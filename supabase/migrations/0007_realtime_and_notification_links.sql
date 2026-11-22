-- =============================================================================
-- Birthday Gift IL - Enable Realtime for Chat & Requests + Fix Notification Links
-- =============================================================================

-- 1. Enable Supabase Realtime on messages and purchase_requests for instant chat updates
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Fix any existing notification links from /requests/<uuid> to /requests/view?id=<uuid>
UPDATE public.notifications
SET link = regexp_replace(link, '^/requests/([0-9a-fA-F-]+)$', '/requests/view?id=\1')
WHERE link ~ '^/requests/[0-9a-fA-F-]+$';
