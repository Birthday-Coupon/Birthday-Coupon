import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateRequestTransition } from "@/lib/domain/state-machine";
import { isDateWithinWindow } from "@/lib/domain/eligibility-window";
import { sanitizePlainText } from "@/lib/domain/contact-guard";
import type { RequestStatus } from "@/lib/types";

const bodySchema = z.object({
  toStatus: z.enum([
    "pending",
    "info_requested",
    "accepted",
    "purchased",
    "completed",
    "disputed",
    "resolved_completed",
    "resolved_cancelled",
    "declined",
    "cancelled",
    "expired",
  ]),
  note: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "demo" });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "נדרשת התחברות." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "סטטוס יעד לא תקין." }, { status: 400 });
  }

  const { toStatus, note } = parsed.data;
  const cleanNote = note ? sanitizePlainText(note, 500) : null;

  // Use atomic RPC for accepting a request (prevents race conditions!)
  if (toStatus === "accepted") {
    const { data, error } = await supabase.rpc("accept_purchase_request", {
      p_request_id: id,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data });
  }

  const { data: reqRow, error: reqErr } = await supabase
    .from("purchase_requests")
    .select("*, user_benefits(window_start_date, window_end_date)")
    .eq("id", id)
    .single();

  if (reqErr || !reqRow) {
    return NextResponse.json({ ok: false, error: "הבקשה לא נמצאה." }, { status: 404 });
  }

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");

  const actor =
    isAdmin && (toStatus === "resolved_completed" || toStatus === "resolved_cancelled")
      ? "admin"
      : reqRow.benefit_owner_id === user.id
        ? "owner"
        : reqRow.buyer_id === user.id
          ? "buyer"
          : isAdmin
            ? "admin"
            : null;

  if (!actor) {
    return NextResponse.json({ ok: false, error: "אין הרשאה לבקשה זו." }, { status: 403 });
  }

  const benefitDates = reqRow.user_benefits as { window_start_date: string; window_end_date: string } | null;
  const windowOpen = benefitDates
    ? isDateWithinWindow(benefitDates.window_start_date, benefitDates.window_end_date)
    : false;

  const check = validateRequestTransition({
    from: reqRow.status as RequestStatus,
    to: toStatus,
    actor,
    benefitWindowStillOpen: windowOpen,
  });

  if (!check.allowed) {
    return NextResponse.json({ ok: false, error: check.reason }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updateFields: Record<string, unknown> = { status: toStatus, updated_at: now };
  if (toStatus === "purchased") updateFields.purchased_at = now;
  if (toStatus === "completed" || toStatus === "resolved_completed") updateFields.completed_at = now;

  const { error: updErr } = await supabase
    .from("purchase_requests")
    .update(updateFields)
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  if (check.resultingBenefitStatus) {
    await supabase
      .from("user_benefits")
      .update({ status: check.resultingBenefitStatus, last_status_change_at: now })
      .eq("id", reqRow.benefit_id);
  }

  await supabase.from("request_events").insert({
    request_id: id,
    actor_id: user.id,
    from_status: reqRow.status,
    to_status: toStatus,
    note: cleanNote,
  });

  return NextResponse.json({ ok: true });
}
