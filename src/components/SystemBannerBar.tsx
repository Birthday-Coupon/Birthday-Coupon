"use client";

import React from "react";
import { AlertTriangle, Info, Sparkles } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";

export function SystemBannerBar() {
  const { mode, banners } = useAppData();
  const activeBanner = banners.find((b) => b.is_active);

  return (
    <div>
      {mode === "demo" && (
        <div
          role="status"
          className="bg-[#3b226b] px-4 py-1.5 text-center text-[11px] font-medium text-[#f9f4ff]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#f6d469]" aria-hidden="true" />
            מצב הדגמה — הנתונים לדוגמה
          </span>
        </div>
      )}
      {activeBanner && (
        <div
          role="region"
          aria-label="הודעת מערכת"
          className={`px-4 py-1.5 text-center text-[11px] font-semibold ${
            activeBanner.severity === "urgent"
              ? "bg-[#fee2e2] text-[#7f1d1d]"
              : activeBanner.severity === "warning"
                ? "bg-[#fef3c7] text-[#78350f]"
                : "bg-[#fef6d8] text-[#4a3204]"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {activeBanner.severity === "info" ? (
              <Info className="h-3 w-3 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            {activeBanner.message}
          </span>
        </div>
      )}
    </div>
  );
}
