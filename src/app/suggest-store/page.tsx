"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, PlusCircle, Scale, Store as StoreIcon } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizePlainText } from "@/lib/domain/contact-guard";
import type { StoreSuggestion } from "@/lib/types";

const STATUS_LABELS: Record<StoreSuggestion["status"], string> = {
  pending: "ממתין לבדיקת תקנון",
  approved: "אושר להוספה!",
  rejected: "לא מתאים / נדחה",
};

export default function SuggestStorePage() {
  const { currentUser, mode } = useAppData();

  const [submitterName, setSubmitterName] = useState(currentUser?.display_name ?? "");
  const [storeName, setStoreName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [benefitDetails, setBenefitDetails] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mySuggestions, setMySuggestions] = useState<StoreSuggestion[]>([]);

  useEffect(() => {
    if (currentUser?.display_name && !submitterName) {
      setSubmitterName(currentUser.display_name);
    }
  }, [currentUser?.display_name, submitterName]);

  useEffect(() => {
    if (mode !== "supabase" || !currentUser) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase
      .from("store_suggestions")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMySuggestions(data as StoreSuggestion[]);
      });
  }, [mode, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = sanitizePlainText(submitterName || currentUser?.display_name || "אורח", 80);
    const cleanStore = sanitizePlainText(storeName, 120);
    const cleanDetails = sanitizePlainText(benefitDetails, 1000);

    if (cleanStore.length < 2 || cleanDetails.length < 5) {
      setError("יש למלא שם חנות ופירוט הטבת יום ההולדת.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: currentUser?.id ?? null,
        submitter_name: cleanName,
        store_name: cleanStore,
        website_url: websiteUrl.trim(),
        benefit_details: cleanDetails,
        terms_url: termsUrl.trim() || null,
      };

      if (mode === "supabase") {
        const supabase = createSupabaseBrowserClient();
        const { data, error: dbErr } =
          (await supabase?.from("store_suggestions").insert(payload).select("*").maybeSingle()) ?? {};
        if (dbErr) {
          setError(dbErr.message);
          return;
        }
        if (data) {
          setMySuggestions((prev) => [data as StoreSuggestion, ...prev]);
        }
      } else {
        const localItem: StoreSuggestion = {
          id: `sug-${Date.now()}`,
          ...payload,
          status: "pending",
          admin_note: null,
          created_at: new Date().toISOString(),
          reviewed_at: null,
        };
        setMySuggestions((prev) => [localItem, ...prev]);
      }

      setSent(true);
      setStoreName("");
      setWebsiteUrl("");
      setBenefitDetails("");
      setTermsUrl("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-8">
      <div className="clay-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-[#3b226b]">
            <PlusCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#241938]">בקשה להוספת חנות עם הטבת יום הולדת</h1>
            <p className="text-xs text-[#5a4c73]">
              מכיר/ה רשת או חנות אונליין עם הטבת יום הולדת שווה? הצע/י אותה כאן ונבדוק אותה בשער החוקיות!
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#fef6d8] p-3.5 text-xs text-[#4a3204]">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            כל חנות שמוצעת עוברת בדיקת תקנון מועדון (שער חוקיות) לפני שהיא נפתחת לפרסום הטבות ובקשות באתר.
          </span>
        </div>

        {sent && (
          <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-100 p-3.5 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            תודה! ההצעה נשלחה לתור הבדיקה של צוות הניהול.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sug-store" className="block text-xs font-bold text-[#4b2e83] mb-1">
                שם החנות / הרשת *
              </label>
              <input
                id="sug-store"
                required
                minLength={2}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="לדוגמה: Terminal X / פוקס / קסטרו"
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sug-url" className="block text-xs font-bold text-[#4b2e83] mb-1">
                כתובת אתר החנות *
              </label>
              <input
                id="sug-url"
                type="url"
                required
                dir="ltr"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.example.co.il"
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sug-details" className="block text-xs font-bold text-[#4b2e83] mb-1">
              מהי הטבת יום ההולדת? (אחוז/סכום, מינימום, תוקף, משלוח) *
            </label>
            <textarea
              id="sug-details"
              required
              minLength={5}
              maxLength={1000}
              rows={3}
              value={benefitDetails}
              onChange={(e) => setBenefitDetails(e.target.value)}
              placeholder="לדוגמה: 20% הנחה בחודש יום ההולדת באתר, הרשמה חינמית למועדון."
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sug-terms" className="block text-xs font-bold text-[#4b2e83] mb-1">
                קישור לתקנון המועדון (אופציונלי — מזרז בדיקה)
              </label>
              <input
                id="sug-terms"
                type="url"
                dir="ltr"
                value={termsUrl}
                onChange={(e) => setTermsUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="sug-name" className="block text-xs font-bold text-[#4b2e83] mb-1">
                הכינוי שלך *
              </label>
              <input
                id="sug-name"
                required
                minLength={2}
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="clay-btn-butter inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold disabled:opacity-60"
          >
            <StoreIcon className="h-4 w-4" aria-hidden="true" />
            {submitting ? "שולח..." : "שליחת הצעה להוספת חנות"}
          </button>
        </form>
      </div>

      {mySuggestions.length > 0 && (
        <section className="clay-card p-6 space-y-4">
          <h2 className="text-lg font-extrabold text-[#241938]">חנויות שהצעת</h2>
          <div className="space-y-3">
            {mySuggestions.map((s) => (
              <div key={s.id} className="rounded-2xl border border-[#e6dcfb] bg-[#faf7ff] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#241938]">{s.store_name}</span>
                  <span className="rounded-full bg-[#e7dbfd] px-3 py-0.5 text-xs font-bold text-[#3b226b]">
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#4e3f69]">{s.benefit_details}</p>
                {s.admin_note && (
                  <p className="mt-2 rounded-xl bg-white p-2.5 text-xs text-[#3b226b]">
                    <strong>הערת צוות:</strong> {s.admin_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
