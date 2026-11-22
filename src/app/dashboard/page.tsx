"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  Calendar,
  Download,
  EyeOff,
  Gift,
  Inbox,
  Pencil,
  Send,
  Settings,
  Trash2,
  CheckCircle2,
  BookmarkCheck,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { BenefitStatusBadge, RequestStatusBadge } from "@/components/Badges";
import { canOwnerHideBenefit } from "@/lib/domain/state-machine";
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
} from "@/lib/services/browser-notifications";
import { he } from "@/lib/i18n";

type TabKey = "benefits" | "incoming" | "outgoing" | "notifications" | "waitlist" | "settings";

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
    updateBenefitStatus,
    updateBenefitDetails,
    toggleWaitlist,
    markNotificationRead,
    updateBirthDate,
    deleteAccount,
  } = useAppData();

  const [tab, setTab] = useState<TabKey>("incoming");
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingBenefitEdit, setSavingBenefitEdit] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState(currentUserBirthDate ?? "");
  const [savingBirthDate, setSavingBirthDate] = useState(false);
  const [notifPermission, setNotifPermission] = useState<BrowserNotificationPermission>("default");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNotifPermission(getBrowserNotificationPermission());
  }, []);

  useEffect(() => {
    if (currentUserBirthDate) {
      setBirthDateInput(currentUserBirthDate);
    }
  }, [currentUserBirthDate]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm font-semibold text-[#5a4c73]">
        טוען את האזור האישי...
      </div>
    );
  }

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

  const handleEnableBrowserNotifs = async () => {
    setError(null);
    const perm = await requestBrowserNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      showBrowserNotification({
        title: "מתנת יום הולדת — ההתראות הופעלו!",
        body: "מעכשיו תקבל/י התראות דפדפן ו-Windows בזמן אמת על בקשות והודעות חדשות.",
      });
      setFeedback("התראות דפדפן / ווינדוס הופעלו בהצלחה!");
    } else if (perm === "denied") {
      setError("הרשאת ההתראות חסומה בדפדפן. ניתן לאפשר אותה דרך הגדרות האתר בסרגל הכתובת.");
    }
  };

  const handleSaveBirthDate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSavingBirthDate(true);
    try {
      const res = await updateBirthDate(birthDateInput);
      if (!res.ok) {
        setError(res.error ?? "לא ניתן לעדכן את תאריך הלידה.");
      } else {
        setFeedback("תאריך הלידה עודכן בהצלחה! חודש הלידה שלך בפרופיל עודכן בהתאם.");
      }
    } finally {
      setSavingBirthDate(false);
    }
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
              myBenefits.map((b) => {
                const canEdit = b.status !== "redeemed" && b.status !== "removed";
                const isEditing = editingBenefitId === b.id;
                return (
                  <div key={b.id} className="clay-card p-5 space-y-4">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-[#241938]">{b.store_name_he}</span>
                          <BenefitStatusBadge status={b.status} />
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#8a5a00]">{b.discount_value}</p>
                        <p className="mt-0.5 text-xs text-[#66548a]">
                          חלון זכאות: {b.window_start_date} עד {b.window_end_date}
                        </p>
                        {b.notes && (
                          <p className="mt-1 text-xs text-[#4e3f69]">{b.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBenefitId(isEditing ? null : b.id);
                              setEditStartDate(b.window_start_date);
                              setEditEndDate(b.window_end_date);
                              setEditNotes(b.notes ?? "");
                              setError(null);
                              setFeedback(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#efe7fe] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83] hover:bg-[#e1d1fc]"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            {isEditing ? "סגור עריכה" : "עריכת פרטים ותאריכים"}
                          </button>
                        )}
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

                    {isEditing && (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setError(null);
                          setFeedback(null);
                          setSavingBenefitEdit(true);
                          try {
                            const res = await updateBenefitDetails({
                              benefitId: b.id,
                              windowStartDate: editStartDate,
                              windowEndDate: editEndDate,
                              notes: editNotes,
                            });
                            if (!res.ok) {
                              setError(res.error ?? "לא ניתן לעדכן את ההטבה.");
                            } else {
                              setFeedback("פרטי ההטבה והתאריכים עודכנו בהצלחה!");
                              setEditingBenefitId(null);
                            }
                          } finally {
                            setSavingBenefitEdit(false);
                          }
                        }}
                        className="space-y-3 border-t border-[#efe7fe] pt-4"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold text-[#4b2e83] mb-1">
                              תאריך תחילת זכאות *
                            </label>
                            <input
                              type="date"
                              required
                              value={editStartDate}
                              onChange={(e) => setEditStartDate(e.target.value)}
                              className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#4b2e83] mb-1">
                              תאריך סיום זכאות *
                            </label>
                            <input
                              type="date"
                              required
                              value={editEndDate}
                              onChange={(e) => setEditEndDate(e.target.value)}
                              className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#4b2e83] mb-1">
                            הערות לקונה
                          </label>
                          <textarea
                            rows={2}
                            maxLength={500}
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={savingBenefitEdit}
                            className="clay-btn-primary px-5 py-2 text-xs font-bold disabled:opacity-60"
                          >
                            {savingBenefitEdit ? "שומר..." : "שמירת שינויים"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBenefitId(null)}
                            className="rounded-full px-4 py-2 text-xs font-semibold text-[#5a4c73]"
                          >
                            ביטול
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-4">
            <div className="clay-card flex flex-col justify-between gap-3 bg-[#faf7ff] p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#241938]">
                  <BellRing className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
                  התראות דפדפן / ווינדוס (בזמן אמת, ללא מיילים)
                </h2>
                <p className="mt-1 text-xs text-[#5a4c73]">
                  {notifPermission === "granted"
                    ? "התראות דפדפן ו-Windows פעילות. תקבל/י קפיצה מיידית על בקשות, אישורים והודעות."
                    : notifPermission === "denied"
                      ? "התראות הדפדפן חסומות כרגע — ניתן לאפשר אותן בהגדרות הדפדפן."
                      : "הפעל/י התראות דפדפן כדי לקבל עדכונים ישירות ל-Windows ולדפדפן."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {notifPermission !== "granted" ? (
                  <button
                    type="button"
                    onClick={() => void handleEnableBrowserNotifs()}
                    className="clay-btn-primary px-4 py-2 text-xs font-bold"
                  >
                    הפעל התראות דפדפן / ווינדוס
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      showBrowserNotification({
                        title: "בדיקת התראה — מתנת יום הולדת",
                        body: "התראות הדפדפן וה-Windows שלך עובדות מצוין!",
                      })
                    }
                    className="rounded-full bg-[#fef6d8] px-4 py-2 text-xs font-bold text-[#4a3204]"
                  >
                    שלח התראת בדיקה
                  </button>
                )}
              </div>
            </div>

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
                        href={n.link.replace(/^\/requests\/([0-9a-fA-F-]+)$/, "/requests/view?id=$1")}
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
          <div className="space-y-5">
            {/* Birth Date Update Card */}
            <form onSubmit={handleSaveBirthDate} className="clay-card space-y-4 p-6">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-[#241938]">
                  <Calendar className="h-5 w-5 text-[#6c46c1]" aria-hidden="true" />
                  עדכון תאריך לידה
                </h2>
                <p className="mt-1 text-xs text-[#5a4c73]">
                  תאריך הלידה המלא נשמר בטבלה הפרטית שלך בלבד (<code>user_private</code>) ואינו מוצג למשתמשים אחרים. חודש הלידה הציבורי יתעדכן אוטומטית.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="settings-dob" className="block text-xs font-bold text-[#4b2e83] mb-1">
                    תאריך לידה (גיל 18+ בלבד)
                  </label>
                  <input
                    id="settings-dob"
                    type="date"
                    required
                    value={birthDateInput}
                    onChange={(e) => setBirthDateInput(e.target.value)}
                    className="rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingBirthDate || !birthDateInput}
                  className="clay-btn-primary px-5 py-2.5 text-sm font-bold disabled:opacity-60"
                >
                  {savingBirthDate ? "שומר..." : "שמור תאריך לידה"}
                </button>
              </div>
            </form>

            {/* Privacy & Account Actions */}
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
          </div>
        )}
      </div>
    </div>
  );
}
