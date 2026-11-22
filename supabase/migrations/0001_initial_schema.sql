-- =============================================================================
-- Birthday Gift IL (מתנת יום הולדת) - Core PostgreSQL & Supabase Schema
-- Aligned with Product Spec v2 (Sections 3, 4, 5, 6, 7, 9, 10, 13, 14, 15)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE public.account_status AS ENUM (
  'pending_verification',
  'active',
  'suspended',
  'blocked',
  'deleted'
);

CREATE TYPE public.app_role AS ENUM (
  'user',
  'content_manager',
  'admin'
);

CREATE TYPE public.legality_status AS ENUM (
  'allowed',
  'conditional',
  'prohibited',
  'unverified'
);

CREATE TYPE public.benefit_discount_type AS ENUM (
  'percentage',
  'fixed_amount',
  'gift',
  'tiered'
);

CREATE TYPE public.eligibility_window_type AS ENUM (
  'day',
  'week',
  'month',
  'days_around',
  'custom_range'
);

CREATE TYPE public.benefit_status AS ENUM (
  'pending_verification',
  'active',
  'reserved',
  'redeemed',
  'expired',
  'hidden',
  'removed'
);

CREATE TYPE public.request_status AS ENUM (
  'pending',
  'info_requested',
  'accepted',
  'purchased',
  'completed',
  'disputed',
  'resolved_completed',
  'resolved_cancelled',
  'declined',
  'cancelled',
  'expired'
);

CREATE TYPE public.report_category AS ENUM (
  'agreement_breach',
  'fraud',
  'harassment',
  'offensive_content',
  'other'
);

CREATE TYPE public.report_status AS ENUM (
  'open',
  'in_review',
  'resolved',
  'dismissed'
);

CREATE TYPE public.notification_channel AS ENUM (
  'in_app',
  'email'
);

CREATE TYPE public.delivery_status AS ENUM (
  'pending',
  'sent',
  'failed'
);

-- =============================================================================
-- 2. CORE USER & PRIVACY TABLES (Section 4 & 14)
--    Notice: NO email and NO full birth_date in public.users!
-- =============================================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 40),
  birth_month SMALLINT NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  account_status public.account_status NOT NULL DEFAULT 'pending_verification',
  profile_visibility TEXT NOT NULL DEFAULT 'nickname_only' CHECK (profile_visibility IN ('nickname_only', 'hidden')),
  safety_acknowledged_at TIMESTAMPTZ,
  completed_transactions_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_transactions_count >= 0),
  is_verified_member BOOLEAN NOT NULL DEFAULT FALSE,
  internal_trust_score INTEGER NOT NULL DEFAULT 50 CHECK (internal_trust_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Private user table: strictly owner + service_role only (full DOB, phone, marketing)
CREATE TABLE public.user_private (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL CHECK (birth_date <= (CURRENT_DATE - INTERVAL '18 years')),
  phone TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Separated roles table (never store role column directly on public.users)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  granted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Consent log (Amendment 13 / Privacy compliance)
CREATE TABLE public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'terms_of_service',
    'privacy_policy',
    'age_18_confirmation',
    'birth_month_display',
    'marketing_emails',
    'safety_acknowledgment',
    'store_terms_acknowledgment'
  )),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocked users (user-to-user blocking)
CREATE TABLE public.blocked_users (
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- =============================================================================
-- 3. STORES & LEGALITY GATE TABLES (Section 3 & 7)
-- =============================================================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_he TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'gift',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_he TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  website_url TEXT NOT NULL,
  logo_source TEXT,
  logo_usage_approved BOOLEAN NOT NULL DEFAULT FALSE,
  benefit_summary TEXT NOT NULL,
  benefit_type public.benefit_discount_type NOT NULL,
  discount_value TEXT NOT NULL,
  min_order_agorot INTEGER DEFAULT 0 CHECK (min_order_agorot >= 0),
  max_order_agorot INTEGER CHECK (max_order_agorot IS NULL OR max_order_agorot >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  default_window_type public.eligibility_window_type NOT NULL DEFAULT 'month',
  default_window_days_before SMALLINT NOT NULL DEFAULT 0,
  default_window_days_after SMALLINT NOT NULL DEFAULT 0,
  club_name TEXT,
  club_fee_info TEXT NOT NULL DEFAULT 'חינם',
  redemption_method TEXT NOT NULL,
  is_online_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  is_one_time_per_member BOOLEAN NOT NULL DEFAULT TRUE,
  valid_on_sale BOOLEAN,
  requires_matching_recipient_name BOOLEAN NOT NULL DEFAULT FALSE,
  shipping_countries TEXT[] NOT NULL DEFAULT ARRAY['IL'],
  purchase_limits TEXT,
  legality_status public.legality_status NOT NULL DEFAULT 'unverified',
  legality_conditions TEXT,
  terms_url TEXT,
  terms_snapshot_url TEXT,
  terms_quoted_clause TEXT,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  takedown_requested BOOLEAN NOT NULL DEFAULT FALSE,
  takedown_requested_at TIMESTAMPTZ,
  affiliate_network TEXT,
  affiliate_commission TEXT,
  suitability_rank SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.store_terms_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.users(id),
  legality_status public.legality_status NOT NULL,
  quoted_clause TEXT NOT NULL,
  source_url TEXT,
  notes TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.store_takedown_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  store_name_submitted TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_role TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('takedown', 'correction')),
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  handled_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- =============================================================================
-- 4. USER BENEFITS & PURCHASE REQUESTS (Section 5, 6, 7)
-- =============================================================================

CREATE TABLE public.user_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status public.benefit_status NOT NULL DEFAULT 'active',
  window_type public.eligibility_window_type NOT NULL DEFAULT 'month',
  window_days_before SMALLINT NOT NULL DEFAULT 0,
  window_days_after SMALLINT NOT NULL DEFAULT 0,
  window_start_date DATE NOT NULL,
  window_end_date DATE NOT NULL,
  notes TEXT CHECK (char_length(notes) <= 500),
  self_declared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  expiry_warning_sent_at TIMESTAMPTZ,
  last_status_change_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (window_end_date >= window_start_date)
);

CREATE TABLE public.purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id UUID NOT NULL REFERENCES public.user_benefits(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  benefit_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  product_name TEXT NOT NULL CHECK (char_length(trim(product_name)) BETWEEN 2 AND 150),
  product_url TEXT NOT NULL,
  estimated_price_agorot INTEGER CHECK (estimated_price_agorot IS NULL OR estimated_price_agorot >= 0),
  currency TEXT NOT NULL DEFAULT 'ILS',
  compensation_type TEXT NOT NULL DEFAULT 'free_help' CHECK (compensation_type IN ('free_help', 'symbolic_thanks')),
  compensation_note TEXT CHECK (char_length(compensation_note) <= 200),
  buyer_notes TEXT CHECK (char_length(buyer_notes) <= 500),
  owner_mutual_phone_consent BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_mutual_phone_consent BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  expiry_warning_sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reminder_day3_sent_at TIMESTAMPTZ,
  reminder_day7_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (buyer_id <> benefit_owner_id)
);

-- Critical concurrency guard: ONLY ONE active (accepted/purchased) request per benefit
CREATE UNIQUE INDEX idx_unique_active_request_per_benefit
  ON public.purchase_requests (benefit_id)
  WHERE status IN ('accepted', 'purchased');

CREATE TABLE public.request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id),
  from_status public.request_status,
  to_status public.request_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  owner_purchase_confirmed_at TIMESTAMPTZ,
  buyer_received_confirmed_at TIMESTAMPTZ,
  benefit_redeemed_at TIMESTAMPTZ,
  dispute_status TEXT CHECK (dispute_status IN ('none', 'open', 'resolved_completed', 'resolved_cancelled')) NOT NULL DEFAULT 'none',
  dispute_opened_by UUID REFERENCES public.users(id),
  dispute_reason TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 5. MESSAGING, NOTIFICATIONS, WAITLIST, MODERATION (Sections 8, 9, 10, 12, 13)
-- =============================================================================

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 2000),
  contained_contact_warning BOOLEAN NOT NULL DEFAULT FALSE,
  reported BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  channel public.notification_channel NOT NULL DEFAULT 'in_app',
  delivery_status public.delivery_status NOT NULL DEFAULT 'sent',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.notification_preferences (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, type)
);

CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, store_id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  request_id UUID REFERENCES public.purchase_requests(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  category public.report_category NOT NULL,
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 5 AND 2000),
  status public.report_status NOT NULL DEFAULT 'open',
  assigned_admin_id UUID REFERENCES public.users(id),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES public.users(id),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'collecting_versions', 'resolved_completed', 'resolved_cancelled')),
  assigned_admin_id UUID REFERENCES public.users(id),
  outcome_note TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.system_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'urgent')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  ip_hash TEXT,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 6. PERFORMANCE INDEXES (Section 15)
-- =============================================================================

CREATE INDEX idx_benefits_store_status_window
  ON public.user_benefits (store_id, status, window_start_date, window_end_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_requests_buyer ON public.purchase_requests (buyer_id, created_at DESC);
CREATE INDEX idx_requests_owner ON public.purchase_requests (benefit_owner_id, created_at DESC);
CREATE INDEX idx_requests_expiry ON public.purchase_requests (status, expires_at);
CREATE INDEX idx_request_events_req ON public.request_events (request_id, created_at ASC);
CREATE INDEX idx_messages_req_created ON public.messages (request_id, created_at ASC);
CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, read_at, created_at DESC);
CREATE INDEX idx_waitlist_store ON public.waitlist (store_id);
CREATE INDEX idx_stores_legality ON public.stores (legality_status, takedown_requested) WHERE deleted_at IS NULL;

-- =============================================================================
-- 7. HELPER FUNCTIONS & TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.has_role(check_user_id UUID, check_role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = check_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role IN ('admin', 'content_manager')
  );
$$;

-- Enforce max 3 pending requests per benefit & legality gate on insert
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

  -- 4. Check 24-hour cooling period for brand new accounts (Section 10.2)
  SELECT created_at INTO v_buyer_created FROM public.users WHERE id = NEW.buyer_id;
  IF v_buyer_created > (NOW() - INTERVAL '24 hours') THEN
    RAISE EXCEPTION 'ACCOUNT_TOO_NEW: New accounts must wait 24 hours before sending their first request.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_purchase_request_insert
  BEFORE INSERT ON public.purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_purchase_request_insert();

-- Atomic RPC: Accept a request, reserve benefit, auto-decline competing pending requests
CREATE OR REPLACE FUNCTION public.accept_purchase_request(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.purchase_requests%ROWTYPE;
  v_other RECORD;
BEGIN
  -- Lock the request row
  SELECT * INTO v_req FROM public.purchase_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  IF v_req.benefit_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN: Only the benefit owner can accept this request.';
  END IF;

  IF v_req.status NOT IN ('pending', 'info_requested') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot accept request in status %', v_req.status;
  END IF;

  -- Lock the benefit row to prevent race conditions
  PERFORM 1 FROM public.user_benefits WHERE id = v_req.benefit_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BENEFIT_UNAVAILABLE: Benefit is no longer active.';
  END IF;

  -- Accept chosen request (7 days to purchase)
  UPDATE public.purchase_requests
    SET status = 'accepted',
        accepted_at = NOW(),
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
    WHERE id = p_request_id;

  -- Reserve the benefit
  UPDATE public.user_benefits
    SET status = 'reserved',
        last_status_change_at = NOW(),
        updated_at = NOW()
    WHERE id = v_req.benefit_id;

  -- Create transaction record
  INSERT INTO public.transactions (request_id) VALUES (p_request_id)
    ON CONFLICT (request_id) DO NOTHING;

  -- Log event
  INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
    VALUES (p_request_id, auth.uid(), v_req.status, 'accepted', 'הבעלים אישר את הבקשה');

  -- Auto-decline competing pending requests and notify their buyers
  FOR v_other IN
    SELECT id, buyer_id, status FROM public.purchase_requests
    WHERE benefit_id = v_req.benefit_id
      AND id <> p_request_id
      AND status IN ('pending', 'info_requested')
    FOR UPDATE
  LOOP
    UPDATE public.purchase_requests
      SET status = 'declined', updated_at = NOW()
      WHERE id = v_other.id;

    INSERT INTO public.request_events (request_id, actor_id, from_status, to_status, note)
      VALUES (v_other.id, NULL, v_other.status, 'declined', 'בקשה אחרת על אותה הטבה אושרה');

    INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        v_other.buyer_id,
        'request_auto_declined',
        'הטבה נתפסה על ידי בקשה אחרת',
        'בקשה אחרת על אותה הטבה אושרה. ניתן להצטרף לרשימת ההמתנה לחנות.',
        '/requests/' || v_other.id
      );
  END LOOP;

  -- Notify accepted buyer
  INSERT INTO public.notifications (user_id, type, title, body, link)
    VALUES (
      v_req.buyer_id,
      'request_accepted',
      'הבקשה שלך אושרה!',
      'בעל ההטבה אישר את הבקשה שלך. כעת נפתח צ׳אט פנימי לתיאום.',
      '/requests/' || p_request_id
    );

  RETURN jsonb_build_object('status', 'accepted', 'request_id', p_request_id);
END;
$$;

-- Block account deletion if user has active requests (Section 18 Scenario 20)
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_active_count
    FROM public.purchase_requests
    WHERE (buyer_id = auth.uid() OR benefit_owner_id = auth.uid())
      AND status IN ('accepted', 'purchased', 'disputed');

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'ACTIVE_REQUESTS_EXIST: Cannot delete account while active requests exist.';
  END IF;

  UPDATE public.users
    SET account_status = 'deleted',
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = auth.uid();

  UPDATE public.user_benefits
    SET status = 'hidden',
        deleted_at = NOW(),
        updated_at = NOW()
    WHERE owner_id = auth.uid() AND status = 'active';

  RETURN jsonb_build_object('deleted', TRUE);
END;
$$;

-- =============================================================================
-- 8. ROW LEVEL SECURITY (RLS) ON EVERY TABLE (Section 14.3)
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_terms_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_takedown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- public.users: everyone can read non-deleted public nicknames/birth_month; only self updates
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT USING (deleted_at IS NULL OR id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "users_self_insert" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- public.user_private: STRICTLY owner only (service_role bypasses RLS when needed with audit)
CREATE POLICY "user_private_owner_only" ON public.user_private
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- public.user_roles: read own roles or admins; only admins manage roles
CREATE POLICY "user_roles_read_own_or_admin" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- public.consent_log: owner read/insert, admin read
CREATE POLICY "consent_log_owner_read" ON public.consent_log
  FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "consent_log_owner_insert" ON public.consent_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- public.blocked_users: blocker manages own blocks
CREATE POLICY "blocked_users_owner" ON public.blocked_users
  FOR ALL USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

-- categories & stores & reviews: public read; staff write
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (TRUE);
CREATE POLICY "categories_staff_write" ON public.categories
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "stores_public_read" ON public.stores
  FOR SELECT USING ((deleted_at IS NULL AND takedown_requested = FALSE) OR public.is_staff(auth.uid()));
CREATE POLICY "stores_staff_write" ON public.stores
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "store_reviews_public_read" ON public.store_terms_reviews FOR SELECT USING (TRUE);
CREATE POLICY "store_reviews_staff_write" ON public.store_terms_reviews
  FOR ALL USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- takedown requests: anyone can submit, only staff reads/updates
CREATE POLICY "takedown_public_insert" ON public.store_takedown_requests
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "takedown_staff_read_update" ON public.store_takedown_requests
  FOR SELECT USING (public.is_staff(auth.uid()));
CREATE POLICY "takedown_staff_update" ON public.store_takedown_requests
  FOR UPDATE USING (public.is_staff(auth.uid()));

-- user_benefits: active benefits in legal stores readable by all; owner sees all own
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
          AND s.legality_status IN ('allowed', 'conditional')
          AND s.takedown_requested = FALSE
      )
    )
  );
CREATE POLICY "benefits_owner_insert" ON public.user_benefits
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "benefits_owner_update" ON public.user_benefits
  FOR UPDATE USING (owner_id = auth.uid() OR public.is_staff(auth.uid()));

-- purchase_requests: ONLY buyer, owner, or admin
CREATE POLICY "requests_parties_read" ON public.purchase_requests
  FOR SELECT USING (
    buyer_id = auth.uid()
    OR benefit_owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "requests_buyer_insert" ON public.purchase_requests
  FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "requests_parties_update" ON public.purchase_requests
  FOR UPDATE USING (
    buyer_id = auth.uid()
    OR benefit_owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- request_events: ONLY parties to the request or admin
CREATE POLICY "request_events_parties_read" ON public.request_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = request_events.request_id
        AND (pr.buyer_id = auth.uid() OR pr.benefit_owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- transactions: ONLY parties to the request or admin
CREATE POLICY "transactions_parties_read" ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = transactions.request_id
        AND (pr.buyer_id = auth.uid() OR pr.benefit_owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- messages: STRICTLY parties to the request (and only after accepted!) or admin
CREATE POLICY "messages_parties_read" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = messages.request_id
        AND (pr.buyer_id = auth.uid() OR pr.benefit_owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "messages_parties_insert" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = messages.request_id
        AND (pr.buyer_id = auth.uid() OR pr.benefit_owner_id = auth.uid())
        AND pr.status IN ('accepted', 'purchased', 'disputed', 'completed')
        AND (pr.completed_at IS NULL OR pr.completed_at > NOW() - INTERVAL '30 days')
    )
  );

-- notifications & preferences & waitlist: strictly owner
CREATE POLICY "notifications_owner" ON public.notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_prefs_owner" ON public.notification_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "waitlist_owner" ON public.waitlist
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- reports & disputes
CREATE POLICY "reports_reporter_or_admin" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "disputes_parties_or_admin" ON public.disputes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.purchase_requests pr
      WHERE pr.id = disputes.request_id
        AND (pr.buyer_id = auth.uid() OR pr.benefit_owner_id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "disputes_parties_insert" ON public.disputes
  FOR INSERT WITH CHECK (opened_by = auth.uid());
CREATE POLICY "disputes_admin_update" ON public.disputes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- system_banners: public read active; admin write
CREATE POLICY "banners_public_read" ON public.system_banners
  FOR SELECT USING (is_active = TRUE OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "banners_admin_write" ON public.system_banners
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_logs: admin read/insert only
CREATE POLICY "admin_logs_admin_only" ON public.admin_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
