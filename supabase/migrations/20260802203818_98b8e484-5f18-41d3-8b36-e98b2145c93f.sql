-- Sprint 1.2 / Migration 003 — Preference tables (DB Spec §3.1, ADR-005, Foundation §14.1/§17)

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT false,
  email_enabled boolean NOT NULL DEFAULT true,
  type_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_timezone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.localization_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  language_code text NOT NULL DEFAULT 'en',
  region_code text,
  date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
  time_format_24h boolean NOT NULL DEFAULT true,
  auto_detect_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT localization_preferences_region_chk CHECK (region_code IS NULL OR region_code ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS public.accessibility_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'default',
  reduced_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  screen_reader_hints_enabled boolean NOT NULL DEFAULT false,
  captions_default_on boolean NOT NULL DEFAULT false,
  font_scale numeric(3,2) NOT NULL DEFAULT 1.00,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accessibility_preferences_mode_chk CHECK (mode IN ('default','reduced_motion','high_contrast','screen_reader_optimized')),
  CONSTRAINT accessibility_preferences_font_scale_chk CHECK (font_scale BETWEEN 0.75 AND 2.00)
);

CREATE TABLE IF NOT EXISTS public.appearance_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme_mode text NOT NULL DEFAULT 'system',
  accent_token text,
  density text NOT NULL DEFAULT 'comfortable',
  compact_room_layout boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appearance_preferences_theme_chk CHECK (theme_mode IN ('system','light','dark')),
  CONSTRAINT appearance_preferences_density_chk CHECK (density IN ('comfortable','compact'))
);

CREATE TABLE IF NOT EXISTS public.privacy_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  presence_visibility text NOT NULL DEFAULT 'recent_partners',
  allow_invites_from text NOT NULL DEFAULT 'everyone',
  analytics_opt_in boolean NOT NULL DEFAULT false,
  po_memory_opt_in boolean NOT NULL DEFAULT false,
  voice_auto_join boolean NOT NULL DEFAULT false,
  voice_join_muted boolean NOT NULL DEFAULT true,
  voice_push_to_talk boolean NOT NULL DEFAULT false,
  default_provider_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT privacy_preferences_presence_chk CHECK (presence_visibility IN ('everyone','recent_partners','nobody')),
  CONSTRAINT privacy_preferences_invites_chk CHECK (allow_invites_from IN ('everyone','recent_partners','nobody'))
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['notification_preferences','localization_preferences','accessibility_preferences','appearance_preferences','privacy_preferences']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%1$s TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_self_all ON public.%1$s', t);
    EXECUTE format($p$CREATE POLICY %1$s_self_all ON public.%1$s FOR ALL TO authenticated USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id())$p$, t);
  END LOOP;
END $$;
