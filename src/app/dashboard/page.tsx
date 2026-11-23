"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  Download,
  Gift,
  Inbox,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { BenefitsPanel } from "@/components/dashboard/BenefitsPanel";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { RequestsPanel } from "@/components/dashboard/RequestsPanel";
import { countUnreadNotifications } from "@/lib/domain/notification-view";
import {
  ensureNotificationServiceWorker,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
} from "@/lib/services/browser-notifications";
import { usePersonalPreferences } from "@/lib/services/personal-preferences";
import { he } from "@/lib/i18n";

type TabKey = "home" | "requests" | "benefits" | "settings";

export default function DashboardPage() {
  const {
    ready,
    currentUser,
    currentUserBirthDate,
    benefits,
    requests,
    notifications,
    stores,
    waitlistStoreIds,
    waitlistSettings,
    updateBenefitStatus,
    updateBenefitDetails,
    deleteBenefit,
    toggleWaitlist,
    updateWaitlistSettings,
    markNotificationRead,
    markAllNotificationsRead,
    updateBirthDate,
    deleteAccount,
    mode,
    users,
    switchDemoUser,
  } = useAppData();

  const [tab, setTab] = useState<TabKey>("home");
  const [birthDateInput, setBirthDateInput] = useState(currentUserBirthDate ?? "");
  const [savingBirthDate, setSavingBirthDate] = useState(false);
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationPermission>("default");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, updatePrefs, prefsLoaded] = usePersonalPreferences(currentUser?.id ?? null);

  useEffect(() => {
    setNotifPermission(getBrowserNotificationPermission());
    void ensureNotificationServiceWorker();
  }, []);

  useEffect(() => {
    if (currentUserBirthDate) setBirthDateInput(currentUserBirthDate);
  }, [currentUserBirthDate]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-semibold text-[#5a4c73]">
        טוען...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="clay-card p-8">
          <h1 className="text-xl font-extrabold text-[#241938]">האזור האישי</h1>
          <p className="mt-2 text-sm text-[#5a4c73]">התחברו כדי לראות מה זמין לכן עכשיו.</p>
          <Link href="/auth/login" className="clay-btn-primary mt-5 inline-block px-6 py-2.5 text-sm font-bold">
            התחברות
          </Link>
        </div>
      </div>
    );
  }

  const myBenefits = benefits.filter((b) => b.owner_id === currentUser.id);
  const incomingRequests = requests.filter((r) => r.benefit_owner_id === currentUser.id);
  const outgoingRequests = requests.filter((r) => r.buyer_id === currentUser.id);
  const unreadCount = countUnreadNotifications(notifications, currentUser.id, {
    stores,
    notificationTypes: prefs.notificationTypes,
    watchSettings: waitlistSettings,
  });

  const handleExportData = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      profile: currentUser,
      benefits: myBenefits,
      incoming_requests: incomingRequests,
      outgoing_requests: outgoingRequests,
      waitlist_store_ids: waitlistStoreIds,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `birthday-gift-my-data-${currentUser.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback("קובץ הנתונים הורד.");
  };

  const handleEnableBrowserNotifs = async () => {
    setError(null);
    const perm = await requestBrowserNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      showBrowserNotification({
        title: "ההתראות הופעלו!",
        body: "תקבלו קפיצה על בקשות חדשות והטבות במעקב.",
      });
      setFeedback("התראות הדפדפן הופעלו.");
    } else if (perm === "denied") {
      setError("ההתראות חסומות בדפדפן — אפשר אותן בהגדרות האתר בסרגל הכתובת.");
    }
  };

  const handleSaveBirthDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSavingBirthDate(true);
    try {
      const res = await updateBirthDate(birthDateInput);
      if (!res.ok) setError(res.error ?? "לא ניתן לעדכן את תאריך הלידה.");
      else setFeedback("תאריך הלידה עודכן.");
    } finally {
      setSavingBirthDate(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setFeedback(null);
    const res = await deleteAccount();
    if (!res.ok) setError(res.error ?? "לא ניתן למחוק את החשבון.");
    else setFeedback("החשבון סומן למחיקה (עד 30 יום).");
  };

  const tabs: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "home", label: "בית", icon: Bell },
    { key: "requests", label: "בקשות", icon: Inbox },
    { key: "benefits", label: "ההטבות שלי", icon: Gift },
    { key: "settings", label: "הגדרות", icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[#241938] sm:text-2xl">
            שלום, {currentUser.display_name}
          </h1>
          <p className="mt-0.5 text-[11px] text-[#8a7ca8]">
            חודש לידה: {he.months[currentUser.birth_month - 1]} · {watchlistCountLabel(waitlistStoreIds.length)}
          </p>
        </div>
        <Link
          href="/benefits/new"
          className="clay-btn-butter inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
        >
          <Gift className="h-4 w-4" aria-hidden="true" />
          פרסום הטבה
        </Link>
      </div>

      <div role="tablist" aria-label="אזור אישי" className="mt-5 flex gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors sm:flex-none sm:px-4 ${
                active
                  ? "bg-[#4b2e83] text-white"
                  : "border border-[#e6dcfb] bg-white text-[#4e3f69] hover:bg-[#f3ecff]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
              {t.key === "home" && unreadCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? "bg-white/20" : "bg-[#f6d469] text-[#3d2803]"
                  }`}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div role="status" className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {feedback}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-3 flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Kept mounted so filters, open store settings and the visit marker
          survive switching tabs, exactly as before the extraction. */}
      <div hidden={tab !== "home"}>
        <DashboardHome
          currentUser={currentUser}
          stores={stores}
          benefits={benefits}
          requests={requests}
          notifications={notifications}
          waitlistStoreIds={waitlistStoreIds}
          waitlistSettings={waitlistSettings}
          preferences={prefs}
          preferencesLoaded={prefsLoaded}
          updatePreferences={updatePrefs}
          toggleWaitlist={toggleWaitlist}
          markNotificationRead={markNotificationRead}
          markAllNotificationsRead={markAllNotificationsRead}
          updateWaitlistSettings={updateWaitlistSettings}
          onFeedback={setFeedback}
        />
      </div>

      {tab === "requests" && (
        <RequestsPanel
          incomingRequests={incomingRequests}
          outgoingRequests={outgoingRequests}
        />
      )}

      {tab === "benefits" && (
        <BenefitsPanel
          myBenefits={myBenefits}
          updateBenefitStatus={updateBenefitStatus}
          updateBenefitDetails={updateBenefitDetails}
          deleteBenefit={deleteBenefit}
          onFeedback={setFeedback}
          onError={setError}
        />
      )}

      {/* SETTINGS */}
      {tab === "settings" && (
        <div className="mt-4 space-y-2">
          <section className="rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#241938]">
              <BellRing className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              התראות דפדפן
            </h2>
            <p className="mt-0.5 text-[11px] text-[#8a7ca8]">
              {notifPermission === "granted"
                ? "פעילות."
                : notifPermission === "denied"
                  ? "חסומות בהגדרות הדפדפן."
                  : "לא הופעלו."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {notifPermission !== "granted" ? (
                <button
                  type="button"
                  onClick={() => void handleEnableBrowserNotifs()}
                  className="clay-btn-primary px-4 py-2 text-[11px] font-bold"
                >
                  הפעלה
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    showBrowserNotification({ title: "בדיקה", body: "ההתראות עובדות!" })
                  }
                  className="rounded-full bg-[#fef6d8] px-4 py-2 text-[11px] font-bold text-[#4a3204]"
                >
                  התראת בדיקה
                </button>
              )}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-[#efe7fe] pt-2">
              {(
                [
                  { key: "waitlist", label: "הטבות חדשות בחנויות במעקב" },
                  { key: "requests", label: "בקשות ועדכונים על ההטבות שלי" },
                  { key: "reminders", label: "תזכורות למימוש ולפקיעה" },
                ] as const
              ).map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-semibold text-[#4e3f69]"
                >
                  {option.label}
                  <input
                    type="checkbox"
                    checked={prefs.notificationTypes[option.key]}
                    onChange={(e) =>
                      updatePrefs((prev) => ({
                        ...prev,
                        notificationTypes: {
                          ...prev.notificationTypes,
                          [option.key]: e.target.checked,
                        },
                      }))
                    }
                    className="h-4 w-4 accent-[#4b2e83]"
                  />
                </label>
              ))}
            </div>
          </section>

          <form onSubmit={handleSaveBirthDate} className="rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-[#241938]">
              <Calendar className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              תאריך לידה
            </h2>
            <p className="mt-0.5 text-[11px] text-[#8a7ca8]">נשמר פרטי ואינו מוצג לאחרים.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                required
                value={birthDateInput}
                onChange={(e) => setBirthDateInput(e.target.value)}
                aria-label="תאריך לידה"
                className="rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={savingBirthDate || !birthDateInput}
                className="clay-btn-primary px-4 py-1.5 text-[11px] font-bold disabled:opacity-60"
              >
                {savingBirthDate ? "שומר..." : "שמירה"}
              </button>
            </div>
          </form>

          <section className="rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3">
            <h2 className="text-sm font-extrabold text-[#241938]">פרטיות וחשבון</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#4b2e83] px-3.5 py-1.5 text-[11px] font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                ייצוא הנתונים שלי
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3.5 py-1.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                מחיקת חשבון
              </button>
            </div>
          </section>

          {mode === "demo" && (
            <section className="rounded-2xl border border-dashed border-[#d9c7f8] bg-white/70 px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-xs font-extrabold text-[#4b2e83]">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                מצב הדגמה — החלפת משתמש
              </h2>
              <select
                value={currentUser.id}
                onChange={(e) => switchDemoUser(e.target.value || null)}
                aria-label="החלפת משתמש הדגמה"
                className="mt-2 rounded-xl border border-[#dfd2fb] bg-white px-3 py-1.5 text-xs"
              >
                <option value="">אורח</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function watchlistCountLabel(count: number) {
  return count > 0 ? `${count} חנויות במעקב` : "אין חנויות במעקב";
}
