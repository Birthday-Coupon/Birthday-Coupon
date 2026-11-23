"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Clock,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { RequestStatusBadge } from "@/components/Badges";
import { WatchSettingsEditor } from "@/components/dashboard/WatchSettingsEditor";
import { ExtensionPromoBanner } from "@/components/ExtensionPromoBanner";
import type {
  AppNotification,
  PublicUser,
  PurchaseRequest,
  Store,
  UserBenefit,
} from "@/lib/types";
import { daysUntilWindowEnd, getTodayInIsrael } from "@/lib/domain/eligibility-window";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import {
  notificationCategory,
  notificationGroupLabel,
  notificationHref,
  isNotificationVisible,
  storeForNotification,
  type NotificationCategory,
} from "@/lib/domain/notification-view";
import type { PersonalPreferences } from "@/lib/services/personal-preferences";
import {
  DEFAULT_WATCH_SETTINGS,
  isStoreMuted,
  passesWatchSettings,
  type WatchSettings,
} from "@/lib/domain/watchlist-settings";
import {
  URGENCY_LABELS,
  buildLifecycleReminders,
  getStoreWatchStatus,
  groupAvailableByUrgency,
  selectAvailableNow,
  suggestWatchedStores,
} from "@/lib/domain/personal-feed";

interface DashboardHomeProps {
  currentUser: PublicUser;
  stores: Store[];
  benefits: UserBenefit[];
  requests: PurchaseRequest[];
  notifications: AppNotification[];
  waitlistStoreIds: string[];
  waitlistSettings: Record<string, WatchSettings>;
  preferences: PersonalPreferences;
  preferencesLoaded: boolean;
  updatePreferences: (updater: (previous: PersonalPreferences) => PersonalPreferences) => void;
  toggleWaitlist: (storeId: string) => Promise<{ ok: boolean; joined: boolean }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateWaitlistSettings: (
    storeId: string,
    patch: Partial<WatchSettings>
  ) => Promise<void>;
  onFeedback: (message: string) => void;
}

const NOTIFICATION_FILTERS: { key: "all" | NotificationCategory; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "waitlist", label: "חנויות במעקב" },
  { key: "requests", label: "בקשות" },
  { key: "system", label: "מערכת" },
];

export function DashboardHome({
  currentUser,
  stores,
  benefits,
  requests,
  notifications,
  waitlistStoreIds,
  waitlistSettings,
  preferences,
  preferencesLoaded,
  updatePreferences,
  toggleWaitlist,
  markNotificationRead,
  markAllNotificationsRead,
  updateWaitlistSettings,
  onFeedback,
}: DashboardHomeProps) {
  const [storeQuery, setStoreQuery] = useState("");
  const [notifFilter, setNotifFilter] = useState<"all" | NotificationCategory>("all");
  const [openWatchSettings, setOpenWatchSettings] = useState<string | null>(null);
  const [showMutedNotifications, setShowMutedNotifications] = useState(false);
  const [previousVisit, setPreviousVisit] = useState<string | null>(null);
  const [visitMarkerReady, setVisitMarkerReady] = useState(false);

  useEffect(() => {
    if (!preferencesLoaded || visitMarkerReady) return;
    setPreviousVisit(preferences.lastSeenAt);
    setVisitMarkerReady(true);
  }, [preferencesLoaded, preferences.lastSeenAt, visitMarkerReady]);

  useEffect(() => {
    if (!visitMarkerReady) return;
    // Mark the visit shortly after the page settles, so the "since your last
    // visit" markers stay stable for this session.
    const timer = window.setTimeout(() => {
      updatePreferences((prev) => ({ ...prev, lastSeenAt: new Date().toISOString() }));
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [visitMarkerReady, updatePreferences]);

  const todayIl = getTodayInIsrael();
  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const availableNow = useMemo(
    () =>
      selectAvailableNow(benefits, storeById, {
        currentUserId: currentUser.id,
        birthMonth: currentUser.birth_month,
        watchedStoreIds: waitlistStoreIds,
        todayIsrael: todayIl,
        isVisible: (benefit) => {
          const store = storeById.get(benefit.store_id);
          if (!store) return false;
          return passesWatchSettings(store, benefit, waitlistSettings[benefit.store_id]);
        },
      }),
    [benefits, currentUser, storeById, todayIl, waitlistStoreIds, waitlistSettings]
  );

  const { groups: availableGroups, remaining: availableRemaining } = useMemo(
    () => groupAvailableByUrgency(availableNow, todayIl, 5),
    [availableNow, todayIl]
  );

  const watchableStores = useMemo(() => {
    const query = storeQuery.trim().toLowerCase();
    return stores
      .filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests)
      .filter(
        (s) =>
          !query ||
          `${s.name_he} ${s.name} ${s.category_name_he ?? ""}`.toLowerCase().includes(query)
      )
      .sort(
        (a, b) =>
          Number(waitlistStoreIds.includes(b.id)) - Number(waitlistStoreIds.includes(a.id)) ||
          (b.active_benefits_count ?? 0) - (a.active_benefits_count ?? 0)
      );
  }, [stores, storeQuery, waitlistStoreIds]);

  const pendingIncoming = requests.filter(
    (r) =>
      r.benefit_owner_id === currentUser.id &&
      (r.status === "pending" || r.status === "info_requested")
  );

  const myNotifications = notifications
    .filter((n) => n.user_id === currentUser.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const visibility = {
    stores,
    notificationTypes: preferences.notificationTypes,
    watchSettings: waitlistSettings,
    showMuted: showMutedNotifications,
  };
  const visibleNotifications = myNotifications.filter((n) =>
    isNotificationVisible(n, visibility)
  );
  const unreadNotifications = visibleNotifications.filter((n) => !n.read_at);
  const newSinceLastVisit = previousVisit
    ? myNotifications.filter((n) => n.created_at > previousVisit).length
    : 0;

  const groupedNotifications = new Map<string, AppNotification[]>();
  for (const notification of visibleNotifications) {
    if (notifFilter !== "all" && notificationCategory(notification.type) !== notifFilter) {
      continue;
    }
    const label = notificationGroupLabel(notification, stores);
    const bucket = groupedNotifications.get(label);
    if (bucket) bucket.push(notification);
    else groupedNotifications.set(label, [notification]);
  }
  const filteredNotificationCount = Array.from(groupedNotifications.values()).reduce(
    (total, items) => total + items.length,
    0
  );

  const watchedStores = stores.filter((s) => waitlistStoreIds.includes(s.id));
  const watchedStoreRows = watchedStores.map((store) => ({
    store,
    status: getStoreWatchStatus({ store, benefits, todayIsrael: todayIl }),
  }));

  const reminders = preferences.notificationTypes.reminders
    ? buildLifecycleReminders({
        benefits,
        requests,
        currentUser,
        todayIsrael: todayIl,
      })
    : [];

  const suggestedWatches = suggestWatchedStores({
    stores,
    waitlistStoreIds,
    requests,
    currentUserId: currentUser.id,
  });

  const updateWatchSetting = (storeId: string, patch: Partial<WatchSettings>) => {
    void updateWaitlistSettings(storeId, patch);
  };

  const muteStore = (store: { id: string; name_he: string }, days: number) => {
    updateWatchSetting(store.id, {
      mutedUntil: new Date(Date.now() + days * 86_400_000).toISOString(),
    });
    onFeedback(
      days > 0
        ? `התראות מ${store.name_he} הושתקו ל-${days} ימים.`
        : `ההשתקה של ${store.name_he} בוטלה.`
    );
  };

  return (
    <div className="mt-4 space-y-4">
      {reminders.length > 0 && (
        <section className="rounded-2xl border border-[#f0d98d] bg-[#fffaf0] p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-[#4a3204]">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            כדאי לטפל
          </h2>
          <ul className="mt-1.5 space-y-0.5">
            {reminders.map((reminder) => (
              <li key={reminder.id}>
                <Link
                  href={reminder.href}
                  className="flex items-start justify-between gap-2 rounded-xl px-2 py-1.5 hover:bg-[#fff6e0]"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-[#241938]">
                      {reminder.title}
                    </span>
                    <span className="block text-[11px] text-[#8a7ca8]">{reminder.body}</span>
                  </span>
                  <ArrowLeft
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a5a00]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExtensionPromoBanner />

      {suggestedWatches.length > 0 && watchedStores.length < 3 && (
        <section className="rounded-2xl border border-[#d2bff8] bg-[#faf7ff] p-4">
          <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-[#3b226b]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            אולי כדאי לעקוב
          </h2>
          <p className="mt-0.5 text-[11px] text-[#8a7ca8]">
            לפי הבקשות הקודמות שלכם — לחיצה מוסיפה התראות לחנות.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedWatches.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => void toggleWaitlist(store.id)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#4b2e83] ring-1 ring-[#d2bff8] hover:bg-[#f3ecff]"
              >
                + {store.name_he}
              </button>
            ))}
          </div>
        </section>
      )}

      {unreadNotifications.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#d2bff8] bg-[#faf7ff]">
          <div className="flex items-center justify-between px-4 py-2.5">
            <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-[#3b226b]">
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
              עדכונים
            </h2>
            <div className="flex items-center gap-2">
              {newSinceLastVisit > 0 && (
                <span className="rounded-full bg-[#f6d469] px-2 py-0.5 text-[10px] font-bold text-[#3d2803]">
                  {newSinceLastVisit} מאז הביקור האחרון
                </span>
              )}
              <button
                type="button"
                onClick={() => void markAllNotificationsRead()}
                className="text-[10px] font-bold text-[#4b2e83] hover:underline"
              >
                סמן הכל
              </button>
              <span className="text-[10px] font-bold text-[#8a7ca8]">
                {unreadNotifications.length} חדשים
              </span>
            </div>
          </div>
          <div className="divide-y divide-[#efe7fe] border-t border-[#efe7fe]">
            {unreadNotifications.slice(0, 4).map((n) => {
              const href = notificationHref(n);
              return (
                <div key={n.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#241938]">{n.title}</p>
                    <p className="truncate text-[11px] text-[#8a7ca8]">{n.body}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {href && (
                      <Link
                        href={href}
                        onClick={() => void markNotificationRead(n.id)}
                        className="rounded-full bg-[#efe7fe] px-3 py-1 text-[11px] font-bold text-[#4b2e83]"
                      >
                        פתיחה
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void markNotificationRead(n.id)}
                      aria-label="סמן כנקרא"
                      className="text-[11px] text-[#8a7ca8] hover:text-[#4b2e83]"
                    >
                      ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingIncoming.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#f0d98d] bg-[#fffaf0]">
          <h2 className="px-4 py-2.5 text-xs font-extrabold text-[#4a3204]">
            ממתין לתגובה שלך ({pendingIncoming.length})
          </h2>
          <div className="divide-y divide-[#f7ebc7] border-t border-[#f7ebc7]">
            {pendingIncoming.map((req) => (
              <Link
                key={req.id}
                href={`/requests/view?id=${req.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-[#fff6e0]"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#241938]">
                    {req.store_name_he} · {req.product_name}
                  </p>
                  <p className="text-[11px] text-[#8a7ca8]">מאת {req.buyer_display_name}</p>
                </div>
                <RequestStatusBadge status={req.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#241938]">אפשר לבקש עכשיו</h2>
            <p className="text-[11px] text-[#8a7ca8]">
              {availableNow.length > 0
                ? `${availableNow.length} הטבות זמינות`
                : "אין הטבות פנויות כרגע"}
            </p>
          </div>
          <Link href="/stores" className="text-[11px] font-bold text-[#4b2e83] hover:underline">
            כל החנויות
          </Link>
        </div>

        {availableNow.length > 0 ? (
          <div className="mt-2 space-y-2">
            {availableGroups.map((group) => (
              <div
                key={group.key}
                className="overflow-hidden rounded-2xl border border-[#e6dcfb] bg-white"
              >
                <p
                  className={`border-b px-4 py-1.5 text-[10px] font-extrabold ${
                    group.key === "today"
                      ? "border-[#f7c9c9] bg-[#fdf2f2] text-[#8a2b2b]"
                      : group.key === "soon"
                        ? "border-[#f7ebc7] bg-[#fffaf0] text-[#4a3204]"
                        : "border-[#efe7fe] bg-[#faf7ff] text-[#5a4c73]"
                  }`}
                >
                  {URGENCY_LABELS[group.key]}
                </p>
                <div className="divide-y divide-[#efe7fe]">
                  {group.items.map((b) => {
                    const store = storeById.get(b.store_id);
                    if (!store) return null;
                    const watched = waitlistStoreIds.includes(b.store_id);
                    const daysLeft = Math.max(
                      0,
                      daysUntilWindowEnd(b.window_end_date, todayIl)
                    );
                    return (
                      <Link
                        key={b.id}
                        href={`/stores/${store.slug}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[#faf7ff]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#241938]">
                            {store.name_he}
                            {watched && (
                              <span className="mr-1.5 rounded-full bg-[#fef6d8] px-2 py-0.5 text-[10px] font-bold text-[#4a3204]">
                                במעקב
                              </span>
                            )}
                            {b.is_verified && (
                              <span className="mr-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                                מאומת
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-[#8a7ca8]">
                            {b.discount_value} · {b.owner_display_name} · נותרו {daysLeft} ימים
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#efe7fe] px-3 py-1.5 text-[11px] font-bold text-[#4b2e83]">
                          בקשה
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            {availableRemaining > 0 && (
              <Link
                href="/stores"
                className="block text-center text-[11px] font-bold text-[#4b2e83] hover:underline"
              >
                עוד {availableRemaining} הטבות בספריית החנויות
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-dashed border-[#d9c7f8] bg-white/70 px-4 py-5 text-center text-xs text-[#8a7ca8]">
            הוסיפו חנויות למעקב למטה — ותדעו כאן ברגע שתופיע הטבה.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#e6dcfb] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#241938]">
              <Bell className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              חנויות במעקב
            </h2>
            <p className="text-[11px] text-[#8a7ca8]">מה קורה בכל חנות ואיך מקבלים התראה</p>
          </div>
          <span className="rounded-full bg-[#f3ecff] px-2.5 py-1 text-[11px] font-bold text-[#4b2e83]">
            {watchedStores.length} במעקב
          </span>
        </div>

        {watchedStoreRows.length > 0 && (
          <div className="mt-3 divide-y divide-[#efe7fe] overflow-hidden rounded-xl border border-[#efe7fe]">
            {watchedStoreRows.map(({ store, status }) => {
              const settings = waitlistSettings[store.id] ?? DEFAULT_WATCH_SETTINGS;
              const muted = isStoreMuted(settings);
              const isOpen = openWatchSettings === store.id;
              return (
                <div key={store.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/stores/${store.slug}`}
                        className="truncate text-xs font-bold text-[#241938] hover:underline"
                      >
                        {store.name_he}
                      </Link>
                      <p
                        className={`truncate text-[11px] ${
                          muted
                            ? "text-[#8a7ca8]"
                            : status.tone === "available"
                              ? "font-semibold text-emerald-800"
                              : status.tone === "soon"
                                ? "text-[#8a5a00]"
                                : "text-[#8a7ca8]"
                        }`}
                      >
                        {muted ? "התראות מושתקות זמנית" : status.label}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={`הגדרות התראה ל${store.name_he}`}
                        title="הגדרות התראה"
                        onClick={() => setOpenWatchSettings(isOpen ? null : store.id)}
                        className={`rounded-full p-1.5 ${
                          isOpen ? "bg-[#4b2e83] text-white" : "bg-[#f3ecff] text-[#4b2e83]"
                        }`}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`הסרת ${store.name_he} מהמעקב`}
                        title="הסרה מהמעקב"
                        onClick={() => void toggleWaitlist(store.id)}
                        className="rounded-full p-1.5 text-[#8a7ca8] hover:bg-[#f3ecff] hover:text-[#4b2e83]"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <WatchSettingsEditor
                      store={store}
                      settings={settings}
                      onUpdate={updateWatchSetting}
                      onMute={muteStore}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <input
          type="search"
          value={storeQuery}
          onChange={(e) => setStoreQuery(e.target.value)}
          placeholder="סינון חנויות..."
          aria-label="סינון חנויות"
          className="mt-3 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-1.5 text-xs outline-none"
        />

        <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
          {watchableStores.map((store) => {
            const watched = waitlistStoreIds.includes(store.id);
            return (
              <button
                key={store.id}
                type="button"
                aria-pressed={watched}
                onClick={() => void toggleWaitlist(store.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  watched
                    ? "bg-[#4b2e83] text-white"
                    : "border border-[#e6dcfb] bg-[#fbf9ff] text-[#4e3f69] hover:bg-[#f3ecff]"
                }`}
              >
                {watched ? "✓" : "+"} {store.name_he}
                {watched && <span className="opacity-70">· הסרה</span>}
              </button>
            );
          })}
        </div>
      </section>

      {myNotifications.length > 0 && (
        <details className="rounded-2xl border border-[#e6dcfb] bg-white/70 px-4 py-3">
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs font-bold text-[#4b2e83]">
            <span>כל ההתראות ({visibleNotifications.length})</span>
            <span className="text-[10px] font-semibold text-[#8a7ca8]">
              {newSinceLastVisit > 0
                ? `${newSinceLastVisit} מאז הביקור האחרון`
                : "מסודר לפי חנות"}
            </span>
          </summary>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {NOTIFICATION_FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setNotifFilter(option.key)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  notifFilter === option.key
                    ? "bg-[#4b2e83] text-white"
                    : "bg-[#f3ecff] text-[#4e3f69]"
                }`}
              >
                {option.label}
              </button>
            ))}
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllNotificationsRead()}
                className="inline-flex items-center gap-1 rounded-full bg-[#fef6d8] px-2.5 py-1 text-[10px] font-bold text-[#4a3204]"
              >
                <CheckCheck className="h-3 w-3" aria-hidden="true" />
                סמן הכל כנקרא
              </button>
            )}
          </div>

          {filteredNotificationCount === 0 ? (
            <p className="mt-3 text-[11px] text-[#8a7ca8]">אין התראות בסינון הזה.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {Array.from(groupedNotifications.entries()).map(([label, items]) => (
                <div key={label}>
                  <p className="text-[10px] font-extrabold text-[#8a7ca8]">{label}</p>
                  <div className="divide-y divide-[#efe7fe]">
                    {items.map((n) => {
                      const href = notificationHref(n);
                      return (
                        <div
                          key={n.id}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="min-w-0">
                            <p
                              className={`truncate text-[11px] ${
                                n.read_at ? "text-[#8a7ca8]" : "font-bold text-[#241938]"
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="truncate text-[10px] text-[#8a7ca8]">{n.body}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {n.type === "waitlist_benefit_available" && (
                              <button
                                type="button"
                                onClick={() => {
                                  const store = storeForNotification(n, stores);
                                  if (store) muteStore(store, 7);
                                }}
                                aria-label="השתק חנות ל-7 ימים"
                                title="השתק חנות ל-7 ימים"
                                className="rounded-full p-1 text-[#8a7ca8] hover:bg-[#f3ecff] hover:text-[#4b2e83]"
                              >
                                <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            )}
                            {href && (
                              <Link
                                href={href}
                                onClick={() => void markNotificationRead(n.id)}
                                className="text-[11px] font-bold text-[#4b2e83] hover:underline"
                              >
                                פתיחה
                              </Link>
                            )}
                            {!n.read_at && (
                              <button
                                type="button"
                                onClick={() => void markNotificationRead(n.id)}
                                aria-label="סמן כנקרא"
                                className="text-[11px] text-[#8a7ca8] hover:text-[#4b2e83]"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showMutedNotifications &&
            visibleNotifications.length < myNotifications.length && (
              <button
                type="button"
                onClick={() => setShowMutedNotifications(true)}
                className="mt-2 text-[10px] font-bold text-[#8a7ca8] underline"
              >
                הצגת התראות שהוסתרו ({myNotifications.length - visibleNotifications.length})
              </button>
            )}
          {showMutedNotifications && (
            <p className="mt-2 text-[10px] text-[#8a7ca8]">
              התראות שהוסתרו מוצגות.{" "}
              <button
                type="button"
                onClick={() => setShowMutedNotifications(false)}
                className="font-bold underline"
              >
                הסתרה
              </button>
            </p>
          )}
        </details>
      )}
    </div>
  );
}
