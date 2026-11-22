-- =============================================================================
-- Birthday Gift IL - Automatic Waitlist Notification Trigger
-- Whenever a benefit is published (or reactivated) as 'active' for a store,
-- notifies all waiting users in public.waitlist (triggers Realtime + Browser/OS notif).
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

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT
    w.user_id,
    'waitlist_benefit_available',
    'נוספה הטבת יום הולדת ב-' || COALESCE(v_store_name, 'חנות'),
    'משתמש פרסם כרגע הטבת יום הולדת פעילה בחנות שחיכית לה! לחץ/י לצפייה ושליחת בקשה.',
    '/stores/' || COALESCE(v_store_slug, '')
  FROM public.waitlist w
  WHERE w.store_id = NEW.store_id
    AND w.user_id <> NEW.owner_id;

  UPDATE public.waitlist
  SET notified_at = NOW()
  WHERE store_id = NEW.store_id
    AND user_id <> NEW.owner_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_waitlist_on_active_benefit ON public.user_benefits;
CREATE TRIGGER trg_notify_waitlist_on_active_benefit
  AFTER INSERT OR UPDATE OF status ON public.user_benefits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_waitlist_on_active_benefit();
