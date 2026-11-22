-- =============================================================================
-- Birthday Gift IL - Server-Side State Machine RPC + pg_cron Activation
-- Ensures 100% server-side enforcement inside PostgreSQL (works on Vercel & Static hosting)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.transition_purchase_request(
  p_request_id UUID,
  p_to_status public.request_status,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.purchase_requests%ROWTYPE;
  v_benefit public.user_benefits%ROWTYPE;
  v_actor TEXT;
  v_is_admin BOOLEAN;
  v_today_il DATE := (NOW() AT TIME ZONE 'Asia/Jerusalem')::DATE;
  v_new_benefit_status public.benefit_status := NULL;
BEGIN
  -- Accept delegates to the atomic accept RPC (handles locking & auto-declining competitors)
  IF p_to_status = 'accepted' THEN
    RETURN public.accept_purchase_request(p_request_id);
  END IF;

  SELECT * INTO v_req FROM public.purchase_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin');

  IF v_is_admin AND p_to_status IN ('resolved_completed', 'resolved_cancelled') THEN
    v_actor := 'admin';
  ELSIF v_req.benefit_owner_id = auth.uid() THEN
    v_actor := 'owner';
  ELSIF v_req.buyer_id = auth.uid() THEN
    v_actor := 'buyer';
  ELSIF v_is_admin THEN
    v_actor := 'admin';
  ELSE
    RAISE EXCEPTION 'FORBIDDEN: Not a party to this request.';
  END IF;

  -- Enforce strict state graph & role permissions (Spec v2 Section 5)
  IF p_to_status = 'declined' THEN
    IF v_req.status NOT IN ('pending', 'info_requested') OR v_actor <> 'owner' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
  ELSIF p_to_status = 'info_requested' THEN
    IF v_req.status <> 'pending' OR v_actor <> 'owner' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
  ELSIF p_to_status = 'pending' THEN
    IF v_req.status <> 'info_requested' OR v_actor <> 'buyer' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
  ELSIF p_to_status = 'purchased' THEN
    IF v_req.status <> 'accepted' OR v_actor <> 'owner' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
  ELSIF p_to_status = 'completed' THEN
    -- Spec v2 Section 5.3.7: ONLY buyer can confirm receipt
    IF v_req.status <> 'purchased' OR v_actor <> 'buyer' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Only buyer can confirm receipt.';
    END IF;
    v_new_benefit_status := 'redeemed';
  ELSIF p_to_status = 'cancelled' THEN
    IF v_req.status NOT IN ('pending', 'info_requested', 'accepted') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Cannot cancel after purchase; open a dispute.';
    END IF;
    IF v_req.status = 'accepted' THEN
      SELECT * INTO v_benefit FROM public.user_benefits WHERE id = v_req.benefit_id FOR UPDATE;
      IF v_benefit.window_end_date >= v_today_il THEN
        v_new_benefit_status := 'active';
      ELSE
        v_new_benefit_status := 'expired';
      END IF;
    END IF;
  ELSIF p_to_status = 'disputed' THEN
    IF v_req.status <> 'purchased' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION';
    END IF;
    INSERT INTO public.disputes (request_id, opened_by, reason)
      VALUES (p_request_id, auth.uid(), COALESCE(NULLIF(trim(p_note), ''), 'נפתחה מחלוקת על ידי צד בעסקה'))
      ON CONFLICT (request_id) DO NOTHING;
  ELSIF p_to_status IN ('resolved_completed', 'resolved_cancelled') THEN
    IF v_req.status <> 'disputed' OR v_actor <> 'admin' THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Admin only.';
    END IF;
    IF p_to_status = 'resolved_completed' THEN
      v_new_benefit_status := 'redeemed';
    END IF;
    UPDATE public.disputes
      SET status = p_to_status::TEXT,
          outcome_note = p_note,
          assigned_admin_id = auth.uid(),
          closed_at = NOW()
      WHERE request_id = p_request_id;
  ELSE
    RAISE EXCEPTION 'INVALID_TRANSITION';
  END IF;

  -- Apply request update
  UPDATE public.purchase_requests
    SET status = p_to_status,
        purchased_at = CASE WHEN p_to_status = 'purchased' THEN NOW() ELSE purchased_at END,
        completed_at = CASE WHEN p_to_status IN ('completed', 'resolved_completed') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = p_request_id;

  -- Apply benefit side-effect if any
  IF v_new_benefit_status IS NOT NULL THEN
    UPDATE public.user_benefits
      SET status = v_new_benefit_status,
          last_status_change_at = NOW(),
          updated_at = NOW()
      WHERE id = v_req.benefit_id;
  END IF;

  -- Grant verified status after completed transaction (Section 7.3)
  IF p_to_status = 'completed' THEN
    UPDATE public.transactions
      SET buyer_received_confirmed_at = NOW(),
          benefit_redeemed_at = NOW(),
          updated_at = NOW()
      WHERE request_id = p_request_id;

    UPDATE public.users
      SET completed_transactions_count = completed_transactions_count + 1,
          is_verified_member = TRUE,
          updated_at = NOW()
      WHERE id IN (v_req.buyer_id, v_req.benefit_owner_id);
  ELSIF p_to_status = 'purchased' THEN
    UPDATE public.transactions
      SET owner_purchase_confirmed_at = NOW(),
          updated_at = NOW()
      WHERE request_id = p_request_id;
  END IF;

  -- Append audit event
  INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
    VALUES (p_request_id, auth.uid(), v_req.status, p_to_status, p_note);

  -- Notify the other party
  INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      CASE WHEN auth.uid() = v_req.buyer_id THEN v_req.benefit_owner_id ELSE v_req.buyer_id END,
      'request_' || p_to_status::TEXT,
      'עדכון סטטוס בבקשה',
      COALESCE(NULLIF(trim(p_note), ''), 'סטטוס הבקשה עודכן.'),
      '/requests/' || p_request_id
    );

  RETURN jsonb_build_object('ok', TRUE, 'status', p_to_status);
END;
$$;

-- Enable pg_cron (if available on project) and schedule hourly maintenance directly inside Supabase
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule('birthday-gift-hourly-maintenance')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'birthday-gift-hourly-maintenance');
  PERFORM cron.schedule(
    'birthday-gift-hourly-maintenance',
    '0 * * * *',
    'SELECT public.run_scheduled_maintenance();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron scheduling skipped: %', SQLERRM;
END $$;
