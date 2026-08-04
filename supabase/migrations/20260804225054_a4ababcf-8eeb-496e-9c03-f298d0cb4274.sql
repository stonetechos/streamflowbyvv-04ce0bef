CREATE OR REPLACE FUNCTION public.assign_domain_event_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.aggregate_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Exact redelivery of an envelope that is already durable: store once.
  IF EXISTS (
    SELECT 1 FROM public.domain_events e
    WHERE e.aggregate_type = NEW.aggregate_type
      AND e.aggregate_id = NEW.aggregate_id
      AND e.event_name = NEW.event_name
      AND e.correlation_id IS NOT DISTINCT FROM NEW.correlation_id
      AND e.occurred_at = NEW.occurred_at
  ) THEN
    RETURN NULL;
  END IF;

  -- Two clients sequence independently, so the slot may already be taken by a
  -- different envelope. Take the next free number for this aggregate.
  IF NEW.sequence IS NULL OR EXISTS (
    SELECT 1 FROM public.domain_events e
    WHERE e.aggregate_type = NEW.aggregate_type
      AND e.aggregate_id = NEW.aggregate_id
      AND e.event_name = NEW.event_name
      AND e.sequence = NEW.sequence
  ) THEN
    SELECT coalesce(max(e.sequence), 0) + 1 INTO NEW.sequence
    FROM public.domain_events e
    WHERE e.aggregate_type = NEW.aggregate_type
      AND e.aggregate_id = NEW.aggregate_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_domain_events_sequence ON public.domain_events;
CREATE TRIGGER trg_domain_events_sequence
BEFORE INSERT ON public.domain_events
FOR EACH ROW EXECUTE FUNCTION public.assign_domain_event_sequence();