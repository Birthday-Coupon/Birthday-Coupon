import React from "react";
import Link from "next/link";
import { Chrome, Code2, ExternalLink, Lock, ShieldCheck, Sparkles } from "lucide-react";

const CHROME_WEB_STORE_URL =
  "https://chromewebstore.google.com/detail/jnliahfmodhbajiminifobjmhihkeijg";

export const metadata = {
  title: "תוסף דפדפן — תזכורת הטבות אוטומטית",
  description:
    "התקינו את תוסף הדפדפן או סקריפט Tampermonkey של מתנת יום הולדת וקבלו תזכורת עדינה בכניסה לחנויות עם הטבות פעילות.",
};

export default function ExtensionPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const userscriptHref = `${basePath}/extension/birthday-coupon-helper.user.js`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 space-y-6">
      <section className="clay-card p-6 sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef6d8] px-3.5 py-1 text-xs font-bold text-[#4a3204]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          חינם • שומר פרטיות • 24+ חנויות
        </span>

        <h1 className="mt-3 text-2xl font-extrabold text-[#241938] sm:text-3xl">
          לעולם אל תשכחו הטבת יום הולדת לפני הקנייה
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5a4c73]">
          התוסף הנלווה של <strong>מתנת יום הולדת</strong> מזהה אוטומטית כשאתם נכנסים לחנות שנמצאת במאגר, ומקפיץ בפינת המסך כרטיס עדין שמראה כמה הטבות יום הולדת פעילות יש כרגע בקהילה — עם מעבר ישיר בקליק אחד.
        </p>

        {/* Two Install Options */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {/* Chrome Web Store Card */}
          <div className="rounded-3xl border border-[#dfd2fb] bg-[#faf7ff] p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#efe7fe] text-[#4b2e83]">
                  <Chrome className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#241938]">תוסף Chrome / Edge</h2>
                  <p className="text-xs text-[#66548a]">התקנה בקליק מחנות התוספים של Google</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#4e3f69]">
                כולל אייקון בסרגל הדפדפן, חיפוש מהיר בכל החנויות, מונה הטבות פעילות על האייקון, וכרטיס התראה צף.
              </p>
            </div>

            {CHROME_WEB_STORE_URL ? (
              <a
                href={CHROME_WEB_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="clay-btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold"
              >
                התקנה מחנות Chrome
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <div className="rounded-2xl bg-[#fef6d8] px-4 py-2.5 text-center text-xs font-bold text-[#4a3204]">
                בבדיקת חנות Chrome — הקישור יעלה ממש בקרוב!
              </div>
            )}
          </div>

          {/* Tampermonkey Card (Live right now!) */}
          <div className="rounded-3xl border border-[#dfd2fb] bg-white p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fef6d8] text-[#4a3204]">
                  <Code2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#241938]">סקריפט Tampermonkey</h2>
                  <p className="text-xs text-[#66548a]">זמין להתקנה מיידית עם עדכונים אוטומטיים</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#4e3f69]">
                משתמשים ב-Tampermonkey? התקינו בקליק אחד ותתחילו לקבל תזכורות בכניסה לחנויות כבר עכשיו.
              </p>
            </div>

            <a
              href={userscriptHref}
              target="_blank"
              rel="noopener noreferrer"
              className="clay-btn-butter inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-extrabold"
            >
              התקנת סקריפט Tampermonkey
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Privacy Highlights */}
        <div className="mt-8 grid gap-3 border-t border-[#efe7fe] pt-6 sm:grid-cols-3 text-xs text-[#4e3f69]">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#6c46c1]" aria-hidden="true" />
            <span>
              <strong>התאמה 100% מקומית:</strong> היסטוריית הגלישה לעולם לא נשלחת לשרת.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#6c46c1]" aria-hidden="true" />
            <span>
              <strong>אפס מעקב ופרסומות:</strong> ללא גישה לסיסמאות, אשראי או עגלת קניות.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#b37b09]" aria-hidden="true" />
            <span>
              <strong>שליטה מלאה:</strong> הסתרה ל-24 שעות או השתקה קבועה לכל אתר בקליק.
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/stores" className="text-xs font-bold text-[#4b2e83] underline">
            לצפייה בכל החנויות הנתמכות באתר ←
          </Link>
        </div>
      </section>
    </div>
  );
}
