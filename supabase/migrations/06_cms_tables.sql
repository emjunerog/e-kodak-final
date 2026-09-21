-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 06_cms_tables.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Creates tables for the Content Management System (CMS)

-- ── 1. ANNOUNCEMENTS ─────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          uuid        primary key default uuid_generate_v4(),
  title       text        not null,
  content     text        not null,
  type        text        default 'info',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.announcements add column if not exists is_active boolean not null default true;
alter table public.announcements add column if not exists type text default 'info';

alter table public.announcements enable row level security;
drop policy if exists "Public can view active announcements" on public.announcements;
create policy "Public can view active announcements" on public.announcements for select using (is_active = true);
drop policy if exists "Staff can manage announcements" on public.announcements;
create policy "Staff can manage announcements" on public.announcements for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);


-- ── 2. FAQS ──────────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id          uuid        primary key default uuid_generate_v4(),
  question    text        not null,
  answer      text        not null,
  category    text        default 'General',
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.faqs add column if not exists is_active boolean not null default true;
alter table public.faqs add column if not exists category text default 'General';
alter table public.faqs add column if not exists sort_order integer not null default 0;

alter table public.faqs enable row level security;
drop policy if exists "Public can view active faqs" on public.faqs;
create policy "Public can view active faqs" on public.faqs for select using (is_active = true);
drop policy if exists "Staff can manage faqs" on public.faqs;
create policy "Staff can manage faqs" on public.faqs for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);


-- ── 3. GALLERY ITEMS ─────────────────────────────────────────────────────────
create table if not exists public.gallery_items (
  id          uuid        primary key default uuid_generate_v4(),
  title       text        not null,
  description text,
  category    text,
  image_url   text        not null,
  sort_order  integer     not null default 0,
  is_featured boolean     not null default false,
  created_at  timestamptz not null default now()
);

alter table public.gallery_items add column if not exists is_featured boolean not null default false;
alter table public.gallery_items add column if not exists sort_order integer not null default 0;

alter table public.gallery_items enable row level security;
drop policy if exists "Public can view gallery items" on public.gallery_items;
create policy "Public can view gallery items" on public.gallery_items for select using (true);
drop policy if exists "Staff can manage gallery items" on public.gallery_items;
create policy "Staff can manage gallery items" on public.gallery_items for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);


-- ── 4. LEGAL DOCS ────────────────────────────────────────────────────────────
create table if not exists public.legal_docs (
  id          uuid        primary key default uuid_generate_v4(),
  type        text        not null unique, -- e.g., 'terms', 'privacy'
  title       text        not null,
  content     text        not null,
  version     text        default '1.0',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.legal_docs enable row level security;
drop policy if exists "Public can view legal docs" on public.legal_docs;
create policy "Public can view legal docs" on public.legal_docs for select using (true);
drop policy if exists "Staff can manage legal docs" on public.legal_docs;
create policy "Staff can manage legal docs" on public.legal_docs for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);


-- ── 5. STUDIO SETTINGS ───────────────────────────────────────────────────────
-- If the existing table is a key-value store (missing 'id'), drop it so we can recreate it.
do $$ 
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'studio_settings'
  ) and not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'studio_settings' and column_name = 'id'
  ) then
    drop table public.studio_settings cascade;
  end if;
end $$;

create table if not exists public.studio_settings (
  id              uuid        primary key default uuid_generate_v4(),
  contact_email   text,
  contact_phone   text,
  address         text,
  business_hours  text,
  social_links    jsonb       default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Clean up duplicate rows if they exist before enforcing uniqueness
delete from public.studio_settings 
where id not in (
  select id from public.studio_settings 
  order by updated_at desc 
  limit 1
);

-- Ensure only one row exists
create unique index if not exists studio_settings_single_row on public.studio_settings ((true));

alter table public.studio_settings enable row level security;
drop policy if exists "Public can view studio settings" on public.studio_settings;
create policy "Public can view studio settings" on public.studio_settings for select using (true);
drop policy if exists "Staff can manage studio settings" on public.studio_settings;
create policy "Staff can manage studio settings" on public.studio_settings for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);


-- ── 6. TEAM MEMBERS ──────────────────────────────────────────────────────────
create table if not exists public.team_members (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  role        text        not null,
  bio         text,
  image_url   text,
  sort_order  integer     not null default 0,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.team_members add column if not exists is_active boolean not null default true;
alter table public.team_members add column if not exists sort_order integer not null default 0;

alter table public.team_members enable row level security;
drop policy if exists "Public can view active team members" on public.team_members;
create policy "Public can view active team members" on public.team_members for select using (is_active = true);
drop policy if exists "Staff can manage team members" on public.team_members;
create policy "Staff can manage team members" on public.team_members for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('staff', 'admin'))
);
