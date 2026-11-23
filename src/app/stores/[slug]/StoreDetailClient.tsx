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
  ShieldCheck,
  Sparkles,
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
      .sort((a, b) => {
        if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
        return a.window_end_date.localeCompare(b.window_end_date);
      });
  }, [store, benefits, todayIl]);

  if (!store) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-lg font-bold">החנות לא נמצאה.</p>
        <Link href="/stores" className="mt-3 inline-block text-sm font-bold text-[#4b2e83] underline">
          חזרה לחנויות
        </Link>
      </div>
    );
  }

  const gate = evaluateStoreLegalityGate(store);
  const following = waitlistStoreIds.includes(store.id);
  const needsSafetyAck = Boolean(currentUser && !currentUser.safety_acknowledged_at);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBenefitId) return;
    setError(null);
    if (!termsConfirmed) {
      setError("צריך לאשר שהפעולה מותרת לפי תנאי המועדון.");
      return;
    }
    if (needsSafetyAck && !safetyConfirmed) {
      setError("צריך לאשר את כללי הבטיחות לפני הבקשה הראשונה.");
      return;
    }
    setSubmitting(true);
    try {
      if (needsSafetyAck) await acknowledgeSafety();
      const res = await createPurchaseRequest({
        benefitId: selectedBenefitId,
        productName,
        productUrl: productUrl || store.website_url,
        estimatedPriceIls: estimatedPrice ? Number(estimatedPrice) : undefined,
        compensationType,
        compensationNote,
        buyerNotes,
      });
      if (!res.ok) setError(res.error ?? "לא ניתן לשלוח את הבקשה.");
      else if (res.requestId) router.push(`/requests/view?id=${res.requestId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <Link
        href="/stores"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4b2e83] hover:underline"
      >
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        חזרה לחנויות
      </Link>

      <section className="mt-3 rounded-2xl border border-[#e6dcfb] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-base font-extrabold text-[#3b226b]"
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#241938] sm:text-2xl">{store.name_he}</h1>
                <LegalityBadge status={store.legality_status} takedownRequested={store.takedown_requested} />
              </div>
              <p className="mt-0.5 text-[11px] text-[#8a7ca8]">
                {he.brand.noAffiliation} · {store.club_name ?? "מועדון לקוחות"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {gate.canAcceptRequests && currentUser && (
              <button
                type="button"
                onClick={() => void toggleWaitlist(store.id)}
                aria-pressed={following}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold ${
                  following
                    ? "bg-[#4b2e83] text-white"
                    : "border border-[#dfd2fb] bg-white text-[#4b2e83] hover:bg-[#f3ecff]"
                }`}
              >
                {following ? <BellRing className="h-3.5 w-3.5" /> : <BellPlus className="h-3.5 w-3.5" />}
                {following ? "במעקב — הסרה" : "עדכנו אותי"}
              </button>
            )}
            <a
              href={store.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-[#dfd2fb] bg-white px-3.5 py-2 text-[11px] font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
            >
              לאתר
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-[#fef6d8] px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-[#4a3204]">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            {store.discount_value}
          </p>
          <p className="mt-0.5 text-xs text-[#4a3204]">{store.benefit_summary}</p>
        </div>

        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-xl bg-[#f7f3ff] px-3 py-2">
            <dt className="text-[10px] font-bold text-[#8a7ca8]">מימוש</dt>
            <dd className="mt-0.5 font-medium text-[#241938]">{store.redemption_method}</dd>
          </div>
          <div className="rounded-xl bg-[#f7f3ff] px-3 py-2">
            <dt className="text-[10px] font-bold text-[#8a7ca8]">מגבלות</dt>
            <dd className="mt-0.5 font-medium text-[#241938]">
              {store.purchase_limits ?? "חד-פעמי לחבר מועדון"}
            </dd>
          </div>
          <div className="rounded-xl bg-[#f7f3ff] px-3 py-2">
            <dt className="text-[10px] font-bold text-[#8a7ca8]">משלוח</dt>
            <dd className="mt-0.5 font-medium text-[#241938]">
              {store.shipping_countries.includes("IL") ? "לישראל" : "ללא משלוח לישראל"} ·{" "}
              {store.valid_on_sale ? "תקף במבצעים" : "בכפוף למבצעים"}
            </dd>
          </div>
        </dl>

        <details
          className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
            store.legality_status === "prohibited" || store.legality_status === "unverified"
              ? "border-amber-300 bg-amber-50"
              : "border-[#dfd2fb] bg-[#faf7ff]"
          }`}
        >
          <summary className="cursor-pointer font-bold text-[#241938]">
            תנאי מועדון · {gate.labelHe}
          </summary>
          <div className="mt-1.5 space-y-1 text-[#5a4c73]">
            <p>{gate.explanationHe}</p>
            {store.terms_quoted_clause && (
              <p className="border-r-2 border-[#b79ced] pr-2 text-[11px] italic">
                &ldquo;{store.terms_quoted_clause}&rdquo;
              </p>
            )}
            <p className="text-[10px] font-semibold">
              האתר לוח חיבור בלבד ואינו צד לעסקה או לתנאי המועדון.
            </p>
            {store.terms_url && (
              <a
                href={store.terms_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-bold text-[#4b2e83] underline"
              >
                לתקנון המועדון
              </a>
            )}
          </div>
        </details>
      </section>

      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold text-[#241938]">
            הטבות זמינות עכשיו {activeBenefits.length > 0 && `(${activeBenefits.length})`}
          </h2>
          {gate.canAcceptRequests && (
            <Link
              href={`/benefits/new?store=${store.id}`}
              className="rounded-full bg-[#efe7fe] px-3.5 py-1.5 text-[11px] font-bold text-[#4b2e83] hover:bg-[#e1d1fc]"
            >
              + יש לי הטבה כאן
            </Link>
          )}
        </div>

        {!gate.canAcceptRequests ? (
          <div className="mt-2 rounded-2xl border border-[#e6dcfb] bg-white px-4 py-6 text-center">
            <AlertTriangle className="mx-auto h-7 w-7 text-amber-600" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-[#241938]">עמוד מידע בלבד</p>
            <p className="mt-0.5 text-xs text-[#8a7ca8]">
              בחנות זו לא מוצגות הטבות ולא נשלחות בקשות (סיווג: {gate.labelHe}).
            </p>
          </div>
        ) : activeBenefits.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-dashed border-[#d9c7f8] bg-white/70 px-4 py-6 text-center">
            <Gift className="mx-auto h-7 w-7 text-[#9c82d6]" aria-hidden="true" />
            <p className="mt-2 text-sm font-bold text-[#241938]">אין הטבות כאן כרגע</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => void toggleWaitlist(store.id)}
                className={
                  following
                    ? "inline-flex items-center gap-1.5 rounded-full border-2 border-[#4b2e83] bg-[#f3ecff] px-4 py-2 text-xs font-bold text-[#4b2e83]"
                    : "clay-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
                }
              >
                {following ? (
                  <>
                    <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                    במעקב — הסרה
                  </>
                ) : (
                  <>
                    <BellPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    עדכנו אותי כשתהיה הטבה
                  </>
                )}
              </button>
              <Link
                href={`/benefits/new?store=${store.id}`}
                className="clay-btn-butter inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
              >
                פרסום הטבה
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="flex items-center gap-1.5 text-[11px] text-[#8a7ca8]">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              הטבות מוצהרות על ידי המשתמשים. מוצגים כינויים בלבד.
            </p>
            {activeBenefits.map((benefit) => {
              const daysLeft = daysUntilWindowEnd(benefit.window_end_date, todayIl);
              const isOwn = currentUser?.id === benefit.owner_id;
              return (
                <div
                  key={benefit.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-[#241938]">
                      {benefit.owner_display_name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          benefit.is_verified
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-[#f3ecff] text-[#5a4c73]"
                        }`}
                      >
                        {benefit.is_verified ? "מאומת" : "הצהרה עצמית"}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#8a7ca8]">
                      {benefit.window_start_date} – {benefit.window_end_date} · נותרו{" "}
                      {Math.max(0, daysLeft)} ימים
                    </p>
                    {benefit.notes && (
                      <p className="mt-0.5 text-xs text-[#4e3f69]">{benefit.notes}</p>
                    )}
                  </div>

                  {isOwn ? (
                    <span className="rounded-full bg-[#efe7fe] px-3.5 py-1.5 text-[11px] font-bold text-[#4b2e83]">
                      שלך
                    </span>
                  ) : !currentUser ? (
                    <Link
                      href="/auth/login"
                      className="clay-btn-primary px-4 py-2 text-xs font-bold"
                    >
                      התחברות לבקשה
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBenefitId(benefit.id);
                        setError(null);
                      }}
                      className="clay-btn-primary px-4 py-2 text-xs font-bold"
                    >
                      שליחת בקשה
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-4 text-center text-[11px] text-[#8a7ca8]">
        <Link href={`/takedown?store=${encodeURIComponent(store.name_he)}`} className="hover:underline">
          בקשת הסרה או תיקון מטעם החנות
        </Link>
      </p>

      {selectedBenefitId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#241938]/55 p-4 backdrop-blur-sm"
        >
          <div className="clay-card max-h-[90vh] w-full max-w-md overflow-y-auto bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 id="request-modal-title" className="text-base font-extrabold text-[#241938]">
                בקשת הטבה · {store.name_he}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedBenefitId(null)}
                aria-label="סגירה"
                className="rounded-full px-2 py-1 text-sm font-bold text-[#8a7ca8] hover:bg-[#f3ecff]"
              >
                ✕
              </button>
            </div>

            {gate.requiresConditionsBanner && (
              <p className="mt-2 rounded-xl bg-[#fef6d8] px-3 py-2 text-[11px] text-[#4a3204]">
                {gate.explanationHe}
              </p>
            )}

            <form onSubmit={handleRequestSubmit} className="mt-3 space-y-3">
              <label className="block text-[11px] font-bold text-[#4b2e83]">
                שם המוצר *
                <input
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="לדוגמה: נעלי Vans Old Skool מידה 42"
                  className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-normal"
                />
              </label>

              <label className="block text-[11px] font-bold text-[#4b2e83]">
                קישור למוצר *
                <input
                  type="url"
                  required
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder={store.website_url}
                  dir="ltr"
                  className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-normal"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block text-[11px] font-bold text-[#4b2e83]">
                  מחיר משוער (₪)
                  <input
                    type="number"
                    min={1}
                    max={20000}
                    value={estimatedPrice}
                    onChange={(e) => setEstimatedPrice(e.target.value)}
                    placeholder="350"
                    className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-normal"
                  />
                </label>
                <label className="block text-[11px] font-bold text-[#4b2e83]">
                  תמורה
                  <select
                    value={compensationType}
                    onChange={(e) =>
                      setCompensationType(e.target.value as "free_help" | "symbolic_thanks")
                    }
                    className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-2 py-2 text-xs font-normal"
                  >
                    <option value="free_help">עזרה בחינם</option>
                    <option value="symbolic_thanks">תודה סמלית</option>
                  </select>
                </label>
              </div>

              {compensationType === "symbolic_thanks" && (
                <label className="block text-[11px] font-bold text-[#4b2e83]">
                  פירוט התודה
                  <input
                    value={compensationNote}
                    onChange={(e) => setCompensationNote(e.target.value)}
                    placeholder="למשל: קפה"
                    className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-normal"
                  />
                </label>
              )}

              <label className="block text-[11px] font-bold text-[#4b2e83]">
                הערות (מידה, צבע, אזור משלוח)
                <textarea
                  rows={2}
                  value={buyerNotes}
                  onChange={(e) => setBuyerNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-normal"
                />
              </label>

              <div className="space-y-2 rounded-xl bg-[#f7f3ff] p-3 text-[11px]">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={termsConfirmed}
                    onChange={(e) => setTermsConfirmed(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#4b2e83]"
                  />
                  <span>
                    אני מאשר/ת שהפעולה מותרת לפי תנאי המועדון, ושהאתר אינו צד לעסקה ואינו אחראי
                    לביטולים או להתנהלות המשתמשים.
                  </span>
                </label>
                {needsSafetyAck && (
                  <label className="flex cursor-pointer items-start gap-2 font-semibold text-[#4b2e83]">
                    <input
                      type="checkbox"
                      checked={safetyConfirmed}
                      onChange={(e) => setSafetyConfirmed(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[#4b2e83]"
                    />
                    <span>
                      קראתי את{" "}
                      <Link href="/safety" target="_blank" className="underline">
                        כללי הבטיחות
                      </Link>{" "}
                      — בלי תשלום מראש לזר ובלי סיסמאות.
                    </span>
                  </label>
                )}
              </div>

              {error && (
                <p role="alert" className="flex items-center gap-1.5 rounded-xl bg-rose-100 px-3 py-2 text-[11px] font-bold text-rose-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBenefitId(null)}
                  className="px-3 py-2 text-xs font-semibold text-[#8a7ca8]"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="clay-btn-primary inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold disabled:opacity-60"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {submitting ? "שולח..." : "שליחה"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
