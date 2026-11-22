-- =============================================================================
-- Birthday Gift IL - Reduce new-account request cooling period to 10 minutes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_purchase_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_legality public.legality_status;
  v_takedown BOOLEAN;
  v_benefit_status public.benefit_status;
  v_pending_count INTEGER;
  v_buyer_created TIMESTAMPTZ;
BEGIN
  -- 1. Check store legality gate
  SELECT legality_status, takedown_requested
    INTO v_store_legality, v_takedown
    FROM public.stores WHERE id = NEW.store_id AND deleted_at IS NULL;

  IF v_takedown IS TRUE OR v_store_legality NOT IN ('allowed', 'conditional') THEN
    RAISE EXCEPTION 'STORE_NOT_ELIGIBLE: This store is not approved for purchase requests.';
  END IF;

  -- 2. Check benefit is active
  SELECT status INTO v_benefit_status
    FROM public.user_benefits WHERE id = NEW.benefit_id AND deleted_at IS NULL;

  IF v_benefit_status <> 'active' THEN
    RAISE EXCEPTION 'BENEFIT_NOT_ACTIVE: Benefit is not currently accepting requests.';
  END IF;

  -- 3. Check max 3 pending requests per benefit
  SELECT COUNT(*) INTO v_pending_count
    FROM public.purchase_requests
    WHERE benefit_id = NEW.benefit_id AND status IN ('pending', 'info_requested');

  IF v_pending_count >= 3 THEN
    RAISE EXCEPTION 'MAX_PENDING_REACHED: Maximum 3 concurrent pending requests per benefit.';
  END IF;

  -- 4. Check 10-minute cooling period for brand new accounts
  SELECT created_at INTO v_buyer_created FROM public.users WHERE id = NEW.buyer_id;
  IF v_buyer_created > (NOW() - INTERVAL '10 minutes') THEN
    RAISE EXCEPTION 'ACCOUNT_TOO_NEW: New accounts must wait 10 minutes before sending their first request.';
  END IF;

  RETURN NEW;
END;
$$;
