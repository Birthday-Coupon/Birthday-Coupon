"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Lock,
  MessageCircleHeart,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { StoreCard } from "@/components/StoreCard";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import { he } from "@/lib/i18n";

export default function HomePage() {
  const router = useRouter();
  const { stores, categories, benefits } = useAppData();
  const [query, setQuery] = useState("");

  // Show approved stores sorted by active supply first (Liquidity strategy Section 19)
  const featuredStores = [...stores]
    .filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests)
    .sort((a, b) => (b.active_benefits_count ?? 0) - (a.active_benefits_count ?? 0) || (a.suitability_rank ?? 99) - (b.suitability_rank ?? 99))
    .slice(0, 6);

  const activeBenefitsTotal = benefits.filter((b) => b.status === "active").length;
  const approvedStoresCount = stores.filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/stores?q=${encodeURIComponent(trimmed)}` : "/stores");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      {/* HERO SECTION - Direct Pastel Lavender & Butter-Yellow 3D Inspiration */}
      <section
        aria-label="פתיחה וחיפוש"
        className="hero-lavender-surface relative overflow-hidden rounded-[2rem] p-6 sm:p-10 lg:p-12"
      >
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold text-[#4b2e83] shadow-sm backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#b37b09]" aria-hidden="true" />
              קהילת שיתוף הטבות יום הולדת בישראל • חינם וללא עמלות
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#241938] sm:text-5xl">
              יום הולדת שמח —{" "}
              <span className="text-[#4b2e83]">
                ההטבה שלך במועדון יכולה לשמח מישהו אחר
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-[#382759] sm:text-lg">
              {he.brand.subtitle}
            </p>

            {/* Quick Search Bar */}
            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="חיפוש חנות או הטבה"
              className="flex flex-col gap-2 rounded-[1.5rem] bg-white/95 p-2 shadow-[0_16px_32px_-12px_rgba(75,46,131,0.22)] sm:flex-row sm:items-center"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3 py-2">
                <Search className="h-5 w-5 shrink-0 text-[#6c46c1]" aria-hidden="true" />
                <label htmlFor="hero-search" className="sr-only">
                  חפש חנות לפי שם או קטגוריה
                </label>
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="חפש חנות... לדוגמה: H&M, Vans, Nike, Original’s"
                  className="w-full bg-transparent text-sm font-medium text-[#241938] placeholder:text-[#7e6ea1] outline-none"
                />
              </div>
              <button
                type="submit"
                className="clay-btn-primary px-6 py-3 text-sm font-bold"
              >
                מצא הטבה
              </button>
            </form>

            {/* Primary CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/benefits/new"
                className="clay-btn-butter inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold"
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                יש לי יום הולדת החודש — אפרסם הטבה
              </Link>
              <Link
                href="/stores"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-5 py-3 text-sm font-bold text-[#3b226b] backdrop-blur-sm transition-colors hover:bg-white"
              >
                לכל {stores.length} החנויות שנבדקו
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* 3D Visual Showcase */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md">
              <div className="overflow-hidden rounded-[2rem] border-2 border-white/60 bg-[#cbb1f5] shadow-[0_24px_48px_-16px_rgba(75,46,131,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-3d.jpg"
                  alt="שקית מתנה תלת-ממדית, קופסת מתנה ובלונים צהובים על רקע סגול פסטלי"
                  className="h-72 w-full object-cover object-center sm:h-80"
                />
              </div>

              {/* Floating Clay Stats Pill */}
              <div className="absolute -bottom-4 right-4 left-4 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md">
                <div className="text-center flex-1">
                  <p className="text-lg font-extrabold text-[#4b2e83]">{approvedStoresCount}</p>
                  <p className="text-[11px] font-medium text-[#5a4c73]">חנויות מאושרות</p>
                </div>
                <div className="h-7 w-px bg-[#e6dcfb]" aria-hidden="true" />
                <div className="text-center flex-1">
                  <p className="text-lg font-extrabold text-[#4b2e83]">{activeBenefitsTotal}</p>
                  <p className="text-[11px] font-medium text-[#5a4c73]">הטבות פעילות</p>
                </div>
                <div className="h-7 w-px bg-[#e6dcfb]" aria-hidden="true" />
                <div className="text-center flex-1">
                  <p className="text-lg font-extrabold text-[#8a5a00]">0 ₪</p>
                  <p className="text-[11px] font-medium text-[#5a4c73]">עמלת שימוש</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY CHIPS */}
      <section aria-label="קטגוריות חנויות" className="mt-14">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/stores?category=${cat.slug}`}
              className="clay-card clay-card-hover inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#3b226b]"
            >
              <ShoppingBag className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              {cat.name_he}
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section aria-labelledby="how-it-works-heading" className="mt-16">
        <div className="text-center">
          <span className="inline-block rounded-full bg-[#fef6d8] px-3.5 py-1 text-xs font-bold text-[#4a3204]">
            פשוט, בטוח ושקוף
          </span>
          <h2 id="how-it-works-heading" className="mt-2 text-2xl font-extrabold text-[#241938] sm:text-3xl">
            איך זה עובד ב-4 צעדים?
          </h2>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "בוחרים חנות מאושרת",
              desc: "כל חנות עוברת שער חוקיות ובדיקת תקנון מועדון לפני שהיא נפתחת לבקשות.",
              icon: Scale,
            },
            {
              step: "02",
              title: "שולחים בקשה מדויקת",
              desc: "בוחרים מוצר, מצרפים קישור ושולחים בקשה לבעל הטבה זמין בחלון יום ההולדת.",
              icon: Gift,
            },
            {
              step: "03",
              title: "מתאמים בצ׳אט פנימי",
              desc: "לאחר אישור נפתח צ׳אט מוגן בתוך הבקשה ללא חשיפת פרטים אישיים.",
              icon: MessageCircleHeart,
            },
            {
              step: "04",
              title: "בעל ההטבה מזמין בעצמו",
              desc: "בעל ההטבה רוכש בחשבונו האישי (ללא מסירת קודים או סיסמאות), ושני הצדדים מאשרים.",
              icon: CheckCircle2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="clay-card p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#efe7fe] text-[#4b2e83]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-[#fef6d8] px-2.5 py-0.5 text-xs font-extrabold text-[#4a3204]">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-bold text-[#241938]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5a4c73]">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURED APPROVED STORES */}
      <section aria-labelledby="featured-stores-heading" className="mt-16">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 id="featured-stores-heading" className="text-2xl font-extrabold text-[#241938] sm:text-3xl">
              חנויות מאושרות עם היצע פעיל
            </h2>
            <p className="mt-1 text-sm text-[#5a4c73]">
              מוצגות חנויות שעברו בדיקת תנאי מועדון (נובמבר 2026). אין קשר רשמי לחנויות.
            </p>
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4b2e83] hover:underline"
          >
            צפייה בכל החנויות
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </section>

      {/* TRUST & PRIVACY CALLOUT */}
      <section aria-labelledby="trust-heading" className="mt-16">
        <div className="clay-card grid gap-6 bg-gradient-to-l from-[#f3ecff] via-white to-[#fef9e6] p-6 sm:p-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#4b2e83] px-3 py-1 text-xs font-bold text-white">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              אמון, בטיחות ופרטיות מלאה
            </div>
            <h2 id="trust-heading" className="text-2xl font-extrabold text-[#241938]">
              בלי סיסמאות, בלי קודים אישיים, ובלי תשלום מראש לזרים
            </h2>
            <p className="text-sm leading-relaxed text-[#4e3f69]">
              המערכת בנויה מהיסוד להגנה על שני הצדדים: תאריך הלידה המלא שלך שמור בטבלה פרטית נפרדת ולא מוצג לעולם, כל חנות נבדקת בשער חוקיות מתועד, ויש דף הנחיות בטיחות מחייב לפני הבקשה הראשונה.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/safety" className="clay-btn-primary px-5 py-2.5 text-sm font-bold">
                קריאת מדריך בטיחות בעסקה
              </Link>
              <Link
                href="/legality"
                className="rounded-full border border-[#d6c5f7] bg-white px-5 py-2.5 text-sm font-bold text-[#4b2e83] hover:bg-[#f3ecff]"
              >
                איך עובד שער החוקיות?
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-2xl bg-white/90 p-5 border border-[#e6dcfb]">
            {[
              "בעל ההטבה מבצע את הרכישה בעצמו בלבד",
              "לעולם לא נבקש סיסמה, קוד SMS או אשראי",
              "הסרת חנות מיידית לבקשת נציג רשת",
              "שימוש לגילאי 18+ בלבד",
            ].map((rule) => (
              <div key={rule} className="flex items-start gap-2 text-xs font-semibold text-[#3b226b]">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#6c46c1]" aria-hidden="true" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
