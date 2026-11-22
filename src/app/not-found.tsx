import React from "react";
import Link from "next/link";
import { Gift } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="clay-card p-8">
        <Gift className="mx-auto h-12 w-12 text-[#6c46c1]" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-[#8a5a00]">שגיאה 404</p>
        <h1 className="mt-1 text-2xl font-extrabold text-[#241938]">העמוד שחיפשת לא נמצא</h1>
        <p className="mt-2 text-sm text-[#5a4c73]">
          ייתכן שהקישור שגוי או שהחנות הוסרה מהמאגר.
        </p>
        <Link href="/" className="clay-btn-primary mt-6 inline-block px-6 py-2.5 text-sm font-bold">
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
