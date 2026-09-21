import { getSupabaseCredentials } from './envHelper.mjs';
import { createClient } from '@supabase/supabase-js';

const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_SERVICES = [
  {
    slug: 'college-packages',
    category: 'college',
    name: 'College Packages and sets',
    tagline: 'Celebrate your collegiate milestone in style.',
    description: 'Comprehensive college graduation packages with premium crystal wood framed portraits, formal Filipiniana / Barong attire, family portraits, and complete passport/wallet prints.',
    cover_image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=900&q=80&auto=format&fit=crop',
    gallery_images: [
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&q=80&auto=format&fit=crop'
    ],
    inclusions: [
      'Free make-up and hair style',
      'Professionally edited digital files',
      'Online gallery with download',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱4,875.00',
        duration: 'Studio Session',
        edited: 'All prints included',
        highlights: [
          '1-12x18 with crystal wood frame',
          '1-8x10 pilipiñana or barong (crystal frame)',
          '1-8x10 Family picture (crystal frame)',
          '6pcs. Wallet size colored (2r)',
          '6pcs. Wallet size colored with cap (2r)',
          '6pcs. Wallet size colored pilipiñana/barong (2r)',
          '12pcs. 2x2 colored',
          '6pcs. Passport size',
          '6pcs. 2x2 colored casual attire',
          '11pcs. 1x1 colored',
          '1pcs. 5x7 size',
          'Free make-up and hair style'
        ],
        popular: true
      },
      {
        name: 'Set B',
        price: '₱3,575.00',
        duration: 'Studio Session',
        edited: 'All prints included',
        highlights: [
          '1-12x16 with crystal wood frame',
          '1-8x10 without frame pilipiñana or barong',
          '1-8x10 Family picture without frame',
          '6pcs. Wallet size colored (2r)',
          '4pcs. Wallet size colored with cap (2r)',
          '4pcs. Wallet size colored pilipiñana (2r)',
          '12pcs. 2x2 I.D colored',
          '6pcs. Passport size',
          '4pcs. 2x2 colored casual attire',
          '8pcs. 1x1 colored',
          '6pcs. Passport size',
          '1pcs. 5x7 size without frame'
        ]
      }
    ],
    is_active: true,
    sort_order: 1
  },
  {
    slug: 'senior-high-packages',
    category: 'senior-high',
    name: 'Senior High Packages and sets',
    tagline: 'Essential graduation & toga portraits for Senior High School.',
    description: 'Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.',
    cover_image: 'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=900&q=80&auto=format&fit=crop',
    gallery_images: [
      'https://images.unsplash.com/photo-1627556592933-ffe99c1cd9eb?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?w=600&q=80&auto=format&fit=crop'
    ],
    inclusions: [
      'Free use of Toga (Non-transferable, Non-refundable)',
      'Professionally edited digital files',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱1,750.00',
        duration: 'Studio Session',
        edited: 'Prints included',
        highlights: [
          '10x12 colored with crystal wood frame',
          '1-8x10 Pilipiña attired without frame',
          '4pcs. Wallet size colored with cap (2r)',
          '4pcs. Wallet size pilipiña',
          '6pcs. Passport size (Tesda)',
          '6pcs. 2x2 formal attire',
          'Free make up during studio pictorial only'
        ],
        popular: true
      },
      {
        name: 'Set B',
        price: '₱1,425.00',
        duration: 'Studio Session',
        edited: 'Prints included',
        highlights: [
          '8x10 colored with crystal wood without frame',
          '4pcs. Wallet size colored with cap (2r)',
          '6pcs. 2x2 formal attire',
          '6pcs. Passport size (Tesda)',
          'Free make up during studio pictorial only'
        ]
      },
      {
        name: 'Set C',
        price: '₱1,100.00',
        duration: 'Studio Session',
        edited: 'Prints included',
        highlights: [
          '8x10 colored without frame',
          '6pcs. Wallet size colored (2r)',
          '6pcs. 2x2 formal attire',
          '6pcs. Passport size (Tesda)',
          'Free make up during studio pictorial only'
        ]
      },
      {
        name: 'Set D',
        price: '₱795.00',
        duration: 'Studio Session',
        edited: 'Prints included',
        highlights: [
          '8x10 colored without frame',
          '4pcs. Wallet size colored (2r)',
          'No free make up'
        ]
      }
    ],
    is_active: true,
    sort_order: 2
  },
  {
    slug: 'wedding-video',
    category: 'wedding-video',
    name: 'Video / Wedding Packages',
    tagline: 'HD Video coverage',
    description: 'High-definition cinematic wedding videography capturing every emotion, vow, and celebration from morning preparation, church solemnity, to grand reception.',
    cover_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=900&q=80&auto=format&fit=crop',
    gallery_images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&q=80&auto=format&fit=crop'
    ],
    inclusions: [
      'HD Video coverage',
      'The Coverage, Preparation, Church and Reception',
      'USB and Google drive delivery',
      'PLAY MOVIE and MTV highlights',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    tiers: [
      {
        name: 'Set B',
        price: '₱18,500.00',
        duration: 'Full Wedding Day',
        edited: 'Play Movie & MTV',
        highlights: [
          '2 mirrorless camera video Camera with Videography',
          'The Coverage, Preparation, Church and Reception.',
          '1 USB and Google drive',
          'PLAY MOVIE and MTV'
        ]
      },
      {
        name: 'Set C',
        price: '₱28,000.00',
        duration: 'Full Wedding Day + Drone',
        edited: 'Same Day Edit (SDE)',
        highlights: [
          '2 mirrorless camera video Camera with Videography',
          'with Drone',
          'The Coverage, Preparation, Church and Reception.',
          'Same Day Edit (SDE)',
          '1 USB and Google drive',
          'PLAY MOVIE and MTV'
        ],
        popular: true
      },
      {
        name: 'Set D',
        price: '₱39,000.00',
        duration: 'Full Wedding Day + Drone + SDE + AVP',
        edited: 'Same Day Edit (SDE) & AVP',
        highlights: [
          '3 mirrorless camera video Camera with Videography',
          'with drone',
          'The Coverage, Preparation, Church and Reception.',
          'Teaser Outdoor video shot',
          'Same Day Edit (SDE)',
          '1 USB and Google drive.',
          'Audio Video Presentation (AVP)',
          'PLAY MOVIE and MTV'
        ]
      }
    ],
    is_active: true,
    sort_order: 3
  },
  {
    slug: 'wedding-photo',
    category: 'wedding-photo',
    name: 'Photo / Wedding Services',
    tagline: 'Photography services',
    description: 'Complete professional wedding photography capturing timeless moments from bridal preparation to church ceremony and joyous reception festivities.',
    cover_image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=80&auto=format&fit=crop',
    gallery_images: [
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&q=80&auto=format&fit=crop'
    ],
    inclusions: [
      'The Coverage, Preparation, Church and Reception',
      'Unlimited Shots with USB',
      'Framed Portraits & Collage Photo Books',
      'Professional Lead & Assistant Photographers',
      'Mode of Payment: 50% Down payment upon booking. Full payment on the day of the event.'
    ],
    tiers: [
      {
        name: 'Set A',
        price: '₱18,500.00',
        duration: 'Full Wedding Day',
        edited: 'Unlimited Shots with USB',
        highlights: [
          'The Coverage, Preparation, Church and Reception.',
          'Unlimited Shots with USB',
          '11x14 with frame',
          '150 prints 4x6 (4r)',
          '2 Photographer'
        ]
      },
      {
        name: 'Set C',
        price: '₱31,000.00',
        duration: 'Prenup + Full Wedding Day',
        edited: 'Same Day Edit (SDE)',
        highlights: [
          'The Coverage, Preparation, Church and Reception.',
          'Unlimited Shots with USB',
          '30 pages Photo Book 10x10 collage',
          '1-16x20 with frame',
          'Prenup with Teaser',
          'Same Day Edit (SDE)',
          '3-Photographer'
        ],
        popular: true
      },
      {
        name: 'Set D',
        price: '₱53,500.00',
        duration: 'Grand Wedding Master Suite',
        edited: 'Full Hardbound Album + Canvass + SDE + AVP',
        highlights: [
          'The Coverage, Preparation, Church and Reception.',
          'Unlimited shots with USB',
          '200 copies 4r size without album',
          '40 pages hard bound album 11x14 collage',
          '30 pages Photo Book 10x10 collage',
          '24x30 canvass with frame',
          '3 DSLR full HDMI 1080p Video Camera',
          'Prenup with Teaser',
          'Same Day Edit (SDE)',
          'Audio Video Presentation (AVP)',
          '4-Photographer'
        ]
      }
    ],
    is_active: true,
    sort_order: 4
  }
];

const TARGET_ADD_ONS = [
  { name: 'Rush Delivery (3 days)', price: '+₱1,500', is_active: true, sort_order: 1 },
  { name: 'Extra Edited Photos (+10)', price: '+₱800', is_active: true, sort_order: 2 },
  { name: 'Same-Day Sneak Peek (5 photos)', price: '+₱1,000', is_active: true, sort_order: 3 },
  { name: 'Printed 8×10 Portrait', price: '+₱350', is_active: true, sort_order: 4 },
  { name: 'Printed Photo Album (20 pages)', price: '+₱3,500', is_active: true, sort_order: 5 },
  { name: 'Additional Assistant / Second Shooter', price: '+₱4,000', is_active: true, sort_order: 6 },
  { name: 'Drone Aerial Photography', price: '+₱3,000', is_active: true, sort_order: 7 },
  { name: 'Videography (Short Film)', price: '+₱8,000', is_active: true, sort_order: 8 }
];

async function syncDatabase() {
  console.log('Authenticating as admin in Supabase...');
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@ekodak.com',
    password: 'admin123'
  });

  if (authError) {
    console.error('Failed to authenticate admin:', authError);
    process.exit(1);
  }

  console.log('Admin authenticated successfully:', auth.user.email);

  // 1. Check existing services
  const { data: existingServices, error: fetchErr } = await supabase
    .from('services')
    .select('id, slug, name');

  if (fetchErr) {
    console.error('Error fetching existing services:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${existingServices.length} existing services.`);
  const slugToId = new Map(existingServices.map(s => [s.slug, s.id]));

  // Also sync studio-packages row if it exists so both slugs are valid and up to date
  const studioRow = TARGET_SERVICES.find(s => s.slug === 'senior-high-packages');
  if (slugToId.has('studio-packages')) {
    console.log('Updating legacy studio-packages row in database...');
    const { error: studioErr } = await supabase
      .from('services')
      .update({
        name: studioRow.name,
        tagline: studioRow.tagline,
        description: studioRow.description,
        category: studioRow.category,
        cover_image: studioRow.cover_image,
        gallery_images: studioRow.gallery_images,
        inclusions: studioRow.inclusions,
        tiers: studioRow.tiers,
        is_active: true,
        sort_order: 2,
        updated_at: new Date().toISOString()
      })
      .eq('slug', 'studio-packages');
    if (studioErr) console.warn('Could not update studio-packages:', studioErr);
    else console.log('✓ Updated studio-packages');
  }

  // Upsert the 4 canonical services
  for (const svc of TARGET_SERVICES) {
    if (slugToId.has(svc.slug)) {
      console.log(`Updating ${svc.slug} in database...`);
      const { error: updateErr } = await supabase
        .from('services')
        .update({
          ...svc,
          updated_at: new Date().toISOString()
        })
        .eq('slug', svc.slug);

      if (updateErr) console.error(`Error updating ${svc.slug}:`, updateErr);
      else console.log(`✓ Updated ${svc.slug}`);
    } else {
      console.log(`Inserting ${svc.slug} into database...`);
      const { error: insertErr } = await supabase
        .from('services')
        .insert([svc]);

      if (insertErr) console.error(`Error inserting ${svc.slug}:`, insertErr);
      else console.log(`✓ Inserted ${svc.slug}`);
    }
  }

  // Deactivate non-primary services (portrait, event, family, couple, commercial, graduation)
  const primarySlugs = ['college-packages', 'senior-high-packages', 'wedding-video', 'wedding-photo'];
  for (const s of existingServices) {
    if (!primarySlugs.includes(s.slug) && s.slug !== 'studio-packages') {
      console.log(`Setting ${s.slug} to inactive...`);
      await supabase
        .from('services')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('slug', s.slug);
    }
  }

  // 2. Synchronize add_ons table: deactivate old duplicates, insert clean 8 add_ons
  console.log('Cleaning and synchronizing add_ons table...');
  const { data: currentAddOns } = await supabase.from('add_ons').select('id, name');
  if (currentAddOns && currentAddOns.length > 0) {
    await supabase
      .from('add_ons')
      .update({ is_active: false })
      .in('id', currentAddOns.map(a => a.id));
  }

  for (const addOn of TARGET_ADD_ONS) {
    const { error: addOnErr } = await supabase
      .from('add_ons')
      .insert([addOn]);
    if (addOnErr) console.error(`Error inserting add_on ${addOn.name}:`, addOnErr);
    else console.log(`✓ Synchronized add-on: ${addOn.name}`);
  }

  console.log('=== DATABASE SYNCHRONIZATION COMPLETE ===');
}

syncDatabase().catch(err => {
  console.error('Unhandled error during DB sync:', err);
  process.exit(1);
});
