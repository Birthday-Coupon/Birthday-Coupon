import React from "react";
import Link from "next/link";
import { Scale, CheckCircle2, AlertCircle, Ban, HelpCircle } from "lucide-react";

export const metadata = {
  title: "איך מבררים אם מותר — שער החוקיות",
  description: "הסבר על תהליך בדיקת תקנוני המועדונים וסיווג החנויות באתר מתנת יום הולדת.",
};

export default function LegalityPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-10 space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7dbfd] px-3.5 py-1 text-xs font-bold text-[#3b226b]">
            <Scale className="h-4 w-4" aria-hidden="true" />
            שער חוקיות ותנאי מועדון (סעיף 3)
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[#241938]">איך אנחנו מבררים אם מותר?</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5a4c73]">
            האתר אינו מעודד ואינו מאפשר עקיפה של תנאי מועדוני לקוחות. לפני שניתן לפרסם הטבה או לשלוח בקשה בכל חנות, היא עוברת בדיקת תקנון מתועדת, כולל שמירת קישור, ציטוט רלוונטי ותאריך בדיקה מחודשת (כל 90 יום).
          </p>
        </div>

        <div className="rounded-2xl bg-[#fef6d8] p-4 text-sm font-bold text-[#4a3204]">
          כלל ברירת המחדל שלנו: אי-בהירות או היעדר מידע פומבי שקולים לאיסור עד השלמת הבדיקה.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h2 className="flex items-center gap-2 font-bold text-emerald-900">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              מותר
            </h2>
            <p className="mt-2 text-sm text-emerald-950/85">
              התקנון מתיר רכישה עצמאית מהחשבון האישי ושליחה לכתובת בישראל. מוצגות הטבות וכפתור בקשה.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
            <h2 className="flex items-center gap-2 font-bold text-amber-950">
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
              מותנה
            </h2>
            <p className="mt-2 text-sm text-amber-950/85">
              מותר בתנאים מוגדרים (למשל הזמנה ישירה בחשבון בלבד ללא העברת קוד או מינימום הזמנה). התנאים מוצגים בבירור לפני שליחת בקשה.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <Ban className="h-5 w-5" aria-hidden="true" />
              אסור
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              התקנון אוסר או שהמימוש פיזי אישי בסניפים בלבד (לדוגמה אלדו). עמוד החנות מוצג למידע בלבד (noindex), ללא הטבות וללא בקשות.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5">
            <h2 className="flex items-center gap-2 font-bold text-purple-950">
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
              לא נבדק / לא ברור
            </h2>
            <p className="mt-2 text-sm text-purple-950/80">
              כאשר אין מידע פומבי מלא (למשל סמסונג ישראל). היחס זהה ל״אסור״ עד בירור מתועד.
            </p>
          </div>
        </div>

        <div className="border-t border-[#efe7fe] pt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#5a4c73]">
            נציג חנות או מועדון לקוחות? ניתן לבקש תיקון או הסרה מלאה ונשיב בתוך 3 ימי עסקים.
          </p>
          <Link href="/takedown" className="clay-btn-primary px-5 py-2 text-xs font-bold">
            טופס הסרת חנות / תיקון פרטים
          </Link>
        </div>
      </div>
    </div>
  );
}
