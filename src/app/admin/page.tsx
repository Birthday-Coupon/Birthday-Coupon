"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Megaphone,
  Scale,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { LegalityBadge } from "@/components/Badges";
import type { LegalityStatus } from "@/lib/types";

type AdminTab = "stores" | "disputes" | "takedowns" | "banner" | "logs";

export default function AdminPage() {
  const {
    currentUser,
    stores,
    disputes,
    takedowns,
    adminLogs,
    reviewStoreLegality,
    resolveDispute,
    setSystemBanner,
  } = useAppData();

  const [tab, setTab] = useState<AdminTab>("stores");
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [legalityStatus, setLegalityStatus] = useState<LegalityStatus>("conditional");
  const [quotedClause, setQuotedClause] = useState("");
  const [conditions, setConditions] = useState("");
  const [takedownFlag, setTakedownFlag] = useState(false);

  const [bannerText, setBannerText] = useState("");
  const [bannerSeverity, setBannerSeverity] = useState<"info" | "warning" | "urgent">("info");
  const [feedback, setFeedback] = useState<string | null>(null);

  const isStaff =
    currentUser?.roles.includes("admin") || currentUser?.roles.includes("content_manager");

  if (!currentUser || !isStaff) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-extrabold text-[#241938]">אין הרשאת גישה לממשק הניהול</h1>
          <p className="mt-2 text-sm text-[#5a4c73]">
            גישה לממשק הניהול מותרת רק לבעלי תפקיד <code>admin</code> או <code>content_manager</code> בטבלת <code>user_roles</code> (ועם אימות דו-שלבי בייצור).
          </p>
          <Link href="/" className="clay-btn-primary mt-5 inline-block px-5 py-2.5 text-sm font-bold">
            חזרה לדף הבית
          </Link>
        </div>
      </div>
    );
  }

  const startEditStore = (storeId: string) => {
    const s = stores.find((item) => item.id === storeId);
    if (!s) return;
    setEditingStoreId(storeId);
    setLegalityStatus(s.legality_status);
    setQuotedClause(s.terms_quoted_clause ?? "");
    setConditions(s.legality_conditions ?? "");
    setTakedownFlag(s.takedown_requested);
  };

  const saveStoreReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreId) return;
    const res = await reviewStoreLegality({
      storeId: editingStoreId,
      legalityStatus,
      quotedClause,
      conditions,
      takedownRequested: takedownFlag,
    });
    if (res.ok) {
      setFeedback("בדיקת התקנון והסיווג עודכנו ונרשמו ביומן admin_logs (הבדיקה הבאה בעוד 90 יום).");
      setEditingStoreId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="clay-card flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fef6d8] text-[#4a3204]">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#241938]">ממשק ניהול ובקרה</h1>
            <p className="text-xs text-[#5a4c73]">
              כל פעולה מתועדת אוטומטית ב-<code>admin_logs</code> • מחובר/ת כ: {currentUser.display_name}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { key: "stores" as const, label: `תור בדיקת חנויות (${stores.length})`, icon: Scale },
          { key: "disputes" as const, label: `מחלוקות (${disputes.length})`, icon: ShieldAlert },
          { key: "takedowns" as const, label: `בקשות הסרה (${takedowns.length})`, icon: ClipboardList },
          { key: "banner" as const, label: "באנר מערכת", icon: Megaphone },
          { key: "logs" as const, label: `יומן פעולות (${adminLogs.length})`, icon: CheckCircle2 },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
                tab === t.key
                  ? "bg-[#4b2e83] text-white"
                  : "bg-white border border-[#e6dcfb] text-[#4b2e83] hover:bg-[#f3ecff]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div role="status" className="mt-4 rounded-2xl bg-emerald-100 p-3 text-xs font-bold text-emerald-900">
          {feedback}
        </div>
      )}

      <div className="mt-6">
        {tab === "stores" && (
          <div className="space-y-4">
            {stores.map((s) => (
              <div key={s.id} className="clay-card p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-[#241938]">{s.name_he}</h2>
                      <LegalityBadge
                        status={s.legality_status}
                        takedownRequested={s.takedown_requested}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[#66548a]">
                      בדיקה אחרונה: {s.last_reviewed_at?.slice(0, 10) ?? "—"} • בדיקה הבאה:{" "}
                      {s.next_review_at?.slice(0, 10) ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditStore(s.id)}
                    className="rounded-full bg-[#efe7fe] px-4 py-2 text-xs font-bold text-[#4b2e83] hover:bg-[#4b2e83] hover:text-white"
                  >
                    עדכון סיווג / תקנון
                  </button>
                </div>

                {editingStoreId === s.id && (
                  <form onSubmit={saveStoreReview} className="mt-4 space-y-3 border-t border-[#efe7fe] pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-bold text-[#4b2e83] mb-1">סיווג חוקיות</label>
                        <select
                          value={legalityStatus}
                          onChange={(e) => setLegalityStatus(e.target.value as LegalityStatus)}
                          className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-sm"
                        >
                          <option value="allowed">מותר (allowed)</option>
                          <option value="conditional">מותנה (conditional)</option>
                          <option value="prohibited">אסור (prohibited)</option>
                          <option value="unverified">לא נבדק (unverified)</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-rose-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={takedownFlag}
                          onChange={(e) => setTakedownFlag(e.target.checked)}
                          className="h-4 w-4 accent-rose-700"
                        />
                        הסרה לבקשת חנות (יבטל בקשות פתוחות!)
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4b2e83] mb-1">ציטוט תומך מהתקנון</label>
                      <textarea
                        rows={2}
                        required
                        value={quotedClause}
                        onChange={(e) => setQuotedClause(e.target.value)}
                        className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#4b2e83] mb-1">תנאים המוצגים למשתמש</label>
                      <textarea
                        rows={2}
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] p-2.5 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="clay-btn-primary px-5 py-2 text-xs font-bold">
                        שמירה ותיעוד בדיקה
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingStoreId(null)}
                        className="rounded-full px-4 py-2 text-xs font-semibold text-[#5a4c73]"
                      >
                        ביטול
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "disputes" && (
          <div className="space-y-4">
            {disputes.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                אין מחלוקות פתוחות כרגע.
              </div>
            ) : (
              disputes.map((d) => (
                <div key={d.id} className="clay-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-bold text-[#241938]">
                      {d.store_name_he} — {d.product_name}
                    </h2>
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-900">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#4e3f69]">
                    נפתח ע״י: <strong>{d.opened_by_name}</strong> • סיבה: {d.reason}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/requests/${d.request_id}`}
                      className="rounded-full border border-[#dfd2fb] px-4 py-1.5 text-xs font-bold text-[#4b2e83]"
                    >
                      צפייה ב-request_events ובצ׳אט
                    </Link>
                    {d.status === "open" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void resolveDispute(d.id, "resolved_completed", "אושרה השלמה על ידי מנהל")
                          }
                          className="rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-bold text-emerald-900"
                        >
                          סגירה כהושלמה
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void resolveDispute(d.id, "resolved_cancelled", "בוטלה על ידי מנהל")
                          }
                          className="rounded-full bg-slate-200 px-4 py-1.5 text-xs font-bold text-slate-800"
                        >
                          סגירה כמבוטלת
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "takedowns" && (
          <div className="space-y-3">
            {takedowns.length === 0 ? (
              <div className="clay-card p-8 text-center text-sm text-[#5a4c73]">
                אין בקשות הסרה או תיקון מחנויות כרגע.
              </div>
            ) : (
              takedowns.map((t) => (
                <div key={t.id} className="clay-card p-5 text-sm">
                  <p className="font-bold text-[#241938]">
                    {t.store_name_submitted} ({t.request_type === "takedown" ? "הסרה" : "תיקון"})
                  </p>
                  <p className="text-xs text-[#5a4c73]">
                    איש קשר: {t.contact_name} ({t.contact_role}) • {t.contact_email}
                  </p>
                  <p className="mt-2 text-[#382759]">{t.details}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "banner" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await setSystemBanner(bannerText, bannerSeverity, true);
              setFeedback("באנר המערכת עודכן ופורסם בראש האתר.");
              setBannerText("");
            }}
            className="clay-card p-6 space-y-4 max-w-xl"
          >
            <h2 className="text-lg font-bold text-[#241938]">פרסום הודעת מערכת (באנר עליון)</h2>
            <textarea
              required
              rows={2}
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="הודעה חשובה לכלל המשתמשים..."
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] p-3 text-sm"
            />
            <select
              value={bannerSeverity}
              onChange={(e) => setBannerSeverity(e.target.value as "info" | "warning" | "urgent")}
              className="rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-sm"
            >
              <option value="info">מידע (צהוב רך)</option>
              <option value="warning">אזהרה</option>
              <option value="urgent">דחוף (אדום)</option>
            </select>
            <button type="submit" className="clay-btn-primary px-6 py-2.5 text-sm font-bold block">
              עדכון באנר פעיל
            </button>
          </form>
        )}

        {tab === "logs" && (
          <div className="clay-card p-5">
            <h2 className="text-base font-bold text-[#241938] mb-3">יומן פעולות מנהל (admin_logs)</h2>
            <ul className="space-y-2 text-xs">
              {adminLogs.map((log) => (
                <li key={log.id} className="rounded-xl bg-[#f7f3ff] p-3 flex flex-wrap justify-between gap-2">
                  <span>
                    <strong>{log.admin_name}</strong> — <code>{log.action}</code> ({log.target_type}:{" "}
                    {log.target_id})
                  </span>
                  <span className="text-[#66548a]">{log.created_at.slice(0, 16).replace("T", " ")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
