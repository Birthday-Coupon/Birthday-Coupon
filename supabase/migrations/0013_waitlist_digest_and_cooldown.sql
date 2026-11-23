-- =============================================================================
-- Birthday Gift IL - Waitlist digest, cooldown and notification preferences
-- 1. One notification per store per waiting user per 24 hours (no flood when a
--    store gets several active benefits in a row).
-- 2. The notification says how many benefits are available right now.
-- 3. Respects notification_preferences.in_app_enabled for the waitlist type.
-- notified_at is used as the cooldown marker, so it is now read, not only written.
-- =============================================================================

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
BEGIN
  -- Fire only when inserted as 'active', or updated from non-active -> 'active'
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT name_he, slug INTO v_store_name, v_store_slug
  FROM public.stores
  WHERE id = NEW.store_id;

  -- How many benefits are actually available in this store right now.
  SELECT count(*) INTO v_active_count
  FROM public.user_benefits ub
  WHERE ub.store_id = NEW.store_id
    AND ub.status = 'active'
    AND ub.deleted_at IS NULL
    AND CURRENT_DATE BETWEEN ub.window_start_date AND ub.window_end_date;

  IF v_active_count = 0 THEN
    RETURN NEW;
  END IF;

  WITH targets AS (
    SELECT w.user_id
    FROM public.waitlist w
    LEFT JOIN public.notification_preferences p
      ON p.user_id = w.user_id
     AND p.type = 'waitlist_benefit_available'
    WHERE w.store_id = NEW.store_id
      AND w.user_id <> NEW.owner_id
      AND COALESCE(p.in_app_enabled, TRUE)
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
