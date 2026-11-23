"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Chrome, Sparkles, X } from "lucide-react";

const DISMISS_KEY = "bg_ext_promo_dismissed_until_v1";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function ExtensionPromoBanner({
  compact = false,
  newTab = false,
}: {
  compact?: boolean;
  newTab?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkInstalled = () =>
      document.documentElement.dataset.bgExtensionInstalled === "true";

    if (checkInstalled()) {
      setVisible(false);
      return;
    }

    try {
      const until = Number(window.localStorage.getItem(DISMISS_KEY) ?? "0");
      if (!compact && until > Date.now()) {
        setVisible(false);
        return;
      }
    } catch {
      // ignore storage errors
    }

    setVisible(true);

    const onReady = () => setVisible(false);
    window.addEventListener("bg-extension-ready", onReady);
    return () => window.removeEventListener("bg-extension-ready", onReady);
  }, [compact]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_MS));
    } catch {}
    setVisible(false);
  };

  return (
    <section
      aria-label="המלצה להתקנת תוסף הדפדפן"
      className="relative flex flex-col justify-between gap-3 rounded-2xl border border-[#dfd2fb] bg-gradient-to-l from-[#f3ecff] via-white to-[#fef6d8] p-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#efe7fe] text-[#4b2e83]">
          <Chrome className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#241938]">
            <Sparkles className="h-3.5 w-3.5 text-[#b37b09]" aria-hidden="true" />
            לא רוצים לשכוח הטבת יום הולדת לפני קנייה?
          </p>
          <p className="mt-0.5 text-xs text-[#5a4c73]">
            התקינו את תוסף הדפדפן החינמי ונקפיץ לכם תזכורת עדינה בכניסה ל-24+ חנויות (100% פרטיות מקומית).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/extension"
          target={newTab ? "_blank" : undefined}
          className="clay-btn-primary px-4 py-2 text-xs font-bold whitespace-nowrap"
        >
          להתקנת התוסף ←
        </Link>
        {!compact && (
          <button
            type="button"
            onClick={dismiss}
            aria-label="הסתר תזכורת תוסף ל-7 ימים"
            title="הסתר לשבוע"
            className="rounded-full p-1.5 text-[#66548a] hover:bg-[#efe7fe]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}
