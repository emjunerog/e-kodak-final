import { getDatabaseUrl } from './envHelper.mjs';
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: getDatabaseUrl() });
await client.connect();

await client.query(`
  DROP POLICY IF EXISTS "Allow customers to insert booking email logs" ON public.email_logs;
  CREATE POLICY "Allow customers to insert booking email logs" ON public.email_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

  DROP POLICY IF EXISTS "Allow customers to select their own email logs" ON public.email_logs;
  CREATE POLICY "Allow customers to select their own email logs" ON public.email_logs
    FOR SELECT TO authenticated
    USING (
      recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff', 'finance'))
    );
`);

console.log("email_logs RLS updated successfully!");
await client.end();

