ALTER TABLE public.orders
  ADD COLUMN customer_name_enc text,
  ADD COLUMN phone_enc text,
  ADD COLUMN address_enc text,
  ADD COLUMN card_text_enc text,
  ADD COLUMN phone_hash text,
  ADD COLUMN pii_key_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN pii_erased_at timestamptz;

ALTER TABLE public.chat_sessions
  ADD COLUMN customer_name_enc text,
  ADD COLUMN phone_enc text,
  ADD COLUMN address_enc text,
  ADD COLUMN phone_hash text,
  ADD COLUMN pii_key_version smallint NOT NULL DEFAULT 1,
  ADD COLUMN pii_erased_at timestamptz;

CREATE INDEX orders_phone_hash_idx ON public.orders(phone_hash);
CREATE INDEX chat_sessions_phone_hash_idx ON public.chat_sessions(phone_hash);

CREATE TABLE public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pii_access_log TO authenticated;
GRANT ALL ON public.pii_access_log TO service_role;
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY pii_log_staff_insert ON public.pii_access_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')));
CREATE POLICY pii_log_admin_read ON public.pii_access_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));