-- =============================================================================
-- Birthday Gift IL - Automatic Profile Provisioning Trigger on auth.users
-- Guarantees public.users, user_private, user_roles & consent_log are created
-- atomically on sign-up even when email confirmation is enabled (auth.uid() = NULL)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name TEXT;
  v_birth_date DATE;
  v_birth_month SMALLINT;
  v_marketing BOOLEAN;
BEGIN
  v_display_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    split_part(COALESCE(NEW.email, 'חבר קהילה'), '@', 1)
  );
  IF char_length(v_display_name) < 2 THEN
    v_display_name := 'חבר קהילה';
  END IF;
  v_display_name := left(v_display_name, 40);

  BEGIN
    v_birth_date := (NEW.raw_user_meta_data ->> 'birth_date')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_birth_date := NULL;
  END;

  v_birth_month := COALESCE(
    NULLIF((NEW.raw_user_meta_data ->> 'birth_month')::SMALLINT, 0),
    CASE WHEN v_birth_date IS NOT NULL THEN EXTRACT(MONTH FROM v_birth_date)::SMALLINT ELSE 1 END
  );
  IF v_birth_month < 1 OR v_birth_month > 12 THEN
    v_birth_month := 1;
  END IF;

  v_marketing := COALESCE((NEW.raw_user_meta_data ->> 'marketing_consent')::BOOLEAN, FALSE);

  INSERT INTO public.users (id, display_name, birth_month, account_status)
  VALUES (NEW.id, v_display_name, v_birth_month, 'active')
  ON CONFLICT (id) DO NOTHING;

  IF v_birth_date IS NOT NULL AND v_birth_date <= (CURRENT_DATE - INTERVAL '18 years') THEN
    INSERT INTO public.user_private (user_id, birth_date, marketing_consent)
    VALUES (NEW.id, v_birth_date, v_marketing)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.consent_log (user_id, consent_type, version)
  VALUES
    (NEW.id, 'terms_of_service', '2.0'),
    (NEW.id, 'privacy_policy', '2.0'),
    (NEW.id, 'age_18_confirmation', '2.0'),
    (NEW.id, 'birth_month_display', '2.0');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
