-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 10_remove_profile_badges.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Removes the customer studio-recognitions badge system entirely.
-- Drops the `badges` column from `public.profiles` (added by the
-- enhance_profiles_table script). Gallery badges (`gallery_items.badges`)
-- are a separate feature and are intentionally left untouched.

alter table public.profiles drop column if exists badges;
