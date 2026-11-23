"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  AdminLog,
  AppNotification,
  BenefitStatus,
  ChatMessage,
  DisputeItem,
  EligibilityWindowType,
  LegalityStatus,
  PublicUser,
  PurchaseRequest,
  RequestEvent,
  RequestStatus,
  Store,
  StoreTermsReview,
  SystemBanner,
  TakedownRequest,
  UserBenefit,
} from "@/lib/types";
import { createDemoSeedState, SEED_CATEGORIES } from "@/lib/data/seed-stores";
import {
  canCreatePendingRequest,
  canDeleteAccount,
  validateRequestTransition,
} from "@/lib/domain/state-machine";
import {
  computeEligibilityWindow,
  getTodayInIsrael,
  isDateWithinWindow,
  verifyMinimumAge,
} from "@/lib/domain/eligibility-window";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import {
  inspectMessageForContactDetails,
  sanitizePlainText,
} from "@/lib/domain/contact-guard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { showBrowserNotification } from "@/lib/services/browser-notifications";
import {
  DEFAULT_WATCH_SETTINGS,
  watchSettingsFromRow,
  watchSettingsToRow,
  type WaitlistRow,
  type WatchSettings,
} from "@/lib/domain/watchlist-settings";

interface PersistedState {
  currentUserId: string | null;
  users: PublicUser[];
  stores: Store[];
  benefits: UserBenefit[];
  requests: PurchaseRequest[];
  events: RequestEvent[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  waitlistStoreIds: string[];
  waitlistSettings: Record<string, WatchSettings>;
  reviews: StoreTermsReview[];
  takedowns: TakedownRequest[];
  disputes: DisputeItem[];
  banners: SystemBanner[];
  adminLogs: AdminLog[];
}

const STORAGE_KEY = "birthday_gift_il_state_v1";

interface AppContextValue {
  mode: "supabase" | "demo";
  ready: boolean;
  categories: typeof SEED_CATEGORIES;
  currentUser: PublicUser | null;
  currentUserBirthDate: string | null;
  users: PublicUser[];
  stores: Store[];
  benefits: UserBenefit[];
  requests: PurchaseRequest[];
  events: RequestEvent[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  waitlistStoreIds: string[];
  waitlistSettings: Record<string, WatchSettings>;
  reviews: StoreTermsReview[];
  takedowns: TakedownRequest[];
  disputes: DisputeItem[];
  banners: SystemBanner[];
  adminLogs: AdminLog[];
  // Auth
  switchDemoUser: (userId: string | null) => void;
  registerUser: (input: {
    email: string;
    password: string;
    displayName: string;
    birthDate: string;
    marketingConsent: boolean;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    birthMonthConsent: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  loginUser: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logoutUser: () => Promise<void>;
  acknowledgeSafety: () => Promise<void>;
  updateBirthDate: (birthDate: string) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: () => Promise<{ ok: boolean; error?: string }>;
  // Benefits & Waitlist
  publishBenefit: (input: {
    storeId: string;
    windowType: EligibilityWindowType;
    windowStartDate?: string;
    windowEndDate?: string;
    daysBefore?: number;
    daysAfter?: number;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string; benefitId?: string }>;
  updateBenefitStatus: (benefitId: string, status: BenefitStatus) => Promise<{ ok: boolean; error?: string }>;
  updateBenefitDetails: (input: {
    benefitId: string;
    windowStartDate: string;
    windowEndDate: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteBenefit: (benefitId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleWaitlist: (storeId: string) => Promise<{ ok: boolean; joined: boolean }>;
  updateWaitlistSettings: (storeId: string, patch: Partial<WatchSettings>) => Promise<void>;
  // Requests & Chat
  createPurchaseRequest: (input: {
    benefitId: string;
    productName: string;
    productUrl: string;
    estimatedPriceIls?: number;
    compensationType: "free_help" | "symbolic_thanks";
    compensationNote?: string;
    buyerNotes?: string;
  }) => Promise<{ ok: boolean; error?: string; requestId?: string }>;
  transitionRequest: (
    requestId: string,
    toStatus: RequestStatus,
    note?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (
    requestId: string,
    body: string
  ) => Promise<{ ok: boolean; warning?: string | null; error?: string }>;
  toggleMutualPhoneConsent: (requestId: string) => Promise<void>;
  reportMessage: (messageId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  // Takedown & Admin
  submitTakedown: (input: {
    storeId?: string;
    storeName: string;
    contactName: string;
    contactEmail: string;
    contactRole: string;
    requestType: "takedown" | "correction";
    details: string;
  }) => Promise<{ ok: boolean }>;
  reviewStoreLegality: (input: {
    storeId: string;
    legalityStatus: LegalityStatus;
    quotedClause: string;
    conditions: string;
    takedownRequested?: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  resolveDispute: (
    disputeId: string,
    outcome: "resolved_completed" | "resolved_cancelled",
    note: string
  ) => Promise<{ ok: boolean; error?: string }>;
  setSystemBanner: (message: string, severity: "info" | "warning" | "urgent", active: boolean) => Promise<void>;
  resetDemoState: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function makeInitialState(liveSupabase: boolean): PersistedState {
  const seed = createDemoSeedState();
  if (liveSupabase) {
    return {
      ...seed,
      currentUserId: null,
      users: [],
      benefits: [],
      requests: [],
      events: [],
      messages: [],
      notifications: [],
      waitlistStoreIds: [],
      waitlistSettings: {},
      disputes: [],
      adminLogs: [],
    };
  }
  return {
    currentUserId: "demo-buyer-1",
    ...seed,
    waitlistSettings: {},
  };
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const supabaseLive = isSupabaseConfigured();
  const mode: "supabase" | "demo" = supabaseLive ? "supabase" : "demo";

  const [state, setState] = useState<PersistedState>(() => makeInitialState(supabaseLive));
  const [currentUserBirthDate, setCurrentUserBirthDate] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage (demo) or Supabase (live)
  useEffect(() => {
    if (mode === "demo") {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedState;
          if (parsed && Array.isArray(parsed.stores) && parsed.stores.length > 0) {
            setState({ ...parsed, waitlistSettings: parsed.waitlistSettings ?? {} });
          }
        }
      } catch {
        // Ignore corrupted local storage
      }
      setReady(true);
      return;
    }

    // Live Supabase hydration
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [
          { data: authData },
          { data: storesData },
          { data: benefitsData },
          { data: bannersData },
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("stores").select("*, categories(slug, name_he)").order("suitability_rank", { ascending: true }),
          supabase.from("user_benefits").select("*, users(display_name, birth_month, is_verified_member), stores(slug, name_he, discount_value)").is("deleted_at", null),
          supabase.from("system_banners").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        ]);

        if (cancelled) return;

        let currentUser: PublicUser | null = null;
        let liveRequests: PurchaseRequest[] = [];
        let liveEvents: RequestEvent[] = [];
        let liveMessages: ChatMessage[] = [];
        let liveNotifications: AppNotification[] = [];
        let liveWaitlistIds: string[] = [];
        let liveWaitlistSettings: Record<string, WatchSettings> = {};
        let liveTakedowns: TakedownRequest[] = [];
        let liveDisputes: DisputeItem[] = [];
        let liveAdminLogs: AdminLog[] = [];

        if (authData?.user) {
          const [
            { data: initialProfile },
            { data: privateData },
            { data: rolesData },
            { data: reqsData },
            { data: notifsData },
            { data: waitData },
          ] = await Promise.all([
            supabase.from("users").select("*").eq("id", authData.user.id).maybeSingle(),
            supabase.from("user_private").select("birth_date").eq("user_id", authData.user.id).maybeSingle(),
            supabase.from("user_roles").select("role").eq("user_id", authData.user.id),
            supabase
              .from("purchase_requests")
              .select("*, stores(slug, name_he)")
              .or(`buyer_id.eq.${authData.user.id},benefit_owner_id.eq.${authData.user.id}`)
              .order("created_at", { ascending: false }),
            supabase
              .from("notifications")
              .select("*")
              .eq("user_id", authData.user.id)
              .order("created_at", { ascending: false }),
            supabase
              .from("waitlist")
              .select("store_id, min_discount_percent, only_verified, muted_until")
              .eq("user_id", authData.user.id),
          ]);

          if (privateData?.birth_date) {
            setCurrentUserBirthDate(String(privateData.birth_date));
          }

          let profile = initialProfile;
          if (!profile) {
            const fallbackName =
              (authData.user.user_metadata?.display_name as string | undefined)?.trim() ||
              authData.user.email?.split("@")[0] ||
              "חבר קהילה";
            const fallbackMonth = Number(authData.user.user_metadata?.birth_month) || 1;
            const { data: created } = await supabase
              .from("users")
              .upsert({
                id: authData.user.id,
                display_name: fallbackName.slice(0, 40),
                birth_month: Math.min(12, Math.max(1, fallbackMonth)),
                account_status: "active",
              })
              .select("*")
              .maybeSingle();
            profile = created;
          }

          if (profile) {
            const parsedRoles = (rolesData ?? []).map((r: { role: string }) => r.role) as PublicUser["roles"];
            currentUser = {
              ...profile,
              roles: parsedRoles.length > 0 ? parsedRoles : ["user"],
            };
          }

          if (currentUser && (currentUser.roles.includes("admin") || currentUser.roles.includes("content_manager"))) {
            const [{ data: tdData }, { data: dispData }, { data: logsData }] = await Promise.all([
              supabase.from("store_takedown_requests").select("*").order("created_at", { ascending: false }),
              supabase.from("disputes").select("*").order("opened_at", { ascending: false }),
              supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(50),
            ]);
            liveTakedowns = (tdData as TakedownRequest[] | null) ?? [];
            liveDisputes = ((dispData ?? []) as Record<string, unknown>[]).map((d) => ({
              id: String(d.id),
              request_id: String(d.request_id),
              store_name_he: "חנות",
              product_name: `בקשה ${String(d.request_id).slice(0, 8)}`,
              opened_by_name: "משתמש",
              reason: String(d.reason ?? ""),
              status: d.status as DisputeItem["status"],
              outcome_note: (d.outcome_note as string | null) ?? null,
              opened_at: String(d.opened_at ?? ""),
              closed_at: (d.closed_at as string | null) ?? null,
            }));
            liveAdminLogs = ((logsData ?? []) as Record<string, unknown>[]).map((l) => ({
              id: String(l.id),
              admin_name: currentUser?.display_name ?? "מנהל",
              action: String(l.action ?? ""),
              target_type: String(l.target_type ?? ""),
              target_id: (l.target_id as string | null) ?? null,
              details: (l.details as Record<string, unknown>) ?? {},
              created_at: String(l.created_at ?? ""),
            }));
          }

          if (reqsData && reqsData.length > 0) {
            liveRequests = reqsData.map((r: Record<string, unknown>) => ({
              ...(r as unknown as PurchaseRequest),
              store_slug: (r.stores as { slug?: string } | null)?.slug ?? "",
              store_name_he: (r.stores as { name_he?: string } | null)?.name_he ?? "",
              buyer_display_name: r.buyer_id === authData.user?.id ? currentUser?.display_name ?? "אני" : "קונה",
              owner_display_name: r.benefit_owner_id === authData.user?.id ? currentUser?.display_name ?? "אני" : "בעל הטבה",
            }));
            const reqIds = liveRequests.map((r) => r.id);
            const [{ data: evData }, { data: msgData }] = await Promise.all([
              supabase.from("request_events").select("*").in("request_id", reqIds).order("created_at", { ascending: true }),
              supabase.from("messages").select("*").in("request_id", reqIds).order("created_at", { ascending: true }),
            ]);
            liveEvents = (evData ?? []).map((e: Record<string, unknown>) => ({
              ...(e as unknown as RequestEvent),
              actor_name: e.actor_id === authData.user?.id ? currentUser?.display_name ?? "אני" : "מערכת / צד שני",
            }));
            liveMessages = (msgData ?? []).map((m: Record<string, unknown>) => ({
              ...(m as unknown as ChatMessage),
              sender_name: m.sender_id === authData.user?.id ? currentUser?.display_name ?? "אני" : "צד שני",
            }));
          }

          liveNotifications = (notifsData as AppNotification[] | null) ?? [];
          liveWaitlistIds = (waitData ?? []).map((w: { store_id: string }) => w.store_id);
          liveWaitlistSettings = Object.fromEntries(
            ((waitData ?? []) as WaitlistRow[]).map((row) => [
              row.store_id,
              watchSettingsFromRow(row),
            ])
          );
        }

        setState((prev) => ({
          ...prev,
          currentUserId: currentUser?.id ?? null,
          users: currentUser ? [currentUser] : [],
          requests: liveRequests,
          events: liveEvents,
          messages: liveMessages,
          notifications: liveNotifications,
          waitlistStoreIds: liveWaitlistIds,
          waitlistSettings: liveWaitlistSettings,
          takedowns: liveTakedowns,
          disputes: liveDisputes,
          adminLogs: liveAdminLogs,
          stores:
            storesData && storesData.length > 0
              ? storesData.map((s: Record<string, unknown>) => ({
                  ...(s as unknown as Store),
                  category_slug: (s.categories as { slug?: string } | null)?.slug,
                  category_name_he: (s.categories as { name_he?: string } | null)?.name_he,
                }))
              : prev.stores,
          benefits:
            benefitsData?.map((b: Record<string, unknown>) => ({
              ...(b as unknown as UserBenefit),
              owner_display_name: (b.users as { display_name?: string } | null)?.display_name ?? "חבר קהילה",
              owner_birth_month: (b.users as { birth_month?: number } | null)?.birth_month ?? 1,
              owner_is_verified: Boolean((b.users as { is_verified_member?: boolean } | null)?.is_verified_member),
              store_slug: (b.stores as { slug?: string } | null)?.slug ?? "",
              store_name_he: (b.stores as { name_he?: string } | null)?.name_he ?? "",
              discount_value: (b.stores as { discount_value?: string } | null)?.discount_value ?? "",
            })) ?? [],
          banners: (bannersData as SystemBanner[] | null) ?? prev.banners,
        }));
      } catch (err) {
        console.error("Supabase hydration warning:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  // Persist demo state
  useEffect(() => {
    if (mode === "demo" && ready) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Ignore quota errors
      }
    }
  }, [state, mode, ready]);

  const currentUser = useMemo(
    () => state.users.find((u) => u.id === state.currentUserId) ?? null,
    [state.users, state.currentUserId]
  );

  // Realtime Browser / Windows OS notifications for live Supabase notifications
  useEffect(() => {
    if (mode !== "supabase" || !currentUser?.id) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const incoming = payload.new as AppNotification;
          setState((prev) => ({
            ...prev,
            notifications: [
              incoming,
              ...prev.notifications.filter((n) => n.id !== incoming.id),
            ],
          }));
          showBrowserNotification({
            title: incoming.title,
            body: incoming.body,
            link: incoming.link,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const incomingMsg: ChatMessage = {
            id: String(row.id),
            request_id: String(row.request_id),
            sender_id: String(row.sender_id),
            sender_name: row.sender_id === currentUser.id ? currentUser.display_name : "צד שני",
            body: String(row.body ?? ""),
            contained_contact_warning: Boolean(row.contained_contact_warning),
            reported: Boolean(row.reported),
            created_at: String(row.created_at ?? new Date().toISOString()),
          };
          setState((prev) => {
            if (prev.messages.some((m) => m.id === incomingMsg.id)) return prev;
            return { ...prev, messages: [...prev.messages, incomingMsg] };
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "purchase_requests",
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setState((prev) => ({
            ...prev,
            requests: prev.requests.map((r) =>
              r.id === String(updated.id)
                ? {
                    ...r,
                    status: (updated.status as RequestStatus) ?? r.status,
                    accepted_at: (updated.accepted_at as string | null) ?? r.accepted_at,
                    purchased_at: (updated.purchased_at as string | null) ?? r.purchased_at,
                    completed_at: (updated.completed_at as string | null) ?? r.completed_at,
                    updated_at: String(updated.updated_at ?? r.updated_at),
                  }
                : r
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mode, currentUser?.id]);

  // Enrich stores with active benefit counts (respecting Israel date window)
  const storesWithCounts = useMemo(() => {
    const todayIl = getTodayInIsrael();
    return state.stores.map((store) => {
      const gate = evaluateStoreLegalityGate(store);
      const count = gate.canListBenefits
        ? state.benefits.filter(
            (b) =>
              b.store_id === store.id &&
              b.status === "active" &&
              isDateWithinWindow(b.window_start_date, b.window_end_date, todayIl)
          ).length
        : 0;
      return { ...store, active_benefits_count: count };
    });
  }, [state.stores, state.benefits]);

  const switchDemoUser = (userId: string | null) => {
    setState((prev) => ({ ...prev, currentUserId: userId }));
  };

  const registerUser: AppContextValue["registerUser"] = async (input) => {
    if (!input.termsAccepted || !input.privacyAccepted || !input.birthMonthConsent) {
      return { ok: false, error: "יש לאשר את התקנון, מדיניות הפרטיות והצגת חודש הלידה." };
    }
    const ageCheck = verifyMinimumAge(input.birthDate);
    if (!ageCheck.valid) {
      return { ok: false, error: ageCheck.reason ?? "ההרשמה מגיל 18 ומעלה בלבד." };
    }
    const cleanName = sanitizePlainText(input.displayName, 40);
    if (cleanName.length < 2) {
      return { ok: false, error: "יש להזין כינוי בן 2 תווים לפחות." };
    }
    const birthMonth = Number(input.birthDate.split("-")[1]);

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "חיבור Supabase אינו זמין." };
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            display_name: cleanName,
            birth_month: birthMonth,
            birth_date: input.birthDate,
            marketing_consent: input.marketingConsent,
          },
        },
      });
      if (error || !data.user) {
        return { ok: false, error: error?.message ?? "שגיאה ביצירת החשבון." };
      }
      // Profile, user_private, user_roles & consent_log are created atomically by the DB trigger on auth.users.
      // If a live session is active immediately (e.g. email confirmation disabled), ensure local state is hydrated.
      const newUser: PublicUser = {
        id: data.user.id,
        display_name: cleanName,
        birth_month: birthMonth,
        account_status: "active",
        profile_visibility: "nickname_only",
        safety_acknowledged_at: null,
        completed_transactions_count: 0,
        is_verified_member: false,
        roles: ["user"],
        created_at: new Date().toISOString(),
      };
      if (data.session) {
        setState((prev) => ({ ...prev, currentUserId: newUser.id, users: [newUser] }));
      }
      return { ok: true };
    }

    // Demo mode registration
    const newUser: PublicUser = {
      id: `user-${Date.now()}`,
      display_name: cleanName,
      birth_month: birthMonth,
      account_status: "active",
      profile_visibility: "nickname_only",
      safety_acknowledged_at: null,
      completed_transactions_count: 0,
      is_verified_member: false,
      roles: ["user"],
      created_at: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      currentUserId: newUser.id,
      users: [...prev.users, newUser],
    }));
    return { ok: true };
  };

  const loginUser: AppContextValue["loginUser"] = async (email, password) => {
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "חיבור Supabase אינו זמין." };
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { ok: false, error: "אימייל או סיסמה שגויים." };
      }
      const [{ data: initialProfile }, { data: rolesData }] = await Promise.all([
        supabase.from("users").select("*").eq("id", data.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      ]);
      let profile = initialProfile;
      if (!profile) {
        const fallbackName =
          (data.user.user_metadata?.display_name as string | undefined)?.trim() ||
          data.user.email?.split("@")[0] ||
          "חבר קהילה";
        const { data: created } = await supabase
          .from("users")
          .upsert({
            id: data.user.id,
            display_name: fallbackName.slice(0, 40),
            birth_month: Number(data.user.user_metadata?.birth_month) || 1,
            account_status: "active",
          })
          .select("*")
          .maybeSingle();
        profile = created;
      }
      if (profile) {
        const parsedRoles = (rolesData ?? []).map((r: { role: string }) => r.role) as PublicUser["roles"];
        const loggedUser: PublicUser = {
          ...profile,
          roles: parsedRoles.length > 0 ? parsedRoles : ["user"],
        };
        setState((prev) => ({
          ...prev,
          currentUserId: loggedUser.id,
          users: [loggedUser, ...prev.users.filter((u) => u.id !== loggedUser.id)],
        }));
      }
      return { ok: true };
    }

    // Demo login: match admin or buyer
    if (email.toLowerCase().includes("admin")) {
      setState((prev) => ({ ...prev, currentUserId: "demo-admin-1" }));
    } else if (email.toLowerCase().includes("owner")) {
      setState((prev) => ({ ...prev, currentUserId: "demo-owner-1" }));
    } else {
      setState((prev) => ({ ...prev, currentUserId: "demo-buyer-1" }));
    }
    return { ok: true };
  };

  const logoutUser = async () => {
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
    }
    setState((prev) => ({ ...prev, currentUserId: null }));
  };

  const acknowledgeSafety = async () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase?.from("users").update({ safety_acknowledged_at: now }).eq("id", currentUser.id);
      await supabase?.from("consent_log").insert({
        user_id: currentUser.id,
        consent_type: "safety_acknowledgment",
        version: "2.0",
      });
    }
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id ? { ...u, safety_acknowledged_at: now } : u
      ),
    }));
  };

  const updateBirthDate: AppContextValue["updateBirthDate"] = async (birthDate) => {
    if (!currentUser) return { ok: false, error: "יש להתחבר כדי לעדכן תאריך לידה." };
    const ageCheck = verifyMinimumAge(birthDate);
    if (!ageCheck.valid) {
      return { ok: false, error: ageCheck.reason ?? "הגיל המינימלי לשימוש באתר הוא 18." };
    }
    const birthMonth = Number(birthDate.split("-")[1]);

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "חיבור Supabase אינו זמין." };

      const { error: privErr } = await supabase
        .from("user_private")
        .upsert(
          { user_id: currentUser.id, birth_date: birthDate, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (privErr) {
        return { ok: false, error: privErr.message };
      }

      const { error: pubErr } = await supabase
        .from("users")
        .update({ birth_month: birthMonth, updated_at: new Date().toISOString() })
        .eq("id", currentUser.id);
      if (pubErr) {
        return { ok: false, error: pubErr.message };
      }
    }

    setCurrentUserBirthDate(birthDate);
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) =>
        u.id === currentUser.id ? { ...u, birth_month: birthMonth } : u
      ),
    }));
    return { ok: true };
  };

  const deleteAccount = async () => {
    if (!currentUser) return { ok: false, error: "אינך מחובר/ת." };
    const userReqs = state.requests.filter(
      (r) => r.buyer_id === currentUser.id || r.benefit_owner_id === currentUser.id
    );
    const check = canDeleteAccount(userReqs.map((r) => r.status));
    if (!check.allowed) {
      return { ok: false, error: check.reason };
    }
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { error } = (await supabase?.rpc("request_account_deletion")) ?? {};
      if (error) return { ok: false, error: error.message };
      await supabase?.auth.signOut();
    }
    setState((prev) => ({
      ...prev,
      currentUserId: null,
      users: prev.users.map((u) =>
        u.id === currentUser.id ? { ...u, account_status: "deleted" } : u
      ),
      benefits: prev.benefits.map((b) =>
        b.owner_id === currentUser.id && b.status === "active" ? { ...b, status: "hidden" } : b
      ),
    }));
    return { ok: true };
  };

  const publishBenefit: AppContextValue["publishBenefit"] = async (input) => {
    if (!currentUser) return { ok: false, error: "יש להתחבר כדי לפרסם הטבה." };
    const store = state.stores.find((s) => s.id === input.storeId);
    if (!store) return { ok: false, error: "החנות לא נמצאה." };
    const gate = evaluateStoreLegalityGate(store);
    if (!gate.canListBenefits) {
      return { ok: false, error: `לא ניתן לפרסם הטבה בחנות זו: ${gate.explanationHe}` };
    }

    const today = getTodayInIsrael();
    const year = Number(today.split("-")[0]);
    const window = computeEligibilityWindow({
      birthMonth: currentUser.birth_month,
      birthDay: 15,
      referenceYear: year,
      windowType: input.windowType,
      daysBefore: input.daysBefore ?? store.default_window_days_before,
      daysAfter: input.daysAfter ?? store.default_window_days_after,
      customStart: input.windowStartDate,
      customEnd: input.windowEndDate,
    });

    const cleanNotes = sanitizePlainText(input.notes, 500);

    const newBenefit: UserBenefit = {
      id: `ben-${Date.now()}`,
      owner_id: currentUser.id,
      owner_display_name: currentUser.display_name,
      owner_birth_month: currentUser.birth_month,
      owner_is_verified: currentUser.is_verified_member,
      store_id: store.id,
      store_slug: store.slug,
      store_name_he: store.name_he,
      discount_value: store.discount_value,
      status: "active",
      window_type: input.windowType,
      window_days_before: input.daysBefore ?? store.default_window_days_before,
      window_days_after: input.daysAfter ?? store.default_window_days_after,
      window_start_date: input.windowStartDate || window.startDate,
      window_end_date: input.windowEndDate || window.endDate,
      notes: cleanNotes || null,
      self_declared_at: new Date().toISOString(),
      is_verified: currentUser.is_verified_member,
      created_at: new Date().toISOString(),
    };

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { data, error } =
        (await supabase
          ?.from("user_benefits")
          .insert({
            owner_id: currentUser.id,
            store_id: store.id,
            status: "active",
            window_type: newBenefit.window_type,
            window_days_before: newBenefit.window_days_before,
            window_days_after: newBenefit.window_days_after,
            window_start_date: newBenefit.window_start_date,
            window_end_date: newBenefit.window_end_date,
            notes: newBenefit.notes,
            is_verified: currentUser.is_verified_member,
          })
          .select("id")
          .single()) ?? {};
      if (error || !data) {
        return { ok: false, error: error?.message ?? "שגיאה בשמירת ההטבה." };
      }
      newBenefit.id = data.id;
    }

    setState((prev) => ({
      ...prev,
      benefits: [newBenefit, ...prev.benefits],
    }));
    return { ok: true, benefitId: newBenefit.id };
  };

  const updateBenefitStatus: AppContextValue["updateBenefitStatus"] = async (benefitId, status) => {
    const target = state.benefits.find((b) => b.id === benefitId);
    if (!target || !currentUser) return { ok: false, error: "הטבה לא נמצאה." };
    if (target.owner_id !== currentUser.id && !currentUser.roles.includes("admin")) {
      return { ok: false, error: "אין הרשאה לעדכן הטבה זו." };
    }
    if (target.status === "reserved" && status === "hidden") {
      return { ok: false, error: "לא ניתן להסתיר הטבה בזמן שיש בקשה מאושרת פעילה." };
    }

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { error } = (await supabase?.from("user_benefits").update({ status }).eq("id", benefitId)) ?? {};
      if (error) return { ok: false, error: error.message };
    }

    setState((prev) => {
      // If owner marks redeemed externally -> cancel open pending requests (Section 5.3.5)
      const updatedRequests =
        status === "redeemed"
          ? prev.requests.map((r) =>
              r.benefit_id === benefitId && (r.status === "pending" || r.status === "info_requested")
                ? { ...r, status: "cancelled" as RequestStatus, updated_at: new Date().toISOString() }
                : r
            )
          : prev.requests;

      return {
        ...prev,
        benefits: prev.benefits.map((b) => (b.id === benefitId ? { ...b, status } : b)),
        requests: updatedRequests,
      };
    });
    return { ok: true };
  };

  const updateBenefitDetails: AppContextValue["updateBenefitDetails"] = async (input) => {
    const target = state.benefits.find((b) => b.id === input.benefitId);
    if (!target || !currentUser) return { ok: false, error: "ההטבה לא נמצאה." };
    if (target.owner_id !== currentUser.id && !currentUser.roles.includes("admin")) {
      return { ok: false, error: "אין הרשאה לערוך הטבה זו." };
    }
    if (target.status === "redeemed" || target.status === "removed") {
      return { ok: false, error: "לא ניתן לערוך הטבה שמומשה או הוסרה." };
    }
    if (!input.windowStartDate || !input.windowEndDate || input.windowEndDate < input.windowStartDate) {
      return { ok: false, error: "תאריך הסיום חייב להיות מאוחר או שווה לתאריך ההתחלה." };
    }

    const cleanNotes = sanitizePlainText(input.notes, 500);
    const todayIl = getTodayInIsrael();
    const nextStatus: BenefitStatus =
      target.status === "expired" && input.windowEndDate >= todayIl ? "active" : target.status;

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { error } =
        (await supabase
          ?.from("user_benefits")
          .update({
            window_type: "custom_range",
            window_start_date: input.windowStartDate,
            window_end_date: input.windowEndDate,
            notes: cleanNotes || null,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.benefitId)) ?? {};
      if (error) return { ok: false, error: error.message };
    }

    setState((prev) => ({
      ...prev,
      benefits: prev.benefits.map((b) =>
        b.id === input.benefitId
          ? {
              ...b,
              window_type: "custom_range",
              window_start_date: input.windowStartDate,
              window_end_date: input.windowEndDate,
              notes: cleanNotes || null,
              status: nextStatus,
            }
          : b
      ),
    }));
    return { ok: true };
  };

  const deleteBenefit: AppContextValue["deleteBenefit"] = async (benefitId) => {
    const target = state.benefits.find((b) => b.id === benefitId);
    if (!target || !currentUser) return { ok: false, error: "ההטבה לא נמצאה." };
    if (target.owner_id !== currentUser.id && !currentUser.roles.includes("admin")) {
      return { ok: false, error: "אין הרשאה למחוק הטבה זו." };
    }

    const hasPurchasedOrDisputed = state.requests.some(
      (r) => r.benefit_id === benefitId && (r.status === "purchased" || r.status === "disputed")
    );
    if (hasPurchasedOrDisputed) {
      return { ok: false, error: "לא ניתן להסיר הטבה שכבר סומנה כנרכשה או נמצאת במחלוקת." };
    }

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { error } = (await supabase?.rpc("owner_delete_benefit", { p_benefit_id: benefitId })) ?? {};
      if (error) return { ok: false, error: error.message };
    }

    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((b) => b.id !== benefitId),
      requests: prev.requests.map((r) =>
        r.benefit_id === benefitId && (r.status === "pending" || r.status === "info_requested" || r.status === "accepted")
          ? { ...r, status: "cancelled" as RequestStatus, updated_at: now }
          : r
      ),
    }));
    return { ok: true };
  };

  const toggleWaitlist: AppContextValue["toggleWaitlist"] = async (storeId) => {
    const exists = state.waitlistStoreIds.includes(storeId);
    if (mode === "supabase" && currentUser) {
      const supabase = createSupabaseBrowserClient();
      if (exists) {
        await supabase?.from("waitlist").delete().eq("user_id", currentUser.id).eq("store_id", storeId);
      } else {
        await supabase?.from("waitlist").insert({
          user_id: currentUser.id,
          store_id: storeId,
          ...watchSettingsToRow(DEFAULT_WATCH_SETTINGS),
        });
      }
    }
    setState((prev) => {
      const waitlistSettings = { ...prev.waitlistSettings };
      if (exists) delete waitlistSettings[storeId];
      else waitlistSettings[storeId] = DEFAULT_WATCH_SETTINGS;
      return {
        ...prev,
        waitlistStoreIds: exists
          ? prev.waitlistStoreIds.filter((id) => id !== storeId)
          : [...prev.waitlistStoreIds, storeId],
        waitlistSettings,
      };
    });
    return { ok: true, joined: !exists };
  };

  const updateWaitlistSettings: AppContextValue["updateWaitlistSettings"] = async (
    storeId,
    patch
  ) => {
    const nextForServer = {
      ...DEFAULT_WATCH_SETTINGS,
      ...(state.waitlistSettings[storeId] ?? {}),
      ...patch,
    };
    if (mode === "supabase" && currentUser) {
      const supabase = createSupabaseBrowserClient();
      await supabase?.from("waitlist").upsert(
        {
          user_id: currentUser.id,
          store_id: storeId,
          ...watchSettingsToRow(nextForServer),
        },
        { onConflict: "user_id,store_id" }
      );
    }
    setState((prev) => ({
      ...prev,
      waitlistSettings: {
        ...prev.waitlistSettings,
        [storeId]: {
          ...DEFAULT_WATCH_SETTINGS,
          ...(prev.waitlistSettings[storeId] ?? {}),
          ...patch,
        },
      },
    }));
  };

  const createPurchaseRequest: AppContextValue["createPurchaseRequest"] = async (input) => {
    if (!currentUser) return { ok: false, error: "יש להתחבר כדי לשלוח בקשה." };
    const benefit = state.benefits.find((b) => b.id === input.benefitId);
    if (!benefit) return { ok: false, error: "ההטבה לא נמצאה." };
    const store = state.stores.find((s) => s.id === benefit.store_id);
    if (!store) return { ok: false, error: "החנות לא נמצאה." };

    const gate = evaluateStoreLegalityGate(store);
    if (!gate.canAcceptRequests) {
      return { ok: false, error: gate.explanationHe };
    }

    const pendingCount = state.requests.filter(
      (r) => r.benefit_id === benefit.id && (r.status === "pending" || r.status === "info_requested")
    ).length;

    const accountAgeHours = (Date.now() - new Date(currentUser.created_at).getTime()) / 3_600_000;
    const check = canCreatePendingRequest({
      benefitStatus: benefit.status,
      existingPendingCount: pendingCount,
      buyerId: currentUser.id,
      ownerId: benefit.owner_id,
      accountAgeHours,
      skipCoolingForDemo: mode === "demo",
    });

    if (!check.allowed) {
      return { ok: false, error: check.reason };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 72 * 3_600_000).toISOString();
    const newReq: PurchaseRequest = {
      id: `req-${Date.now()}`,
      benefit_id: benefit.id,
      store_id: store.id,
      store_slug: store.slug,
      store_name_he: store.name_he,
      buyer_id: currentUser.id,
      buyer_display_name: currentUser.display_name,
      benefit_owner_id: benefit.owner_id,
      owner_display_name: benefit.owner_display_name,
      status: "pending",
      product_name: sanitizePlainText(input.productName, 150),
      product_url: input.productUrl.trim(),
      estimated_price_agorot: input.estimatedPriceIls ? Math.round(input.estimatedPriceIls * 100) : null,
      currency: "ILS",
      compensation_type: input.compensationType,
      compensation_note: input.compensationNote ? sanitizePlainText(input.compensationNote, 200) : null,
      buyer_notes: input.buyerNotes ? sanitizePlainText(input.buyerNotes, 500) : null,
      owner_mutual_phone_consent: false,
      buyer_mutual_phone_consent: false,
      read_at: null,
      expires_at: expiresAt,
      accepted_at: null,
      purchased_at: null,
      completed_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { data, error } =
        (await supabase
          ?.from("purchase_requests")
          .insert({
            benefit_id: newReq.benefit_id,
            store_id: newReq.store_id,
            buyer_id: newReq.buyer_id,
            benefit_owner_id: newReq.benefit_owner_id,
            product_name: newReq.product_name,
            product_url: newReq.product_url,
            estimated_price_agorot: newReq.estimated_price_agorot,
            compensation_type: newReq.compensation_type,
            compensation_note: newReq.compensation_note,
            buyer_notes: newReq.buyer_notes,
            expires_at: newReq.expires_at,
          })
          .select("id")
          .single()) ?? {};
      if (error || !data) {
        return { ok: false, error: error?.message ?? "שגיאה בשליחת הבקשה." };
      }
      newReq.id = data.id;
    }

    const newEvent: RequestEvent = {
      id: `ev-${Date.now()}`,
      request_id: newReq.id,
      actor_id: currentUser.id,
      actor_name: currentUser.display_name,
      from_status: null,
      to_status: "pending",
      note: "נשלחה בקשת רכישה חדשה עם אישור תנאי מועדון ובטיחות.",
      created_at: now.toISOString(),
    };

    const ownerNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      user_id: benefit.owner_id,
      type: "request_new",
      title: `בקשה חדשה להטבה ב-${store.name_he}`,
      body: `${currentUser.display_name} שלח/ה בקשה עבור "${newReq.product_name}". יש להגיב תוך 72 שעות.`,
      link: `/requests/view?id=${newReq.id}`,
      read_at: null,
      created_at: now.toISOString(),
    };

    setState((prev) => ({
      ...prev,
      requests: [newReq, ...prev.requests],
      events: [...prev.events, newEvent],
      notifications: [ownerNotif, ...prev.notifications],
    }));
    return { ok: true, requestId: newReq.id };
  };

  const transitionRequest: AppContextValue["transitionRequest"] = async (requestId, toStatus, note) => {
    if (!currentUser) return { ok: false, error: "יש להתחבר." };
    const req = state.requests.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: "הבקשה לא נמצאה." };

    const actor =
      currentUser.roles.includes("admin") && (toStatus === "resolved_completed" || toStatus === "resolved_cancelled")
        ? "admin"
        : req.benefit_owner_id === currentUser.id
          ? "owner"
          : req.buyer_id === currentUser.id
            ? "buyer"
            : currentUser.roles.includes("admin")
              ? "admin"
              : null;

    if (!actor) return { ok: false, error: "אינך צד בבקשה זו." };

    const benefit = state.benefits.find((b) => b.id === req.benefit_id);
    const windowOpen = benefit ? isDateWithinWindow(benefit.window_start_date, benefit.window_end_date) : false;

    const check = validateRequestTransition({
      from: req.status,
      to: toStatus,
      actor,
      benefitWindowStillOpen: windowOpen,
    });

    if (!check.allowed) {
      return { ok: false, error: check.reason };
    }

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return { ok: false, error: "חיבור Supabase אינו זמין." };
      const { error } = await supabase.rpc("transition_purchase_request", {
        p_request_id: requestId,
        p_to_status: toStatus,
        p_note: note ?? null,
      });
      if (error) {
        return { ok: false, error: error.message };
      }
    }

    const now = new Date().toISOString();
    const cleanNote = note ? sanitizePlainText(note, 500) : null;

    setState((prev) => {
      const updatedRequests = prev.requests.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: toStatus,
            accepted_at: toStatus === "accepted" ? now : r.accepted_at,
            purchased_at: toStatus === "purchased" ? now : r.purchased_at,
            completed_at: toStatus === "completed" || toStatus === "resolved_completed" ? now : r.completed_at,
            expires_at:
              toStatus === "accepted"
                ? new Date(Date.now() + 7 * 86_400_000).toISOString()
                : r.expires_at,
            updated_at: now,
          };
        }
        // Auto-decline competing pending requests when one is accepted (Scenario 12)
        if (
          check.autoDeclineOtherPending &&
          r.benefit_id === req.benefit_id &&
          r.id !== requestId &&
          (r.status === "pending" || r.status === "info_requested")
        ) {
          return { ...r, status: "declined" as RequestStatus, updated_at: now };
        }
        return r;
      });

      const updatedBenefits = check.resultingBenefitStatus
        ? prev.benefits.map((b) =>
            b.id === req.benefit_id ? { ...b, status: check.resultingBenefitStatus! } : b
          )
        : prev.benefits;

      // Grant verified badge after a successful completed transaction (Section 7.3)
      const updatedUsers =
        toStatus === "completed"
          ? prev.users.map((u) =>
              u.id === req.benefit_owner_id || u.id === req.buyer_id
                ? {
                    ...u,
                    completed_transactions_count: u.completed_transactions_count + 1,
                    is_verified_member: true,
                  }
                : u
            )
          : prev.users;

      const newDisputes =
        toStatus === "disputed"
          ? [
              {
                id: `disp-${Date.now()}`,
                request_id: req.id,
                store_name_he: req.store_name_he,
                product_name: req.product_name,
                opened_by_name: currentUser.display_name,
                reason: cleanNote ?? "נפתחה מחלוקת על ידי אחד הצדדים",
                status: "open" as const,
                outcome_note: null,
                opened_at: now,
                closed_at: null,
              },
              ...prev.disputes,
            ]
          : prev.disputes;

      const newEvent: RequestEvent = {
        id: `ev-${Date.now()}`,
        request_id: requestId,
        actor_id: currentUser.id,
        actor_name: currentUser.display_name,
        from_status: req.status,
        to_status: toStatus,
        note: cleanNote,
        created_at: now,
      };

      const targetUserId = currentUser.id === req.buyer_id ? req.benefit_owner_id : req.buyer_id;
      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        user_id: targetUserId,
        type: `request_${toStatus}`,
        title: `עדכון בבקשה ב-${req.store_name_he}`,
        body: `סטטוס הבקשה עודכן ל-${toStatus}.`,
        link: `/requests/view?id=${req.id}`,
        read_at: null,
        created_at: now,
      };

      return {
        ...prev,
        users: updatedUsers,
        benefits: updatedBenefits,
        requests: updatedRequests,
        events: [...prev.events, newEvent],
        disputes: newDisputes,
        notifications: [newNotif, ...prev.notifications],
      };
    });

    return { ok: true };
  };

  const sendMessage: AppContextValue["sendMessage"] = async (requestId, body) => {
    if (!currentUser) return { ok: false, error: "יש להתחבר." };
    const clean = sanitizePlainText(body, 2000);
    if (!clean) return { ok: false, error: "לא ניתן לשלוח הודעה ריקה." };

    const guard = inspectMessageForContactDetails(clean);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      request_id: requestId,
      sender_id: currentUser.id,
      sender_name: currentUser.display_name,
      body: clean,
      contained_contact_warning: guard.hasContactInfo,
      reported: false,
      created_at: new Date().toISOString(),
    };

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      const { data, error } =
        (await supabase
          ?.from("messages")
          .insert({
            request_id: requestId,
            sender_id: currentUser.id,
            body: clean,
            contained_contact_warning: guard.hasContactInfo,
          })
          .select("id, created_at")
          .maybeSingle()) ?? {};
      if (error) return { ok: false, error: error.message };
      if (data?.id) {
        msg.id = String(data.id);
        if (data.created_at) msg.created_at = String(data.created_at);
      }
    }

    setState((prev) => {
      if (prev.messages.some((m) => m.id === msg.id)) return prev;
      return {
        ...prev,
        messages: [...prev.messages, msg],
      };
    });

    return { ok: true, warning: guard.warningMessage };
  };

  const toggleMutualPhoneConsent = async (requestId: string) => {
    if (!currentUser) return;
    setState((prev) => ({
      ...prev,
      requests: prev.requests.map((r) => {
        if (r.id !== requestId) return r;
        if (r.buyer_id === currentUser.id) {
          return { ...r, buyer_mutual_phone_consent: !r.buyer_mutual_phone_consent };
        }
        if (r.benefit_owner_id === currentUser.id) {
          return { ...r, owner_mutual_phone_consent: !r.owner_mutual_phone_consent };
        }
        return r;
      }),
    }));
  };

  const reportMessage = async (messageId: string) => {
    setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => (m.id === messageId ? { ...m, reported: true } : m)),
    }));
  };

  const markNotificationRead = async (notificationId: string) => {
    const now = new Date().toISOString();
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase
        ?.from("notifications")
        .update({ read_at: now })
        .eq("id", notificationId);
    }
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read_at: now } : n
      ),
    }));
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase
        ?.from("notifications")
        .update({ read_at: now })
        .eq("user_id", currentUser.id)
        .is("read_at", null);
    }
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.user_id === currentUser.id && !n.read_at ? { ...n, read_at: now } : n
      ),
    }));
  };

  const submitTakedown: AppContextValue["submitTakedown"] = async (input) => {
    const item: TakedownRequest = {
      id: `td-${Date.now()}`,
      store_id: input.storeId ?? null,
      store_name_submitted: sanitizePlainText(input.storeName, 120),
      contact_name: sanitizePlainText(input.contactName, 80),
      contact_email: input.contactEmail.trim(),
      contact_role: sanitizePlainText(input.contactRole, 80),
      request_type: input.requestType,
      details: sanitizePlainText(input.details, 2000),
      status: "open",
      created_at: new Date().toISOString(),
    };
    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase?.from("store_takedown_requests").insert({
        store_id: item.store_id,
        store_name_submitted: item.store_name_submitted,
        contact_name: item.contact_name,
        contact_email: item.contact_email,
        contact_role: item.contact_role,
        request_type: item.request_type,
        details: item.details,
      });
    } else {
      await fetch("/api/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }).catch(() => {});
    }

    setState((prev) => ({
      ...prev,
      takedowns: [item, ...prev.takedowns],
    }));
    return { ok: true };
  };

  const reviewStoreLegality: AppContextValue["reviewStoreLegality"] = async (input) => {
    if (!currentUser || (!currentUser.roles.includes("admin") && !currentUser.roles.includes("content_manager"))) {
      return { ok: false, error: "נדרשת הרשאת מנהל או מנהל תוכן." };
    }
    const now = new Date();
    const nextReview = new Date(now.getTime() + 90 * 86_400_000).toISOString();
    const takedown = Boolean(input.takedownRequested);

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      await supabase
        ?.from("stores")
        .update({
          legality_status: input.legalityStatus,
          terms_quoted_clause: input.quotedClause,
          legality_conditions: input.conditions,
          takedown_requested: takedown,
          last_reviewed_at: now.toISOString(),
          next_review_at: nextReview,
        })
        .eq("id", input.storeId);
    }

    setState((prev) => ({
      ...prev,
      stores: prev.stores.map((s) =>
        s.id === input.storeId
          ? {
              ...s,
              legality_status: input.legalityStatus,
              terms_quoted_clause: input.quotedClause,
              legality_conditions: input.conditions,
              takedown_requested: takedown,
              last_reviewed_at: now.toISOString(),
              next_review_at: nextReview,
            }
          : s
      ),
      // If store removed / takedown requested -> cancel open requests (Section 3.3 & Scenario 22)
      requests: takedown
        ? prev.requests.map((r) =>
            r.store_id === input.storeId && (r.status === "pending" || r.status === "info_requested" || r.status === "accepted")
              ? { ...r, status: "cancelled" as RequestStatus, updated_at: now.toISOString() }
              : r
          )
        : prev.requests,
      reviews: [
        {
          id: `rev-${Date.now()}`,
          store_id: input.storeId,
          reviewer_name: currentUser.display_name,
          legality_status: input.legalityStatus,
          quoted_clause: input.quotedClause,
          source_url: prev.stores.find((s) => s.id === input.storeId)?.terms_url ?? null,
          notes: takedown ? "הוסרה לבקשת חנות" : "עדכון בדיקת תקנון",
          reviewed_at: now.toISOString(),
        },
        ...prev.reviews,
      ],
      adminLogs: [
        {
          id: `alog-${Date.now()}`,
          admin_name: currentUser.display_name,
          action: takedown ? "store_takedown_applied" : "store_terms_reviewed",
          target_type: "store",
          target_id: input.storeId,
          details: { legalityStatus: input.legalityStatus, takedown },
          created_at: now.toISOString(),
        },
        ...prev.adminLogs,
      ],
    }));

    return { ok: true };
  };

  const resolveDispute: AppContextValue["resolveDispute"] = async (disputeId, outcome, note) => {
    if (!currentUser?.roles.includes("admin")) {
      return { ok: false, error: "רק מנהל רשאי לסגור מחלוקת." };
    }
    const dispute = state.disputes.find((d) => d.id === disputeId);
    if (!dispute) return { ok: false, error: "המחלוקת לא נמצאה." };
    await transitionRequest(dispute.request_id, outcome, note);
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      disputes: prev.disputes.map((d) =>
        d.id === disputeId ? { ...d, status: outcome, outcome_note: note, closed_at: now } : d
      ),
      adminLogs: [
        {
          id: `alog-${Date.now()}`,
          admin_name: currentUser.display_name,
          action: "dispute_resolved",
          target_type: "dispute",
          target_id: disputeId,
          details: { outcome, note },
          created_at: now,
        },
        ...prev.adminLogs,
      ],
    }));
    return { ok: true };
  };

  const setSystemBanner: AppContextValue["setSystemBanner"] = async (message, severity, active) => {
    if (!currentUser?.roles.includes("admin")) return;
    const now = new Date().toISOString();
    const cleanMessage = sanitizePlainText(message, 300);
    let bannerId = `banner-${Date.now()}`;

    if (mode === "supabase") {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await supabase.from("system_banners").update({ is_active: false }).eq("is_active", true);
        if (active && cleanMessage) {
          const { data } = await supabase
            .from("system_banners")
            .insert({
              message: cleanMessage,
              severity,
              is_active: true,
              created_by: currentUser.id,
            })
            .select("id")
            .maybeSingle();
          if (data?.id) bannerId = String(data.id);
        }
        await supabase.from("admin_logs").insert({
          admin_id: currentUser.id,
          action: "system_banner_updated",
          target_type: "banner",
          target_id: bannerId,
          details: { severity, active },
        });
      }
    }

    const banner: SystemBanner = {
      id: bannerId,
      message: cleanMessage,
      severity,
      is_active: active,
      created_at: now,
    };
    setState((prev) => ({
      ...prev,
      banners: [banner, ...prev.banners.map((b) => ({ ...b, is_active: false }))],
      adminLogs: [
        {
          id: `alog-${Date.now()}`,
          admin_name: currentUser.display_name,
          action: "system_banner_updated",
          target_type: "banner",
          target_id: banner.id,
          details: { severity, active },
          created_at: now,
        },
        ...prev.adminLogs,
      ],
    }));
  };

  const resetDemoState = () => {
    const fresh = makeInitialState(false);
    setState(fresh);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        ready,
        categories: SEED_CATEGORIES,
        currentUser,
        currentUserBirthDate,
        users: state.users,
        stores: storesWithCounts,
        benefits: state.benefits,
        requests: state.requests,
        events: state.events,
        messages: state.messages,
        notifications: state.notifications,
        waitlistStoreIds: state.waitlistStoreIds,
        waitlistSettings: state.waitlistSettings,
        reviews: state.reviews,
        takedowns: state.takedowns,
        disputes: state.disputes,
        banners: state.banners,
        adminLogs: state.adminLogs,
        switchDemoUser,
        registerUser,
        loginUser,
        logoutUser,
        acknowledgeSafety,
        updateBirthDate,
        deleteAccount,
        publishBenefit,
        updateBenefitStatus,
        updateBenefitDetails,
        deleteBenefit,
        toggleWaitlist,
        updateWaitlistSettings,
        createPurchaseRequest,
        transitionRequest,
        sendMessage,
        toggleMutualPhoneConsent,
        reportMessage,
        markNotificationRead,
        markAllNotificationsRead,
        submitTakedown,
        reviewStoreLegality,
        resolveDispute,
        setSystemBanner,
        resetDemoState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
