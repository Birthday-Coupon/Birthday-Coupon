-- =============================================================================
-- Birthday Gift IL - Allow Staff (admin / content_manager) to send user notifications
-- =============================================================================

DROP POLICY IF EXISTS "notifications_staff_insert" ON public.notifications;
CREATE POLICY "notifications_staff_insert" ON public.notifications
  FOR INSERT WITH CHECK (public.is_staff(auth.uid()));
