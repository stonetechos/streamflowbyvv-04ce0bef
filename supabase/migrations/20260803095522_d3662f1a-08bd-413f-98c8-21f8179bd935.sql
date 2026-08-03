-- Sprint H1.7 — profile provisioning for confirmed auth subjects (retry: backfill fix).

CREATE OR REPLACE FUNCTION public.provision_profile_for_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base text;
  _handle text;
  _suffix integer := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE auth_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  _base := lower(regexp_replace(split_part(coalesce(NEW.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  IF length(_base) < 3 THEN
    _base := _base || 'user';
  END IF;
  _base := left(_base, 24);
  _handle := _base;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle::text) = _handle AND deleted_at IS NULL) LOOP
    _suffix := _suffix + 1;
    _handle := left(_base, 24) || _suffix::text;
  END LOOP;

  INSERT INTO public.profiles (code, auth_user_id, display_name, handle, locale)
  VALUES (
    public.allocate_code('USR'),
    NEW.id,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'display_name', ''), _handle),
    _handle::citext,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'locale', ''), 'en')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_profile ON auth.users;
CREATE TRIGGER trg_provision_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.provision_profile_for_auth_user();

-- Backfill subjects that signed up before provisioning existed.
DO $$
DECLARE
  _u record;
  _base text;
  _handle text;
  _suffix integer;
BEGIN
  FOR _u IN
    SELECT u.id, u.email, u.raw_user_meta_data
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.auth_user_id = u.id
    WHERE p.id IS NULL
  LOOP
    _suffix := 0;
    _base := lower(regexp_replace(split_part(coalesce(_u.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
    IF length(_base) < 3 THEN
      _base := _base || 'user';
    END IF;
    _base := left(_base, 24);
    _handle := _base;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(handle::text) = _handle AND deleted_at IS NULL) LOOP
      _suffix := _suffix + 1;
      _handle := left(_base, 24) || _suffix::text;
    END LOOP;

    INSERT INTO public.profiles (code, auth_user_id, display_name, handle, locale)
    VALUES (
      public.allocate_code('USR'),
      _u.id,
      coalesce(nullif(_u.raw_user_meta_data ->> 'display_name', ''), _handle),
      _handle::citext,
      coalesce(nullif(_u.raw_user_meta_data ->> 'locale', ''), 'en')
    );
  END LOOP;
END;
$$;
