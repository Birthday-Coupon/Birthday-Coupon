"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, LifeBuoy, MessageCircle, Send } from "lucide-react";
import { useAppData } from "@/lib/data/app-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { sanitizePlainText } from "@/lib/domain/contact-guard";
import type { ContactMessage } from "@/lib/types";

const CATEGORY_LABELS: Record<ContactMessage["category"], string> = {
  general: "פנייה כללית",
  bug: "דיווח על תקלה טכנית",
  account: "שאלה על חשבון / פרטיות",
  safety: "בטיחות ודיווח על משתמש",
  other: "אחר",
};

const STATUS_LABELS: Record<ContactMessage["status"], string> = {
  open: "נשלח — ממתין למענה",
  in_progress: "בטיפול הנהלת האתר",
  resolved: "טופל",
};

export default function ContactPage() {
  const { currentUser, mode } = useAppData();

  const [senderName, setSenderName] = useState(currentUser?.display_name ?? "");
  const [category, setCategory] = useState<ContactMessage["category"]>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myMessages, setMyMessages] = useState<ContactMessage[]>([]);

  useEffect(() => {
    if (currentUser?.display_name && !senderName) {
      setSenderName(currentUser.display_name);
    }
  }, [currentUser?.display_name, senderName]);

  useEffect(() => {
    if (mode !== "supabase" || !currentUser) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    void supabase
      .from("contact_messages")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setMyMessages(data as ContactMessage[]);
      });
  }, [mode, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanName = sanitizePlainText(senderName || currentUser?.display_name || "אורח", 80);
    const cleanSubject = sanitizePlainText(subject, 150);
    const cleanMessage = sanitizePlainText(message, 2000);

    if (cleanName.length < 2 || cleanSubject.length < 2 || cleanMessage.length < 5) {
      setError("יש למלא שם, נושא והודעה מפורטת.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        user_id: currentUser?.id ?? null,
        sender_name: cleanName,
        category,
        subject: cleanSubject,
        message: cleanMessage,
      };

      if (mode === "supabase") {
        const supabase = createSupabaseBrowserClient();
        const { data, error: dbErr } =
          (await supabase?.from("contact_messages").insert(payload).select("*").maybeSingle()) ?? {};
        if (dbErr) {
          setError(dbErr.message);
          return;
        }
        if (data) {
          setMyMessages((prev) => [data as ContactMessage, ...prev]);
        }
      } else {
        const localItem: ContactMessage = {
          id: `cm-${Date.now()}`,
          ...payload,
          status: "open",
          admin_reply: null,
          created_at: new Date().toISOString(),
          resolved_at: null,
        };
        setMyMessages((prev) => [localItem, ...prev]);
      }

      setSent(true);
      setSubject("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-8">
      <div className="clay-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#d4bdf7] to-[#f6d469] text-[#3b226b]">
            <LifeBuoy className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-[#241938]">פניות וצור קשר עם הנהלת האתר</h1>
            <p className="text-xs text-[#5a4c73]">
              יש לך שאלה, תקלה טכנית או משוב? שלח/י לנו פנייה והמענה יופיע כאן ובאזור האישי שלך.
            </p>
          </div>
        </div>

        {sent && (
          <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-100 p-3.5 text-xs font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            הפנייה נשלחה בהצלחה להנהלת האתר! נשיב לך בהקדם.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-5 rounded-2xl bg-rose-100 p-3 text-xs font-bold text-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-bold text-[#4b2e83] mb-1">
                שם / כינוי *
              </label>
              <input
                id="contact-name"
                required
                minLength={2}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="הכינוי שלך"
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="contact-cat" className="block text-xs font-bold text-[#4b2e83] mb-1">
                נושא הפנייה *
              </label>
              <select
                id="contact-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactMessage["category"])}
                className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="block text-xs font-bold text-[#4b2e83] mb-1">
              כותרת קצרה *
            </label>
            <input
              id="contact-subject"
              required
              minLength={2}
              maxLength={150}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="לדוגמה: שאלה לגבי פרסום הטבה"
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label htmlFor="contact-msg" className="block text-xs font-bold text-[#4b2e83] mb-1">
              תוכן הפנייה *
            </label>
            <textarea
              id="contact-msg"
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="פרט/י כיצד נוכל לעזור..."
              className="w-full rounded-2xl border border-[#dfd2fb] bg-[#fbf9ff] px-4 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="clay-btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-bold disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? "שולח..." : "שליחת פנייה להנהלה"}
          </button>
        </form>
      </div>

      {/* User's Previous Inquiries */}
      {myMessages.length > 0 && (
        <section className="clay-card p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#241938]">
            <MessageCircle className="h-5 w-5 text-[#6c46c1]" aria-hidden="true" />
            הפניות הקודמות שלך
          </h2>
          <div className="space-y-3">
            {myMessages.map((m) => (
              <div key={m.id} className="rounded-2xl border border-[#e6dcfb] bg-[#faf7ff] p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#241938]">{m.subject}</span>
                  <span className="rounded-full bg-[#fef6d8] px-3 py-0.5 text-xs font-bold text-[#4a3204]">
                    {STATUS_LABELS[m.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#66548a]">
                  {CATEGORY_LABELS[m.category]} • {m.created_at.slice(0, 10)}
                </p>
                <p className="mt-2 text-[#382759] whitespace-pre-wrap">{m.message}</p>
                {m.admin_reply && (
                  <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-950">
                    <strong className="block mb-0.5">תגובת הנהלת האתר:</strong>
                    {m.admin_reply}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
