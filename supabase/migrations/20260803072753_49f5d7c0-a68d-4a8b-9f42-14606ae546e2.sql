-- Friend system (Milestone F.0) — Foundation §User/Social, Database Spec §3.11 code prefixes.

INSERT INTO public.code_sequences (prefix, padding_width) VALUES ('FRN', 6)
ON CONFLICT (prefix) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  requester_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendships_code_format_chk CHECK (code ~ '^FRN-[0-9]{6,}$'),
  CONSTRAINT friendships_status_chk CHECK (status IN ('pending','accepted','declined','cancelled')),
  CONSTRAINT friendships_not_self_chk CHECK (requester_profile_id <> addressee_profile_id),
  CONSTRAINT friendships_pair_uq UNIQUE (requester_profile_id, addressee_profile_id)
);

CREATE INDEX IF NOT EXISTS friendships_requester_idx
  ON public.friendships (requester_profile_id, status);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx
  ON public.friendships (addressee_profile_id, status);

-- Codes are allocated by the store, never by the client (Database Spec §3.11).
CREATE OR REPLACE FUNCTION public.assign_friendship_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.allocate_code('FRN');
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.friendships ALTER COLUMN code DROP NOT NULL;

DROP TRIGGER IF EXISTS trg_friendships_code ON public.friendships;
CREATE TRIGGER trg_friendships_code BEFORE INSERT ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.assign_friendship_code();

DROP TRIGGER IF EXISTS trg_friendships_updated_at ON public.friendships;
CREATE TRIGGER trg_friendships_updated_at BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friendships_select_involved ON public.friendships;
CREATE POLICY friendships_select_involved ON public.friendships FOR SELECT TO authenticated
  USING (
    requester_profile_id = public.current_profile_id()
    OR addressee_profile_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS friendships_insert_requester ON public.friendships;
CREATE POLICY friendships_insert_requester ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (
    requester_profile_id = public.current_profile_id()
    AND NOT public.is_block_between(addressee_profile_id, public.current_profile_id())
  );

DROP POLICY IF EXISTS friendships_update_involved ON public.friendships;
CREATE POLICY friendships_update_involved ON public.friendships FOR UPDATE TO authenticated
  USING (
    requester_profile_id = public.current_profile_id()
    OR addressee_profile_id = public.current_profile_id()
  )
  WITH CHECK (
    requester_profile_id = public.current_profile_id()
    OR addressee_profile_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS friendships_delete_involved ON public.friendships;
CREATE POLICY friendships_delete_involved ON public.friendships FOR DELETE TO authenticated
  USING (
    requester_profile_id = public.current_profile_id()
    OR addressee_profile_id = public.current_profile_id()
  );