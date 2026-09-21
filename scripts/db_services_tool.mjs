import { getSupabaseCredentials } from './envHelper.mjs';
import { createClient } from '@supabase/supabase-js';

const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
if (!supabaseUrl || !supabaseKey) {
  console.error('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying current services in Supabase...');
  const { data: services, error } = await supabase
    .from('services')
    .select('id, slug, name, category, is_active, tiers');

  if (error) {
    console.error('Error fetching services:', error);
    return;
  }

  console.log(`Found ${services.length} services.`);

  console.log('Testing upsert on services table...');
  const testService = {
    slug: 'senior-high-packages',
    name: 'Senior High Packages and sets',
    tagline: 'Essential graduation & toga portraits for Senior High School.',
    description: 'Accessible Senior High School graduation photography packages focusing on classic toga, formal attire, and Filipiniana portraits. Complete with crystal wood frames and ID prints.',
    category: 'senior-high',
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
  };

  const { data: upsertData, error: upsertError } = await supabase
    .from('services')
    .upsert(testService, { onConflict: 'slug' })
    .select();

  if (upsertError) {
    console.error('Upsert failed with anon key:', upsertError);
  } else {
    console.log('Upsert succeeded!', upsertData);
  }
}

main();
