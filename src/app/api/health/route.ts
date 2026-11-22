import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getTodayInIsrael } from "@/lib/domain/eligibility-window";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: isSupabaseConfigured() ? "supabase" : "demo",
    timezone: "Asia/Jerusalem",
    todayIsrael: getTodayInIsrael(),
  });
}
