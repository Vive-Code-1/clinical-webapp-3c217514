CREATE TABLE public.tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate_bps INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 10000),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tax_rates_clinic ON public.tax_rates(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_rates TO authenticated;
GRANT ALL ON public.tax_rates TO service_role;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic members read tax rates" ON public.tax_rates FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Owners manage tax rates" ON public.tax_rates FOR ALL TO authenticated USING (public.is_clinic_owner(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

DO $$ BEGIN CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','partially_paid','void','overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('cash','card','etransfer','stripe','insurance','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clinic_clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'CAD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, invoice_number)
);
CREATE INDEX idx_invoices_clinic ON public.invoices(clinic_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic members read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Clients read own invoices" ON public.invoices FOR SELECT TO authenticated USING (client_id IN (SELECT id FROM public.clinic_clients WHERE user_id = auth.uid()));
CREATE POLICY "Clinic members manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  tax_rate_bps INTEGER NOT NULL DEFAULT 0,
  line_total_cents INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read invoice items via invoice" ON public.invoice_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND (public.is_clinic_member(i.clinic_id, auth.uid()) OR i.client_id IN (SELECT id FROM public.clinic_clients WHERE user_id = auth.uid()))));
CREATE POLICY "Manage invoice items via invoice" ON public.invoice_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_clinic_member(i.clinic_id, auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND public.is_clinic_member(i.clinic_id, auth.uid())));

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  method public.payment_method NOT NULL DEFAULT 'cash',
  reference TEXT,
  stripe_charge_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_clinic ON public.payments(clinic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinic members read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Clinic members manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.recalc_invoice_paid() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv_id UUID; paid INTEGER; total INTEGER;
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount_cents),0) INTO paid FROM public.payments WHERE invoice_id = inv_id;
  SELECT total_cents INTO total FROM public.invoices WHERE id = inv_id;
  UPDATE public.invoices SET amount_paid_cents = paid,
    status = CASE WHEN paid >= total AND total > 0 THEN 'paid'::invoice_status WHEN paid > 0 THEN 'partially_paid'::invoice_status ELSE status END,
    paid_at = CASE WHEN paid >= total AND total > 0 THEN now() ELSE paid_at END,
    updated_at = now() WHERE id = inv_id;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_payments_recalc AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_paid();

CREATE OR REPLACE FUNCTION public.recalc_invoice_totals(_invoice_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub INTEGER := 0; tax INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(line_total_cents), 0), COALESCE(SUM(line_total_cents * tax_rate_bps / 10000), 0) INTO sub, tax FROM public.invoice_items WHERE invoice_id = _invoice_id;
  UPDATE public.invoices SET subtotal_cents = sub, tax_cents = tax, total_cents = sub + tax, updated_at = now() WHERE id = _invoice_id;
END $$;

CREATE TABLE public.invoice_counters (
  clinic_id UUID PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  next_number INTEGER NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE ON public.invoice_counters TO authenticated;
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read counter" ON public.invoice_counters FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Members update counter" ON public.invoice_counters FOR ALL TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.next_invoice_number(_clinic_id UUID) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INTEGER;
BEGIN
  INSERT INTO public.invoice_counters(clinic_id, next_number) VALUES (_clinic_id, 1)
  ON CONFLICT (clinic_id) DO UPDATE SET next_number = invoice_counters.next_number + 1 RETURNING next_number INTO n;
  RETURN 'INV-' || to_char(now(), 'YYYY') || '-' || LPAD(n::text, 5, '0');
END $$;

CREATE TABLE public.reminder_settings (
  clinic_id UUID PRIMARY KEY REFERENCES public.clinics(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  hours_before INTEGER NOT NULL DEFAULT 24 CHECK (hours_before > 0 AND hours_before <= 168),
  send_confirmations BOOLEAN NOT NULL DEFAULT true,
  twilio_from TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_settings TO authenticated;
GRANT ALL ON public.reminder_settings TO service_role;
ALTER TABLE public.reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read reminder settings" ON public.reminder_settings FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Owners manage reminder settings" ON public.reminder_settings FOR ALL TO authenticated USING (public.is_clinic_owner(clinic_id, auth.uid())) WITH CHECK (public.is_clinic_owner(clinic_id, auth.uid()));

CREATE TABLE public.reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  status TEXT NOT NULL CHECK (status IN ('queued','sent','failed')),
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reminder_log_clinic ON public.reminder_log(clinic_id);
CREATE INDEX idx_reminder_log_appt ON public.reminder_log(appointment_id);
GRANT SELECT, INSERT ON public.reminder_log TO authenticated;
GRANT ALL ON public.reminder_log TO service_role;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read reminder log" ON public.reminder_log FOR SELECT TO authenticated USING (public.is_clinic_member(clinic_id, auth.uid()));
CREATE POLICY "Members insert reminder log" ON public.reminder_log FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(clinic_id, auth.uid()));