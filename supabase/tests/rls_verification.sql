-- =============================================================================
-- Automated RLS Security Verification Checks (Spec v2 Section 14.3 & Scenario 21)
-- Run against a test Supabase / PostgreSQL database after applying 0001_initial_schema.sql
-- =============================================================================

BEGIN;

-- 1. Verify RLS is enabled on EVERY public table
DO $$
DECLARE
  v_unprotected TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO v_unprotected
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = FALSE;

  IF v_unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'RLS_CHECK_FAILED: Tables without RLS enabled: %', v_unprotected;
  END IF;
END $$;

-- 2. Verify public.users does NOT contain birth_date or email columns (Guideline 25)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('birth_date', 'email', 'phone')
  ) THEN
    RAISE EXCEPTION 'PRIVACY_CHECK_FAILED: Sensitive columns found on public.users!';
  END IF;
END $$;

-- 3. Verify partial unique index exists preventing 2 active requests on same benefit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_unique_active_request_per_benefit'
  ) THEN
    RAISE EXCEPTION 'CONCURRENCY_CHECK_FAILED: Missing idx_unique_active_request_per_benefit!';
  END IF;
END $$;

-- 4. Verify 18+ age CHECK constraint exists on user_private.birth_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_private'
      AND constraint_type = 'CHECK'
  ) THEN
    RAISE EXCEPTION 'AGE_GATE_CHECK_FAILED: Missing CHECK constraint on user_private!';
  END IF;
END $$;

ROLLBACK;
