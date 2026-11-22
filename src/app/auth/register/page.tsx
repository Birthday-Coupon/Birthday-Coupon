"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock, ShieldCheck, UserPlus } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";

export default function RegisterPage() {
  const router = useRouter();
  const { registerUser } = useAppData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [birthMonthConsent, setBirthMonthConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerUser({
        email,
        password,
        displayName,
        birthDate,
        termsAccepted,
        privacyAccepted,
        birthMonthConsent,
        marketingConsent,
      });
      if (!res.ok) {
        setError(res.error ?? "שגיאה בהרשמה.");
      } else {
        router.push("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-[#3b226b]">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-[#241938]">הצטרפות לקהילה בחינם</h1>
          <p className="mt-1 text-sm text-[#5a4c73]">
            השימוש באתר מותר מגיל 18 ומעלה בלבד. אנו שומרים מינימום מידע נדרש.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="reg-display-name" className="block text-xs font-bold text-[#4b2e83] mb-1">
              כינוי ציבורי (אין חובה למסור שם מלא) *
            </label>
            <input
              id="reg-display-name"
              required
              minLength={2}
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="לדוגמה: דנה מ."
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-[#4b2e83] mb-1">
              כתובת אימייל (אינה מוצגת למשתמשים אחרים) *
            </label>
            <input
              id="reg-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-bold text-[#4b2e83] mb-1">
              סיסמה (8 תווים לפחות) *
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="reg-dob" className="block text-xs font-bold text-[#4b2e83] mb-1">
              תאריך לידה (לאימות גיל 18+ בלבד — נשמר בטבלה פרטית נפרדת) *
            </label>
            <input
              id="reg-dob"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-[#66548a]">
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              תאריך הלידה המלא לעולם לא יופיע בפרופיל הציבורי או ב-API ציבורי. רק חודש הלידה משמש להתאמת הטבות.
            </p>
          </div>

          {/* Consent checkboxes (logged in consent_log) */}
          <fieldset className="space-y-2.5 rounded-2xl bg-[#f7f3ff] p-4 text-xs">
            <legend className="px-1 font-bold text-[#4b2e83]">אישורים והסכמות (נשמרים ביומן הסכמות)</legend>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>
                אני מאשר/ת שאני מעל גיל 18 ומסכים/ה ל
                <Link href="/legal/terms" className="font-bold text-[#4b2e83] underline">
                  תקנון השימוש
                </Link>
                .
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>
                קראתי ואני מסכים/ה ל
                <Link href="/legal/privacy" className="font-bold text-[#4b2e83] underline">
                  מדיניות הפרטיות
                </Link>
                .
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={birthMonthConsent}
                onChange={(e) => setBirthMonthConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>אני מאשר/ת הצגת חודש הלידה שלי בלבד (ללא יום ושנה) לצורך הצגת זמינות הטבות.</span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-[#5a4c73]">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#4b2e83]"
              />
              <span>
                (אופציונלי) אני מעוניין/ת לקבל עדכונים ודיוור שיווקי במייל (ניתן להסיר בכל עת לפי חוק התקשורת).
              </span>
            </label>
          </fieldset>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="clay-btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {loading ? "יוצר חשבון..." : "הרשמה והמשך לבחירת חנויות"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#5a4c73]">
          כבר יש לך חשבון?{" "}
          <Link href="/auth/login" className="font-bold text-[#4b2e83] underline">
            התחברות
          </Link>
        </p>
      </div>
    </div>
  );
}
