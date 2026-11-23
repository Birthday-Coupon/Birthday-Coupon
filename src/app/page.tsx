"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BellRing, Gift, Search, ShieldCheck } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import {
  daysUntilWindowEnd,
  getTodayInIsrael,
  isDateWithinWindow,
} from "@/lib/domain/eligibility-window";

export default function HomePage() {
  const router = useRouter();
  const { stores, benefits, currentUser } = useAppData();
  const [query, setQuery] = useState("");
  const todayIl = getTodayInIsrael();

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);

  const availableNow = useMemo(
    () =>
      benefits
        .filter(
          (b) =>
            b.status === "active" &&
            b.owner_id !== currentUser?.id &&
            isDateWithinWindow(b.window_start_date, b.window_end_date, todayIl)
        )
        .filter((b) => {
          const store = storeById.get(b.store_id);
          return Boolean(store && evaluateStoreLegalityGate(store).canAcceptRequests);
        })
        .sort(
          (a, b) =>
            daysUntilWindowEnd(a.window_end_date, todayIl) -
            daysUntilWindowEnd(b.window_end_date, todayIl)
        )
        .slice(0, 4),
    [benefits, currentUser?.id, storeById, todayIl]
  );

  const approvedStores = stores.filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/stores?q=${encodeURIComponent(trimmed)}` : "/stores");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <section
        aria-label="פתיחה וחיפוש"
        className="hero-lavender-surface relative overflow-hidden rounded-[2rem] p-6 sm:p-9"
      >
        <div className="grid items-center gap-7 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <h1 className="text-2xl font-extrabold leading-tight text-[#241938] sm:text-4xl">
              ההטבה של יום ההולדת שלך —{" "}
              <span className="text-[#4b2e83]">למישהו שצריך אותה</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-[#382759] sm:text-base">
              משתפים הטבה, מבקשים, ומתאמים בקהילה. בחינם, בלי סיסמאות ובלי קודים.
            </p>

            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="חיפוש חנות"
              className="flex flex-col gap-2 rounded-[1.25rem] bg-white/95 p-1.5 shadow-[0_14px_28px_-14px_rgba(75,46,131,0.3)] sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-2 px-3 py-1.5">
                <Search className="h-4.5 w-4.5 shrink-0 text-[#6c46c1]" aria-hidden="true" />
                <label htmlFor="hero-search" className="sr-only">
                  חיפוש חנות
                </label>
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="איזו חנות? H&M, Nike, Vans..."
                  className="w-full bg-transparent text-sm font-medium text-[#241938] placeholder:text-[#8a7ca8] outline-none"
                />
              </div>
              <button type="submit" className="clay-btn-primary px-5 py-2.5 text-sm font-bold">
                חיפוש
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href={currentUser ? "/dashboard" : "/auth/register"}
                className="clay-btn-butter inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-extrabold"
              >
                {currentUser ? "לאזור האישי שלי" : "הצטרפות בחינם"}
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/benefits/new"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-4 py-2.5 text-sm font-bold text-[#3b226b] backdrop-blur-sm hover:bg-white"
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                פרסום הטבה
              </Link>
            </div>

            <p className="text-[11px] font-semibold text-[#4b3a68]">
              {approvedStores.length} חנויות · {benefits.filter((b) => b.status === "active").length} הטבות פעילות · 0 ₪ עמלה
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="mx-auto max-w-sm overflow-hidden rounded-[1.75rem] border-2 border-white/60 bg-[#cbb1f5] shadow-[0_20px_40px_-18px_rgba(75,46,131,0.4)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/hero-3d.gif`}
                alt="מתנת יום הולדת"
                className="h-44 w-full object-cover object-center sm:h-52"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="available-heading" className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="available-heading" className="text-xl font-extrabold text-[#241938]">
              זמין עכשיו
            </h2>
            <p className="mt-0.5 text-xs text-[#8a7ca8]">הטבות שאפשר לבקש מהן בקשה ברגע זה</p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#4b2e83] hover:underline"
          >
            לכל החנויות
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {availableNow.length > 0 ? (
          <div className="mt-3 divide-y divide-[#efe7fe] overflow-hidden rounded-2xl border border-[#e6dcfb] bg-white/90">
            {availableNow.map((benefit) => {
              const store = storeById.get(benefit.store_id);
              if (!store) return null;
              const daysLeft = Math.max(0, daysUntilWindowEnd(benefit.window_end_date, todayIl));
              return (
                <Link
                  key={benefit.id}
                  href={`/stores/${store.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#faf7ff]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#241938]">
                      {store.name_he}{" "}
                      <span className="font-semibold text-[#8a5a00]">· {benefit.discount_value}</span>
                    </p>
                    <p className="truncate text-[11px] text-[#8a7ca8]">
                      {benefit.owner_display_name} · נותרו {daysLeft} ימים
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#f3ecff] px-3 py-1.5 text-[11px] font-bold text-[#4b2e83]">
                    לבקשה
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex flex-col items-start gap-2 rounded-2xl border border-[#e6dcfb] bg-white/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-[#5a4c73]">
              <BellRing className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              אין הטבות פנויות כרגע — עקבו אחרי חנויות ותקבלו עדכון כאן.
            </p>
            <Link
              href={currentUser ? "/dashboard" : "/auth/register"}
              className="text-xs font-bold text-[#4b2e83] hover:underline"
            >
              {currentUser ? "לאזור האישי" : "הצטרפות"}
            </Link>
          </div>
        )}
      </section>

      <section aria-label="איך זה עובד" className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { n: "1", t: "בוחרים הטבה", d: "רואים איזו הטבה זמינה עכשיו" },
          { n: "2", t: "שולחים בקשה", d: "מוצר, קישור והערות — בלי פרטים אישיים" },
          { n: "3", t: "מתאמים בצ׳אט", d: "בעל ההטבה קונה בעצמו ומאשרים" },
        ].map((step) => (
          <div key={step.n} className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#efe7fe] text-xs font-extrabold text-[#4b2e83]">
              {step.n}
            </span>
            <div>
              <p className="text-sm font-bold text-[#241938]">{step.t}</p>
              <p className="text-[11px] text-[#8a7ca8]">{step.d}</p>
            </div>
          </div>
        ))}
      </section>

      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] text-[#8a7ca8]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#4b2e83]" aria-hidden="true" />
        לא מבקשים סיסמאות או קודים · לא צד לעסקה ·
        <Link href="/safety" className="font-semibold text-[#4b2e83] hover:underline">
          בטיחות
        </Link>
        ·
        <Link href="/legality" className="font-semibold text-[#4b2e83] hover:underline">
          תנאי מועדונים
        </Link>
      </p>
    </div>
  );
}
