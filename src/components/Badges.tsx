import React from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldAlert,
} from "lucide-react";
import type { BenefitStatus, LegalityStatus, RequestStatus } from "@/lib/types";
import { he } from "@/lib/i18n";

export function LegalityBadge({
  status,
  takedownRequested = false,
}: {
  status: LegalityStatus;
  takedownRequested?: boolean;
}) {
  if (takedownRequested) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-900">
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        הוסרה לבקשת החנות
      </span>
    );
  }

  switch (status) {
    case "allowed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          {he.legality.allowed}
        </span>
      );
    case "conditional":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fef0be] px-3 py-1 text-xs font-bold text-[#4a3204]">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {he.legality.conditional}
        </span>
      );
    case "prohibited":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
          {he.legality.prohibited}
        </span>
      );
    case "unverified":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-900">
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {he.legality.unverified}
        </span>
      );
  }
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const styles: Record<RequestStatus, string> = {
    pending: "bg-[#fef0be] text-[#4a3204]",
    info_requested: "bg-amber-100 text-amber-900",
    accepted: "bg-[#e7dbfd] text-[#3b226b]",
    purchased: "bg-sky-100 text-sky-900",
    completed: "bg-emerald-100 text-emerald-900",
    disputed: "bg-rose-100 text-rose-900",
    resolved_completed: "bg-emerald-100 text-emerald-900",
    resolved_cancelled: "bg-slate-200 text-slate-800",
    declined: "bg-slate-200 text-slate-800",
    cancelled: "bg-slate-200 text-slate-700",
    expired: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status === "disputed" ? (
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
      ) : status === "completed" || status === "resolved_completed" ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {he.requestStatus[status]}
    </span>
  );
}

export function BenefitStatusBadge({ status }: { status: BenefitStatus }) {
  const styles: Record<BenefitStatus, string> = {
    pending_verification: "bg-amber-100 text-amber-900",
    active: "bg-emerald-100 text-emerald-900",
    reserved: "bg-[#e7dbfd] text-[#3b226b]",
    redeemed: "bg-slate-200 text-slate-800",
    expired: "bg-slate-200 text-slate-700",
    hidden: "bg-slate-100 text-slate-600",
    removed: "bg-rose-100 text-rose-900",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>
      {he.benefitStatus[status]}
    </span>
  );
}
