"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Gift, Search, SlidersHorizontal } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { StoreCard } from "@/components/StoreCard";
import type { BenefitDiscountType } from "@/lib/types";

function StoresDirectoryContent() {
  const searchParams = useSearchParams();
  const { stores, categories } = useAppData();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [categorySlug, setCategorySlug] = useState(searchParams.get("category") ?? "all");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyFriendlyTerms, setOnlyFriendlyTerms] = useState(false);
  const [benefitType, setBenefitType] = useState<"all" | BenefitDiscountType>("all");
  const [sortBy, setSortBy] = useState<"supply" | "rank" | "name">("supply");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores
      .filter((store) => {
        if (store.takedown_requested) return false;
        if (
          onlyFriendlyTerms &&
          store.legality_status !== "allowed" &&
          store.legality_status !== "conditional"
        ) {
          return false;
        }
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
        if (sortBy === "rank") return (a.suitability_rank ?? 99) - (b.suitability_rank ?? 99);
        return a.name_he.localeCompare(b.name_he, "he");
      });
  }, [stores, query, categorySlug, onlyFriendlyTerms, benefitType, sortBy]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#241938]">חנויות</h1>
          <p className="mt-0.5 text-xs text-[#8a7ca8]">{filtered.length} חנויות במאגר</p>
        </div>
        <Link
          href="/benefits/new"
          className="clay-btn-butter inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
        >
          <Gift className="h-4 w-4" aria-hidden="true" />
          פרסום הטבה
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#dfd2fb] bg-white px-3.5 py-2.5 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-[#6c46c1]" aria-hidden="true" />
        <label htmlFor="stores-search" className="sr-only">
          חיפוש חנות
        </label>
        <input
          id="stores-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש חנות או מועדון"
          className="w-full bg-transparent text-sm outline-none"
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
            showFilters ? "bg-[#4b2e83] text-white" : "bg-[#f3ecff] text-[#4b2e83]"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          סינון
        </button>
      </div>

      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setCategorySlug("all")}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
            categorySlug === "all"
              ? "bg-[#4b2e83] text-white"
              : "border border-[#e6dcfb] bg-white text-[#4e3f69]"
          }`}
        >
          הכל
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategorySlug(categorySlug === cat.slug ? "all" : cat.slug)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              categorySlug === cat.slug
                ? "bg-[#4b2e83] text-white"
                : "border border-[#e6dcfb] bg-white text-[#4e3f69]"
            }`}
          >
            {cat.name_he}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="clay-card mt-3 grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="type-filter" className="mb-1 block text-[11px] font-bold text-[#4b2e83]">
              סוג הטבה
            </label>
            <select
              id="type-filter"
              value={benefitType}
              onChange={(e) => setBenefitType(e.target.value as "all" | BenefitDiscountType)}
              className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-medium outline-none"
            >
              <option value="all">הכל</option>
              <option value="percentage">אחוז הנחה</option>
              <option value="fixed_amount">סכום בש״ח</option>
              <option value="tiered">לפי דרגה</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort-filter" className="mb-1 block text-[11px] font-bold text-[#4b2e83]">
              מיון
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "supply" | "rank" | "name")}
              className="w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-3 py-2 text-xs font-medium outline-none"
            >
              <option value="supply">הכי זמין עכשיו</option>
              <option value="rank">דירוג התאמה</option>
              <option value="name">שם (א-ת)</option>
            </select>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#3b226b] sm:col-span-2">
            <input
              type="checkbox"
              checked={onlyFriendlyTerms}
              onChange={(e) => setOnlyFriendlyTerms(e.target.checked)}
              className="h-4 w-4 rounded accent-[#4b2e83]"
            />
            רק חנויות עם תנאי מועדון נוחים
          </label>
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      ) : (
        <div className="clay-card mt-6 p-8 text-center">
          <h2 className="text-base font-bold text-[#241938]">לא נמצאו חנויות</h2>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategorySlug("all");
              setBenefitType("all");
              setOnlyFriendlyTerms(false);
            }}
            className="clay-btn-primary mt-4 px-5 py-2 text-xs font-bold"
          >
            איפוס סינון
          </button>
        </div>
      )}
    </div>
  );
}

export default function StoresPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 text-center text-sm text-[#5a4c73]">
          טוען...
        </div>
      }
    >
      <StoresDirectoryContent />
    </Suspense>
  );
}
