"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  Lock,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  ShoppingBag,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { RequestStatusBadge } from "@/components/Badges";
import { isRequestChatOpen } from "@/lib/domain/state-machine";
import { he } from "@/lib/i18n";

function RequestDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const {
    currentUser,
    requests,
    events,
    messages,
    transitionRequest,
    sendMessage,
    toggleMutualPhoneConsent,
    reportMessage,
  } = useAppData();

  const req = requests.find((r) => r.id === id);
  const [chatText, setChatText] = useState("");
  const [chatWarning, setChatWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeBox, setShowDisputeBox] = useState(false);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <Lock className="mx-auto h-10 w-10 text-[#6c46c1]" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-extrabold">נדרשת התחברות לצפייה בבקשה</h1>
          <Link href="/auth/login" className="clay-btn-primary mt-5 inline-block px-6 py-2.5 text-sm font-bold">
            התחברות
          </Link>
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <h1 className="text-xl font-extrabold">הבקשה לא נמצאה</h1>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-bold text-[#4b2e83] underline">
            חזרה לאזור האישי
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = req.benefit_owner_id === currentUser.id;
  const isBuyer = req.buyer_id === currentUser.id;
  const isAdmin = currentUser.roles.includes("admin");

  if (!isOwner && !isBuyer && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-extrabold text-[#241938]">אין הרשאה לצפייה בבקשה זו</h1>
          <p className="mt-2 text-sm text-[#5a4c73]">
            מטעמי פרטיות (RLS), רק הצדדים לבקשה או מנהל מערכת בבירור מורשים לצפות בתוכנה.
          </p>
          <Link href="/dashboard" className="clay-btn-primary mt-5 inline-block px-5 py-2.5 text-sm font-bold">
            חזרה לאזור האישי
          </Link>
        </div>
      </div>
    );
  }

  const reqEvents = events.filter((e) => e.request_id === req.id);
  const reqMessages = messages.filter((m) => m.request_id === req.id);
  const chatStatus = isRequestChatOpen({ status: req.status, completedAt: req.completed_at });
  const bothConsentedPhone = req.owner_mutual_phone_consent && req.buyer_mutual_phone_consent;

  const handleTransition = async (toStatus: typeof req.status, note?: string) => {
    setActionError(null);
    const res = await transitionRequest(req.id, toStatus, note);
    if (!res.ok) {
      setActionError(res.error ?? "הפעולה נכשלה.");
    } else {
      setShowDisputeBox(false);
      setDisputeReason("");
    }
  };

  const handleChatSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setChatWarning(null);
    const res = await sendMessage(req.id, chatText);
    if (res.ok) {
      setChatText("");
      if (res.warning) setChatWarning(res.warning);
    }
  };

  const steps = [
    { key: "pending", label: "ממתינה לאישור" },
    { key: "accepted", label: "אושרה וצ׳אט פתוח" },
    { key: "purchased", label: "נרכש על ידי הבעלים" },
    { key: "completed", label: "הושלמה בהצלחה" },
  ];
  const stepIndex =
    req.status === "completed" || req.status === "resolved_completed"
      ? 3
      : req.status === "purchased" || req.status === "disputed"
        ? 2
        : req.status === "accepted"
          ? 1
          : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4b2e83] hover:underline">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        חזרה לאזור האישי
      </Link>

      <section className="clay-card mt-4 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#241938]">{req.product_name}</h1>
              <RequestStatusBadge status={req.status} />
            </div>
            <p className="mt-1 text-sm text-[#5a4c73]">
              חנות:{" "}
              <Link href={`/stores/${req.store_slug}`} className="font-bold text-[#4b2e83] underline">
                {req.store_name_he}
              </Link>{" "}
              • בעל הטבה: <strong>{req.owner_display_name}</strong> • קונה:{" "}
              <strong>{req.buyer_display_name}</strong>
            </p>
          </div>
          <a
            href={req.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd2fb] bg-white px-4 py-2 text-xs font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
          >
            צפייה במוצר באתר החנות
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>

        <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="שלבי הבקשה">
          {steps.map((s, idx) => {
            const done = idx <= stepIndex && !["declined", "cancelled", "expired"].includes(req.status);
            return (
              <li
                key={s.key}
                className={`rounded-2xl px-3 py-2.5 text-center text-xs font-bold ${
                  done ? "bg-[#e7dbfd] text-[#3b226b]" : "bg-[#f7f3ff] text-[#8a7ba8]"
                }`}
              >
                {idx + 1}. {s.label}
              </li>
            );
          })}
        </ol>

        {req.buyer_notes && (
          <div className="mt-4 rounded-2xl bg-[#f7f3ff] p-3.5 text-sm text-[#382759]">
            <strong className="text-xs text-[#4b2e83] block mb-0.5">הערות הקונה:</strong>
            {req.buyer_notes}
          </div>
        )}

        <div className="mt-6 border-t border-[#efe7fe] pt-5">
          {actionError && (
            <div role="alert" className="mb-3 flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {actionError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {isOwner && (req.status === "pending" || req.status === "info_requested") && (
              <>
                <button
                  type="button"
                  onClick={() => void handleTransition("accepted", "בעל ההטבה אישר את הבקשה")}
                  className="clay-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  אישור בקשה ופתיחת צ׳אט
                </button>
                {req.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => void handleTransition("info_requested", "נדרשים פרטים נוספים מהקונה")}
                    className="rounded-full bg-[#fef6d8] px-4 py-2.5 text-sm font-bold text-[#4a3204]"
                  >
                    בקשת פרטים נוספים
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleTransition("declined", "הבקשה נדחתה על ידי בעל ההטבה")}
                  className="rounded-full border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-50"
                >
                  דחיית בקשה
                </button>
              </>
            )}

            {isOwner && req.status === "accepted" && (
              <button
                type="button"
                onClick={() => void handleTransition("purchased", "בעל ההטבה ביצע את ההזמנה בחשבונו האישי")}
                className="clay-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                ביצעתי את הרכישה בחשבון שלי
              </button>
            )}

            {isBuyer && req.status === "purchased" && (
              <button
                type="button"
                onClick={() => void handleTransition("completed", "הקונה אישר את קבלת המוצר — העסקה הושלמה")}
                className="clay-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                אישור קבלת המוצר וסיום עסקה
              </button>
            )}

            {(isBuyer || isOwner) &&
              (req.status === "pending" || req.status === "info_requested" || req.status === "accepted") && (
                <button
                  type="button"
                  onClick={() => void handleTransition("cancelled", "הבקשה בוטלה בהסכמת אחד הצדדים")}
                  className="rounded-full border border-[#dfd2fb] px-4 py-2.5 text-sm font-bold text-[#5a4c73] hover:bg-[#f3ecff]"
                >
                  ביטול בקשה
                </button>
              )}

            {(isBuyer || isOwner) && req.status === "purchased" && (
              <button
                type="button"
                onClick={() => setShowDisputeBox((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-4 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-200"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                פתיחת מחלוקת / בירור מנהל
              </button>
            )}
          </div>

          {showDisputeBox && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-3">
              <p className="text-xs font-bold text-rose-900">
                פתיחת מחלוקת תעביר את התיק לבדיקת מנהל (איסוף גרסאות עד 5 ימי עסקים). האתר אינו מחזיר כספים אך מתעד ומטפל בחשבונות פוגעניים.
              </p>
              <textarea
                rows={2}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="תאר/י בקצרה את הבעיה..."
                className="w-full rounded-xl border border-rose-200 bg-white p-2.5 text-sm"
              />
              <button
                type="button"
                disabled={disputeReason.trim().length < 5}
                onClick={() => void handleTransition("disputed", disputeReason)}
                className="rounded-full bg-rose-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                אישור פתיחת מחלוקת
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section aria-label="צ׳אט פנימי לבקשה" className="clay-card p-5 lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#efe7fe] pb-3">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-[#241938]">
              <MessageSquare className="h-5 w-5 text-[#6c46c1]" aria-hidden="true" />
              צ׳אט פנימי מאובטח
            </h2>
            {chatStatus.open && (isBuyer || isOwner) && (
              <button
                type="button"
                onClick={() => void toggleMutualPhoneConsent(req.id)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  bothConsentedPhone ? "bg-emerald-100 text-emerald-900" : "bg-[#f3ecff] text-[#4b2e83]"
                }`}
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {bothConsentedPhone
                  ? "הסכמה הדדית לחשיפת טלפון פעילה"
                  : "אישור הדדי לשיתוף טלפון למשלוח"}
              </button>
            )}
          </div>

          {!chatStatus.open ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <Lock className="h-8 w-8 text-[#9c82d6]" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-[#241938]">{chatStatus.reason}</p>
              <p className="mt-1 text-xs text-[#66548a]">כל פרטי הקשר נשארים חסויים עד לפתיחת הצ׳אט.</p>
            </div>
          ) : (
            <>
              <div className="mt-3 rounded-xl bg-[#fef6d8] px-3 py-2 text-[11px] font-medium text-[#4a3204]">
                <strong>סדר פעולות בטוח:</strong> בעל ההטבה מזמין ושולח אישור הזמנה (ללא פרטים אישיים); הקונה מסדיר תשלום רק לאחר צפייה באישור.
              </div>

              <div className="mt-4 flex-1 space-y-3 max-h-80 overflow-y-auto pl-1">
                {reqMessages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#66548a]">
                    הצ׳אט פתוח! ניתן לתאם כאן את כתובת המשלוח ופרטי ההזמנה.
                  </p>
                ) : (
                  reqMessages.map((m) => {
                    const mine = m.sender_id === currentUser.id;
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? "items-start" : "items-end"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine ? "bg-[#4b2e83] text-white" : "bg-[#f3ecff] text-[#241938]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 mb-1">
                            <span className="font-bold">{m.sender_name}</span>
                            <span>{m.created_at.slice(11, 16)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        </div>
                        {!mine && (
                          <button
                            type="button"
                            onClick={() => void reportMessage(m.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#66548a] hover:text-rose-700"
                          >
                            <Flag className="h-3 w-3" aria-hidden="true" />
                            {m.reported ? "דווח לצוות" : "דיווח על הודעה"}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {chatWarning && (
                <div role="status" className="mt-3 rounded-xl bg-amber-100 p-2.5 text-xs font-semibold text-amber-900">
                  {chatWarning}
                </div>
              )}

              <form onSubmit={handleChatSend} className="mt-4 flex gap-2 border-t border-[#efe7fe] pt-3">
                <label htmlFor="chat-input" className="sr-only">
                  כתיבת הודעה בצ׳אט
                </label>
                <input
                  id="chat-input"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="כתוב/י הודעה לתיאום ההזמנה והמשלוח..."
                  className="flex-1 rounded-full border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="clay-btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  שלח
                </button>
              </form>
            </>
          )}
        </section>

        <section aria-label="היסטוריית סטטוסים" className="clay-card p-5 lg:col-span-5">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-[#241938] border-b border-[#efe7fe] pb-3">
            <Clock className="h-5 w-5 text-[#6c46c1]" aria-hidden="true" />
            היסטוריית בקשה (Audit Log)
          </h2>
          <ol className="mt-4 space-y-3">
            {reqEvents.map((ev) => (
              <li key={ev.id} className="rounded-2xl bg-[#f7f3ff] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#4b2e83]">{he.requestStatus[ev.to_status]}</span>
                  <span className="text-[11px] text-[#66548a]">{ev.created_at.slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="mt-1 text-[#382759]">{ev.note ?? "עדכון סטטוס"}</p>
                <p className="mt-0.5 text-[11px] text-[#66548a]">בוצע ע״י: {ev.actor_name}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export default function RequestViewPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-[#5a4c73]">טוען בקשה...</div>}>
      <RequestDetailInner />
    </Suspense>
  );
}
