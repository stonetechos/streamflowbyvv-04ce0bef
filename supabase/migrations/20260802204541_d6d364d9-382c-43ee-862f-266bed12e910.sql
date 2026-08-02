-- Sprint 1.2 / Migration 009 — Languages reference
-- Traceability: DB Spec §3.4 Localization; Foundation §15 (launch locales en, hi-IN)

CREATE TABLE IF NOT EXISTS public.languages (
  code text PRIMARY KEY,
  english_name text NOT NULL,
  native_name text NOT NULL,
  direction text NOT NULL DEFAULT 'ltr',
  is_enabled boolean NOT NULL DEFAULT false,
  is_launch_locale boolean NOT NULL DEFAULT false,
  fallback_code text REFERENCES public.languages(code) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT languages_code_chk CHECK (code ~ '^[a-z]{2}(-[A-Za-z0-9]{2,8})?$'),
  CONSTRAINT languages_direction_chk CHECK (direction IN ('ltr','rtl')),
  CONSTRAINT languages_fallback_not_self_chk CHECK (fallback_code IS NULL OR fallback_code <> code)
);

DROP TRIGGER IF EXISTS trg_languages_updated_at ON public.languages;
CREATE TRIGGER trg_languages_updated_at BEFORE UPDATE ON public.languages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;

DROP POLICY IF EXISTS languages_select_authenticated ON public.languages;
CREATE POLICY languages_select_authenticated ON public.languages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS languages_write_admin ON public.languages;
CREATE POLICY languages_write_admin ON public.languages FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
