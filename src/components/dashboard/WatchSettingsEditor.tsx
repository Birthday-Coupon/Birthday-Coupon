"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/lib/types";
import { isStoreMuted, type WatchSettings } from "@/lib/domain/watchlist-settings";

export function WatchSettingsEditor({
  store,
  settings,
  onUpdate,
  onMute,
}: {
  store: Store;
  settings: WatchSettings;
  onUpdate: (storeId: string, patch: Partial<WatchSettings>) => void;
  onMute: (store: { id: string; name_he: string }, days: number) => void;
}) {
  const [discountDraft, setDiscountDraft] = useState(
    settings.minDiscountPercent === null ? "" : String(settings.minDiscountPercent)
  );
  const mutedUntilMs = settings.mutedUntil ? new Date(settings.mutedUntil).getTime() : 0;
  const muted = isStoreMuted(settings);
  const muteValue = muted ? (mutedUntilMs - Date.now() <= 86_400_000 ? "24" : "7") : "off";

  useEffect(() => {
    setDiscountDraft(
      settings.minDiscountPercent === null ? "" : String(settings.minDiscountPercent)
    );
  }, [settings.minDiscountPercent]);

  // Committed on blur / Enter, so typing a threshold is a single write.
  const commitDiscount = () => {
    const trimmed = discountDraft.trim();
    if (trimmed === "") {
      if (settings.minDiscountPercent !== null) {
        onUpdate(store.id, { minDiscountPercent: null });
      }
      return;
    }
    const parsed = Math.min(100, Math.max(0, Number(trimmed)));
    if (!Number.isFinite(parsed)) {
      setDiscountDraft(
        settings.minDiscountPercent === null ? "" : String(settings.minDiscountPercent)
      );
      return;
    }
    if (parsed === settings.minDiscountPercent) return;
    setDiscountDraft(String(parsed));
    onUpdate(store.id, { minDiscountPercent: parsed });
  };

  return (
    <div className="mt-2 grid gap-2 rounded-xl bg-[#fbf9ff] px-3 py-2 sm:grid-cols-3">
      <label className="text-[10px] font-bold text-[#4b2e83]">
        רף הנחה (%)
        <input
          type="number"
          min={0}
          max={100}
          value={discountDraft}
          onChange={(e) => setDiscountDraft(e.target.value)}
          onBlur={commitDiscount}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          placeholder="הכל"
          className="mt-1 w-full rounded-lg border border-[#dfd2fb] bg-white px-2 py-1 text-[11px] font-normal"
        />
      </label>
      <label className="flex items-end gap-1.5 pb-1 text-[10px] font-bold text-[#4b2e83]">
        <input
          type="checkbox"
          checked={settings.onlyVerified}
          onChange={(e) => onUpdate(store.id, { onlyVerified: e.target.checked })}
          className="h-3.5 w-3.5 accent-[#4b2e83]"
        />
        רק הטבות מאומתות
      </label>
      <label className="text-[10px] font-bold text-[#4b2e83]">
        השתקת התראות
        <select
          value={muteValue}
          onChange={(e) =>
            onMute(store, e.target.value === "off" ? 0 : Number(e.target.value))
          }
          className="mt-1 w-full rounded-lg border border-[#dfd2fb] bg-white px-2 py-1 text-[11px] font-normal"
        >
          <option value="off">פעילות</option>
          <option value="24">24 שעות</option>
          <option value="7">7 ימים</option>
        </select>
      </label>
    </div>
  );
}
