import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizePlainText } from "@/lib/domain/contact-guard";

const takedownSchema = z.object({
  store_id: z.string().nullable().optional(),
  store_name_submitted: z.string().min(2).max(120),
  contact_name: z.string().min(2).max(80),
  contact_email: z.string().email(),
  contact_role: z.string().min(2).max(80),
  request_type: z.enum(["takedown", "correction"]),
  details: z.string().min(5).max(2000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = takedownSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "נתונים לא תקינים." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    if (admin) {
      await admin.from("store_takedown_requests").insert({
        store_id: parsed.data.store_id ?? null,
        store_name_submitted: sanitizePlainText(parsed.data.store_name_submitted, 120),
        contact_name: sanitizePlainText(parsed.data.contact_name, 80),
        contact_email: parsed.data.contact_email,
        contact_role: sanitizePlainText(parsed.data.contact_role, 80),
        request_type: parsed.data.request_type,
        details: sanitizePlainText(parsed.data.details, 2000),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "שגיאה בעיבוד הבקשה." }, { status: 500 });
  }
}
