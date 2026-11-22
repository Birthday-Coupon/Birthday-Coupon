import React from "react";
import { Accessibility } from "lucide-react";

export const metadata = {
  title: "הצהרת נגישות",
  description: "הצהרת נגישות של אתר מתנת יום הולדת בהתאם לתקן הישראלי ת״י 5568 רמה AA.",
};

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-10 space-y-5 text-sm leading-relaxed text-[#4e3f69]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7dbfd] text-[#3b226b]">
            <Accessibility className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold text-[#241938]">הצהרת נגישות</h1>
        </div>

        <p>
          אתר <strong>מתנת יום הולדת</strong> פועל להנגשת השירות לאנשים עם מוגבלות בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג-2013, ולתקן הישראלי <strong>ת״י 5568</strong> ברמת <strong>WCAG 2.1 AA</strong>.
        </p>

        <h2 className="text-lg font-bold text-[#241938]">התאמות הנגישות שיושמו באתר</h2>
        <ul className="list-disc list-inside space-y-1.5">
          <li>תמיכה מלאה בכיווניות עברית (RTL) ומבנה כותרות היררכי תקין.</li>
          <li>קישור ״דלג לתוכן הראשי״ וניווט מלא באמצעות מקלדת (Tab / Shift+Tab / Enter) עם מסגרת פוקוס ברורה.</li>
          <li>ניגודיות צבעים מותאמת לתקן WCAG AA בין טקסט, כפתורים ותגיות סטטוס.</li>
          <li>תוויות ARIA, הודעות שגיאה מפורשות בטפסים שאינן תלויות בצבע בלבד, וטקסט חלופי לתמונות.</li>
        </ul>

        <h2 className="text-lg font-bold text-[#241938]">פרטי רכז/ת נגישות</h2>
        <p>
          נתקלת בבעיית נגישות או שיש לך הצעה לשיפור? נשמח לשמוע ולטפל בהקדם:
          <br />
          דוא״ל: <span dir="ltr" className="font-semibold">accessibility@birthday-gift.co.il</span>
          <br />
          תאריך עדכון ההצהרה: נובמבר 2026.
        </p>
      </div>
    </div>
  );
}
