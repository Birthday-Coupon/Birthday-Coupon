import type { PublicUser, PurchaseRequest, Store, UserBenefit } from "@/lib/types";
import {
  daysUntilWindowEnd,
  isDateWithinWindow,
} from "@/lib/domain/eligibility-window";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";

export type UrgencyKey = "today" | "soon" | "week" | "later";

const URGENCY_ORDER: UrgencyKey[] = ["today", "soon", "week", "later"];

export const URGENCY_LABELS: Record<UrgencyKey, string> = {
  today: "נגמר היום או מחר",
  soon: "עד 3 ימים",
  week: "השבוע",
  later: "בהמשך",
};

function benefitUrgency(daysLeft: number): UrgencyKey {
  if (daysLeft <= 1) return "today";
  if (daysLeft <= 3) return "soon";
  if (daysLeft <= 7) return "week";
  return "later";
}

/** True when the benefit's eligibility window touches the user's birth month. */
function isBirthMonthRelevant(benefit: UserBenefit, birthMonth: number): boolean {
  const startMonth = Number(benefit.window_start_date.slice(5, 7));
  const endMonth = Number(benefit.window_end_date.slice(5, 7));
  return startMonth === birthMonth || endMonth === birthMonth;
}

export interface SelectAvailableOptions {
  currentUserId: string;
  birthMonth: number;
  watchedStoreIds: string[];
  todayIsrael: string;
  /** Optional per-store filter (watch settings: threshold / verified only). */
  isVisible?: (benefit: UserBenefit) => boolean;
}

/**
 * "אפשר לבקש עכשיו": active benefits inside their window, in a store that passes
 * the legality gate, ordered by personal relevance (birth month), then watched
 * stores, then the ones expiring soonest.
 */
export function selectAvailableNow(
  benefits: UserBenefit[],
  storesById: Map<string, Store>,
  options: SelectAvailableOptions
): UserBenefit[] {
  const watched = new Set(options.watchedStoreIds);
  return benefits
    .filter(
      (b) =>
        b.status === "active" &&
        b.owner_id !== options.currentUserId &&
        isDateWithinWindow(b.window_start_date, b.window_end_date, options.todayIsrael)
    )
    .filter((b) => {
      const store = storesById.get(b.store_id);
      return Boolean(store && evaluateStoreLegalityGate(store).canAcceptRequests);
    })
    .filter((b) => (options.isVisible ? options.isVisible(b) : true))
    .sort((a, b) => {
      const relevance =
        Number(isBirthMonthRelevant(b, options.birthMonth)) -
        Number(isBirthMonthRelevant(a, options.birthMonth));
      if (relevance !== 0) return relevance;

      const watching =
        Number(watched.has(b.store_id)) - Number(watched.has(a.store_id));
      if (watching !== 0) return watching;

      return (
        daysUntilWindowEnd(a.window_end_date, options.todayIsrael) -
        daysUntilWindowEnd(b.window_end_date, options.todayIsrael)
      );
    });
}

export interface UrgencyGroup {
  key: UrgencyKey;
  items: UserBenefit[];
}

/** Splits the available list into urgency buckets and keeps at most `limit` rows. */
export function groupAvailableByUrgency(
  benefits: UserBenefit[],
  todayIsrael: string,
  limit = 5
): { groups: UrgencyGroup[]; remaining: number } {
  const buckets: Record<UrgencyKey, UserBenefit[]> = {
    today: [],
    soon: [],
    week: [],
    later: [],
  };
  for (const benefit of benefits) {
    const daysLeft = Math.max(
      0,
      daysUntilWindowEnd(benefit.window_end_date, todayIsrael)
    );
    buckets[benefitUrgency(daysLeft)].push(benefit);
  }

  const groups: UrgencyGroup[] = [];
  let taken = 0;
  for (const key of URGENCY_ORDER) {
    const room = Math.max(0, limit - taken);
    if (room === 0) break;
    const items = buckets[key].slice(0, room);
    if (items.length === 0) continue;
    groups.push({ key, items });
    taken += items.length;
  }

  return { groups, remaining: Math.max(0, benefits.length - taken) };
}

export interface StoreWatchStatus {
  label: string;
  tone: "available" | "soon" | "quiet";
}

/**
 * Explains what is happening in a watched store, so an empty feed never looks
 * like the reminders are broken.
 */
export function getStoreWatchStatus(params: {
  store: Store;
  benefits: UserBenefit[];
  todayIsrael: string;
}): StoreWatchStatus {
  const { store, benefits, todayIsrael } = params;

  if (!evaluateStoreLegalityGate(store).canAcceptRequests) {
    return { label: "החנות אינה זמינה לבקשות כרגע", tone: "quiet" };
  }

  const storeBenefits = benefits.filter((b) => b.store_id === store.id);
  const live = storeBenefits.filter(
    (b) =>
      b.status === "active" &&
      isDateWithinWindow(b.window_start_date, b.window_end_date, todayIsrael)
  );
  if (live.length > 0) {
    return {
      label: `${live.length} ${live.length === 1 ? "הטבה זמינה" : "הטבות זמינות"} עכשיו`,
      tone: "available",
    };
  }

  const upcoming = storeBenefits
    .filter(
      (b) =>
        (b.status === "active" || b.status === "hidden" || b.status === "pending_verification") &&
        b.window_start_date > todayIsrael
    )
    .sort((a, b) => a.window_start_date.localeCompare(b.window_start_date))[0];

  if (upcoming) {
    const days = Math.max(0, daysUntilWindowEnd(upcoming.window_start_date, todayIsrael));
    return {
      label:
        days === 0
          ? "ההטבה הבאה נפתחת היום"
          : `ההטבה הבאה נפתחת בעוד ${days} ${days === 1 ? "יום" : "ימים"}`,
      tone: "soon",
    };
  }

  if (storeBenefits.length > 0) {
    return { label: "החלון הקודם נסגר — נעדכן כשתיפתח הטבה חדשה", tone: "quiet" };
  }

  return { label: "אין הטבות כרגע — נעדכן ברגע שתהיה", tone: "quiet" };
}

/**
 * Suggests a few stores to watch: ones the user already requested from first,
 * then the stores with the most live benefits.
 */
export function suggestWatchedStores(params: {
  stores: Store[];
  waitlistStoreIds: string[];
  requests: PurchaseRequest[];
  currentUserId: string;
  limit?: number;
}): Store[] {
  const { stores, waitlistStoreIds, requests, currentUserId, limit = 3 } = params;
  const watched = new Set(waitlistStoreIds);
  const requestedFrom = new Set(
    requests.filter((r) => r.buyer_id === currentUserId).map((r) => r.store_id)
  );

  return stores
    .filter((s) => !watched.has(s.id) && evaluateStoreLegalityGate(s).canAcceptRequests)
    .sort(
      (a, b) =>
        Number(requestedFrom.has(b.id)) - Number(requestedFrom.has(a.id)) ||
        (b.active_benefits_count ?? 0) - (a.active_benefits_count ?? 0) ||
        a.name_he.localeCompare(b.name_he, "he")
    )
    .slice(0, limit);
}

export interface LifecycleReminder {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "urgent" | "info" | "waiting";
}

/**
 * Reminders that move the user to action: an approved benefit about to expire,
 * a published benefit nobody asked about yet, and a request waiting for a reply.
 */
export function buildLifecycleReminders(params: {
  benefits: UserBenefit[];
  requests: PurchaseRequest[];
  currentUser: PublicUser;
  todayIsrael: string;
  now?: number;
}): LifecycleReminder[] {
  const { benefits, requests, currentUser, todayIsrael } = params;
  const now = params.now ?? Date.now();
  const benefitById = new Map(benefits.map((b) => [b.id, b]));
  const reminders: LifecycleReminder[] = [];

  for (const request of requests) {
    if (request.buyer_id !== currentUser.id) continue;
    if (request.status !== "accepted" && request.status !== "purchased") continue;
    const benefit = benefitById.get(request.benefit_id);
    if (!benefit) continue;
    const days = daysUntilWindowEnd(benefit.window_end_date, todayIsrael);
    if (days < 0 || days > 2) continue;
    reminders.push({
      id: `expiring-${request.id}`,
      title:
        days === 0
          ? `ההטבה ב-${request.store_name_he} פגה היום`
          : `ההטבה ב-${request.store_name_he} פגה בעוד ${days} ${days === 1 ? "יום" : "ימים"}`,
      body: "הבקשה אושרה — כדאי לסגור את המימוש עכשיו.",
      href: `/requests/view?id=${request.id}`,
      tone: "urgent",
    });
  }

  for (const benefit of benefits) {
    if (benefit.owner_id !== currentUser.id || benefit.status !== "active") continue;
    const days = daysUntilWindowEnd(benefit.window_end_date, todayIsrael);
    if (days < 0 || days > 3) continue;
    if (requests.some((r) => r.benefit_id === benefit.id)) continue;
    reminders.push({
      id: `no-requests-${benefit.id}`,
      title: `עוד אין פניות להטבה שלך ב-${benefit.store_name_he}`,
      body:
        days === 0
          ? "החלון נסגר היום — אפשר להאריך את תוקף ההטבה."
          : `החלון נסגר בעוד ${days} ${days === 1 ? "יום" : "ימים"} — אפשר להאריך או להזכיר לחברים.`,
      href: "/dashboard",
      tone: "info",
    });
  }

  for (const request of requests) {
    if (request.benefit_owner_id !== currentUser.id) continue;
    if (request.status !== "pending" && request.status !== "info_requested") continue;
    const hours = (now - new Date(request.created_at).getTime()) / 3_600_000;
    if (hours < 24) continue;
    reminders.push({
      id: `reply-${request.id}`,
      title: `בקשה מ-${request.buyer_display_name} ממתינה לתשובה`,
      body: `${request.store_name_he} · ${request.product_name}`,
      href: `/requests/view?id=${request.id}`,
      tone: "waiting",
    });
  }

  return reminders.slice(0, 4);
}
