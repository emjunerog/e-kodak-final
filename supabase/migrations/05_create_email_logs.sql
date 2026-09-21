-- ── CREATE EMAIL LOGS TABLE ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  html_body TEXT,
  notification_type TEXT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'QUEUED',
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff and Admin can manage email_logs" ON public.email_logs;
CREATE POLICY "Staff and Admin can manage email_logs" ON public.email_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
  );
