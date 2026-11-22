"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="clay-card p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-rose-800">שגיאה 500</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#241938]">משהו השתבש בדרך</h1>
        <p className="mt-2 text-sm text-[#5a4c73]">
          אירעה תקלה בלתי צפויה. ניתן לנסות שוב או לחזור לדף הבית.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="clay-btn-primary px-5 py-2.5 text-sm font-bold">
            נסה שוב
          </button>
          <Link href="/" className="rounded-full border border-[#dfd2fb] px-5 py-2.5 text-sm font-bold text-[#4b2e83]">
            דף הבית
          </Link>
        </div>
      </div>
    </div>
  );
}
