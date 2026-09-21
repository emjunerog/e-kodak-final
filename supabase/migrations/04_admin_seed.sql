-- =================================================================================
-- E-KODAK! — ADMIN & STAFF ROLE ELEVATION
-- 
-- Due to Supabase's strict internal authentication schema constraints, 
-- inserting directly into auth.users can sometimes cause schema errors.
-- 
-- INSTRUCTIONS:
-- 1. Go to your E-KODAK website (e.g. localhost:5173/register).
-- 2. Sign up normally with the email you want to use for the Admin (e.g. admin@ekodak.com).
-- 3. Run this script in the Supabase SQL Editor to elevate that account to Admin.
-- =================================================================================

-- Elevate a specific email to 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@ekodak.com'
);

-- Elevate a specific email to 'staff' (Optional)
UPDATE public.profiles
SET role = 'staff'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'staff@ekodak.com'
);

-- Verify the changes
SELECT p.first_name, p.last_name, p.role, u.email 
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role IN ('admin', 'staff');
