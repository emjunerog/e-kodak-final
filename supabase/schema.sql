-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- DATABASE SCHEMA — SUPABASE POSTGRESQL
-- ═══════════════════════════════════════════════════════════════════════════
--
-- HOW TO USE:
--  1. Go to your Supabase project → SQL Editor → New Query
--  2. Paste this entire file and click "Run"
--  3. All tables, RLS policies, and seed data will be created automatically
--
-- TABLES:
--   services          — Photography packages (what's on the Services page)
--   add_ons           — Optional extras customers can add to bookings
--   gallery_items     — Photos shown on the Gallery page
--   faqs              — FAQ accordion content
--   studio_settings   — Key/value store for admin-editable site content
--   team_members      — Team members for the About page
--   legal_docs        — Privacy Policy and Terms of Service content
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enable UUID generation ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── SERVICES ──────────────────────────────────────────────────────────────────
create table if not exists public.services (
  id            uuid        primary key default uuid_generate_v4(),
  slug          text        not null unique,
  name          text        not null,
  tagline       text,
  description   text,
  category      text        not null default 'portrait',
  cover_image   text,
  gallery_images text[]     default '{}',
  inclusions    text[]      default '{}',
  tiers         jsonb       default '[]',
  is_active     boolean     not null default true,
  sort_order    int         not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.services add column if not exists gallery_images text[] default '{}';

-- RLS: Anyone can read active services (public landing page)
alter table public.services enable row level security;
drop policy if exists "Services are publicly readable" on public.services;
create policy "Services are publicly readable"
  on public.services for select
  using (is_active = true);

-- ── ADD-ONS ───────────────────────────────────────────────────────────────────
create table if not exists public.add_ons (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  price       text        not null,
  is_active   boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.add_ons enable row level security;
drop policy if exists "Add-ons are publicly readable" on public.add_ons;
create policy "Add-ons are publicly readable"
  on public.add_ons for select
  using (is_active = true);

-- ── GALLERY ITEMS ─────────────────────────────────────────────────────────────
create table if not exists public.gallery_items (
  id           uuid        primary key default uuid_generate_v4(),
  title        text        not null,
  category     text        not null default 'portrait',
  image_url    text        not null,
  before_image text,
  likes        int         default 0,
  badges       text[]      default '{}',
  is_public    boolean     not null default true,
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now()
);

-- Ensure new columns exist if the table was created previously
alter table public.gallery_items 
  add column if not exists before_image text,
  add column if not exists likes int default 0,
  add column if not exists badges text[] default '{}';

alter table public.gallery_items enable row level security;
drop policy if exists "Public gallery items are readable" on public.gallery_items;
create policy "Public gallery items are readable"
  on public.gallery_items for select
  using (is_public = true);

-- ── ANNOUNCEMENTS ─────────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id          uuid        primary key default uuid_generate_v4(),
  text        text        not null,
  cta_text    text,
  cta_link    text,
  type        text        not null default 'info',  -- 'info' | 'promo'
  is_active   boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.announcements enable row level security;
drop policy if exists "Active announcements are publicly readable" on public.announcements;
create policy "Active announcements are publicly readable"
  on public.announcements for select
  using (is_active = true);

-- ── FAQs ──────────────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id          uuid        primary key default uuid_generate_v4(),
  question    text        not null,
  answer      text        not null,
  topic       text        not null default 'general',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.faqs enable row level security;
drop policy if exists "FAQs are publicly readable" on public.faqs;
create policy "FAQs are publicly readable"
  on public.faqs for select
  to anon, authenticated
  using (true);

-- ── STUDIO SETTINGS (key/value store) ─────────────────────────────────────────
-- Admin-editable values like hero headlines, phone numbers, etc.
create table if not exists public.studio_settings (
  key         text        primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

alter table public.studio_settings enable row level security;
drop policy if exists "Studio settings are publicly readable" on public.studio_settings;
create policy "Studio settings are publicly readable"
  on public.studio_settings for select
  to anon, authenticated
  using (true);

-- ── TEAM MEMBERS ──────────────────────────────────────────────────────────────
create table if not exists public.team_members (
  id          text        primary key,
  name        text        not null,
  role        text        not null,
  bio         text,
  image       text,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.team_members enable row level security;
drop policy if exists "Team members are publicly readable" on public.team_members;
create policy "Team members are publicly readable"
  on public.team_members for select
  using (true);

-- ── LEGAL DOCS ────────────────────────────────────────────────────────────────
create table if not exists public.legal_docs (
  slug        text        primary key,
  title       text        not null,
  content     text        not null,
  updated_at  timestamptz not null default now()
);

alter table public.legal_docs enable row level security;
drop policy if exists "Legal docs are publicly readable" on public.legal_docs;
create policy "Legal docs are publicly readable"
  on public.legal_docs for select
  using (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA — safe to re-run (uses ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Announcements seed ────────────────────────────────────────────────────────
insert into public.announcements (text, cta_text, cta_link, type, sort_order, is_active)
values
  ('🎉 Early Bird Offer: Book any package before September 30 and get 15% off!', 'View Packages', '/services', 'promo', 0, true),
  ('📱 Our Mobile Companion App is coming soon — track your booking in real time!', 'Learn More', '/#how-it-works', 'info', 1, true),
  ('✨ New graduation and debut photos added to our gallery — check them out!', 'View Gallery', '/gallery', 'info', 2, true)
on conflict do nothing;

-- ── Studio settings seed ─────────────────────────────────────────────────────
insert into public.studio_settings (key, value) values
  ('hero_headline',   'Moments Worth Remembering'),
  ('hero_subheadline','Premium photography services for life''s milestones. Portraits, graduations, events — captured beautifully.'),
  ('contact_phone',   '+63 912 345 6789'),
  ('contact_email',   'hello@ekodak.ph'),
  ('contact_address', 'Cebu City, Philippines'),
  ('contact_hours',   'Monday – Saturday, 9:00 AM – 6:00 PM'),
  ('payment_policy',  'Mode of the Payment: 50% Down payment upon booking')
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── FAQ seed ──────────────────────────────────────────────────────────────────
insert into public.faqs (question, answer, topic, sort_order) values
  ('How do I book a session?', 'Create a free account, pick your package, choose a date, and pay the reservation fee — done in under 5 minutes!', 'booking', 0),
  ('What is the reservation fee?', 'A 30% downpayment secures your booking. The balance is due on the day of the shoot.', 'pricing', 1),
  ('How long does editing take?', 'Standard editing is delivered within 5–7 business days. Rush delivery (48 hrs) is available as an add-on.', 'delivery', 2),
  ('Can I reschedule?', 'Yes! Rescheduling is free if done at least 48 hours before your session start time.', 'booking', 3),
  ('Do you shoot outside Cebu City?', 'Yes — travel shoots are available. Contact us for location-based pricing and availability.', 'booking', 4),
  ('Can I track my booking status?', 'Absolutely! Our mobile companion app lets you track your booking in real time from confirmation to photo delivery.', 'general', 5),
  ('How many edited photos will I receive?', 'It depends on your package tier. Basic packages include 10–15 edited photos; Premium tiers include 50+.', 'delivery', 6),
  ('What payment methods do you accept?', 'We accept GCash, Maya, bank transfer, and cash. Payment instructions are sent after booking confirmation.', 'pricing', 7)
on conflict do nothing;

-- ── Services seed ─────────────────────────────────────────────────────────────
insert into public.services (slug, name, tagline, description, category, cover_image, gallery_images, inclusions, tiers, sort_order)
values
  (
    'portrait',
    'Portrait Photography',
    'Capture who you are.',
    'Our portrait sessions are designed to bring out your authentic personality. Whether you need a professional headshot, a creative personal branding shoot, or simply a beautiful portrait — we create images that feel genuinely you.',
    'portrait',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80&auto=format&fit=crop'],
    array['Pre-session style consultation','Professional lighting setup','Multiple outfit changes','Professionally edited digital files','Online gallery delivery','Print-ready resolution'],
    '[
      {"name":"Basic","price":"₱3,500","duration":"1 hour","edited":"10 edited photos","highlights":["1 location","1 outfit","Online gallery"]},
      {"name":"Standard","price":"₱5,500","duration":"2 hours","edited":"25 edited photos","highlights":["2 locations","2 outfits","Online gallery","USB backup"],"popular":true},
      {"name":"Premium","price":"₱8,500","duration":"3 hours","edited":"50 edited photos","highlights":["3 locations","Unlimited outfits","Online gallery","USB backup","1 print"]}
    ]'::jsonb,
    0
  ),
  (
    'college-packages',
    'College Packages',
    'Celebrate your academic milestone in style.',
    'Comprehensive college graduation packages with premium framed portraits, wallet sizes, and passport prints. Perfect for honoring your hard work and achievements.',
    'graduation',
    'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop'],
    array['Free make-up and hair style','Professionally edited digital files','Online gallery with download'],
    '[
      {"name":"Set A","price":"₱4,875.00","duration":"Studio Session","edited":"All prints included","highlights":["1-12x18 with crystal wood frame","1-8x10 pilipiñana or barong (crystal frame)","1-8x10 Family picture (crystal frame)","6pcs. Wallet size colored (2r)","6pcs. Wallet size colored with cap (2r)","6pcs. Wallet size colored pilipiñana/barong (2r)","12pcs. 2x2 colored","6pcs. Passport size","6pcs. 2x2 colored casual attire","11pcs. 1x1 colored","1pcs. 5x7 size"],"popular":true},
      {"name":"Set B","price":"₱3,575.00","duration":"Studio Session","edited":"All prints included","highlights":["1-12x16 with crystal wood frame","1-8x10 without frame pilipiñana or barong","1-8x10 Family picture without frame","6pcs. Wallet size colored (2r)","4pcs. Wallet size colored with cap (2r)","4pcs. Wallet size colored pilipiñana (2r)","12pcs. 2x2 I.D colored","6pcs. Passport size","4pcs. 2x2 colored casual attire","8pcs. 1x1 colored","6pcs. Passport size","1pcs. 5x7 size without frame"]}
    ]'::jsonb,
    1
  ),
  (
    'studio-packages',
    'Studio & Toga Packages',
    'Essential graduation portraits.',
    'Accessible graduation photography packages focusing on classic toga and formal shots. Choose the perfect set of prints for your needs.',
    'graduation',
    'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop'],
    array['Free use of Toga (Non-transferable, Non-refundable)','Professionally edited digital files'],
    '[
      {"name":"Set A","price":"₱1,750.00","duration":"Studio Session","edited":"Prints included","highlights":["10x12 colored with crystal wood frame","1-8x10 Pilipiña attired without frame","4pcs. Wallet size colored with cap (2r)","4pcs. Wallet size pilipiña","6pcs. Passport size (Tesda)","6pcs. 2x2 formal attire","Free make up during studio pictorial only"],"popular":true},
      {"name":"Set B","price":"₱1,425.00","duration":"Studio Session","edited":"Prints included","highlights":["8x10 colored with crystal wood without frame","4pcs. Wallet size colored with cap (2r)","6pcs. 2x2 formal attire","6pcs. Passport size (Tesda)","Free make up during studio pictorial only"]},
      {"name":"Set C","price":"₱1,100.00","duration":"Studio Session","edited":"Prints included","highlights":["8x10 colored without frame","6pcs. Wallet size colored (2r)","6pcs. 2x2 formal attire","6pcs. Passport size (Tesda)","Free make up during studio pictorial only"]},
      {"name":"Set D","price":"₱795.00","duration":"Studio Session","edited":"Prints included","highlights":["8x10 colored without frame","4pcs. Wallet size colored (2r)","No free make up"]}
    ]'::jsonb,
    2
  ),
  (
    'event',
    'Event Photography',
    'Every moment, documented.',
    'From corporate gatherings to birthday celebrations — our event photographers blend into the background to capture genuine moments, candid reactions, and the full story of your event.',
    'event',
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80&auto=format&fit=crop'],
    array['Arrival to send-off coverage','Candid and posed shots','Group photo coordination','Same-day preview (Premium)','Online gallery','Multi-photographer available'],
    '[
      {"name":"Half-Day","price":"₱8,000","duration":"Up to 4 hours","edited":"80+ edited photos","highlights":["1 photographer","Candid & formals","Online gallery"]},
      {"name":"Full-Day","price":"₱14,000","duration":"Up to 8 hours","edited":"150+ edited photos","highlights":["1 photographer","Full event coverage","Online gallery","Highlights reel"],"popular":true},
      {"name":"Full-Day Duo","price":"₱20,000","duration":"Up to 10 hours","edited":"250+ edited photos","highlights":["2 photographers","Full event coverage","Online gallery","Same-day sneak peek","Rush 3-day delivery"]}
    ]'::jsonb,
    3
  ),
  (
    'family',
    'Family Photography',
    'Together is the best place.',
    'Family sessions are about connection, warmth, and laughter — not just perfect poses. We create a relaxed environment where your family can be themselves, and we capture the genuine moments between you.',
    'family',
    'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1511895426328-dc8714191011?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1475503572774-15a45e5d60b9?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1601027847350-0285867c31f7?w=600&q=80&auto=format&fit=crop'],
    array['Pre-session style consultation','Guided posing for all ages','Individual & group shots','Outdoor or studio setting','Professionally edited digital files','Online gallery with download'],
    '[
      {"name":"Mini","price":"₱4,000","duration":"45 minutes","edited":"15 edited photos","highlights":["1 location","Family of up to 5","Online gallery"]},
      {"name":"Standard","price":"₱6,000","duration":"1.5 hours","edited":"30 edited photos","highlights":["1–2 locations","Family of up to 8","Online gallery","1 printed 8×10"],"popular":true},
      {"name":"Extended","price":"₱9,000","duration":"3 hours","edited":"50+ edited photos","highlights":["Multiple locations","Extended family welcome","Online gallery","Print package included"]}
    ]'::jsonb,
    4
  ),
  (
    'couple',
    'Couple & Prenuptial',
    'Love, beautifully documented.',
    'Whether it is an anniversary session, a prenuptial shoot, or simply a celebration of your relationship — our couple sessions are relaxed, romantic, and artfully photographed to reflect your unique story.',
    'couple',
    'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1488116908828-cbf1b36c6e53?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80&auto=format&fit=crop'],
    array['Engagement / prenup consultation','Multiple romantic locations','Wardrobe change support','Artistic editing & color grade','Professionally edited digital files','Online gallery with download'],
    '[
      {"name":"Classic","price":"₱6,000","duration":"2 hours","edited":"30 edited photos","highlights":["1 location","2 outfit changes","Online gallery"]},
      {"name":"Signature","price":"₱10,000","duration":"4 hours","edited":"60 edited photos","highlights":["2–3 locations","Multiple outfits","Online gallery","Sunset / golden hour"],"popular":true},
      {"name":"Cinematic","price":"₱16,000","duration":"Full day","edited":"100+ edited photos","highlights":["Multiple locations","Unlimited outfits","Drone shots (if available)","Online gallery","Premium album"]}
    ]'::jsonb,
    5
  ),
  (
    'commercial',
    'Commercial & Branding',
    'Your brand, visually elevated.',
    'Professional commercial photography for businesses, products, and personal brands. We create images that communicate quality, build trust, and attract your ideal clients — for websites, social media, and marketing materials.',
    'commercial',
    'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=900&q=80&auto=format&fit=crop',
    array['https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1524901548305-08ecdea1ed24?w=600&q=80&auto=format&fit=crop'],
    array['Brand discovery call','Custom shot list planning','Product / lifestyle shots','Commercial usage license','Professionally edited digital files','Online gallery with download'],
    '[
      {"name":"Brand Starter","price":"₱8,000","duration":"2 hours","edited":"20 edited photos","highlights":["1 location","Headshots + product","Commercial license"]},
      {"name":"Brand Pro","price":"₱15,000","duration":"4–5 hours","edited":"40 edited photos","highlights":["Multiple setups","Team headshots","Product + lifestyle","Commercial license"],"popular":true},
      {"name":"Campaign","price":"Custom","duration":"Full-day +","edited":"Unlimited","highlights":["Full campaign coverage","Multiple days available","Models / styling","Art direction","Commercial license"]}
    ]'::jsonb,
    6
  )
on conflict (slug) do nothing;

-- ── Gallery seed ──────────────────────────────────────────────────────────────
insert into public.gallery_items (title, category, image_url, before_image, likes, badges, sort_order, is_public) values
  ('Portrait Session', 'portrait', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80&auto=format&fit=crop&sepia=1', 124, array['Featured', 'Client Favorite'], 0, true),
  ('Graduation Shoot', 'graduation', 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=80&auto=format&fit=crop', 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=800&q=20&auto=format&fit=crop&blur=10', 45, '{}', 1, true),
  ('Professional Headshot', 'portrait', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80&auto=format&fit=crop', null, 89, array['Award Winning'], 2, true),
  ('Family Moments', 'family', 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=700&q=80&auto=format&fit=crop', null, 0, '{}', 3, true),
  ('Couple Session', 'couple', 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=700&q=80&auto=format&fit=crop', null, 0, '{}', 4, true)
on conflict do nothing;

-- ── Add-ons seed ─────────────────────────────────────────────────────────────
insert into public.add_ons (name, price, sort_order, is_active) values
  ('Rush Delivery (3 days)',         '+₱1,500', 0, true),
  ('Extra Edited Photos (+10)',      '+₱800',   1, true),
  ('Printed 8×10 Photo',             '+₱350',   2, true),
  ('Printed Photo Album (20 pages)', '+₱3,500', 3, true),
  ('Same-Day Sneak Peek (5 photos)', '+₱1,000', 4, true),
  ('Additional Photographer',        '+₱4,000', 5, true),
  ('Drone Aerial Photography',       '+₱3,000', 6, true),
  ('Videography (Short Film)',       '+₱8,000', 7, true)
on conflict do nothing;

-- ── Team Members seed ─────────────────────────────────────────────────────────
insert into public.team_members (id, name, role, bio, image, sort_order) values
  ('lead-photographer', 'Miguel Santos', 'Lead Photographer & Founder', 'With over 10 years of experience, Miguel specializes in portrait and event photography. He founded E-Kodak to bring premium, cinematic photography to everyday milestones.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop&face', 0),
  ('photographer', 'James Villanueva', 'Photographer', 'James discovered his passion for photography during his own graduation shoot. Now a full-time E-Kodak photographer, he covers events and brings creative energy to every assignment.', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&auto=format&fit=crop&face', 1),
  ('photo-editor', 'Carla Mendoza', 'Lead Photo Editor', 'Carla''s meticulous editing ensures every photo delivered by E-Kodak is polished to perfection. She develops and maintains our signature editing style across all sessions.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop&face', 2)
on conflict do nothing;

-- ── Legal Docs seed ───────────────────────────────────────────────────────────
insert into public.legal_docs (slug, title, content) values
  ('privacy', 'Privacy Policy', '## 1. Introduction
Welcome to E-Kodak. We respect your privacy and are committed to protecting your personal data... (Example Content)'),
  ('terms', 'Terms of Service', '## 1. Acceptance of Terms
By accessing and using the E-Kodak website and services, you accept and agree to be bound by the terms and provision of this agreement...')
on conflict (slug) do update set content = excluded.content;
