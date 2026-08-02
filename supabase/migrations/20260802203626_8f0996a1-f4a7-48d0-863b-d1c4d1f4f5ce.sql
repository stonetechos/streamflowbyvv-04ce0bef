-- Sprint 1.2 / Migration 001 — Foundation
-- Traceability: Database Specification v1.0 §1.2 (codes), §3.11 (platform support tables), §5 (enums as checks), ADR-009

CREATE EXTENSION IF NOT EXISTS citext;

-- Standard audit trigger (DB Spec §2 audit set)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- §3.11 code_sequences
CREATE TABLE IF NOT EXISTS public.code_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text NOT NULL UNIQUE,
  current_value bigint NOT NULL DEFAULT 0,
  padding_width integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_sequences_prefix_format_chk CHECK (prefix ~ '^[A-Z]{3}$'),
  CONSTRAINT code_sequences_current_value_chk CHECK (current_value >= 0),
  CONSTRAINT code_sequences_padding_chk CHECK (padding_width BETWEEN 4 AND 12)
);

DROP TRIGGER IF EXISTS trg_code_sequences_updated_at ON public.code_sequences;
CREATE TRIGGER trg_code_sequences_updated_at
BEFORE UPDATE ON public.code_sequences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.code_sequences TO service_role;
ALTER TABLE public.code_sequences ENABLE ROW LEVEL SECURITY;
-- §9: code_sequences — system/admin read, system write. No client role is granted access.

-- Atomic human-readable code allocation (§1.2)
CREATE OR REPLACE FUNCTION public.allocate_code(_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next bigint;
  _width integer;
BEGIN
  INSERT INTO public.code_sequences (prefix) VALUES (_prefix)
  ON CONFLICT (prefix) DO NOTHING;

  UPDATE public.code_sequences
     SET current_value = current_value + 1
   WHERE prefix = _prefix
  RETURNING current_value, padding_width INTO _next, _width;

  RETURN _prefix || '-' || lpad(_next::text, _width, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_code(text) TO service_role;

INSERT INTO public.code_sequences (prefix, padding_width) VALUES
  ('USR', 6), ('ROM', 6), ('INV', 6), ('PLB', 6), ('VOI', 6),
  ('PRV', 6), ('POS', 6), ('FLG', 6), ('NTF', 6)
ON CONFLICT (prefix) DO NOTHING;

-- §3.11 user_roles (ADR-009). app_role modelled as a check constraint, not a native enum (§5).
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_role_chk CHECK (role IN ('admin','moderator','user')),
  CONSTRAINT user_roles_profile_role_uq UNIQUE (profile_id, role)
);

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
