-- ── 20_photographer_booking_update_rls.sql ──────────────────────────────────
-- Allows assigned photographers to advance the lifecycle status of their own
-- assigned bookings (e.g. Start Pictorial -> CAPTURE, Finish -> EDITING), record
-- status history entries, and notify the customer cleanly under RLS.

-- 1. Bookings: allow assigned photographers to update their own assigned bookings
DROP POLICY IF EXISTS "Photographers can update assigned bookings" ON public.bookings;
CREATE POLICY "Photographers can update assigned bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- 2. Booking Status History: allow photographers to read and log history on assigned bookings
DROP POLICY IF EXISTS "Photographers can view assigned booking history" ON public.booking_status_history;
CREATE POLICY "Photographers can view assigned booking history"
  ON public.booking_status_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.photographer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Photographers can insert assigned booking history" ON public.booking_status_history;
CREATE POLICY "Photographers can insert assigned booking history"
  ON public.booking_status_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.photographer_id = auth.uid()
    )
  );

-- 3. Notifications: also allow photographers to notify the customer of an assigned booking
DROP POLICY IF EXISTS "Allow notification inserts" ON public.notifications;
CREATE POLICY "Allow notification inserts"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.photographer_id = auth.uid()
        AND b.customer_id = notifications.user_id
    )
  );

-- 4. Atomic SECURITY DEFINER RPC fallback for advancing an assigned booking status
CREATE OR REPLACE FUNCTION public.photographer_update_assigned_booking_status(
  target_booking_id uuid,
  new_status text,
  remarks_text text DEFAULT ''
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text := upper(btrim(coalesce(new_status, '')));
  v_booking public.bookings;
  v_note text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_status NOT IN ('PHOTOGRAPHER_ASSIGNED', 'CAPTURE', 'IN_PROGRESS', 'EDITING', 'FINALIZED', 'READY') THEN
    RAISE EXCEPTION 'Invalid photographer booking status transition: %', v_status;
  END IF;

  UPDATE public.bookings
  SET status = v_status,
      updated_at = now()
  WHERE id = target_booking_id
    AND photographer_id = v_uid
  RETURNING * INTO v_booking;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assigned booking not found for current photographer';
  END IF;

  v_note := coalesce(nullif(btrim(coalesce(remarks_text, '')), ''), format('Status updated to %s by photographer.', v_status));

  INSERT INTO public.booking_status_history (booking_id, status, remarks, changed_by)
  VALUES (target_booking_id, v_status, v_note, v_uid);

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.photographer_update_assigned_booking_status(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.photographer_update_assigned_booking_status(uuid, text, text) TO authenticated;
