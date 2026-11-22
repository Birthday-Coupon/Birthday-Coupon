-- =============================================================================
-- Birthday Gift IL - Contact Inquiries & Store Suggestions Tables + RLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL CHECK (char_length(trim(sender_name)) BETWEEN 2 AND 80),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'bug', 'account', 'safety', 'other')),
  subject TEXT NOT NULL CHECK (char_length(trim(subject)) BETWEEN 2 AND 150),
  message TEXT NOT NULL CHECK (char_length(trim(message)) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  admin_reply TEXT,
  handled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.store_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitter_name TEXT NOT NULL CHECK (char_length(trim(submitter_name)) BETWEEN 2 AND 80),
  store_name TEXT NOT NULL CHECK (char_length(trim(store_name)) BETWEEN 2 AND 120),
  website_url TEXT NOT NULL,
  benefit_details TEXT NOT NULL CHECK (char_length(trim(benefit_details)) BETWEEN 5 AND 1000),
  terms_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_user ON public.contact_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_suggestions_user ON public.store_suggestions (user_id, created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_suggestions ENABLE ROW LEVEL SECURITY;

-- contact_messages policies
CREATE POLICY "contact_messages_insert_any" ON public.contact_messages
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "contact_messages_read_own_or_staff" ON public.contact_messages
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "contact_messages_staff_update" ON public.contact_messages
  FOR UPDATE USING (public.is_staff(auth.uid()));

-- store_suggestions policies
CREATE POLICY "store_suggestions_insert_any" ON public.store_suggestions
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "store_suggestions_read_own_or_staff" ON public.store_suggestions
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "store_suggestions_staff_update" ON public.store_suggestions
  FOR UPDATE USING (public.is_staff(auth.uid()));
