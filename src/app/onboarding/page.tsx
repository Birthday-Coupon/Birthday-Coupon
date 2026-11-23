"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Gift, Sparkles } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { evaluateStoreLegalityGate } from "@/lib/domain/legality-gate";
import { ExtensionPromoBanner } from "@/components/ExtensionPromoBanner";

export default function OnboardingPage() {
  const router = useRouter();
  const { stores, currentUser, publishBenefit } = useAppData();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const approvedStores = stores.filter((s) => evaluateStoreLegalityGate(s).canAcceptRequests);

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFinish = async (publishNow: boolean) => {
    if (publishNow && currentUser && selectedIds.length > 0) {
      setSaving(true);
      for (const storeId of selectedIds) {
        const s = approvedStores.find((item) => item.id === storeId);
        if (!s) continue;
        await publishBenefit({
          storeId,
          windowType: s.default_window_type,
          daysBefore: s.default_window_days_before,
          daysAfter: s.default_window_days_after,
          notes: "פורסם במהלך ההצטרפות לקהילה.",
        });
      }
      setSaving(false);
    }
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-8">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fef6d8] px-3.5 py-1 text-xs font-bold text-[#4a3204]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          שלב אחרון בהצטרפות
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-[#241938] sm:text-3xl">
          באילו מועדוני לקוחות יש לך חברות?
        </h1>
        <p className="mt-1.5 text-sm text-[#5a4c73]">
          בחר/י חנויות מאושרות שבהן יש לך הטבת יום הולדת — כך נוכל לפרסם אותן אוטומטית בחלון יום ההולדת שלך (תוכל/י להסתיר בכל עת).
        </p>

        <div className="mt-5">
          <ExtensionPromoBanner compact newTab />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {approvedStores.map((store) => {
            const active = selectedIds.includes(store.id);
            return (
              <button
                key={store.id}
                type="button"
                onClick={() => toggle(store.id)}
                aria-pressed={active}
                className={`flex items-start justify-between gap-3 rounded-2xl border-2 p-4 text-right transition-all ${
                  active
                    ? "border-[#4b2e83] bg-[#f3ecff]"
                    : "border-[#e6dcfb] bg-white hover:border-[#cbb1f5]"
                }`}
              >
                <div>
                  <p className="font-bold text-[#241938]">{store.name_he}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#8a5a00]">{store.discount_value}</p>
                  <p className="mt-1 text-[11px] text-[#5a4c73]">{store.club_name}</p>
                </div>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    active
                      ? "border-[#4b2e83] bg-[#4b2e83] text-white"
                      : "border-[#cbb1f5] bg-white"
                  }`}
                >
                  {active && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#efe7fe] pt-5">
          <button
            type="button"
            onClick={() => void handleFinish(false)}
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#5a4c73] hover:bg-[#f3ecff]"
          >
            דלג בינתיים לאזור האישי
          </button>

          <button
            type="button"
            disabled={saving || selectedIds.length === 0}
            onClick={() => void handleFinish(true)}
            className="clay-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-50"
          >
            <Gift className="h-4 w-4" aria-hidden="true" />
            {saving
              ? "מפרסם הטבות..."
              : `פרסם ${selectedIds.length} הטבות שנבחרו`}
          </button>
        </div>
      </div>
    </div>
  );
}
