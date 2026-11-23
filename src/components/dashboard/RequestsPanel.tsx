"use client";

import { useState } from "react";
import Link from "next/link";
import { RequestStatusBadge } from "@/components/Badges";
import type { PurchaseRequest } from "@/lib/types";

export function RequestsPanel({
  incomingRequests,
  outgoingRequests,
}: {
  incomingRequests: PurchaseRequest[];
  outgoingRequests: PurchaseRequest[];
}) {
  const [view, setView] = useState<"incoming" | "outgoing">("incoming");
  const visibleRequests = view === "incoming" ? incomingRequests : outgoingRequests;

  return (
    <div className="mt-4">
      <div className="inline-flex rounded-full border border-[#e6dcfb] bg-white p-1">
        {(
          [
            { key: "incoming", label: `שקיבלתי (${incomingRequests.length})` },
            { key: "outgoing", label: `ששלחתי (${outgoingRequests.length})` },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setView(option.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold ${
              view === option.key ? "bg-[#4b2e83] text-white" : "text-[#4e3f69]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d9c7f8] bg-white/70 px-4 py-8 text-center text-xs text-[#8a7ca8]">
            {view === "incoming" ? "אין בקשות שהתקבלו." : "עוד לא שלחתם בקשות."}{" "}
            <Link href="/stores" className="font-bold text-[#4b2e83] underline">
              לחיפוש הטבות
            </Link>
          </div>
        ) : (
          visibleRequests.map((req) => (
            <Link
              key={req.id}
              href={`/requests/view?id=${req.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3 hover:border-[#d2bff8]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#241938]">{req.store_name_he}</span>
                  <RequestStatusBadge status={req.status} />
                </div>
                <p className="truncate text-[11px] text-[#8a7ca8]">
                  {req.product_name} ·{" "}
                  {view === "incoming" ? req.buyer_display_name : req.owner_display_name}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-[#4b2e83]">פתיחה</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
