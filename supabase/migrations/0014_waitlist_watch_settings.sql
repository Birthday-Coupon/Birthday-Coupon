-- =============================================================================
-- Birthday Gift IL - Per-store watch settings
-- The dashboard watch settings (minimum discount, verified-only, mute) move from
-- the browser to the waitlist row, so they follow the user across devices.
-- The waitlist trigger now honours mute / threshold / verified filters.
-- =============================================================================

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS min_discount_percent NUMERIC(5, 2)
    CHECK (min_discount_percent IS NULL OR (min_discount_percent >= 0 AND min_discount_percent <= 100)),
  ADD COLUMN IF NOT EXISTS only_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.notify_waitlist_on_active_benefit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_name TEXT;
  v_store_slug TEXT;
  v_active_count INT;
  v_store_discount NUMERIC;
  v_store_type public.benefit_discount_type;
  v_has_verified BOOLEAN;
BEGIN
  -- Fire only when inserted as 'active', or updated from non-active -> 'active'
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT name_he, slug, benefit_type
    INTO v_store_name, v_store_slug, v_store_type
  FROM public.stores
  WHERE id = NEW.store_id;

  SELECT
    count(*),
    bool_or(ub.is_verified)
  INTO v_active_count, v_has_verified
  FROM public.user_benefits ub
  WHERE ub.store_id = NEW.store_id
    AND ub.status = 'active'
    AND ub.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN ub.window_start_date AND ub.window_end_date;

  IF COALESCE(v_active_count, 0) = 0 THEN
    RETURN NEW;
  END IF;

  -- Store-level percentage for the per-store minimum-discount filter.
  SELECT (regexp_match(discount_value, '[0-9]+(\.[0-9]+)?'))[1]::numeric
    INTO v_store_discount
  FROM public.stores
  WHERE id = NEW.store_id;

  WITH targets AS (
    SELECT w.user_id
    FROM public.waitlist w
    LEFT JOIN public.notification_preferences p
      ON p.user_id = w.user_id
     AND p.type = 'waitlist_benefit_available'
    WHERE w.store_id = NEW.store_id
      AND w.user_id <> NEW.owner_id
      AND COALESCE(p.in_app_enabled, TRUE)
      -- per-store mute
      AND (w.muted_until IS NULL OR w.muted_until <= NOW())
      -- per-store verified-only filter
      AND (NOT w.only_verified OR COALESCE(v_has_verified, FALSE))
      -- per-store minimum discount (percentage stores only)
      AND (
        w.min_discount_percent IS NULL
        OR v_store_type <> 'percentage'
        OR v_store_discount IS NULL
        OR v_store_discount >= w.min_discount_percent
      )
      -- digest: at most one waitlist notification per store per 24h
      AND (w.notified_at IS NULL OR w.notified_at < NOW() - INTERVAL '24 hours')
  ), inserted AS (
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT
      t.user_id,
      'waitlist_benefit_available',
      'נוספה הטבת יום הולדת ב-' || COALESCE(v_store_name, 'חנות'),
      CASE
        WHEN v_active_count > 1
          THEN v_active_count || ' הטבות זמינות עכשיו בחנות במעקב — אפשר לבקש.'
        ELSE 'נפתחה הטבת יום הולדת פעילה בחנות במעקב — אפשר לבקש עכשיו.'
      END,
      '/stores/' || COALESCE(v_store_slug, '')
    FROM targets t
    RETURNING user_id
  )
  UPDATE public.waitlist w
  SET notified_at = NOW()
  FROM inserted i
  WHERE w.user_id = i.user_id
    AND w.store_id = NEW.store_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_active_benefit ON public.user_benefits;
CREATE TRIGGER trg_notify_waitlist_on_active_benefit
  AFTER INSERT OR UPDATE OF status ON public.user_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waitlist_on_active_benefit();
