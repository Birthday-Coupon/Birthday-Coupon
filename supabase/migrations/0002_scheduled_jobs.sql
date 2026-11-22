-- =============================================================================
-- Birthday Gift IL - Scheduled Maintenance Jobs (pg_cron / Edge / Vercel Cron)
-- Aligned with Spec v2 Sections 5.3, 6, 12, 17
-- =============================================================================

CREATE OR REPLACE FUNCTION public.run_scheduled_maintenance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_il DATE := (NOW() AT TIME ZONE 'Asia/Jerusalem')::DATE;
  v_expired_pending INTEGER := 0;
  v_expired_accepted INTEGER := 0;
  v_auto_disputes INTEGER := 0;
  v_expired_benefits INTEGER := 0;
  v_req RECORD;
BEGIN
  -- 1. Expire pending / info_requested requests past 72h
  FOR v_req IN
    SELECT id, buyer_id, status FROM public.purchase_requests
    WHERE status IN ('pending', 'info_requested') AND expires_at <= NOW()
  LOOP
    UPDATE public.purchase_requests SET status = 'expired', updated_at = NOW() WHERE id = v_req.id;
    INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
      VALUES (v_req.id, NULL, v_req.status, 'expired', 'פג תוקף הבקשה לאחר 72 שעות ללא תגובה');
    INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (v_req.buyer_id, 'request_expired', 'הבקשה שלך פגה', 'חלפו 72 שעות ללא תגובה מבעל ההטבה.', '/requests/' || v_req.id);
    v_expired_pending := v_expired_pending + 1;
  END LOOP;

  -- 2. Expire accepted requests past 7 days & release benefit if still inside eligibility window
  FOR v_req IN
    SELECT pr.id, pr.benefit_id, pr.buyer_id, pr.benefit_owner_id, ub.window_end_date
    FROM public.purchase_requests pr
    JOIN public.user_benefits ub ON ub.id = pr.benefit_id
    WHERE pr.status = 'accepted' AND pr.expires_at <= NOW()
  LOOP
    UPDATE public.purchase_requests SET status = 'expired', updated_at = NOW() WHERE id = v_req.id;
    INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
      VALUES (v_req.id, NULL, 'accepted', 'expired', 'פג תוקף בקשה מאושרת לאחר 7 ימים');

    -- Restore benefit to active if eligibility window hasn't ended yet, else mark expired
    UPDATE public.user_benefits
      SET status = CASE WHEN v_req.window_end_date >= v_today_il THEN 'active'::public.benefit_status ELSE 'expired'::public.benefit_status END,
          last_status_change_at = NOW(),
          updated_at = NOW()
      WHERE id = v_req.benefit_id AND status = 'reserved';

    v_expired_accepted := v_expired_accepted + 1;
  END LOOP;

  -- 3. Purchased requests without buyer confirmation after 14 days -> Auto-open admin dispute (NEVER auto-complete!)
  FOR v_req IN
    SELECT id, buyer_id, benefit_owner_id FROM public.purchase_requests
    WHERE status = 'purchased' AND purchased_at <= NOW() - INTERVAL '14 days'
  LOOP
    UPDATE public.purchase_requests SET status = 'disputed', updated_at = NOW() WHERE id = v_req.id;
    INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
      VALUES (v_req.id, NULL, 'purchased', 'disputed', 'נפתח בירור מנהל אוטומטי לאחר 14 ימים ללא אישור קבלה');
    INSERT INTO public.disputes (request_id, opened_by, reason)
      VALUES (v_req.id, v_req.benefit_owner_id, 'חלפו 14 ימים מסימון הרכישה ללא אישור קבלה מהקונה (בירור אוטומטי)')
      ON CONFLICT (request_id) DO NOTHING;
    v_auto_disputes := v_auto_disputes + 1;
  END LOOP;

  -- 4. Expire active benefits whose window ended (in Asia/Jerusalem)
  --    Note: reserved benefits with accepted requests continue up to 7 days (Section 5.3.4)
  UPDATE public.user_benefits
    SET status = 'expired', last_status_change_at = NOW(), updated_at = NOW()
    WHERE status = 'active' AND window_end_date < v_today_il;
  GET DIAGNOSTICS v_expired_benefits = ROW_COUNT;

  -- 5. Send 7-day expiry warning to owners of active benefits
  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT ub.owner_id,
         'benefit_expiring_soon',
         'חלון הזכאות שלך מסתיים בקרוב',
         'נותרו 7 ימים או פחות למימוש הטבת יום ההולדת שפרסמת.',
         '/dashboard'
  FROM public.user_benefits ub
  WHERE ub.status = 'active'
    AND ub.expiry_warning_sent_at IS NULL
    AND ub.window_end_date BETWEEN v_today_il AND (v_today_il + 7);

  UPDATE public.user_benefits
    SET expiry_warning_sent_at = NOW()
    WHERE status = 'active'
      AND expiry_warning_sent_at IS NULL
      AND window_end_date BETWEEN v_today_il AND (v_today_il + 7);

  RETURN jsonb_build_object(
    'ran_at', NOW(),
    'today_israel', v_today_il,
    'expired_pending', v_expired_pending,
    'expired_accepted', v_expired_accepted,
    'auto_disputes', v_auto_disputes,
    'expired_benefits', v_expired_benefits
  );
END;
$$;

-- Optional pg_cron setup (uncomment in Supabase SQL editor after enabling pg_cron extension):
-- SELECT cron.schedule('birthday-gift-hourly-maintenance', '0 * * * *', $$SELECT public.run_scheduled_maintenance();$$);
