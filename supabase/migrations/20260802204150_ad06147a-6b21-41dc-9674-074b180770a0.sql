-- Sprint 1.2 / Migration 006 — Notifications & Voice
-- Traceability: DB Spec §3.3, §3.4, §5, §9; ADR-007

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title_key text NOT NULL,
  body_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  related_invite_id uuid REFERENCES public.invites(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'in_app',
  delivery_status text NOT NULL DEFAULT 'queued',
  read_at timestamptz,
  dismissed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_code_format_chk CHECK (code ~ '^NTF-[0-9]{6,}$'),
  CONSTRAINT notifications_type_chk CHECK (type IN ('room_invite','invite_accepted','room_starting','countdown_started','member_joined','member_left','voice_started','provider_status_changed','system_announcement')),
  CONSTRAINT notifications_channel_chk CHECK (channel IN ('in_app','push','email')),
  CONSTRAINT notifications_delivery_chk CHECK (delivery_status IN ('queued','sent','delivered','failed','suppressed')),
  CONSTRAINT notifications_title_key_chk CHECK (title_key ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$'),
  CONSTRAINT notifications_body_key_chk CHECK (body_key ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$')
);
CREATE INDEX IF NOT EXISTS notifications_inbox_idx ON public.notifications (recipient_profile_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_delivery_idx ON public.notifications (delivery_status);
CREATE INDEX IF NOT EXISTS notifications_expires_idx ON public.notifications (expires_at);

CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  provider_key text NOT NULL DEFAULT 'livekit',
  external_session_ref text,
  status text NOT NULL DEFAULT 'provisioning',
  started_at timestamptz,
  ended_at timestamptz,
  peak_participant_count integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_sessions_code_format_chk CHECK (code ~ '^VOI-[0-9]{6,}$'),
  CONSTRAINT voice_sessions_status_chk CHECK (status IN ('provisioning','active','degraded','ended','failed')),
  CONSTRAINT voice_sessions_peak_chk CHECK (peak_participant_count >= 0)
);
CREATE INDEX IF NOT EXISTS voice_sessions_room_status_idx ON public.voice_sessions (room_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS voice_sessions_active_uq ON public.voice_sessions (room_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.voice_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_session_id uuid NOT NULL REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'connecting',
  is_muted boolean NOT NULL DEFAULT true,
  is_deafened boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  connection_quality text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT voice_participants_status_chk CHECK (status IN ('connecting','connected','reconnecting','disconnected')),
  CONSTRAINT voice_participants_quality_chk CHECK (connection_quality IN ('excellent','good','poor','unknown')),
  CONSTRAINT voice_participants_uq UNIQUE (voice_session_id, profile_id, joined_at)
);
CREATE INDEX IF NOT EXISTS voice_participants_profile_idx ON public.voice_participants (profile_id);

CREATE OR REPLACE FUNCTION public.is_voice_session_member(_voice_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.voice_sessions vs
    WHERE vs.id = _voice_session_id AND public.is_room_member(vs.room_id)
  );
$$;
REVOKE ALL ON FUNCTION public.is_voice_session_member(uuid) FROM PUBLIC, anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notifications','voice_sessions','voice_participants']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT ON public.voice_sessions TO authenticated;
GRANT SELECT, UPDATE ON public.voice_participants TO authenticated;

-- notifications (§9): recipient only
DROP POLICY IF EXISTS notifications_select_recipient ON public.notifications;
CREATE POLICY notifications_select_recipient ON public.notifications FOR SELECT TO authenticated
  USING (recipient_profile_id = public.current_profile_id());
DROP POLICY IF EXISTS notifications_update_recipient ON public.notifications;
CREATE POLICY notifications_update_recipient ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_profile_id = public.current_profile_id())
  WITH CHECK (recipient_profile_id = public.current_profile_id());
DROP POLICY IF EXISTS notifications_delete_recipient ON public.notifications;
CREATE POLICY notifications_delete_recipient ON public.notifications FOR DELETE TO authenticated
  USING (recipient_profile_id = public.current_profile_id());

-- voice_sessions (§9): members read; system/host write (host update)
DROP POLICY IF EXISTS voice_sessions_select_members ON public.voice_sessions;
CREATE POLICY voice_sessions_select_members ON public.voice_sessions FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));

-- voice_participants (§9): members of that room read; self updates mute/deafen; host force-mute
DROP POLICY IF EXISTS voice_participants_select_members ON public.voice_participants;
CREATE POLICY voice_participants_select_members ON public.voice_participants FOR SELECT TO authenticated
  USING (public.is_voice_session_member(voice_session_id));
DROP POLICY IF EXISTS voice_participants_update_self_or_host ON public.voice_participants;
CREATE POLICY voice_participants_update_self_or_host ON public.voice_participants FOR UPDATE TO authenticated
  USING (
    profile_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.voice_sessions vs WHERE vs.id = voice_session_id AND public.is_room_host(vs.room_id))
  )
  WITH CHECK (
    profile_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.voice_sessions vs WHERE vs.id = voice_session_id AND public.is_room_host(vs.room_id))
  );
