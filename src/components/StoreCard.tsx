import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Globe2, Gift, Sparkles } from "lucide-react";
import type { Store } from "@/lib/types";
import { LegalityBadge } from "./Badges";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";

export function StoreCard({ store }: { store: Store }) {
  const gate = evaluateStoreLegalityGate(store);
  const activeCount = store.active_benefits_count ?? 0;

  return (
    <article className="clay-card clay-card-hover flex flex-col justify-between p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e7dbfd] to-[#fef3c7] font-extrabold text-lg text-[#4b2e83] shadow-inner"
            >
              {store.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#241938]">{store.name_he}</h3>
              <p className="text-xs text-[#66548a]">{store.category_name_he ?? "כללי"}</p>
            </div>
          </div>
          <LegalityBadge
            status={store.legality_status}
            takedownRequested={store.takedown_requested}
          />
        </div>

        {/* Discount highlight pill */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-[#fef6d8] px-3.5 py-1.5 text-sm font-bold text-[#4a3204]">
          <Sparkles className="h-4 w-4 text-[#b37b09]" aria-hidden="true" />
          {store.discount_value}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#4e3f69]">{store.benefit_summary}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#66548a]">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f0ff] px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-[#6c46c1]" aria-hidden="true" />
            {store.club_fee_info}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f0ff] px-2.5 py-1">
            <Globe2 className="h-3.5 w-3.5 text-[#6c46c1]" aria-hidden="true" />
            {store.shipping_countries.includes("GLOBAL") ? "משלוח לישראל מחו״ל" : "רשת בישראל"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#efe7fe] pt-4">
        {gate.canListBenefits ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4b2e83]">
            <Gift className="h-4 w-4 text-[#6c46c1]" aria-hidden="true" />
            {activeCount > 0 ? `${activeCount} הטבות פעילות היום` : "אין הטבות היום — הצטרף להמתנה"}
          </span>
        ) : (
          <span className="text-xs font-medium text-[#66548a]">עמוד מידעני בלבד</span>
        )}

        <Link
          href={`/stores/${store.slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-[#f3ecff] px-3.5 py-1.5 text-xs font-bold text-[#4b2e83] transition-colors hover:bg-[#4b2e83] hover:text-white"
        >
          {gate.canAcceptRequests ? "לפרטים והטבות" : "צפייה במידע"}
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
