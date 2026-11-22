"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Calendar, CheckCircle2, Gift, ShieldCheck } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import { computeEligibilityWindow, getTodayInIsrael } from "@/lib/domain/eligibility-window";
import type { EligibilityWindowType } from "@/lib/types";

function PublishBenefitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStoreId = searchParams.get("store") ?? "";

  const { stores, currentUser, publishBenefit } = useAppData();
  const approvedStores = useMemo(
    () => stores.filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests),
    [stores]
  );

  const [storeId, setStoreId] = useState(initialStoreId || approvedStores[0]?.id || "");
  const selectedStore = approvedStores.find((s) => s.id === storeId) ?? approvedStores[0];

  const todayIl = getTodayInIsrael();
  const currentYear = Number(todayIl.split("-")[0]);

  const [windowType, setWindowType] = useState<EligibilityWindowType>(
    selectedStore?.default_window_type ?? "month"
  );
  const [customStart, setCustomStart] = useState(todayIl);
  const [customEnd, setCustomEnd] = useState(todayIl);
  const [notes, setNotes] = useState("");
  const [selfDeclared, setSelfDeclared] = useState(false);
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const previewWindow = useMemo(() => {
    if (!currentUser || !selectedStore) return null;
    return computeEligibilityWindow({
      birthMonth: currentUser.birth_month,
      birthDay: 15,
      referenceYear: currentYear,
      windowType,
      daysBefore: selectedStore.default_window_days_before,
      daysAfter: selectedStore.default_window_days_after,
      customStart,
      customEnd,
    });
  }, [currentUser, selectedStore, currentYear, windowType, customStart, customEnd]);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="clay-card p-8">
          <Gift className="mx-auto h-10 w-10 text-[#6c46c1]" aria-hidden="true" />
          <h1 className="mt-3 text-xl font-extrabold text-[#241938]">נדרשת התחברות לפרסום הטבה</h1>
          <p className="mt-2 text-sm text-[#5a4c73]">
            התחבר/י או הירשם/י בחינם כדי לשתף את הטבת יום ההולדת שלך עם הקהילה.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/auth/login" className="clay-btn-primary px-5 py-2.5 text-sm font-bold">
              התחברות
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full border border-[#dfd2fb] px-5 py-2.5 text-sm font-bold text-[#4b2e83]"
            >
              הרשמה בחינם
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selfDeclared || !termsConfirmed) {
      setError("חובה לאשר את הצהרת הזכאות העצמית ואת תנאי המועדון.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await publishBenefit({
        storeId: selectedStore.id,
        windowType,
        windowStartDate: windowType === "custom_range" ? customStart : previewWindow?.startDate,
        windowEndDate: windowType === "custom_range" ? customEnd : previewWindow?.endDate,
        notes,
      });
      if (!res.ok) {
        setError(res.error ?? "לא ניתן לפרסם הטבה.");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="clay-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-[#3b226b]">
            <Gift className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#241938]">פרסום הטבת יום הולדת</h1>
            <p className="text-xs text-[#5a4c73]">
              ניתן לפרסם רק בחנויות שעברו את שער החוקיות. ללא העלאת צילומי מסך או מסירת קודים!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="pub-store" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              בחירת חנות מאושרת *
            </label>
            <select
              id="pub-store"
              value={selectedStore?.id ?? ""}
              onChange={(e) => {
                const next = approvedStores.find((s) => s.id === e.target.value);
                setStoreId(e.target.value);
                if (next) setWindowType(next.default_window_type);
              }}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-3 text-sm font-semibold"
            >
              {approvedStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_he} — {s.discount_value}
                </option>
              ))}
            </select>
            {selectedStore?.legality_conditions && (
              <p className="mt-2 rounded-xl bg-[#fef6d8] p-3 text-xs text-[#4a3204]">
                <strong>תנאי המועדון:</strong> {selectedStore.legality_conditions}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="pub-window-type" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              חלון זכאות ההטבה (אזור זמן ישראל)
            </label>
            <select
              id="pub-window-type"
              value={windowType}
              onChange={(e) => setWindowType(e.target.value as EligibilityWindowType)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-3 text-sm"
            >
              <option value="month">כל חודש יום ההולדת</option>
              <option value="week">שבוע סביב יום ההולדת</option>
              <option value="days_around">ברירת מחדל של החנות (ימים לפני/אחרי)</option>
              <option value="custom_range">טווח תאריכים מותאם אישית</option>
            </select>

            {windowType === "custom_range" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="pub-start" className="block text-xs font-semibold text-[#5a4c73] mb-1">
                    מתאריך
                  </label>
                  <input
                    id="pub-start"
                    type="date"
                    required
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="pub-end" className="block text-xs font-semibold text-[#5a4c73] mb-1">
                    עד תאריך
                  </label>
                  <input
                    id="pub-end"
                    type="date"
                    required
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              previewWindow && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#4b2e83]">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  חלון מחושב: {previewWindow.startDate} עד {previewWindow.endDate}
                </p>
              )
            )}
          </div>

          <div>
            <label htmlFor="pub-notes" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              הערות לקונה (שעות נוחות להזמנה, דגשים — ללא פרטי קשר אישיים)
            </label>
            <textarea
              id="pub-notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="למשל: זמין/ה להזמנה בערבים, אשמח לעזור בכיף."
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          {/* Self-Declaration & Legality Confirmation (Section 3.4 & 7.3) */}
          <div className="space-y-2.5 rounded-2xl bg-[#f7f3ff] p-4 text-xs">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selfDeclared}
                onChange={(e) => setSelfDeclared(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>
                <strong>אימות עצמי (סעיף 7.3):</strong> אני מצהיר/ה שיש לי חברות בתוקף והטבת יום הולדת זמינה בחנות זו. ידוע לי שאין להעלות צילומי מסך של חשבון המועדון.
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsConfirmed}
                onChange={(e) => setTermsConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>
                קראתי את תנאי המועדון, לפי ידיעתי הפעולה מותרת, ואני מתחייב/ת לבצע את הרכישה בעצמי בחשבוני בלבד ללא העברת קודים או פרטי התחברות.
              </span>
            </label>
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="clay-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {submitting ? "מפרסם..." : "פרסום הטבה בקהילה"}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#66548a]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            תוכל/י להסתיר או לסמן כמומשת בכל עת (כל עוד אין בקשה פעילה בשלב רכישה).
          </p>
        </form>
      </div>
    </div>
  );
}

export default function PublishBenefitPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm">טוען טופס פרסום...</div>}>
      <PublishBenefitForm />
    </Suspense>
  );
}
