import React from "react";
import Link from "next/link";
import { Gift, ShieldCheck } from "lucide-react";
import { he } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#e6dcfb] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 font-extrabold text-lg text-[#3b226b]">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c9aef5] to-[#f6d469] text-[#3b226b]">
                <Gift className="h-5 w-5" aria-hidden="true" />
              </span>
              {he.brand.name}
            </div>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#5a4c73]">
              {he.brand.disclaimer}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f3ecff] px-3.5 py-1.5 text-xs font-semibold text-[#4b2e83]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              לגילאי 18+ בלבד • פרטיות מלאה • ללא סיסמאות או סליקה
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#241938]">הפלטפורמה</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5a4c73]">
              <li>
                <Link href="/stores" className="hover:text-[#4b2e83] hover:underline">
                  מאגר החנויות וההטבות
                </Link>
              </li>
              <li>
                <Link href="/benefits/new" className="hover:text-[#4b2e83] hover:underline">
                  פרסום הטבת יום הולדת
                </Link>
              </li>
              <li>
                <Link href="/suggest-store" className="hover:text-[#4b2e83] hover:underline">
                  בקשה להוספת חנות
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#4b2e83] hover:underline">
                  פניות וצור קשר עם ההנהלה
                </Link>
              </li>
              <li>
                <Link href="/safety" className="hover:text-[#4b2e83] hover:underline">
                  בטיחות בעסקה
                </Link>
              </li>
              <li>
                <Link href="/legality" className="hover:text-[#4b2e83] hover:underline">
                  איך מבררים אם מותר (שער חוקיות)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-[#241938]">שקיפות ומשפטי</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5a4c73]">
              <li>
                <Link href="/takedown" className="hover:text-[#4b2e83] hover:underline">
                  בקשת הסרת חנות / תיקון פרטים
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-[#4b2e83] hover:underline">
                  תקנון ותנאי שימוש
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[#4b2e83] hover:underline">
                  מדיניות פרטיות (תיקון 13)
                </Link>
              </li>
              <li>
                <Link href="/accessibility" className="hover:text-[#4b2e83] hover:underline">
                  הצהרת נגישות (ת״י 5568 AA)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[#efe7fe] pt-6 text-xs text-[#66548a] sm:flex-row">
          <p>© {new Date().getFullYear()} {he.brand.name}. אין קשר רשמי לחנויות או למועדוני הלקוחות המוזכרים באתר.</p>
          <p>אזור זמן מערכת: ישראל (Asia/Jerusalem)</p>
        </div>
      </div>
    </footer>
  );
}
