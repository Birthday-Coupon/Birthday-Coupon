"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Filter, Gift, Search, SlidersHorizontal } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { StoreCard } from "@/components/StoreCard";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import type { BenefitDiscountType } from "@/lib/types";

function StoresDirectoryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "all";

  const { stores, categories } = useAppData();
  const [query, setQuery] = useState(initialQuery);
  const [categorySlug, setCategorySlug] = useState(initialCategory);
  const [onlyApproved, setOnlyApproved] = useState(true);
  const [benefitType, setBenefitType] = useState<"all" | BenefitDiscountType>("all");
  const [sortBy, setSortBy] = useState<"supply" | "rank" | "name">("supply");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores
      .filter((store) => {
        if (store.takedown_requested) return false;
        const gate = evaluateStoreLegalityGate(store);
        if (onlyApproved && !gate.canAcceptRequests) return false;
        if (categorySlug !== "all" && store.category_slug !== categorySlug) return false;
        if (benefitType !== "all" && store.benefit_type !== benefitType) return false;
        if (q) {
          const hay = `${store.name} ${store.name_he} ${store.benefit_summary} ${store.club_name ?? ""} ${store.category_name_he ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "supply") {
          return (
            (b.active_benefits_count ?? 0) - (a.active_benefits_count ?? 0) ||
            (a.suitability_rank ?? 99) - (b.suitability_rank ?? 99)
          );
        }
        if (sortBy === "rank") {
          return (a.suitability_rank ?? 99) - (b.suitability_rank ?? 99);
        }
        return a.name_he.localeCompare(b.name_he, "he");
      });
  }, [stores, query, categorySlug, onlyApproved, benefitType, sortBy]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[#241938]">מאגר חנויות והטבות יום הולדת</h1>
          <p className="mt-1.5 text-sm text-[#5a4c73]">
            כברירת מחדל מוצגות חנויות שעברו את שער החוקיות (מותר / מותנה). ניתן להציג גם חנויות מידעניות בלבד.
          </p>
        </div>
        <Link href="/benefits/new" className="clay-btn-butter inline-flex items-center gap-2 px-5 py-2.5 text-sm font-extrabold">
          <Gift className="h-4 w-4" aria-hidden="true" />
          פרסם הטבה שלך
        </Link>
      </div>

      {/* Filters Panel */}
      <section aria-label="מסנני חיפוש" className="clay-card mt-6 p-5">
        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-5">
            <label htmlFor="stores-search" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              חיפוש חופשי
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5">
              <Search className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
              <input
                id="stores-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="שם חנות, מועדון או סוג הנחה..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="category-filter" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              קטגוריה
            </label>
            <select
              id="category-filter"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm font-medium outline-none"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name_he}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="type-filter" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              סוג הטבה
            </label>
            <select
              id="type-filter"
              value={benefitType}
              onChange={(e) => setBenefitType(e.target.value as "all" | BenefitDiscountType)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm font-medium outline-none"
            >
              <option value="all">הכל</option>
              <option value="percentage">אחוז הנחה</option>
              <option value="fixed_amount">סכום בש״ח</option>
              <option value="tiered">לפי דרגה</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="sort-filter" className="block text-xs font-bold text-[#4b2e83] mb-1.5">
              מיון לפי
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "supply" | "rank" | "name")}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm font-medium outline-none"
            >
              <option value="supply">הכי הרבה הטבות פעילות</option>
              <option value="rank">דירוג התאמה למודל</option>
              <option value="name">שם (א-ת)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#efe7fe] pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#3b226b]">
            <input
              type="checkbox"
              checked={onlyApproved}
              onChange={(e) => setOnlyApproved(e.target.checked)}
              className="h-4 w-4 rounded accent-[#4b2e83]"
            />
            הצג חנויות מאושרות לבקשות בלבד (שער חוקיות)
          </label>

          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66548a]">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            נמצאו {filtered.length} חנויות
          </p>
        </div>
      </section>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="clay-card mt-8 p-10 text-center">
          <Filter className="mx-auto h-10 w-10 text-[#9c82d6]" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold text-[#241938]">לא נמצאו חנויות התואמות לסינון</h2>
          <p className="mt-1 text-sm text-[#5a4c73]">
            נסה לנקות את הסינון או להציג גם חנויות מידעניות שטרם אושרו לבקשות.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategorySlug("all");
                setBenefitType("all");
                setOnlyApproved(false);
              }}
              className="clay-btn-primary px-5 py-2.5 text-sm font-bold"
            >
              איפוס סינון
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoresPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-[#5a4c73]">טוען חנויות...</div>}>
      <StoresDirectoryContent />
    </Suspense>
  );
}
