"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const SESSION_KEY = "bg_anon_visit_id";

function getAnonymousSessionId(): string {
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `v-${Date.now().toString(36)}`;
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !isSupabaseConfigured()) return;
    // Do not inflate visitor stats with admin panel navigation
    if (pathname.startsWith("/admin")) return;
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const sessionId = getAnonymousSessionId();
    const referrer =
      typeof document !== "undefined" && document.referrer
        ? document.referrer.slice(0, 200)
        : null;

    void supabase
      .from("page_views")
      .insert({
        path: pathname.slice(0, 300),
        session_id: sessionId,
        referrer,
      })
      .then(() => {});
  }, [pathname]);

  return null;
}
