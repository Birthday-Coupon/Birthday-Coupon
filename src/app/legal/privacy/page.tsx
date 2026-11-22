import React from "react";

export const metadata = {
  title: "מדיניות פרטיות",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-10 space-y-5 text-sm leading-relaxed text-[#4e3f69]">
        <h1 className="text-2xl font-extrabold text-[#241938]">מדיניות פרטיות (מותאמת לתיקון 13 לחוק הגנת הפרטיות)</h1>
        <h2 className="text-base font-bold text-[#241938]">1. מינימום איסוף מידע והפרדת טבלאות</h2>
        <p>
          אנו אוספים רק מידע ההכרחי להפעלת השירות. תאריך הלידה המלא נשמר בטבלה פרטית נפרדת (<code>user_private</code>) עם הרשאות RLS לבעל החשבון בלבד, ולעולם אינו חשוף למשתמשים אחרים. בפרופיל הציבורי מוצגים כינוי וחודש לידה בלבד.
        </p>
        <h2 className="text-base font-bold text-[#241938]">2. שמירת הודעות, ייצוא ומחיקה</h2>
        <p>
          הודעות צ׳אט נשמרות למשך 12 חודשים (או עד סגירת מחלוקת פתוחה). תוכל/י לייצא את המידע האישי שלך או למחוק את חשבונך בכל עת מהאזור האישי (בכפוף לסיום בקשות פעילות). מחיקה סופית מתבצעת תוך 30 יום.
        </p>
        <h2 className="text-base font-bold text-[#241938]">3. דיוור שיווקי (חוק התקשורת)</h2>
        <p>
          הודעות שירות נשלחות לצורך תפעול הבקשות (ולעולם אינן כוללות את תוכן הודעות הצ׳אט). דיוור שיווקי נשלח אך ורק בהסכמה מפורשת המתועדת ב-<code>consent_log</code> וכולל קישור הסרה מיידי.
        </p>
      </div>
    </div>
  );
}
