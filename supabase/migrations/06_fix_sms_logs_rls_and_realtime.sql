-- Migration 06: Fix sms_logs RLS policies and add to Realtime
drop policy if exists "Staff insert sms logs" on public.sms_logs;
create policy "Staff insert sms logs" on public.sms_logs
  for insert with check (
    auth.role() = 'authenticated'
  );

drop policy if exists "Staff update sms logs" on public.sms_logs;
create policy "Staff update sms logs" on public.sms_logs
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

drop policy if exists "Staff delete sms logs" on public.sms_logs;
create policy "Staff delete sms logs" on public.sms_logs
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
  );

-- Add sms_logs to realtime publication if not already added
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.sms_logs;
  end if;
exception when others then
  null;
end $$;
