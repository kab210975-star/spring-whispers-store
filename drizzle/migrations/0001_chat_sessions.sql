CREATE TYPE public.chat_status AS ENUM ('ai','operator','closed');
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  phone text NOT NULL,
  privacy_accepted_at timestamptz NOT NULL,
  pd_consent_at timestamptz NOT NULL,
  status public.chat_status NOT NULL DEFAULT 'ai',
  needs_operator boolean NOT NULL DEFAULT false,
  operator_reason text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','operator')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_idx ON public.chat_messages(session_id, created_at);
GRANT SELECT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY chat_sessions_staff_read ON public.chat_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY chat_sessions_staff_update ON public.chat_sessions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY chat_sessions_admin_delete ON public.chat_sessions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY chat_messages_staff_read ON public.chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff'));
CREATE POLICY chat_messages_staff_insert ON public.chat_messages FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'staff')) AND role = 'operator');
CREATE POLICY chat_messages_admin_delete ON public.chat_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));