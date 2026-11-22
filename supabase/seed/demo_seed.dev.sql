-- =============================================================================
-- DEV-ONLY DEMO SEED (Guideline 26)
-- NEVER RUN THIS FILE IN PRODUCTION!
-- =============================================================================
-- This script only inserts a system notice banner if you want a visual banner
-- in a local/staging Supabase instance. Real users must register via Supabase Auth.

DO $$
BEGIN
  IF current_setting('app.environment', true) = 'production' THEN
    RAISE EXCEPTION 'Refusing to run demo_seed.dev.sql in production!';
  END IF;
END $$;

INSERT INTO public.system_banners (message, severity, is_active)
VALUES (
  'סביבת פיתוח/הדגמה: האתר מופעל בחינם כעזרה הדדית קהילתית. לעולם אין להעביר סיסמאות או פרטי אשראי.',
  'info',
  TRUE
);
