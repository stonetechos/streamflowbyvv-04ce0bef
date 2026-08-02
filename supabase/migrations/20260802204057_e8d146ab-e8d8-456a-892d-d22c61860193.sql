-- Sprint 1.2 / Migration 005 — Rooms, Membership, Presence, State, Invites
-- Traceability: DB Spec §3.2, §5, §6.4, §9; ADR-002, ADR-003, ADR-004, ADR-013; Foundation §14.2, §14.3

CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  host_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'lobby',
  visibility text NOT NULL DEFAULT 'private',
  provider_id uuid REFERENCES public.providers(id) ON DELETE RESTRICT,
  content_reference text,
  max_members integer NOT NULL DEFAULT 4,
  scheduled_start_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  join_code_hash text,
  join_code_expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT rooms_code_format_chk CHECK (code ~ '^ROM-[0-9]{6,}$'),
  CONSTRAINT rooms_name_chk CHECK (length(btrim(name)) > 0),
  CONSTRAINT rooms_status_chk CHECK (status IN ('lobby','active','paused','ended','abandoned')),
  CONSTRAINT rooms_visibility_chk CHECK (visibility IN ('private','link','public','community')),
  CONSTRAINT rooms_max_members_chk CHECK (max_members BETWEEN 2 AND 8),
  CONSTRAINT rooms_end_after_start_chk CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS rooms_host_idx ON public.rooms (host_profile_id);
CREATE INDEX IF NOT EXISTS rooms_status_created_idx ON public.rooms (status, created_at DESC);
CREATE INDEX IF NOT EXISTS rooms_live_idx ON public.rooms (host_profile_id) WHERE status IN ('lobby','active');
CREATE INDEX IF NOT EXISTS rooms_provider_idx ON public.rooms (provider_id);

CREATE TABLE IF NOT EXISTS public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'guest',
  state text NOT NULL DEFAULT 'invited',
  joined_at timestamptz,
  left_at timestamptz,
  is_muted_by_host boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_members_role_chk CHECK (role IN ('host','co_host','guest')),
  CONSTRAINT room_members_state_chk CHECK (state IN ('invited','joined','left','removed')),
  CONSTRAINT room_members_uq UNIQUE (room_id, profile_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS room_members_single_host_uq ON public.room_members (room_id) WHERE role = 'host';
CREATE INDEX IF NOT EXISTS room_members_profile_state_idx ON public.room_members (profile_id, state);
CREATE INDEX IF NOT EXISTS room_members_room_state_idx ON public.room_members (room_id, state);

-- Membership helpers (§9.1 rule 3) — security definer to avoid recursive policy evaluation
CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = _room_id
      AND rm.profile_id = public.current_profile_id()
      AND rm.state IN ('invited','joined')
  );
$$;
REVOKE ALL ON FUNCTION public.is_room_member(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.is_room_controller(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = _room_id
      AND rm.profile_id = public.current_profile_id()
      AND rm.role IN ('host','co_host')
      AND rm.state IN ('invited','joined')
  );
$$;
REVOKE ALL ON FUNCTION public.is_room_controller(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.is_room_host(_room_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id AND r.host_profile_id = public.current_profile_id()
  );
$$;
REVOKE ALL ON FUNCTION public.is_room_host(uuid) FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS public.room_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'online',
  connection_id text NOT NULL,
  device_kind text,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  latency_ms integer,
  clock_offset_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_presence_status_chk CHECK (status IN ('online','idle','buffering','disconnected','offline')),
  CONSTRAINT room_presence_uq UNIQUE (room_id, profile_id, connection_id)
);
CREATE INDEX IF NOT EXISTS room_presence_room_status_idx ON public.room_presence (room_id, status);
CREATE INDEX IF NOT EXISTS room_presence_heartbeat_idx ON public.room_presence (last_heartbeat_at);

CREATE TABLE IF NOT EXISTS public.room_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL UNIQUE REFERENCES public.rooms(id) ON DELETE CASCADE,
  playback_status text NOT NULL DEFAULT 'idle',
  position_ms bigint NOT NULL DEFAULT 0,
  playback_rate numeric(4,2) NOT NULL DEFAULT 1.00,
  anchor_server_time timestamptz,
  countdown_target_at timestamptz,
  sync_mode text NOT NULL DEFAULT 'manual',
  last_actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_state_playback_status_chk CHECK (playback_status IN ('idle','ready','counting_down','playing','paused','buffering','ended')),
  CONSTRAINT room_state_sync_mode_chk CHECK (sync_mode IN ('controlled','manual')),
  CONSTRAINT room_state_position_chk CHECK (position_ms >= 0),
  CONSTRAINT room_state_rate_chk CHECK (playback_rate > 0),
  CONSTRAINT room_state_version_chk CHECK (version >= 0)
);

-- version monotonicity (DB Spec §3.2 room_state constraints)
CREATE OR REPLACE FUNCTION public.enforce_room_state_version()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.version <= OLD.version THEN
    RAISE EXCEPTION 'room_state.version must increase monotonically (old=%, new=%)', OLD.version, NEW.version;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_room_state_version ON public.room_state;
CREATE TRIGGER trg_room_state_version BEFORE UPDATE ON public.room_state
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_state_version();

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  inviter_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invitee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token_hash text,
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT invites_code_format_chk CHECK (code ~ '^INV-[0-9]{6,}$'),
  CONSTRAINT invites_channel_chk CHECK (channel IN ('in_app','link')),
  CONSTRAINT invites_status_chk CHECK (status IN ('pending','accepted','declined','expired','revoked')),
  CONSTRAINT invites_link_requirements_chk CHECK (channel <> 'link' OR (token_hash IS NOT NULL AND expires_at IS NOT NULL)),
  CONSTRAINT invites_direct_requirements_chk CHECK (channel <> 'in_app' OR invitee_profile_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS invites_token_hash_uq ON public.invites (token_hash) WHERE token_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invites_pending_uq ON public.invites (room_id, invitee_profile_id)
  WHERE status = 'pending' AND invitee_profile_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS invites_invitee_status_idx ON public.invites (invitee_profile_id, status);
CREATE INDEX IF NOT EXISTS invites_room_status_idx ON public.invites (room_id, status);
CREATE INDEX IF NOT EXISTS invites_expires_idx ON public.invites (expires_at);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rooms','room_members','room_presence','room_state','invites']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_presence TO authenticated;
GRANT SELECT, UPDATE ON public.room_state TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invites TO authenticated;

-- rooms (§9): read members + invitees; insert authenticated; update host/co-host; soft delete by host
DROP POLICY IF EXISTS rooms_select_members ON public.rooms;
CREATE POLICY rooms_select_members ON public.rooms FOR SELECT TO authenticated
  USING (host_profile_id = public.current_profile_id() OR public.is_room_member(id));
DROP POLICY IF EXISTS rooms_insert_authenticated ON public.rooms;
CREATE POLICY rooms_insert_authenticated ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (host_profile_id = public.current_profile_id());
DROP POLICY IF EXISTS rooms_update_controller ON public.rooms;
CREATE POLICY rooms_update_controller ON public.rooms FOR UPDATE TO authenticated
  USING (host_profile_id = public.current_profile_id() OR public.is_room_controller(id))
  WITH CHECK (host_profile_id = public.current_profile_id() OR public.is_room_controller(id));

-- room_members (§9)
DROP POLICY IF EXISTS room_members_select_members ON public.room_members;
CREATE POLICY room_members_select_members ON public.room_members FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_room_member(room_id));
DROP POLICY IF EXISTS room_members_insert_host_or_self ON public.room_members;
CREATE POLICY room_members_insert_host_or_self ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (public.is_room_host(room_id) OR profile_id = public.current_profile_id());
DROP POLICY IF EXISTS room_members_update_host_or_self ON public.room_members;
CREATE POLICY room_members_update_host_or_self ON public.room_members FOR UPDATE TO authenticated
  USING (public.is_room_host(room_id) OR profile_id = public.current_profile_id())
  WITH CHECK (public.is_room_host(room_id) OR profile_id = public.current_profile_id());
DROP POLICY IF EXISTS room_members_delete_host ON public.room_members;
CREATE POLICY room_members_delete_host ON public.room_members FOR DELETE TO authenticated
  USING (public.is_room_host(room_id));

-- room_presence (§9): members read; self writes
DROP POLICY IF EXISTS room_presence_select_members ON public.room_presence;
CREATE POLICY room_presence_select_members ON public.room_presence FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));
DROP POLICY IF EXISTS room_presence_insert_self ON public.room_presence;
CREATE POLICY room_presence_insert_self ON public.room_presence FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id() AND public.is_room_member(room_id));
DROP POLICY IF EXISTS room_presence_update_self ON public.room_presence;
CREATE POLICY room_presence_update_self ON public.room_presence FOR UPDATE TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS room_presence_delete_self ON public.room_presence;
CREATE POLICY room_presence_delete_self ON public.room_presence FOR DELETE TO authenticated
  USING (profile_id = public.current_profile_id());

-- room_state (§9): members read; host/co-host update; system inserts; cascade delete only
DROP POLICY IF EXISTS room_state_select_members ON public.room_state;
CREATE POLICY room_state_select_members ON public.room_state FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));
DROP POLICY IF EXISTS room_state_update_controller ON public.room_state;
CREATE POLICY room_state_update_controller ON public.room_state FOR UPDATE TO authenticated
  USING (public.is_room_controller(room_id)) WITH CHECK (public.is_room_controller(room_id));

-- invites (§9): inviter + invitee read; host/co-host create; inviter revokes, invitee responds
DROP POLICY IF EXISTS invites_select_parties ON public.invites;
CREATE POLICY invites_select_parties ON public.invites FOR SELECT TO authenticated
  USING (inviter_profile_id = public.current_profile_id() OR invitee_profile_id = public.current_profile_id());
DROP POLICY IF EXISTS invites_insert_controller ON public.invites;
CREATE POLICY invites_insert_controller ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.is_room_controller(room_id) AND inviter_profile_id = public.current_profile_id());
DROP POLICY IF EXISTS invites_update_parties ON public.invites;
CREATE POLICY invites_update_parties ON public.invites FOR UPDATE TO authenticated
  USING (inviter_profile_id = public.current_profile_id() OR invitee_profile_id = public.current_profile_id())
  WITH CHECK (inviter_profile_id = public.current_profile_id() OR invitee_profile_id = public.current_profile_id());
