-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 09_workstation_transfers_and_flow.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Implements cross-departmental workstation transfer logs and RLS policies
-- for Admin, Staff, Photographer, and Finance.

-- 1. Create Workstation Transfers Table
CREATE TABLE IF NOT EXISTS public.workstation_transfers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES public.profiles(id),
  sender_role   TEXT NOT NULL CHECK (sender_role IN ('admin', 'staff', 'photographer', 'finance', 'system')),
  target_role   TEXT NOT NULL CHECK (target_role IN ('admin', 'staff', 'photographer', 'finance', 'all')),
  transfer_type TEXT NOT NULL CHECK (transfer_type IN (
    'ORDER_HANDOFF',        -- Staff -> Photographer: Order ready for studio shoot
    'PAYMENT_VERIFICATION', -- Finance -> Staff: Payment verified and cleared
    'ISSUE_ESCALATION',     -- Any -> Admin/Staff: Floor issue, dispute, or exception
    'OUTPUT_SUBMISSION',    -- Photographer -> Staff: Proofs/retouched photos submitted
    'DISPATCH_CLEARANCE',   -- Finance -> Staff: Final balance settled, cleared for print handover
    'GENERAL_NOTE'          -- Cross-departmental coordination note
  )),
  priority      TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  payload       JSONB DEFAULT '{}'::JSONB,
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'RESOLVED')),
  resolved_by   UUID REFERENCES public.profiles(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_transfers_booking ON public.workstation_transfers(booking_id);
CREATE INDEX IF NOT EXISTS idx_transfers_target_status ON public.workstation_transfers(target_role, status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON public.workstation_transfers(created_at DESC);

-- Enable RLS
ALTER TABLE public.workstation_transfers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin full access workstation transfers" ON public.workstation_transfers;
DROP POLICY IF EXISTS "Staff full access workstation transfers" ON public.workstation_transfers;
DROP POLICY IF EXISTS "Finance full access workstation transfers" ON public.workstation_transfers;
DROP POLICY IF EXISTS "Photographers read relevant transfers" ON public.workstation_transfers;
DROP POLICY IF EXISTS "Photographers create transfers for assigned bookings" ON public.workstation_transfers;

-- 2. RLS Policies for workstation_transfers
-- Admins have omni access
CREATE POLICY "Admin full access workstation transfers"
  ON public.workstation_transfers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Staff can read and manage all transfers
CREATE POLICY "Staff full access workstation transfers"
  ON public.workstation_transfers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'staff')
  );

-- Finance can read and manage all transfers
CREATE POLICY "Finance full access workstation transfers"
  ON public.workstation_transfers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'finance')
  );

-- Photographers can read transfers targeted to them, 'all', or created by them
CREATE POLICY "Photographers read relevant transfers"
  ON public.workstation_transfers FOR SELECT
  USING (
    sender_id = auth.uid()
    OR target_role IN ('photographer', 'all')
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = workstation_transfers.booking_id AND b.photographer_id = auth.uid()
    )
  );

-- Photographers can insert transfers for their assigned bookings
CREATE POLICY "Photographers create transfers for assigned bookings"
  ON public.workstation_transfers FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.photographer_id = auth.uid()
    )
  );

-- 3. Update public.bookings RLS to allow Finance read access
DROP POLICY IF EXISTS "Staff and Finance read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff read all bookings" ON public.bookings;

CREATE POLICY "Staff and Finance read all bookings"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('staff', 'admin', 'finance')
    )
  );

-- 4. Update public.payments RLS to allow Finance full management access
DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Staff and Finance manage payments" ON public.payments;

CREATE POLICY "Staff and Finance manage payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('staff', 'admin', 'finance')
    )
  );

-- 5. Allow photographers to update photo output status (e.g. from UPLOADED -> EDITING -> READY)
DROP POLICY IF EXISTS "Photographers can update own photo outputs" ON public.photo_outputs;
CREATE POLICY "Photographers can update own photo outputs"
  ON public.photo_outputs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = photo_outputs.booking_id AND b.photographer_id = auth.uid()
    )
  );
