import React from "react";
import Link from "next/link";
import { Scale, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";

export const metadata = {
  title: "תנאי מועדונים והסרת אחריות",
  description: "הסבר על מידע תנאי המועדונים באתר מתנת יום הולדת ואחריותם הבלעדית של המשתמשים.",
};

export default function LegalityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-10 space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7dbfd] px-3.5 py-1 text-xs font-bold text-[#3b226b]">
            <Scale className="h-4 w-4" aria-hidden="true" />
            שקיפות והסרת אחריות
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[#241938]">תנאי מועדונים ואחריות המשתמשים</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5a4c73]">
            אתר <strong>מתנת יום הולדת</strong> פועל כלוח חיבור קהילתי פתוח בלבד. האתר אינו אוכף תקנוני מועדוני לקוחות, אינו חוסם יצירת קשר בין משתמשים בחנויות השונות, ואינו נושא בכל אחריות לפעולות המשתמשים, לביטול הזמנות או לסגירת חשבונות מועדון.
          </p>
        </div>

        <div className="rounded-2xl bg-[#fef6d8] p-4 text-sm font-bold text-[#4a3204]">
          האחריות המלאה והבלעדית לבדיקת תנאי המועדון ולהחלטה כיצד לפעול חלה על המשתמשים עצמם בלבד.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h2 className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              תנאי מועדון נוחים
            </h2>
            <p className="mt-2 text-sm text-emerald-950/85">
              לפי המידע שברשותנו ניתן לבצע הזמנה באתר עם משלוח לכל כתובת בישראל.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              בכפוף לתנאי מועדון
            </h2>
            <p className="mt-2 text-sm text-amber-950/85">
              קיימים תנאים מוגדרים (כגון מינימום הזמנה או הזמנה ישירה בחשבון). ההערה מוצגת לשקיפות בלבד.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            <h2 className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              שימו לב: מגבלות בתקנון
            </h2>
            <p className="mt-2 text-sm text-rose-950/85">
              תקנון החנות עשוי להגביל מימוש או לדרוש מימוש פיזי. האתר אינו חוסם תקשורת בין משתמשים, אך מסיר מעצמו כל אחריות.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5">
            <h2 className="flex items-center gap-2 font-bold text-purple-950">
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
              תנאים לא נבדקו
            </h2>
            <p className="mt-2 text-sm text-purple-950/80">
              תנאי המועדון לא אומתו במלואם. כל פעולה בחנות זו נעשית על דעת המשתמשים ואחריותם הבלעדית.
            </p>
          </div>
        </div>

        <div className="border-t border-[#efe7fe] pt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#5a4c73]">
            נציג חנות המבקש תיקון מידע או הסרה של עמוד החנות מהאתר יכול לפנות אלינו כאן:
          </p>
          <Link href="/takedown" className="clay-btn-primary px-5 py-2 text-xs font-bold">
            טופס הסרת חנות / תיקון פרטים
          </Link>
        </div>
      </div>
    </div>
  );
}
