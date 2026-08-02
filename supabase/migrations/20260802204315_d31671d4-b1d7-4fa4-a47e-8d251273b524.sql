-- Sprint 1.2 / Migration 007 — Playback, Sync, Po Agent
-- Traceability: DB Spec §3.5, §3.6, §5, §9; ADR-001, ADR-004, ADR-009; Foundation §14.4

CREATE TABLE IF NOT EXISTS public.playback_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  content_reference text,
  sync_mode text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'preparing',
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint,
  average_drift_ms integer,
  max_drift_ms integer,
  resync_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playback_sessions_code_format_chk CHECK (code ~ '^PLB-[0-9]{6,}$'),
  CONSTRAINT playback_sessions_sync_mode_chk CHECK (sync_mode IN ('controlled','manual')),
  CONSTRAINT playback_sessions_status_chk CHECK (status IN ('preparing','active','completed','abandoned','failed')),
  CONSTRAINT playback_sessions_resync_chk CHECK (resync_count >= 0)
);
CREATE INDEX IF NOT EXISTS playback_sessions_room_idx ON public.playback_sessions (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.playback_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playback_session_id uuid NOT NULL REFERENCES public.playback_sessions(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  position_ms bigint NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  drift_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT playback_checkpoints_position_chk CHECK (position_ms >= 0)
);
CREATE INDEX IF NOT EXISTS playback_checkpoints_session_idx ON public.playback_checkpoints (playback_session_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS public.sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  playback_session_id uuid REFERENCES public.playback_sessions(id) ON DELETE SET NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  position_ms bigint,
  server_time timestamptz NOT NULL DEFAULT now(),
  client_time timestamptz,
  drift_ms integer,
  quality_band text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sync_events_type_chk CHECK (event_type IN ('countdown_started','countdown_cancelled','play','pause','seek','resync_requested','resync_applied','drift_reported','session_ended')),
  CONSTRAINT sync_events_quality_chk CHECK (quality_band IS NULL OR quality_band IN ('excellent','good','warning','critical'))
);
CREATE INDEX IF NOT EXISTS sync_events_room_time_idx ON public.sync_events (room_id, server_time DESC);
CREATE INDEX IF NOT EXISTS sync_events_session_idx ON public.sync_events (playback_session_id, server_time DESC);

-- Po agent (ADR-001) — schema only; Po remains non-operational in Sprint 1.2
CREATE TABLE IF NOT EXISTS public.po_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'text',
  status text NOT NULL DEFAULT 'open',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_sessions_code_format_chk CHECK (code ~ '^POS-[0-9]{6,}$'),
  CONSTRAINT po_sessions_channel_chk CHECK (channel IN ('text','voice')),
  CONSTRAINT po_sessions_status_chk CHECK (status IN ('open','closed','expired'))
);
CREATE INDEX IF NOT EXISTS po_sessions_profile_idx ON public.po_sessions (profile_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.po_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_session_id uuid NOT NULL REFERENCES public.po_sessions(id) ON DELETE CASCADE,
  utterance_redacted text,
  intent_key text,
  confidence numeric(4,3),
  resolution text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_intents_confidence_chk CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  CONSTRAINT po_intents_resolution_chk CHECK (resolution IN ('pending','planned','clarification_requested','rejected','unsupported'))
);
CREATE INDEX IF NOT EXISTS po_intents_session_idx ON public.po_intents (po_session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.po_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  po_session_id uuid NOT NULL REFERENCES public.po_sessions(id) ON DELETE CASCADE,
  po_intent_id uuid REFERENCES public.po_intents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  summary_key text,
  requires_confirmation boolean NOT NULL DEFAULT true,
  confirmed_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_plans_code_format_chk CHECK (code ~ '^POP-[0-9]{6,}$'),
  CONSTRAINT po_plans_status_chk CHECK (status IN ('draft','awaiting_confirmation','executing','completed','failed','cancelled'))
);
CREATE INDEX IF NOT EXISTS po_plans_session_idx ON public.po_plans (po_session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.po_plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_plan_id uuid NOT NULL REFERENCES public.po_plans(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  tool_key text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  error_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_plan_steps_status_chk CHECK (status IN ('pending','running','succeeded','failed','skipped')),
  CONSTRAINT po_plan_steps_order_chk CHECK (step_order > 0),
  CONSTRAINT po_plan_steps_uq UNIQUE (po_plan_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.po_tool_invocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_plan_step_id uuid NOT NULL REFERENCES public.po_plan_steps(id) ON DELETE CASCADE,
  tool_key text NOT NULL,
  outcome text NOT NULL DEFAULT 'pending',
  duration_ms integer,
  compliance_decision text,
  error_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT po_tool_invocations_outcome_chk CHECK (outcome IN ('pending','allowed','denied','succeeded','failed')),
  CONSTRAINT po_tool_invocations_compliance_chk CHECK (compliance_decision IS NULL OR compliance_decision IN ('allow','deny','manual_only'))
);
CREATE INDEX IF NOT EXISTS po_tool_invocations_step_idx ON public.po_tool_invocations (po_plan_step_id);

CREATE TABLE IF NOT EXISTS public.po_preference_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope text NOT NULL DEFAULT 'user',
  source text NOT NULL DEFAULT 'explicit',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT po_preference_memories_scope_chk CHECK (scope IN ('user','room')),
  CONSTRAINT po_preference_memories_source_chk CHECK (source IN ('explicit','inferred')),
  CONSTRAINT po_preference_memories_uq UNIQUE (profile_id, memory_key, scope)
);

CREATE OR REPLACE FUNCTION public.owns_po_session(_po_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.po_sessions s
    WHERE s.id = _po_session_id AND s.profile_id = public.current_profile_id()
  );
$$;
REVOKE ALL ON FUNCTION public.owns_po_session(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.owns_po_plan(_po_plan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.po_plans p
    JOIN public.po_sessions s ON s.id = p.po_session_id
    WHERE p.id = _po_plan_id AND s.profile_id = public.current_profile_id()
  );
$$;
REVOKE ALL ON FUNCTION public.owns_po_plan(uuid) FROM PUBLIC, anon;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['playback_sessions','playback_checkpoints','sync_events','po_sessions','po_intents','po_plans','po_plan_steps','po_tool_invocations','po_preference_memories']
  LOOP
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['playback_sessions','po_sessions','po_plans','po_plan_steps','po_preference_memories']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

GRANT SELECT ON public.playback_sessions TO authenticated;
GRANT SELECT ON public.playback_checkpoints TO authenticated;
GRANT SELECT, INSERT ON public.sync_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.po_sessions TO authenticated;
GRANT SELECT ON public.po_intents TO authenticated;
GRANT SELECT, UPDATE ON public.po_plans TO authenticated;
GRANT SELECT ON public.po_plan_steps TO authenticated;
GRANT SELECT ON public.po_tool_invocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.po_preference_memories TO authenticated;

DROP POLICY IF EXISTS playback_sessions_select_members ON public.playback_sessions;
CREATE POLICY playback_sessions_select_members ON public.playback_sessions FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));

DROP POLICY IF EXISTS playback_checkpoints_select_members ON public.playback_checkpoints;
CREATE POLICY playback_checkpoints_select_members ON public.playback_checkpoints FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.playback_sessions ps WHERE ps.id = playback_session_id AND public.is_room_member(ps.room_id)));

DROP POLICY IF EXISTS sync_events_select_members ON public.sync_events;
CREATE POLICY sync_events_select_members ON public.sync_events FOR SELECT TO authenticated
  USING (public.is_room_member(room_id));
DROP POLICY IF EXISTS sync_events_insert_members ON public.sync_events;
CREATE POLICY sync_events_insert_members ON public.sync_events FOR INSERT TO authenticated
  WITH CHECK (public.is_room_member(room_id) AND actor_profile_id = public.current_profile_id());

DROP POLICY IF EXISTS po_sessions_owner_select ON public.po_sessions;
CREATE POLICY po_sessions_owner_select ON public.po_sessions FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS po_sessions_owner_insert ON public.po_sessions;
CREATE POLICY po_sessions_owner_insert ON public.po_sessions FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS po_sessions_owner_update ON public.po_sessions;
CREATE POLICY po_sessions_owner_update ON public.po_sessions FOR UPDATE TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS po_intents_owner_select ON public.po_intents;
CREATE POLICY po_intents_owner_select ON public.po_intents FOR SELECT TO authenticated
  USING (public.owns_po_session(po_session_id));

DROP POLICY IF EXISTS po_plans_owner_select ON public.po_plans;
CREATE POLICY po_plans_owner_select ON public.po_plans FOR SELECT TO authenticated
  USING (public.owns_po_session(po_session_id));
DROP POLICY IF EXISTS po_plans_owner_update ON public.po_plans;
CREATE POLICY po_plans_owner_update ON public.po_plans FOR UPDATE TO authenticated
  USING (public.owns_po_session(po_session_id)) WITH CHECK (public.owns_po_session(po_session_id));

DROP POLICY IF EXISTS po_plan_steps_owner_select ON public.po_plan_steps;
CREATE POLICY po_plan_steps_owner_select ON public.po_plan_steps FOR SELECT TO authenticated
  USING (public.owns_po_plan(po_plan_id));

DROP POLICY IF EXISTS po_tool_invocations_owner_select ON public.po_tool_invocations;
CREATE POLICY po_tool_invocations_owner_select ON public.po_tool_invocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.po_plan_steps s WHERE s.id = po_plan_step_id AND public.owns_po_plan(s.po_plan_id)));

DROP POLICY IF EXISTS po_memories_owner_all ON public.po_preference_memories;
CREATE POLICY po_memories_owner_all ON public.po_preference_memories FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
