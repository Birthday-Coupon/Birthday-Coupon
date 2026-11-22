export type AccountStatus =
  | "pending_verification"
  | "active"
  | "suspended"
  | "blocked"
  | "deleted";

export type AppRole = "user" | "content_manager" | "admin";

export type LegalityStatus =
  | "allowed"
  | "conditional"
  | "prohibited"
  | "unverified";

export type BenefitDiscountType =
  | "percentage"
  | "fixed_amount"
  | "gift"
  | "tiered";

export type EligibilityWindowType =
  | "day"
  | "week"
  | "month"
  | "days_around"
  | "custom_range";

export type BenefitStatus =
  | "pending_verification"
  | "active"
  | "reserved"
  | "redeemed"
  | "expired"
  | "hidden"
  | "removed";

export type RequestStatus =
  | "pending"
  | "info_requested"
  | "accepted"
  | "purchased"
  | "completed"
  | "disputed"
  | "resolved_completed"
  | "resolved_cancelled"
  | "declined"
  | "cancelled"
  | "expired";

export type ReportCategory =
  | "agreement_breach"
  | "fraud"
  | "harassment"
  | "offensive_content"
  | "other";

export interface Category {
  id: string;
  slug: string;
  name_he: string;
  icon: string;
  sort_order: number;
}

export interface Store {
  id: string;
  slug: string;
  name: string;
  name_he: string;
  category_id: string;
  category_slug?: string;
  category_name_he?: string;
  website_url: string;
  logo_source?: string | null;
  logo_usage_approved: boolean;
  benefit_summary: string;
  benefit_type: BenefitDiscountType;
  discount_value: string;
  min_order_agorot: number;
  max_order_agorot: number | null;
  currency: string;
  default_window_type: EligibilityWindowType;
  default_window_days_before: number;
  default_window_days_after: number;
  club_name: string | null;
  club_fee_info: string;
  redemption_method: string;
  is_online_eligible: boolean;
  is_one_time_per_member: boolean;
  valid_on_sale: boolean | null;
  requires_matching_recipient_name: boolean;
  shipping_countries: string[];
  purchase_limits: string | null;
  legality_status: LegalityStatus;
  legality_conditions: string | null;
  terms_url: string | null;
  terms_snapshot_url?: string | null;
  terms_quoted_clause: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  takedown_requested: boolean;
  affiliate_network: string | null;
  affiliate_commission: string | null;
  suitability_rank: number | null;
  active_benefits_count?: number;
}

export interface PublicUser {
  id: string;
  display_name: string;
  birth_month: number;
  account_status: AccountStatus;
  profile_visibility: "nickname_only" | "hidden";
  safety_acknowledged_at: string | null;
  completed_transactions_count: number;
  is_verified_member: boolean;
  roles: AppRole[];
  created_at: string;
}

export interface UserBenefit {
  id: string;
  owner_id: string;
  owner_display_name: string;
  owner_birth_month: number;
  owner_is_verified: boolean;
  store_id: string;
  store_slug: string;
  store_name_he: string;
  discount_value: string;
  status: BenefitStatus;
  window_type: EligibilityWindowType;
  window_days_before: number;
  window_days_after: number;
  window_start_date: string; // YYYY-MM-DD
  window_end_date: string;   // YYYY-MM-DD
  notes: string | null;
  self_declared_at: string;
  is_verified: boolean;
  pending_requests_count?: number;
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  benefit_id: string;
  store_id: string;
  store_slug: string;
  store_name_he: string;
  buyer_id: string;
  buyer_display_name: string;
  benefit_owner_id: string;
  owner_display_name: string;
  status: RequestStatus;
  product_name: string;
  product_url: string;
  estimated_price_agorot: number | null;
  currency: string;
  compensation_type: "free_help" | "symbolic_thanks";
  compensation_note: string | null;
  buyer_notes: string | null;
  owner_mutual_phone_consent: boolean;
  buyer_mutual_phone_consent: boolean;
  read_at: string | null;
  expires_at: string;
  accepted_at: string | null;
  purchased_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  actor_id: string | null;
  actor_name: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  contained_contact_warning: boolean;
  reported: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface StoreTermsReview {
  id: string;
  store_id: string;
  reviewer_name: string;
  legality_status: LegalityStatus;
  quoted_clause: string;
  source_url: string | null;
  notes: string | null;
  reviewed_at: string;
}

export interface TakedownRequest {
  id: string;
  store_id: string | null;
  store_name_submitted: string;
  contact_name: string;
  contact_email: string;
  contact_role: string;
  request_type: "takedown" | "correction";
  details: string;
  status: "open" | "in_progress" | "completed";
  created_at: string;
}

export interface AdminLog {
  id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DisputeItem {
  id: string;
  request_id: string;
  store_name_he: string;
  product_name: string;
  opened_by_name: string;
  reason: string;
  status: "open" | "collecting_versions" | "resolved_completed" | "resolved_cancelled";
  outcome_note: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface SystemBanner {
  id: string;
  message: string;
  severity: "info" | "warning" | "urgent";
  is_active: boolean;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  user_id: string | null;
  sender_name: string;
  category: "general" | "bug" | "account" | "safety" | "other";
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface StoreSuggestion {
  id: string;
  user_id: string | null;
  submitter_name: string;
  store_name: string;
  website_url: string;
  benefit_details: string;
  terms_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}
