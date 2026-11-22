"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn, Sparkles } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";

export default function LoginPage() {
  const router = useRouter();
  const { loginUser, mode } = useAppData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser(email, password);
      if (!res.ok) {
        setError(res.error ?? "ההתחברות נכשלה.");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="clay-card p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-[#3b226b]">
            <LogIn className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-3 text-2xl font-extrabold text-[#241938]">התחברות לחשבון</h1>
          <p className="mt-1 text-sm text-[#5a4c73]">שמחים לראות אותך שוב בקהילת מתנת יום הולדת</p>
        </div>

        {mode === "demo" && (
          <div className="mt-4 rounded-2xl bg-[#fef6d8] p-3 text-xs text-[#4a3204]">
            <p className="font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              מצב הדגמה פעיל:
            </p>
            <p className="mt-1">
              הזן אימייל המכיל <code>admin</code> למנהל, <code>owner</code> לבעלת הטבות, או כל אימייל אחר לקונה — או החלף משתמש ישירות מהתפריט העליון.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-[#4b2e83] mb-1">
              כתובת אימייל
            </label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="block text-xs font-bold text-[#4b2e83] mb-1">
              סיסמה
            </label>
            <input
              id="login-password"
              type="password"
              required
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-center gap-2 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="clay-btn-primary w-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {loading ? "מתחבר..." : "התחברות"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#5a4c73]">
          עדיין אין לך חשבון?{" "}
          <Link href="/auth/register" className="font-bold text-[#4b2e83] underline">
            הרשמה בחינם
          </Link>
        </p>
      </div>
    </div>
  );
}
