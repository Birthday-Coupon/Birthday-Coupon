-- =============================================================================
-- Birthday Gift IL - Open Community Policy (User Responsibility Model)
-- Removes server-side blocking on store legality_status while keeping
-- takedown_requested protection and full transparency notices.
-- =============================================================================

-- 1. Update purchase_requests insert trigger: allow all non-takedown stores
CREATE OR REPLACE FUNCTION public.validate_purchase_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_takedown BOOLEAN;
  v_benefit_status public.benefit_status;
  v_pending_count INTEGER;
  v_buyer_created TIMESTAMPTZ;
BEGIN
  -- 1. Respect explicit store takedown requests only
  SELECT takedown_requested
    INTO v_takedown
    FROM public.stores WHERE id = NEW.store_id AND deleted_at IS NULL;

  IF v_takedown IS TRUE THEN
    RAISE EXCEPTION 'STORE_REMOVED: This store was removed at its request.';
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

-- 2. Update user_benefits RLS SELECT policy: active benefits visible on ALL non-takedown stores
DROP POLICY IF EXISTS "benefits_read_active_or_owner" ON public.user_benefits;
CREATE POLICY "benefits_read_active_or_owner" ON public.user_benefits
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_staff(auth.uid())
    OR (
      status = 'active'
      AND deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = user_benefits.store_id
          AND s.deleted_at IS NULL
          AND s.takedown_requested = FALSE
      )
    )
  );
