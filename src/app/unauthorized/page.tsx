import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="clay-card p-8">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-rose-800">שגיאה 403</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#241938]">אין הרשאת גישה לעמוד זה</h1>
        <p className="mt-2 text-sm text-[#5a4c73]">
          נראה שאין לחשבון שלך הרשאה לצפות במשאב זה.
        </p>
        <Link href="/" className="clay-btn-primary mt-6 inline-block px-6 py-2.5 text-sm font-bold">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
