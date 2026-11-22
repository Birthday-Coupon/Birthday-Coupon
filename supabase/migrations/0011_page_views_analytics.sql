-- =============================================================================
-- Birthday Gift IL - Lightweight Privacy-Friendly Page Views Analytics
-- Cookieless, staff-only SELECT via RLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL CHECK (char_length(path) BETWEEN 1 AND 300),
  session_id TEXT NOT NULL CHECK (char_length(session_id) BETWEEN 4 AND 80),
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views (path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_views_public_insert" ON public.page_views;
CREATE POLICY "page_views_public_insert" ON public.page_views
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "page_views_staff_select" ON public.page_views;
CREATE POLICY "page_views_staff_select" ON public.page_views
  FOR SELECT USING (public.is_staff(auth.uid()));
