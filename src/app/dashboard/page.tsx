"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Download,
  EyeOff,
  Gift,
  Inbox,
  Send,
  Settings,
  Trash2,
  CheckCircle2,
  BookmarkCheck,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { BenefitStatusBadge, RequestStatusBadge } from "@/components/Badges";
import { canOwnerHideBenefit } from "@/lib/domain/state-machine";
import { he } from "@/lib/i18n";

type TabKey = "benefits" | "incoming" | "outgoing" | "notifications" | "waitlist" | "settings";

export default function DashboardPage() {
  const {
    currentUser,
    benefits,
    requests,
    notifications,
    stores,
    waitlistStoreIds,
    updateBenefitStatus,
    toggleWaitlist,
    markNotificationRead,
    deleteAccount,
  } = useAppData();

  const [tab, setTab] = useState<TabKey>("incoming");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <h1 className="text-xl font-extrabold text-[#241938]">האזור האישי</h1>
          <p className="mt-2 text-sm text-[#5a4c73]">יש להתחבר כדי לנהל הטבות, בקשות והתראות.</p>
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
  const myNotifications = notifications.filter((n) => n.user_id === currentUser.id);
  const waitlistStores = stores.filter((s) => waitlistStoreIds.includes(s.id));

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
    setFeedback("קובץ ייצוא הנתונים האישיים הורד למחשב שלך.");
  };

  const handleDeleteAccount = async () => {
    setError(null);
    setFeedback(null);
    const res = await deleteAccount();
    if (!res.ok) {
      setError(res.error ?? "לא ניתן למחוק את החשבון.");
    } else {
      setFeedback("החשבון סומן למחיקה לוגית ומחיקה סופית תתבצע בתוך 30 יום.");
    }
  };

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "incoming", label: "בקשות שקיבלתי", count: incomingRequests.length, icon: Inbox },
    { key: "outgoing", label: "בקשות ששלחתי", count: outgoingRequests.length, icon: Send },
    { key: "benefits", label: "ההטבות שלי", count: myBenefits.length, icon: Gift },
    { key: "notifications", label: "התראות", count: myNotifications.filter((n) => !n.read_at).length, icon: Bell },
    { key: "waitlist", label: "רשימת המתנה", count: waitlistStores.length, icon: BookmarkCheck },
    { key: "settings", label: "פרטיות וחשבון", icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="clay-card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#241938]">
            שלום, {currentUser.display_name}
          </h1>
          <p className="mt-1 text-xs font-medium text-[#5a4c73]">
            חודש לידה מוצג: {he.months[currentUser.birth_month - 1]} • עסקאות שהושלמו:{" "}
            {currentUser.completed_transactions_count} • סטטוס:{" "}
            {currentUser.is_verified_member ? "חבר מאומת" : "חבר רגיל"}
          </p>
        </div>
        <Link href="/benefits/new" className="clay-btn-butter inline-flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold">
          <Gift className="h-4 w-4" aria-hidden="true" />
          פרסם הטבה חדשה
        </Link>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="לשוניות אזור אישי" className="mt-6 flex flex-wrap gap-2">
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
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                active
                  ? "bg-[#4b2e83] text-white shadow-sm"
                  : "bg-white text-[#4e3f69] border border-[#e6dcfb] hover:bg-[#f3ecff]"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    active ? "bg-white/20 text-white" : "bg-[#f3ecff] text-[#4b2e83]"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div role="status" className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-100 p-3 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {feedback}
        </div>
      )}
      {error && (
        <div role="alert" className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* TAB PANELS */}
      <div className="mt-6">
        {tab === "incoming" && (
          <div className="space-y-3">
            {incomingRequests.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                עדיין לא התקבלו בקשות על ההטבות שלך.
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="clay-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#241938]">{req.store_name_he}</span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#4e3f69]">{req.product_name}</p>
                    <p className="mt-0.5 text-xs text-[#66548a]">
                      מאת: {req.buyer_display_name} • נשלחה: {req.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <Link href={`/requests/view?id=${req.id}`} className="clay-btn-primary px-5 py-2 text-xs font-bold text-center">
                    צפייה וטיפול בבקשה
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "outgoing" && (
          <div className="space-y-3">
            {outgoingRequests.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                עדיין לא שלחת בקשות.{" "}
                <Link href="/stores" className="font-bold text-[#4b2e83] underline">
                  לחיפוש הטבות זמינות
                </Link>
              </div>
            ) : (
              outgoingRequests.map((req) => (
                <div key={req.id} className="clay-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#241938]">{req.store_name_he}</span>
                      <RequestStatusBadge status={req.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#4e3f69]">{req.product_name}</p>
                    <p className="mt-0.5 text-xs text-[#66548a]">
                      בעל ההטבה: {req.owner_display_name} • נשלחה: {req.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <Link href={`/requests/view?id=${req.id}`} className="clay-btn-primary px-5 py-2 text-xs font-bold text-center">
                    לעמוד הבקשה והצ׳אט
                  </Link>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "benefits" && (
          <div className="space-y-3">
            {myBenefits.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                עדיין לא פרסמת הטבות יום הולדת.{" "}
                <Link href="/benefits/new" className="font-bold text-[#4b2e83] underline">
                  פרסם את ההטבה הראשונה שלך
                </Link>
              </div>
            ) : (
              myBenefits.map((b) => (
                <div key={b.id} className="clay-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#241938]">{b.store_name_he}</span>
                      <BenefitStatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#8a5a00]">{b.discount_value}</p>
                    <p className="mt-0.5 text-xs text-[#66548a]">
                      חלון זכאות: {b.window_start_date} עד {b.window_end_date}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canOwnerHideBenefit(b.status) && (
                      <button
                        type="button"
                        onClick={() => void updateBenefitStatus(b.id, "hidden")}
                        className="inline-flex items-center gap-1 rounded-full border border-[#dfd2fb] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
                      >
                        <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                        הסתר זמנית
                      </button>
                    )}
                    {b.status === "hidden" && (
                      <button
                        type="button"
                        onClick={() => void updateBenefitStatus(b.id, "active")}
                        className="rounded-full bg-[#efe7fe] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83]"
                      >
                        הפעל מחדש
                      </button>
                    )}
                    {b.status === "active" && (
                      <button
                        type="button"
                        onClick={() => void updateBenefitStatus(b.id, "redeemed")}
                        className="rounded-full bg-[#fef6d8] px-3.5 py-1.5 text-xs font-bold text-[#4a3204]"
                      >
                        סמן כמומש מחוץ לאתר
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3">
            {myNotifications.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">אין התראות חדשות.</div>
            ) : (
              myNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`clay-card flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center ${
                    !n.read_at ? "border-[#b79ced] bg-[#faf7ff]" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-[#241938]">{n.title}</p>
                    <p className="text-xs text-[#5a4c73]">{n.body}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => void markNotificationRead(n.id)}
                        className="rounded-full bg-[#efe7fe] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83]"
                      >
                        פתח
                      </Link>
                    )}
                    {!n.read_at && (
                      <button
                        type="button"
                        onClick={() => void markNotificationRead(n.id)}
                        className="text-xs font-semibold text-[#66548a] underline"
                      >
                        סמן כנקרא
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "waitlist" && (
          <div className="space-y-3">
            {waitlistStores.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                אינך רשום/ה לרשימות המתנה כרגע.
              </div>
            ) : (
              waitlistStores.map((s) => (
                <div key={s.id} className="clay-card flex items-center justify-between p-4">
                  <div>
                    <Link href={`/stores/${s.slug}`} className="font-bold text-[#241938] hover:underline">
                      {s.name_he}
                    </Link>
                    <p className="text-xs text-[#5a4c73]">{s.discount_value}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleWaitlist(s.id)}
                    className="rounded-full border border-[#dfd2fb] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83]"
                  >
                    הסר מהרשימה
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="clay-card space-y-6 p-6">
            <div>
              <h2 className="text-lg font-bold text-[#241938]">פרטיות וזכויות המשתמש (תיקון 13)</h2>
              <p className="mt-1 text-sm text-[#5a4c73]">
                תוכל/י להוריד עותק מלא של המידע האישי שלך או לבקש מחיקת חשבון. מחיקת חשבון נחסמת אוטומטית כל עוד קיימת בקשה פעילה או מחלוקת פתוחה.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExportData}
                className="inline-flex items-center gap-2 rounded-full border border-[#4b2e83] bg-white px-5 py-2.5 text-sm font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                ייצוא הנתונים שלי (JSON)
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteAccount()}
                className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-5 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-200"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                מחיקת חשבון
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
