-- =============================================================================
-- Birthday Gift IL - Atomic Owner Benefit Removal RPC
-- Allows owner to remove a benefit even when 'reserved' (accepted request),
-- automatically cancelling open pending/accepted requests & notifying buyers.
-- Blocks only if a request is already 'purchased' or 'disputed'.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.owner_delete_benefit(p_benefit_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefit public.user_benefits%ROWTYPE;
  v_req RECORD;
BEGIN
  SELECT * INTO v_benefit FROM public.user_benefits WHERE id = p_benefit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BENEFIT_NOT_FOUND';
  END IF;

  IF v_benefit.owner_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: Only the benefit owner can remove this benefit.';
  END IF;

  -- Block only if already purchased or in dispute
  IF EXISTS (
    SELECT 1 FROM public.purchase_requests
    WHERE benefit_id = p_benefit_id AND status IN ('purchased', 'disputed')
  ) THEN
    RAISE EXCEPTION 'PURCHASED_REQUEST_EXISTS: לא ניתן להסיר הטבה שכבר סומנה כנרכשה או נמצאת במחלוקת.';
  END IF;

  -- Auto-cancel any pending / info_requested / accepted requests and notify their buyers
  FOR v_req IN
    SELECT id, buyer_id, status FROM public.purchase_requests
    WHERE benefit_id = p_benefit_id
      AND status IN ('pending', 'info_requested', 'accepted')
    FOR UPDATE
  LOOP
    UPDATE public.purchase_requests
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = v_req.id;

    INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
      VALUES (v_req.id, auth.uid(), v_req.status, 'cancelled', 'ההטבה הוסרה על ידי בעל ההטבה ולכן הבקשה בוטלה אוטומטית');

    INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_req.buyer_id,
        'request_cancelled',
        'הבקשה בוטלה — ההטבה הוסרה',
        'בעל ההטבה הסיר את ההטבה שפרסם ולכן הבקשה בוטלה אוטומטית.',
        '/requests/view?id=' || v_req.id
      );
  END LOOP;

  -- Soft-delete the benefit
  UPDATE public.user_benefits
    SET status = 'hidden',
        deleted_at = NOW(),
        last_status_change_at = NOW(),
        updated_at = NOW()
    WHERE id = p_benefit_id;

  RETURN jsonb_build_object('ok', TRUE, 'benefit_id', p_benefit_id);
END;
$$;
