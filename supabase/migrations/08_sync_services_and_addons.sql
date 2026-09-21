-- ═══════════════════════════════════════════════════════════════════════════
-- E-Kodak Photography Service Management System
-- MIGRATION: 08_sync_services_and_addons.sql
-- ═══════════════════════════════════════════════════════════════════════════
-- Synchronizes live studio services (College, Senior High, Wedding Video, Wedding Photo)
-- and add-ons, ensuring RLS allows staff and admin to manage services and add-ons.

-- 1. Ensure staff/admin management policies on services and add_ons
alter table public.services enable row level security;
drop policy if exists "Services are publicly readable" on public.services;
create policy "Services are publicly readable"
  on public.services for select
  using (is_active = true);

drop policy if exists "Staff can manage services" on public.services;
create policy "Staff can manage services" on public.services
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('staff', 'admin')
    )
  );

alter table public.add_ons enable row level security;
drop policy if exists "Add-ons are publicly readable" on public.add_ons;
create policy "Add-ons are publicly readable"
  on public.add_ons for select
  using (is_active = true);

drop policy if exists "Staff can manage add_ons" on public.add_ons;
create policy "Staff can manage add_ons" on public.add_ons
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('staff', 'admin')
    )
  );

-- 2. Upsert Canonical Services
insert into public.services (
  slug, name, tagline, description, category,
  cover_image, gallery_images, inclusions, tiers, is_active, sort_order
)
values
  (
    'college-packages',
    'College Packages and sets',
    'Celebrate your collegiate milestone in style.',
    'Comprehensive college graduation packages with premium crystal wood framed portraits, formal Filipiniana / Barong attire, family portraits, and complete passport/wallet prints.',
    'college',
    'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop',
    array[
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop'
    ],
    array[
      'Free make-up and hair style',
      'Professionally edited digital files',
      'Online gallery with download',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    '[
      {
        "name": "Set A",
        "price": "₱4,875.00",
        "duration": "Studio Session",
        "edited": "All prints included",
        "highlights": [
          "1-12x18 with crystal wood frame",
          "1-8x10 pilipiñana or barong (crystal frame)",
          "1-8x10 Family picture (crystal frame)",
          "6pcs. Wallet size colored (2r)",
          "6pcs. Wallet size colored with cap (2r)",
          "6pcs. Wallet size colored pilipiñana/barong (2r)",
          "12pcs. 2x2 colored",
          "6pcs. Passport size",
          "6pcs. 2x2 colored casual attire",
          "11pcs. 1x1 colored",
          "1pcs. 5x7 size",
          "Free make-up and hair style"
        ],
        "popular": true
      },
      {
        "name": "Set B",
        "price": "₱3,575.00",
        "duration": "Studio Session",
        "edited": "All prints included",
        "highlights": [
          "1-12x16 with crystal wood frame",
          "1-8x10 without frame pilipiñana or barong",
          "1-8x10 Family picture without frame",
          "6pcs. Wallet size colored (2r)",
          "4pcs. Wallet size colored with cap (2r)",
          "4pcs. Wallet size colored pilipiñana (2r)",
          "12pcs. 2x2 I.D colored",
          "6pcs. Passport size",
          "4pcs. 2x2 colored casual attire",
          "8pcs. 1x1 colored",
          "6pcs. Passport size",
          "1pcs. 5x7 size without frame"
        ]
      }
    ]'::jsonb,
    true,
    1
  ),
  (
    'senior-high-packages',
    'Senior High Packages and sets',
    'Essential graduation & toga portraits for Senior High School.',
    'Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.',
    'senior-high',
    'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop',
    array[
      'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop'
    ],
    array[
      'Free use of Toga (Non-transferable, Non-refundable)',
      'Professionally edited digital files',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    '[
      {
        "name": "Set A",
        "price": "₱1,750.00",
        "duration": "Studio Session",
        "edited": "Prints included",
        "highlights": [
          "10x12 colored with crystal wood frame",
          "1-8x10 Pilipiña attired without frame",
          "4pcs. Wallet size colored with cap (2r)",
          "4pcs. Wallet size pilipiña",
          "6pcs. Passport size (Tesda)",
          "6pcs. 2x2 formal attire",
          "Free make up during studio pictorial only"
        ],
        "popular": true
      },
      {
        "name": "Set B",
        "price": "₱1,425.00",
        "duration": "Studio Session",
        "edited": "Prints included",
        "highlights": [
          "8x10 colored with crystal wood without frame",
          "4pcs. Wallet size colored with cap (2r)",
          "6pcs. 2x2 formal attire",
          "6pcs. Passport size (Tesda)",
          "Free make up during studio pictorial only"
        ]
      },
      {
        "name": "Set C",
        "price": "₱1,100.00",
        "duration": "Studio Session",
        "edited": "Prints included",
        "highlights": [
          "8x10 colored without frame",
          "6pcs. Wallet size colored (2r)",
          "6pcs. 2x2 formal attire",
          "6pcs. Passport size (Tesda)",
          "Free make up during studio pictorial only"
        ]
      },
      {
        "name": "Set D",
        "price": "₱795.00",
        "duration": "Studio Session",
        "edited": "Prints included",
        "highlights": [
          "8x10 colored without frame",
          "4pcs. Wallet size colored (2r)",
          "No free make up"
        ]
      }
    ]'::jsonb,
    true,
    2
  ),
  (
    'wedding-video',
    'Video / Wedding Packages',
    'HD Video coverage',
    'High-definition cinematic wedding videography capturing every emotion, vow, and celebration from morning preparation, church solemnity, to grand reception.',
    'wedding-video',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop',
    array[
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80&auto=format&fit=crop'
    ],
    array[
      'HD Video coverage',
      'The Coverage, Preparation, Church and Reception',
      'USB and Google drive delivery',
      'PLAY MOVIE and MTV highlights',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    '[
      {
        "name": "Set B",
        "price": "₱18,500.00",
        "duration": "Full Wedding Day",
        "edited": "Play Movie & MTV",
        "highlights": [
          "2 mirrorless camera video Camera with Videography",
          "The Coverage, Preparation, Church and Reception.",
          "1 USB and Google drive",
          "PLAY MOVIE and MTV"
        ]
      },
      {
        "name": "Set C",
        "price": "₱28,000.00",
        "duration": "Full Wedding Day + Drone",
        "edited": "Same Day Edit (SDE)",
        "highlights": [
          "2 mirrorless camera video Camera with Videography",
          "with Drone",
          "The Coverage, Preparation, Church and Reception.",
          "Same Day Edit (SDE)",
          "1 USB and Google drive",
          "PLAY MOVIE and MTV"
        ],
        "popular": true
      },
      {
        "name": "Set D",
        "price": "₱39,000.00",
        "duration": "Full Wedding Day + Drone + SDE + AVP",
        "edited": "Same Day Edit (SDE) & AVP",
        "highlights": [
          "3 mirrorless camera video Camera with Videography",
          "with drone",
          "The Coverage, Preparation, Church and Reception.",
          "Teaser Outdoor video shot",
          "Same Day Edit (SDE)",
          "1 USB and Google drive.",
          "Audio Video Presentation (AVP)",
          "PLAY MOVIE and MTV"
        ]
      }
    ]'::jsonb,
    true,
    3
  ),
  (
    'wedding-photo',
    'Photo / Wedding Services',
    'Photography services',
    'Complete professional wedding photography capturing timeless moments from bridal preparation to church ceremony and joyous reception festivities.',
    'wedding-photo',
    'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop',
    array[
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&q=80&auto=format&fit=crop'
    ],
    array[
      'The Coverage, Preparation, Church and Reception',
      'Unlimited Shots with USB',
      'Framed Portraits & Collage Photo Books',
      'Professional Lead & Assistant Photographers',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    '[
      {
        "name": "Set A",
        "price": "₱18,500.00",
        "duration": "Full Wedding Day",
        "edited": "Unlimited Shots with USB",
        "highlights": [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited Shots with USB",
          "11x14 with frame",
          "150 prints 4x6 (4r)",
          "2 Photographer"
        ]
      },
      {
        "name": "Set C",
        "price": "₱31,000.00",
        "duration": "Prenup + Full Wedding Day",
        "edited": "Same Day Edit (SDE)",
        "highlights": [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited Shots with USB",
          "30 pages Photo Book 10x10 collage",
          "1-16x20 with frame",
          "Prenup with Teaser",
          "Same Day Edit (SDE)",
          "3-Photographer"
        ],
        "popular": true
      },
      {
        "name": "Set D",
        "price": "₱53,500.00",
        "duration": "Grand Wedding Master Suite",
        "edited": "Full Hardbound Album + Canvass + SDE + AVP",
        "highlights": [
          "The Coverage, Preparation, Church and Reception.",
          "Unlimited shots with USB",
          "200 copies 4r size without album",
          "40 pages hard bound album 11x14 collage",
          "30 pages Photo Book 10x10 collage",
          "24x30 canvass with frame",
          "3 DSLR full HDMI 1080p Video Camera",
          "Prenup with Teaser",
          "Same Day Edit (SDE)",
          "Audio Video Presentation (AVP)",
          "4-Photographer"
        ]
      }
    ]'::jsonb,
    true,
    4
  )
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  description = excluded.description,
  category = excluded.category,
  cover_image = excluded.cover_image,
  gallery_images = excluded.gallery_images,
  inclusions = excluded.inclusions,
  tiers = excluded.tiers,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Also ensure studio-packages matches senior-high-packages content for backward compatibility
update public.services
set
  name = 'Senior High Packages and sets',
  tagline = 'Essential graduation & toga portraits for Senior High School.',
  description = 'Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.',
  category = 'senior-high',
  inclusions = array[
    'Free use of Toga (Non-transferable, Non-refundable)',
    'Professionally edited digital files',
    'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
  ],
  tiers = '[
    {
      "name": "Set A",
      "price": "₱1,750.00",
      "duration": "Studio Session",
      "edited": "Prints included",
      "highlights": [
        "10x12 colored with crystal wood frame",
        "1-8x10 Pilipiña attired without frame",
        "4pcs. Wallet size colored with cap (2r)",
        "4pcs. Wallet size pilipiña",
        "6pcs. Passport size (Tesda)",
        "6pcs. 2x2 formal attire",
        "Free make up during studio pictorial only"
      ],
      "popular": true
    },
    {
      "name": "Set B",
      "price": "₱1,425.00",
      "duration": "Studio Session",
      "edited": "Prints included",
      "highlights": [
        "8x10 colored with crystal wood without frame",
        "4pcs. Wallet size colored with cap (2r)",
        "6pcs. 2x2 formal attire",
        "6pcs. Passport size (Tesda)",
        "Free make up during studio pictorial only"
      ]
    },
    {
      "name": "Set C",
      "price": "₱1,100.00",
      "duration": "Studio Session",
      "edited": "Prints included",
      "highlights": [
        "8x10 colored without frame",
        "6pcs. Wallet size colored (2r)",
        "6pcs. 2x2 formal attire",
        "6pcs. Passport size (Tesda)",
        "Free make up during studio pictorial only"
      ]
    },
    {
      "name": "Set D",
      "price": "₱795.00",
      "duration": "Studio Session",
      "edited": "Prints included",
      "highlights": [
        "8x10 colored without frame",
        "4pcs. Wallet size colored (2r)",
        "No free make up"
      ]
    }
  ]'::jsonb,
  is_active = true,
  sort_order = 2,
  updated_at = now()
where slug = 'studio-packages';

-- Set unused demo services to inactive so client interfaces display active studio services
update public.services
set is_active = false, updated_at = now()
where slug in ('portrait', 'event', 'family', 'couple', 'commercial', 'graduation');
