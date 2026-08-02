-- Sprint 1.9 / Migration 010 — Event persistence + projection write paths
-- Traceability: Domain Event Catalog v1.0 §1 (PascalCase event_name, gapless sequence),
-- Foundation §4 (event bus), DB Spec §3.7.

ALTER TABLE public.domain_events DROP CONSTRAINT IF EXISTS domain_events_name_chk;
ALTER TABLE public.domain_events
  ADD CONSTRAINT domain_events_name_chk CHECK (event_name ~ '^[A-Za-z][A-Za-z0-9_.]*$');

ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_name_chk;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_name_chk CHECK (event_name ~ '^[A-Za-z][A-Za-z0-9_.]*$');

ALTER TABLE public.domain_events ADD COLUMN IF NOT EXISTS sequence integer;
ALTER TABLE public.domain_events DROP CONSTRAINT IF EXISTS domain_events_sequence_chk;
ALTER TABLE public.domain_events
  ADD CONSTRAINT domain_events_sequence_chk CHECK (sequence IS NULL OR sequence >= 1);

CREATE UNIQUE INDEX IF NOT EXISTS domain_events_replay_uq
  ON public.domain_events (aggregate_type, aggregate_id, event_name, sequence)
  WHERE aggregate_id IS NOT NULL AND sequence IS NOT NULL;

CREATE INDEX IF NOT EXISTS domain_events_order_idx
  ON public.domain_events (aggregate_type, aggregate_id, sequence);

GRANT INSERT ON public.domain_events TO authenticated;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.activity_timeline TO authenticated;
GRANT INSERT, UPDATE ON public.recent_partners TO authenticated;

DROP POLICY IF EXISTS domain_events_insert_actor ON public.domain_events;
CREATE POLICY domain_events_insert_actor ON public.domain_events FOR INSERT TO authenticated
  WITH CHECK (actor_profile_id IS NULL OR actor_profile_id = public.current_profile_id());

DROP POLICY IF EXISTS analytics_events_insert_self ON public.analytics_events;
CREATE POLICY analytics_events_insert_self ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (profile_id IS NULL OR profile_id = public.current_profile_id());

DROP POLICY IF EXISTS activity_timeline_insert_self ON public.activity_timeline;
CREATE POLICY activity_timeline_insert_self ON public.activity_timeline FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS recent_partners_insert_self ON public.recent_partners;
CREATE POLICY recent_partners_insert_self ON public.recent_partners FOR INSERT TO authenticated
  WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS recent_partners_update_self ON public.recent_partners;
CREATE POLICY recent_partners_update_self ON public.recent_partners FOR UPDATE TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());