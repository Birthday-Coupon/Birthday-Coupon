import type { BenefitStatus, RequestStatus } from "@/lib/types";

export type ActorRoleInRequest = "buyer" | "owner" | "admin" | "system";

export const MAX_CONCURRENT_PENDING_REQUESTS = 3;
export const NEW_ACCOUNT_COOLING_MINUTES = 10;
export const PENDING_EXPIRY_HOURS = 72;
export const ACCEPTED_EXPIRY_DAYS = 7;
export const PURCHASED_DISPUTE_DAYS = 14;
export const CHAT_RETENTION_AFTER_COMPLETION_DAYS = 30;

/**
 * Valid Request State Machine transitions (Spec v2 Section 5.2 & 5.3)
 */
export const REQUEST_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  pending: ["accepted", "declined", "info_requested", "cancelled", "expired"],
  info_requested: ["pending", "accepted", "declined", "cancelled", "expired"],
  accepted: ["purchased", "cancelled", "expired"],
  purchased: ["completed", "disputed"], // NO cancellation after purchased; NO auto-completion!
  completed: [],
  disputed: ["resolved_completed", "resolved_cancelled"], // Admin only
  resolved_completed: [],
  resolved_cancelled: [],
  declined: [],
  cancelled: [],
  expired: [],
};

export const TERMINAL_REQUEST_STATUSES: ReadonlySet<RequestStatus> = new Set([
  "completed",
  "resolved_completed",
  "resolved_cancelled",
  "declined",
  "cancelled",
  "expired",
]);

export const ACTIVE_LOCKING_REQUEST_STATUSES: ReadonlySet<RequestStatus> = new Set([
  "accepted",
  "purchased",
  "disputed",
]);

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
  resultingBenefitStatus?: BenefitStatus;
  autoDeclineOtherPending?: boolean;
}

/**
 * Validates a request state transition strictly by status graph and actor role.
 */
export function validateRequestTransition(params: {
  from: RequestStatus;
  to: RequestStatus;
  actor: ActorRoleInRequest;
  benefitWindowStillOpen?: boolean;
}): TransitionCheckResult {
  const { from, to, actor, benefitWindowStillOpen = true } = params;

  if (!REQUEST_TRANSITIONS[from].includes(to)) {
    return {
      allowed: false,
      reason: `מעבר סטטוס לא חוקי מ-${from} אל ${to}`,
    };
  }

  // Role enforcement per Spec v2 Section 5.2 & 5.3
  switch (to) {
    case "accepted":
    case "declined":
    case "info_requested":
      if (actor !== "owner" && actor !== "system") {
        return { allowed: false, reason: "רק בעל ההטבה רשאי לאשר, לדחות או לבקש פרטים." };
      }
      break;
    case "pending":
      if (from === "info_requested" && actor !== "buyer") {
        return { allowed: false, reason: "רק הקונה רשאי להשלים פרטים ולהחזיר להמתנה." };
      }
      break;
    case "purchased":
      if (actor !== "owner") {
        return { allowed: false, reason: "רק בעל ההטבה רשאי לסמן שהרכישה בוצעה." };
      }
      break;
    case "completed":
      // CRITICAL: Spec v2 Section 5.3.7 — NEVER auto-complete without buyer confirmation!
      if (actor !== "buyer") {
        return {
          allowed: false,
          reason: "אין השלמה אוטומטית — רק הקונה רשאי לאשר קבלת מוצר ולהשלים את העסקה.",
        };
      }
      break;
    case "cancelled":
      if (from === "purchased") {
        return { allowed: false, reason: "לאחר סימון רכישה לא ניתן לבטל — יש לפתוח מחלוקת." };
      }
      if (actor !== "buyer" && actor !== "owner" && actor !== "admin" && actor !== "system") {
        return { allowed: false, reason: "אין הרשאה לביטול הבקשה." };
      }
      break;
    case "disputed":
      if (actor !== "buyer" && actor !== "owner" && actor !== "system") {
        return { allowed: false, reason: "רק צד לעסקה או המערכת (לאחר 14 יום) רשאים לפתוח מחלוקת." };
      }
      break;
    case "resolved_completed":
    case "resolved_cancelled":
      if (actor !== "admin") {
        return { allowed: false, reason: "רק מנהל רשאי לסגור מחלוקת." };
      }
      break;
    case "expired":
      if (actor !== "system") {
        return { allowed: false, reason: "פקיעת תוקף מבוצעת על ידי המערכת בלבד." };
      }
      break;
  }

  // Side effects on Benefit status
  if (to === "accepted") {
    return {
      allowed: true,
      resultingBenefitStatus: "reserved",
      autoDeclineOtherPending: true,
    };
  }

  if (to === "completed" || to === "resolved_completed") {
    return {
      allowed: true,
      resultingBenefitStatus: "redeemed",
    };
  }

  if ((to === "cancelled" || to === "expired" || to === "resolved_cancelled") && from === "accepted") {
    return {
      allowed: true,
      resultingBenefitStatus: benefitWindowStillOpen ? "active" : "expired",
    };
  }

  return { allowed: true };
}

/**
 * Checks whether a new pending request can be submitted for a benefit.
 */
export function canCreatePendingRequest(params: {
  benefitStatus: BenefitStatus;
  existingPendingCount: number;
  buyerId: string;
  ownerId: string;
  accountAgeHours: number;
  skipCoolingForDemo?: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.buyerId === params.ownerId) {
    return { allowed: false, reason: "לא ניתן לשלוח בקשה להטבה של עצמך." };
  }
  if (params.benefitStatus !== "active") {
    return { allowed: false, reason: "ההטבה אינה פעילה כרגע לבקשות חדשות." };
  }
  if (params.existingPendingCount >= MAX_CONCURRENT_PENDING_REQUESTS) {
    return {
      allowed: false,
      reason: `להטבה זו קיימות כבר ${MAX_CONCURRENT_PENDING_REQUESTS} בקשות ממתינות בו-זמנית.`,
    };
  }
  if (!params.skipCoolingForDemo && params.accountAgeHours * 60 < NEW_ACCOUNT_COOLING_MINUTES) {
    return {
      allowed: false,
      reason: "מטעמי בטיחות, חשבונות חדשים יכולים לשלוח בקשה ראשונה לאחר 10 דקות מההרשמה.",
    };
  }
  return { allowed: true };
}

/**
 * Checks if chat is open for a request (Spec v2 Section 9: unlocked after accepted, closed 30d after completion)
 */
export function isRequestChatOpen(params: {
  status: RequestStatus;
  completedAt: string | null;
  now?: Date;
}): { open: boolean; reason?: string } {
  const { status, completedAt, now = new Date() } = params;
  if (status === "pending" || status === "info_requested" || status === "declined" || status === "cancelled" || status === "expired") {
    return { open: false, reason: "הצ׳אט הפנימי נפתח רק לאחר שבעל ההטבה מאשר את הבקשה." };
  }
  if ((status === "completed" || status === "resolved_completed" || status === "resolved_cancelled") && completedAt) {
    const closedAt = new Date(completedAt).getTime() + CHAT_RETENTION_AFTER_COMPLETION_DAYS * 86_400_000;
    if (now.getTime() > closedAt) {
      return { open: false, reason: "הצ׳אט נסגר לאחר 30 ימים מהשלמת העסקה." };
    }
  }
  return { open: true };
}

/**
 * Checks whether a user can delete their account (Scenario 20)
 */
export function canDeleteAccount(activeRequestStatuses: RequestStatus[]): {
  allowed: boolean;
  reason?: string;
} {
  const hasBlocking = activeRequestStatuses.some((s) => ACTIVE_LOCKING_REQUEST_STATUSES.has(s));
  if (hasBlocking) {
    return {
      allowed: false,
      reason: "לא ניתן למחוק את החשבון כל עוד קיימת בקשה פעילה או מחלוקת פתוחה.",
    };
  }
  return { allowed: true };
}

/**
 * Checks whether an owner can hide/pause their benefit (Section 2.7)
 */
export function canOwnerHideBenefit(status: BenefitStatus): boolean {
  return status === "active" || status === "pending_verification";
}
