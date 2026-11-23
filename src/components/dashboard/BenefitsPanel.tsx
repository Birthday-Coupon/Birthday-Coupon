"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { EyeOff, Pencil, Trash2 } from "lucide-react";
import { BenefitStatusBadge } from "@/components/Badges";
import { canOwnerHideBenefit } from "@/lib/domain/state-machine";
import type { BenefitStatus, UserBenefit } from "@/lib/types";

interface BenefitsPanelProps {
  myBenefits: UserBenefit[];
  updateBenefitStatus: (benefitId: string, status: BenefitStatus) => Promise<{ ok: boolean; error?: string }>;
  updateBenefitDetails: (input: {
    benefitId: string;
    windowStartDate: string;
    windowEndDate: string;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  deleteBenefit: (benefitId: string) => Promise<{ ok: boolean; error?: string }>;
  onFeedback: (message: string) => void;
  onError: (message: string) => void;
}

export function BenefitsPanel({
  myBenefits,
  updateBenefitStatus,
  updateBenefitDetails,
  deleteBenefit,
  onFeedback,
  onError,
}: BenefitsPanelProps) {
  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingBenefitEdit, setSavingBenefitEdit] = useState(false);

  const startEditing = (benefit: UserBenefit) => {
    setEditingBenefitId(benefit.id);
    setEditStartDate(benefit.window_start_date);
    setEditEndDate(benefit.window_end_date);
    setEditNotes(benefit.notes ?? "");
  };

  const handleDelete = async (benefitId: string) => {
    onError("");
    onFeedback("");
    const res = await deleteBenefit(benefitId);
    if (!res.ok) onError(res.error ?? "לא ניתן להסיר את ההטבה.");
    else onFeedback("ההטבה הוסרה.");
  };

  const handleSave = async (event: FormEvent, benefitId: string) => {
    event.preventDefault();
    onError("");
    onFeedback("");
    setSavingBenefitEdit(true);
    try {
      const res = await updateBenefitDetails({
        benefitId,
        windowStartDate: editStartDate,
        windowEndDate: editEndDate,
        notes: editNotes,
      });
      if (!res.ok) {
        onError(res.error ?? "לא ניתן לעדכן.");
      } else {
        onFeedback("ההטבה עודכנה.");
        setEditingBenefitId(null);
      }
    } finally {
      setSavingBenefitEdit(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      {myBenefits.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d9c7f8] bg-white/70 px-4 py-8 text-center text-xs text-[#8a7ca8]">
          אין הטבות.{" "}
          <Link href="/benefits/new" className="font-bold text-[#4b2e83] underline">
            פרסום הטבה
          </Link>
        </div>
      ) : (
        myBenefits.map((b) => {
          const canEdit = b.status !== "redeemed" && b.status !== "removed";
          const isEditing = editingBenefitId === b.id;
          return (
            <div key={b.id} className="rounded-2xl border border-[#e6dcfb] bg-white px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#241938]">{b.store_name_he}</span>
                    <BenefitStatusBadge status={b.status} />
                  </div>
                  <p className="text-[11px] text-[#8a5a00]">{b.discount_value}</p>
                  <p className="text-[11px] text-[#8a7ca8]">
                    {b.window_start_date} – {b.window_end_date}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => (isEditing ? setEditingBenefitId(null) : startEditing(b))}
                      aria-label="עריכה"
                      title="עריכת תאריכים והערות"
                      className="rounded-full bg-[#efe7fe] p-2 text-[#4b2e83] hover:bg-[#e1d1fc]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {canOwnerHideBenefit(b.status) && (
                    <button
                      type="button"
                      onClick={() => void updateBenefitStatus(b.id, "hidden")}
                      aria-label="הסתרה זמנית"
                      title="הסתרה זמנית"
                      className="rounded-full border border-[#dfd2fb] p-2 text-[#4b2e83] hover:bg-[#f3ecff]"
                    >
                      <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  {b.status === "hidden" && (
                    <button
                      type="button"
                      onClick={() => void updateBenefitStatus(b.id, "active")}
                      className="rounded-full bg-[#efe7fe] px-3 py-1.5 text-[11px] font-bold text-[#4b2e83]"
                    >
                      הפעלה
                    </button>
                  )}
                  {b.status === "active" && (
                    <button
                      type="button"
                      onClick={() => void updateBenefitStatus(b.id, "redeemed")}
                      className="rounded-full bg-[#fef6d8] px-3 py-1.5 text-[11px] font-bold text-[#4a3204]"
                    >
                      מומשה
                    </button>
                  )}
                  {b.status !== "redeemed" && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(b.id)}
                      aria-label="הסרת הטבה"
                      title="הסרת הטבה"
                      className="rounded-full bg-rose-50 p-2 text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing && (
                <form
                  onSubmit={(event) => void handleSave(event, b.id)}
                  className="mt-3 grid gap-2 border-t border-[#efe7fe] pt-3 sm:grid-cols-2"
                >
                  <label className="text-[11px] font-bold text-[#4b2e83]">
                    תחילת זכאות
                    <input
                      type="date"
                      required
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-2.5 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#4b2e83]">
                    סיום זכאות
                    <input
                      type="date"
                      required
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-2.5 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <label className="text-[11px] font-bold text-[#4b2e83] sm:col-span-2">
                    הערה לקונה
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-[#dfd2fb] bg-[#fbf9ff] px-2.5 py-1.5 text-xs font-normal"
                    />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={savingBenefitEdit}
                      className="clay-btn-primary px-4 py-1.5 text-[11px] font-bold disabled:opacity-60"
                    >
                      {savingBenefitEdit ? "שומר..." : "שמירה"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBenefitId(null)}
                      className="px-3 py-1.5 text-[11px] font-semibold text-[#8a7ca8]"
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
