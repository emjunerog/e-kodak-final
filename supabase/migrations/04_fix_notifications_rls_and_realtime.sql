-- ── NOTIFICATIONS RLS & REALTIME REPAIR ──────────────────────────────────────
-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff and Admin can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff and admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users and staff can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users and staff can update notifications" ON public.notifications;

-- 1. INSERT: Allow admin, staff, finance to dispatch notifications to anyone,
--    and allow authenticated users to insert system/booking notifications for themselves
CREATE POLICY "Allow notification inserts" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
    OR auth.uid() = user_id
  );

-- 2. SELECT: Users read their own notifications; staff/admin/finance read all notifications
CREATE POLICY "Allow reading notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
  );

-- 3. UPDATE: Users update their own notifications (e.g. is_read); staff/admin/finance update any
CREATE POLICY "Allow updating notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
  );

-- 4. DELETE: Staff, admin, finance can delete notifications
CREATE POLICY "Allow staff and admin to delete notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance')
    )
  );

-- 5. Add to Supabase Realtime publication (ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
