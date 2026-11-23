import React from "react";
import Link from "next/link";
import { ArrowLeft, Gift } from "lucide-react";
import type { Store } from "@/lib/types";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";

export function StoreCard({ store }: { store: Store }) {
  const gate = evaluateStoreLegalityGate(store);
  const activeCount = store.active_benefits_count ?? 0;

  return (
    <article className="clay-card clay-card-hover flex flex-col justify-between p-4">
      <div>
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e7dbfd] to-[#fef3c7] text-sm font-extrabold text-[#4b2e83]"
          >
            {store.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-[#241938]">{store.name_he}</h3>
            <p className="text-[11px] text-[#8a7ca8]">{store.category_name_he ?? "כללי"}</p>
          </div>
        </div>

        <p className="mt-3 text-sm font-bold text-[#8a5a00]">{store.discount_value}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#5a4c73]">
          {store.benefit_summary}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#efe7fe] pt-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#4b2e83]">
          <Gift className="h-3.5 w-3.5 text-[#6c46c1]" aria-hidden="true" />
          {!gate.canListBenefits
            ? "מידע בלבד"
            : activeCount > 0
              ? `${activeCount} זמינות`
              : "אין הטבות היום"}
        </span>
        <Link
          href={`/stores/${store.slug}`}
          className="inline-flex items-center gap-1 rounded-full bg-[#f3ecff] px-3 py-1.5 text-[11px] font-bold text-[#4b2e83] transition-colors hover:bg-[#4b2e83] hover:text-white"
        >
          {gate.canAcceptRequests ? "להטבות" : "מידע"}
          <ArrowLeft className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
