export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anonKey &&
      url.startsWith("https://") &&
      !url.includes("YOUR_PROJECT_REF") &&
      !anonKey.includes("your-supabase")
  );
}

export function isDemoModeEnabled(): boolean {
  if (isSupabaseConfigured()) return false;
  return process.env.NEXT_PUBLIC_ALLOW_DEMO_MODE !== "false";
}
