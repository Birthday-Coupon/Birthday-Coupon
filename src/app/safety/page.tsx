import React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Lock, ShieldCheck, Scale } from "lucide-react";

export const metadata = {
  title: "בטיחות בעסקה",
  description: "מדריך בטיחות ומניעת הונאה בשימוש בפלטפורמת מתנת יום הולדת.",
};

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-10 space-y-8">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef6d8] px-3.5 py-1 text-xs font-bold text-[#4a3204]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            חובה לקרוא לפני הבקשה הראשונה
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-[#241938]">בטיחות בעסקה ומניעת הונאה</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#5a4c73]">
            מתנת יום הולדת היא פלטפורמה קהילתית לחיבור ותיאום בלבד — האתר אינו סולק כספים ואינו מחזיק בנאמנות. כדי לשמור על שני הצדדים, יש לפעול לפי הכללים הבאים בכל עסקה:
          </p>
        </div>

        {/* Golden Rules */}
        <section aria-labelledby="golden-rules" className="grid gap-4 sm:grid-cols-2">
          <h2 id="golden-rules" className="sr-only">כללי ברזל</h2>
          {[
            {
              title: "לעולם לא מעבירים כסף מראש לזר",
              body: "הסדר המומלץ: בעל ההטבה מבצע את ההזמנה בחשבונו האישי ושולח אישור הזמנה (ללא פרטים אישיים/כרטיס אשראי). הקונה מסדיר את התשלום רק לאחר שראה אישור הזמנה.",
            },
            {
              title: "לעולם לא מוסרים סיסמאות או קודי אימות",
              body: "בעל ההטבה מבצע את הרכישה בעצמו בלבד. אין להעביר סיסמאות, קודי SMS, פרטי כרטיס אשראי או קופונים אישיים אסורים להעברה.",
            },
            {
              title: "תקרת מחיר מומלצת לעסקאות ראשונות",
              body: "למשתמשים חדשים מומלץ להתחיל במוצרים בעלות אינדיקטיבית של עד 500 ₪, או לסכם תשלום מדורג בעסקאות גדולות יותר.",
            },
            {
              title: "תיאום בתוך הצ׳אט הפנימי בלבד",
              body: "כל תיעוד ההסכמות וכתובת המשלוח נעשה בתוך הצ׳אט הפנימי בבקשה. הדבר מאפשר למנהלים לסייע במקרה של מחלוקת.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-[#e6dcfb] bg-[#faf7ff] p-5">
              <h3 className="flex items-center gap-2 text-base font-bold text-[#3b226b]">
                <Lock className="h-4 w-4 shrink-0 text-[#6c46c1]" aria-hidden="true" />
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4e3f69]">{item.body}</p>
            </div>
          ))}
        </section>

        {/* Recommended Flow */}
        <section className="rounded-3xl bg-[#fef6d8]/75 p-6 space-y-3">
          <h2 className="text-lg font-extrabold text-[#4a3204] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            סדר הפעולות הבטוח המומלץ
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[#4a3204]">
            <li>הקונה שולח בקשה עם קישור ישיר למוצר ומוודא את תנאי המועדון.</li>
            <li>בעל ההטבה מאשר את הבקשה ונפתח צ׳אט פנימי.</li>
            <li>מתאמים מידה, צבע וכתובת משלוח (ניתן להפעיל הסכמה הדדית לטלפון עבור השליח בלבד).</li>
            <li>בעל ההטבה מבצע את ההזמנה, שולח אישור הזמנה נקי מפרטים רגישים, ומסמן ״רכשתי״ באתר.</li>
            <li>רק לאחר קבלת המוצר — הקונה מאשר קבלה והבקשה נסגרת (אין השלמה אוטומטית).</li>
          </ol>
        </section>

        {/* Disputes & Reporting */}
        <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 space-y-2">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-rose-900">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            מדיניות מחלוקות ודיווחים
          </h2>
          <p className="text-sm text-rose-900/90 leading-relaxed">
            בכל שלב מ״נרכש״ ניתן לפתוח מחלוקת לבירור מנהל (איסוף גרסאות עד 5 ימי עסקים). אם חולפים 14 ימים ללא אישור קבלה — המערכת פותחת בירור אוטומטי. האתר אינו אחראי כספית ואינו משיב כספים, אך מפרסם החלטה פנימית וחוסם חשבונות פוגעניים.
          </p>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/stores" className="clay-btn-primary px-6 py-2.5 text-sm font-bold">
            מעבר לחיפוש הטבות
          </Link>
          <Link
            href="/legality"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#dfd2fb] px-5 py-2.5 text-sm font-bold text-[#4b2e83]"
          >
            <Scale className="h-4 w-4" aria-hidden="true" />
            קריאה על שער החוקיות
          </Link>
        </div>
      </div>
    </div>
  );
}
