"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BellPlus,
  BellRing,
  ExternalLink,
  Gift,
  Info,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { LegalityBadge } from "@/components/Badges";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import {
  daysUntilWindowEnd,
  getTodayInIsrael,
  isDateWithinWindow,
} from "@/lib/domain/eligibility-window";
import { he } from "@/lib/i18n";

export function StoreDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const {
    stores,
    benefits,
    currentUser,
    waitlistStoreIds,
    toggleWaitlist,
    createPurchaseRequest,
    acknowledgeSafety,
  } = useAppData();

  const store = stores.find((s) => s.slug === slug);
  const [selectedBenefitId, setSelectedBenefitId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [compensationType, setCompensationType] = useState<"free_help" | "symbolic_thanks">("free_help");
  const [compensationNote, setCompensationNote] = useState("");
  const [buyerNotes, setBuyerNotes] = useState("");
  const [termsConfirmed, setTermsConfirmed] = useState(false);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const todayIl = getTodayInIsrael();

  const activeBenefits = useMemo(() => {
    if (!store) return [];
    const gate = evaluateStoreLegalityGate(store);
    if (!gate.canListBenefits) return [];
    return benefits
      .filter(
        (b) =>
          b.store_id === store.id &&
          b.status === "active" &&
          isDateWithinWindow(b.window_start_date, b.window_end_date, todayIl)
      )
      // Spec v2 Section 8: Sort verified first, then soonest expiry
      .sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return a.window_end_date.localeCompare(b.window_end_date);
      });
  }, [store, benefits, todayIl]);

  if (!store) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-lg font-bold">החנות לא נמצאה.</p>
        <Link href="/stores" className="mt-4 inline-block text-sm font-bold text-[#4b2e83] underline">
          חזרה למאגר החנויות
        </Link>
      </div>
    );
  }

  const gate = evaluateStoreLegalityGate(store);
  const inWaitlist = waitlistStoreIds.includes(store.id);
  const needsSafetyAck = Boolean(currentUser && !currentUser.safety_acknowledged_at);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenefitId) return;
    setError(null);

    if (!termsConfirmed) {
      setError("חובה לאשר שקראת את תנאי המועדון ושלפי ידיעתך הפעולה מותרת.");
      return;
    }
    if (needsSafetyAck && !safetyConfirmed) {
      setError("לפני הבקשה הראשונה חובה לאשר שקראת את כללי הבטיחות בעסקה.");
      return;
    }

    setSubmitting(true);
    try {
      if (needsSafetyAck) {
        await acknowledgeSafety();
      }
      const res = await createPurchaseRequest({
        benefitId: selectedBenefitId,
        productName,
        productUrl: productUrl || store.website_url,
        estimatedPriceIls: estimatedPrice ? Number(estimatedPrice) : undefined,
        compensationType,
        compensationNote,
        buyerNotes,
      });
      if (!res.ok) {
        setError(res.error ?? "לא ניתן לשלוח את הבקשה.");
      } else if (res.requestId) {
        router.push(`/requests/${res.requestId}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/stores"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4b2e83] hover:underline"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        חזרה למאגר החנויות
      </Link>

      {/* Store Header Card */}
      <section className="clay-card mt-4 p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-2xl font-extrabold text-[#3b226b] shadow-sm"
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-[#241938] sm:text-3xl">{store.name_he}</h1>
                <LegalityBadge
                  status={store.legality_status}
                  takedownRequested={store.takedown_requested}
                />
              </div>
              <p className="mt-1 text-xs font-medium text-[#66548a]">
                {he.brand.noAffiliation} • מועדון: {store.club_name ?? "מועדון לקוחות"} • דמי חברות: {store.club_fee_info}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={store.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd2fb] bg-white px-4 py-2 text-xs font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
            >
              אתר החנות
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <Link
              href={`/takedown?store=${encodeURIComponent(store.name_he)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#efe7fe] px-4 py-2 text-xs font-medium text-[#66548a] hover:bg-[#f7f3ff]"
            >
              בקשת הסרה / תיקון
            </Link>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#fef6d8] p-4 text-[#4a3204]">
          <p className="text-sm font-extrabold flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            הטבת יום ההולדת: {store.discount_value}
          </p>
          <p className="mt-1 text-sm">{store.benefit_summary}</p>
        </div>

        {/* Store Details Grid */}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-[#f7f3ff] p-3.5">
            <dt className="text-xs font-bold text-[#66548a]">אופן מימוש ההטבה</dt>
            <dd className="mt-1 font-medium text-[#241938]">{store.redemption_method}</dd>
          </div>
          <div className="rounded-2xl bg-[#f7f3ff] p-3.5">
            <dt className="text-xs font-bold text-[#66548a]">מגבלות ותנאים</dt>
            <dd className="mt-1 font-medium text-[#241938]">
              {store.purchase_limits ?? "חד-פעמי לחבר מועדון"}
            </dd>
          </div>
          <div className="rounded-2xl bg-[#f7f3ff] p-3.5">
            <dt className="text-xs font-bold text-[#66548a]">כפל מבצעים ומשלוח</dt>
            <dd className="mt-1 font-medium text-[#241938]">
              {store.valid_on_sale ? "תקף גם במבצעים" : "בכפוף לתנאי מבצעים"} • משלוח לישראל:{" "}
              {store.shipping_countries.includes("IL") ? "כן" : "לא"}
            </dd>
          </div>
        </dl>

        {/* Legality Gate Box (Section 3) */}
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            gate.canAcceptRequests
              ? "border-[#dfd2fb] bg-[#faf7ff]"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <Scale className="mt-0.5 h-5 w-5 shrink-0 text-[#4b2e83]" aria-hidden="true" />
            <div className="space-y-1 text-sm">
              <p className="font-bold text-[#241938]">שער חוקיות ותנאי מועדון: {gate.labelHe}</p>
              <p className="text-[#4e3f69]">{gate.explanationHe}</p>
              {store.terms_quoted_clause && (
                <blockquote className="mt-2 border-r-2 border-[#b79ced] pr-3 text-xs italic text-[#5a4c73]">
                  ציטוט מבדיקת התקנון: &ldquo;{store.terms_quoted_clause}&rdquo;
                </blockquote>
              )}
              <p className="pt-1 text-[11px] text-[#66548a]">
                בדיקה אחרונה: {store.last_reviewed_at?.slice(0, 10) ?? "—"} • בדיקה תקופתית הבאה (כל 90 יום):{" "}
                {store.next_review_at?.slice(0, 10) ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE BENEFITS OR INFORMATIONAL-ONLY NOTICE */}
      <section className="mt-8" aria-labelledby="benefits-section-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="benefits-section-heading" className="text-xl font-extrabold text-[#241938]">
            הטבות יום הולדת פעילות כרגע
          </h2>
          {gate.canAcceptRequests && (
            <Link
              href={`/benefits/new?store=${store.id}`}
              className="rounded-full bg-[#efe7fe] px-4 py-2 text-xs font-bold text-[#4b2e83] hover:bg-[#e1d1fc]"
            >
              + יש לי הטבה ב-{store.name_he}
            </Link>
          )}
        </div>

        {!gate.canAcceptRequests ? (
          <div className="clay-card mt-4 p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-bold text-[#241938]">
              עמוד חנות זה הינו מידעני בלבד
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[#5a4c73]">
              בהתאם לשער החוקיות של האתר, לא מוצגות הטבות ולא ניתן לשלוח בקשות בחנות שסווגה כ&ldquo;{gate.labelHe}&rdquo;.
            </p>
            <Link href="/legality" className="mt-4 inline-block text-sm font-bold text-[#4b2e83] underline">
              למה חנויות מסוימות הן מידעניות בלבד?
            </Link>
          </div>
        ) : activeBenefits.length === 0 ? (
          <div className="clay-card mt-4 p-8 text-center">
            <Gift className="mx-auto h-10 w-10 text-[#9c82d6]" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-bold text-[#241938]">
              אין כרגע הטבות פעילות ב-{store.name_he}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#5a4c73]">
              הצטרף לרשימת ההמתנה ונשלח לך עדכון ברגע שמשתמש יפרסם הטבת יום הולדת בחנות זו.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void toggleWaitlist(store.id)}
                className={
                  inWaitlist
                    ? "inline-flex items-center gap-2 rounded-full border-2 border-[#4b2e83] bg-[#f3ecff] px-5 py-2.5 text-sm font-bold text-[#4b2e83]"
                    : "clay-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
                }
              >
                {inWaitlist ? (
                  <>
                    <BellRing className="h-4 w-4" aria-hidden="true" />
                    נרשמת לרשימת ההמתנה (לחץ להסרה)
                  </>
                ) : (
                  <>
                    <BellPlus className="h-4 w-4" aria-hidden="true" />
                    עדכנו אותי כשתהיה הטבה
                  </>
                )}
              </button>
              <Link
                href={`/benefits/new?store=${store.id}`}
                className="clay-btn-butter inline-flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold"
              >
                יש לך יום הולדת? פרסם הטבה
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="flex items-center gap-2 rounded-2xl bg-[#f3ecff] px-4 py-2.5 text-xs font-medium text-[#4b2e83]">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              ההטבות מוצהרות על ידי המשתמשים ואינן מובטחות על ידי האתר. מוצגים כינויים בלבד לשמירה על פרטיות.
            </p>

            {activeBenefits.map((benefit) => {
              const daysLeft = daysUntilWindowEnd(benefit.window_end_date, todayIl);
              const isOwn = currentUser?.id === benefit.owner_id;
              return (
                <div
                  key={benefit.id}
                  className="clay-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[#241938]">
                        {benefit.owner_display_name}
                      </span>
                      {benefit.is_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          מאומת (השלים עסקה בהצלחה)
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f3ecff] px-2.5 py-0.5 text-xs font-semibold text-[#5a4c73]">
                          הצהרה עצמית
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#66548a]">
                      חלון זכאות: {benefit.window_start_date} עד {benefit.window_end_date} (נותרו{" "}
                      <strong>{Math.max(0, daysLeft)}</strong> ימים)
                    </p>
                    {benefit.notes && (
                      <p className="text-sm text-[#4e3f69]">{benefit.notes}</p>
                    )}
                  </div>

                  <div className="shrink-0">
                    {isOwn ? (
                      <span className="inline-block rounded-full bg-[#efe7fe] px-4 py-2 text-xs font-bold text-[#4b2e83]">
                        זו ההטבה שלך
                      </span>
                    ) : !currentUser ? (
                      <Link
                        href="/auth/login"
                        className="clay-btn-primary inline-block px-5 py-2.5 text-sm font-bold"
                      >
                        התחבר לשליחת בקשה
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBenefitId(benefit.id);
                          setError(null);
                        }}
                        className="clay-btn-primary px-5 py-2.5 text-sm font-bold"
                      >
                        שליחת בקשה
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* REQUEST MODAL */}
      {selectedBenefitId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241938]/55 p-4 backdrop-blur-sm"
        >
          <div className="clay-card max-h-[90vh] w-full max-w-lg overflow-y-auto bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 id="request-modal-title" className="text-xl font-extrabold text-[#241938]">
                שליחת בקשה ב-{store.name_he}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedBenefitId(null)}
                className="rounded-full px-3 py-1 text-sm font-bold text-[#5a4c73] hover:bg-[#f3ecff]"
              >
                ביטול
              </button>
            </div>

            {gate.requiresConditionsBanner && (
              <div className="mt-3 rounded-2xl bg-[#fef6d8] p-3 text-xs font-medium text-[#4a3204]">
                <strong>תנאי המועדון:</strong> {gate.explanationHe}
              </div>
            )}

            <form onSubmit={handleRequestSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="req-product-name" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  שם המוצר המבוקש *
                </label>
                <input
                  id="req-product-name"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="לדוגמה: נעלי Vans Old Skool מידה 42"
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label htmlFor="req-product-url" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  קישור ישיר למוצר באתר החנות *
                </label>
                <input
                  id="req-product-url"
                  type="url"
                  required
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder={store.website_url}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                  dir="ltr"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="req-price" className="block text-xs font-bold text-[#4b2e83] mb-1">
                    מחיר משוער (₪) — מומלץ עד 500 ₪ לחדשים
                  </label>
                  <input
                    id="req-price"
                    type="number"
                    min={1}
                    max={20000}
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="350"
                    className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="req-comp" className="block text-xs font-bold text-[#4b2e83] mb-1">
                    מתכונת עזרה (סעיף 11)
                  </label>
                  <select
                    id="req-comp"
                    value={compensationType}
                    onChange={(e) =>
                      setCompensationType(e.target.value as "free_help" | "symbolic_thanks")
                    }
                    className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                  >
                    <option value="free_help">עזרה קהילתית ללא תמורה (מומלץ)</option>
                    <option value="symbolic_thanks">תודה / שי סמלי בהסכמה</option>
                  </select>
                </div>
              </div>

              {compensationType === "symbolic_thanks" && (
                <div>
                  <label htmlFor="req-comp-note" className="block text-xs font-bold text-[#4b2e83] mb-1">
                    פירוט תודה סמלית
                  </label>
                  <input
                    id="req-comp-note"
                    value={compensationNote}
                    onChange={(e) => setCompensationNote(e.target.value)}
                    placeholder="למשל: קפה / ברכה אישית"
                    className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <div>
                <label htmlFor="req-notes" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  הערות (מידה, צבע, אזור משלוח — אין למסור כתובת מדויקת לפני אישור)
                </label>
                <textarea
                  id="req-notes"
                  rows={2}
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>

              {/* Mandatory Terms & Safety Checkboxes */}
              <div className="space-y-2.5 rounded-2xl bg-[#f7f3ff] p-3.5 text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={(e) => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
                  />
                  <span>
                    אני מאשר/ת כי קראתי את תנאי המועדון, כי לפי ידיעתי הפעולה מותרת, וכי האתר אינו צד לעסקה ואינו אחראי לביטול הזמנה או הפסקת הטבה.
                  </span>
                </label>

                {needsSafetyAck && (
                  <label className="flex items-start gap-2 cursor-pointer font-semibold text-[#4b2e83]">
                    <input
                      type="checkbox"
                      checked={safetyConfirmed}
                      onChange={(e) => setSafetyConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
                    />
                    <span>
                      קראתי את{" "}
                      <Link href="/safety" target="_blank" className="underline">
                        דף בטיחות בעסקה
                      </Link>
                      : לא אעביר כסף מראש לזר, ולא אבקש או אמסור סיסמאות או פרטי אשראי.
                    </span>
                  </label>
                )}
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBenefitId(null)}
                  className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#5a4c73] hover:bg-[#f3ecff]"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="clay-btn-primary inline-flex items-center gap-1.5 px-6 py-2.5 text-sm font-bold disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {submitting ? "שולח..." : "שליחת בקשה"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
