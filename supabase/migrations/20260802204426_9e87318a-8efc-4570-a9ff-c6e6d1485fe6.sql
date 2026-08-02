-- Sprint 1.2 / Migration 008 — Events, Audit, Social
-- Traceability: DB Spec §3.7, §3.8, §7, §9; ADR-005, ADR-010, ADR-011

CREATE TABLE IF NOT EXISTS public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  correlation_id uuid,
  causation_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT domain_events_name_chk CHECK (event_name ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$'),
  CONSTRAINT domain_events_version_chk CHECK (event_version >= 1)
);
CREATE INDEX IF NOT EXISTS domain_events_aggregate_idx ON public.domain_events (aggregate_type, aggregate_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS domain_events_name_time_idx ON public.domain_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS domain_events_correlation_idx ON public.domain_events (correlation_id);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  session_ref text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  locale text,
  platform text,
  app_version text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_name_chk CHECK (event_name ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$'),
  CONSTRAINT analytics_events_platform_chk CHECK (platform IS NULL OR platform IN ('web','ios','android','pwa'))
);
CREATE INDEX IF NOT EXISTS analytics_events_name_time_idx ON public.analytics_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_profile_idx ON public.analytics_events (profile_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_state jsonb,
  after_state jsonb,
  reason text,
  ip_hash text,
  user_agent_hash text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_code_format_chk CHECK (code ~ '^AUD-[0-9]{6,}$')
);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON public.audit_logs (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs (actor_profile_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  related_room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  summary_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_timeline_type_chk CHECK (activity_type IN ('room_created','room_joined','room_ended','invite_sent','invite_accepted','voice_joined')),
  CONSTRAINT activity_timeline_summary_key_chk CHECK (summary_key ~ '^[a-z0-9]+(\.[a-z0-9_]+)+$')
);
CREATE INDEX IF NOT EXISTS activity_timeline_profile_idx ON public.activity_timeline (profile_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.recent_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_count integer NOT NULL DEFAULT 1,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recent_partners_uq UNIQUE (profile_id, partner_profile_id),
  CONSTRAINT recent_partners_not_self_chk CHECK (profile_id <> partner_profile_id),
  CONSTRAINT recent_partners_count_chk CHECK (session_count > 0)
);
CREATE INDEX IF NOT EXISTS recent_partners_recent_idx ON public.recent_partners (profile_id, last_watched_at DESC);

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_uq UNIQUE (profile_id, blocked_profile_id),
  CONSTRAINT blocked_users_not_self_chk CHECK (profile_id <> blocked_profile_id)
);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON public.blocked_users (blocked_profile_id);

CREATE OR REPLACE FUNCTION public.is_block_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users b
    WHERE (b.profile_id = _a AND b.blocked_profile_id = _b)
       OR (b.profile_id = _b AND b.blocked_profile_id = _a)
  );
$$;
REVOKE ALL ON FUNCTION public.is_block_between(uuid, uuid) FROM PUBLIC, anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['domain_events','analytics_events','audit_logs','activity_timeline','recent_partners','blocked_users']
  LOOP
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  EXECUTE 'DROP TRIGGER IF EXISTS trg_recent_partners_updated_at ON public.recent_partners';
  EXECUTE 'CREATE TRIGGER trg_recent_partners_updated_at BEFORE UPDATE ON public.recent_partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';
END $$;

GRANT SELECT ON public.domain_events TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.activity_timeline TO authenticated;
GRANT SELECT ON public.recent_partners TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;

DROP POLICY IF EXISTS domain_events_select_admin ON public.domain_events;
CREATE POLICY domain_events_select_admin ON public.domain_events FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS analytics_events_select_self ON public.analytics_events;
CREATE POLICY analytics_events_select_self ON public.analytics_events FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_platform_admin());

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS activity_timeline_select_self ON public.activity_timeline;
CREATE POLICY activity_timeline_select_self ON public.activity_timeline FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS recent_partners_select_self ON public.recent_partners;
CREATE POLICY recent_partners_select_self ON public.recent_partners FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS blocked_users_select_self ON public.blocked_users;
CREATE POLICY blocked_users_select_self ON public.blocked_users FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS blocked_users_insert_self ON public.blocked_users;
CREATE POLICY blocked_users_insert_self ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS blocked_users_delete_self ON public.blocked_users;
CREATE POLICY blocked_users_delete_self ON public.blocked_users FOR DELETE TO authenticated
  USING (profile_id = public.current_profile_id());

-- Complete the deferred block-list clause on profile visibility (Migration 002 note)
DROP POLICY IF EXISTS profiles_select_others ON public.profiles;
CREATE POLICY profiles_select_others ON public.profiles FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND NOT public.is_block_between(id, public.current_profile_id())
  );
