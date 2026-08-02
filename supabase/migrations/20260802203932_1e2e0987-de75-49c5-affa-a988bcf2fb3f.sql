-- Sprint 1.2 / Migration 004 — Providers, Compliance, Localization, Feature Flags
-- Traceability: DB Spec §3.5, §3.7, §5, §9

CREATE TABLE IF NOT EXISTS public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  key text NOT NULL UNIQUE,
  display_name_key text NOT NULL,
  category text NOT NULL,
  homepage_url text,
  logo_asset_key text,
  is_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT providers_code_format_chk CHECK (code ~ '^PRV-[0-9]{6,}$'),
  CONSTRAINT providers_category_chk CHECK (category IN ('ott','video_platform','local_media','other'))
);
CREATE INDEX IF NOT EXISTS providers_enabled_sort_idx ON public.providers (is_enabled, sort_order);

ALTER TABLE public.privacy_preferences
  DROP CONSTRAINT IF EXISTS privacy_preferences_default_provider_fk;
ALTER TABLE public.privacy_preferences
  ADD CONSTRAINT privacy_preferences_default_provider_fk
  FOREIGN KEY (default_provider_id) REFERENCES public.providers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.provider_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  capability text NOT NULL,
  support_level text NOT NULL DEFAULT 'unverified',
  notes_key text,
  verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_capabilities_capability_chk CHECK (capability IN ('play_pause','seek','deep_link','position_read','embed','local_playback')),
  CONSTRAINT provider_capabilities_support_chk CHECK (support_level IN ('supported','manual_sync','experimental','unverified','unavailable')),
  CONSTRAINT provider_capabilities_uq UNIQUE (provider_id, capability)
);
CREATE INDEX IF NOT EXISTS provider_capabilities_support_idx ON public.provider_capabilities (support_level);

CREATE TABLE IF NOT EXISTS public.provider_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  reason_key text,
  effective_from timestamptz NOT NULL DEFAULT now(),
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_status_history_prev_chk CHECK (previous_status IS NULL OR previous_status IN ('available','degraded','manual_only','unavailable','retired')),
  CONSTRAINT provider_status_history_new_chk CHECK (new_status IN ('available','degraded','manual_only','unavailable','retired'))
);
CREATE INDEX IF NOT EXISTS provider_status_history_provider_idx ON public.provider_status_history (provider_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.provider_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  is_favorite boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_preferences_uq UNIQUE (profile_id, provider_id)
);
CREATE INDEX IF NOT EXISTS provider_preferences_recent_idx ON public.provider_preferences (profile_id, last_used_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_compliance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  action text NOT NULL,
  scope text NOT NULL DEFAULT 'global',
  region_code text,
  rationale_key text NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT provider_compliance_rules_action_chk CHECK (action IN ('allow','manual_only','warn','block')),
  CONSTRAINT provider_compliance_rules_scope_chk CHECK (scope IN ('global','region')),
  CONSTRAINT provider_compliance_rules_region_chk CHECK ((scope = 'region' AND region_code IS NOT NULL) OR (scope = 'global' AND region_code IS NULL)),
  CONSTRAINT provider_compliance_rules_window_chk CHECK (effective_until IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS provider_compliance_rules_lookup_idx ON public.provider_compliance_rules (provider_id, scope, region_code);
CREATE INDEX IF NOT EXISTS provider_compliance_rules_window_idx ON public.provider_compliance_rules (effective_from, effective_until);

CREATE TABLE IF NOT EXISTS public.localization_strings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  key text NOT NULL,
  language_code text NOT NULL,
  value text NOT NULL,
  is_reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT localization_strings_uq UNIQUE (namespace, key, language_code)
);
CREATE INDEX IF NOT EXISTS localization_strings_language_idx ON public.localization_strings (language_code);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  key text NOT NULL UNIQUE,
  description text,
  state text NOT NULL DEFAULT 'off',
  rollout_percentage integer NOT NULL DEFAULT 0,
  default_value jsonb NOT NULL DEFAULT 'false'::jsonb,
  is_permanent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT feature_flags_code_format_chk CHECK (code ~ '^FLG-[0-9]{6,}$'),
  CONSTRAINT feature_flags_state_chk CHECK (state IN ('off','on','internal','percentage','targeted')),
  CONSTRAINT feature_flags_rollout_chk CHECK (rollout_percentage BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS feature_flags_state_idx ON public.feature_flags (state);

CREATE TABLE IF NOT EXISTS public.feature_flag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  source text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flag_assignments_source_chk CHECK (source IN ('manual','percentage_bucket','internal_tester')),
  CONSTRAINT feature_flag_assignments_uq UNIQUE (feature_flag_id, profile_id)
);
CREATE INDEX IF NOT EXISTS feature_flag_assignments_profile_idx ON public.feature_flag_assignments (profile_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_capabilities','provider_status_history','provider_preferences','provider_compliance_rules','localization_strings','feature_flags','feature_flag_assignments']
  LOOP
    IF t <> 'provider_status_history' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
      EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
    END IF;
    EXECUTE format('GRANT ALL ON public.%1$s TO service_role', t);
    EXECUTE format('ALTER TABLE public.%1$s ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- §9 read grants
GRANT SELECT ON public.providers, public.provider_capabilities, public.provider_status_history,
  public.provider_compliance_rules, public.feature_flags, public.feature_flag_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_preferences TO authenticated;
GRANT SELECT ON public.localization_strings TO anon, authenticated;

-- Admin-managed reference data: read by all authenticated, written by admins only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_capabilities','provider_status_history','provider_compliance_rules','feature_flags']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_select_authenticated ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_select_authenticated ON public.%1$s FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_admin_insert ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_admin_insert ON public.%1$s FOR INSERT TO authenticated WITH CHECK (public.is_platform_admin())', t);
  END LOOP;
END $$;

-- Admin update where §9 allows it (providers, capabilities, compliance rules, feature flags).
-- provider_status_history is append-only: no update policy, no delete policy.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_capabilities','provider_compliance_rules','feature_flags']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_admin_update ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_admin_update ON public.%1$s FOR UPDATE TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())', t);
  END LOOP;
END $$;

-- Admin delete where §9 allows it. provider_compliance_rules: never deleted.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['providers','provider_capabilities','feature_flags']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_admin_delete ON public.%1$s', t);
    EXECUTE format('CREATE POLICY %1$s_admin_delete ON public.%1$s FOR DELETE TO authenticated USING (public.is_platform_admin())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS provider_preferences_self_all ON public.provider_preferences;
CREATE POLICY provider_preferences_self_all ON public.provider_preferences
  FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

DROP POLICY IF EXISTS localization_strings_public_select ON public.localization_strings;
CREATE POLICY localization_strings_public_select ON public.localization_strings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS localization_strings_admin_write ON public.localization_strings;
CREATE POLICY localization_strings_admin_write ON public.localization_strings
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS feature_flag_assignments_select_self ON public.feature_flag_assignments;
CREATE POLICY feature_flag_assignments_select_self ON public.feature_flag_assignments
  FOR SELECT TO authenticated USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS feature_flag_assignments_admin_write ON public.feature_flag_assignments;
CREATE POLICY feature_flag_assignments_admin_write ON public.feature_flag_assignments
  FOR ALL TO authenticated USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
