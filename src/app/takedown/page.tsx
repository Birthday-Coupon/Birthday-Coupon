"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileWarning } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";

function TakedownFormContent() {
  const searchParams = useSearchParams();
  const initialStore = searchParams.get("store") ?? "";
  const { stores, submitTakedown } = useAppData();

  const [storeName, setStoreName] = useState(initialStore);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [requestType, setRequestType] = useState<"takedown" | "correction">("takedown");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matched = stores.find(
      (s) => s.name_he === storeName || s.name.toLowerCase() === storeName.toLowerCase()
    );
    await submitTakedown({
      storeId: matched?.id,
      storeName,
      contactName,
      contactEmail,
      contactRole,
      requestType,
      details,
    });
    setDone(true);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="clay-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fef6d8] text-[#4a3204]">
            <FileWarning className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#241938]">בקשת הסרת חנות או תיקון מידע</h1>
            <p className="text-xs text-[#5a4c73]">
              מיועד לנציגי חנויות ומועדוני לקוחות. זמן טיפול מובטח: עד 3 ימי עסקים.
            </p>
          </div>
        </div>

        {done ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
            <h2 className="text-lg font-bold text-emerald-900">הבקשה התקבלה בהצלחה</h2>
            <p className="text-sm text-emerald-900/85">
              צוות האתר יבדוק את פנייתך ויעדכן את עמוד החנות או יסיר אותו (כולל ביטול בקשות פתוחות) בתוך 3 ימי עסקים.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="td-store" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  שם החנות / המותג *
                </label>
                <input
                  id="td-store"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="td-type" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  סוג הפנייה *
                </label>
                <select
                  id="td-type"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as "takedown" | "correction")}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                >
                  <option value="takedown">בקשת הסרה מלאה מהאתר</option>
                  <option value="correction">תיקון תנאי מועדון / מידע</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="td-name" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  שם מלא *
                </label>
                <input
                  id="td-name"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="td-role" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  תפקיד בארגון *
                </label>
                <input
                  id="td-role"
                  required
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="ייעוץ משפטי / שיווק"
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="td-email" className="block text-xs font-bold text-[#4b2e83] mb-1">
                  אימייל רשמי *
                </label>
                <input
                  id="td-email"
                  type="email"
                  required
                  dir="ltr"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="td-details" className="block text-xs font-bold text-[#4b2e83] mb-1">
                פירוט הבקשה וקישור לתקנון מעודכן *
              </label>
              <textarea
                id="td-details"
                required
                minLength={5}
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-3.5 py-2.5 text-sm"
              />
            </div>

            <button type="submit" className="clay-btn-primary w-full py-3 text-sm font-bold">
              שליחת פנייה לצוות האתר
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function TakedownPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm">טוען טופס...</div>}>
      <TakedownFormContent />
    </Suspense>
  );
}
