const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

let envContent = '';
try {
  envContent = fs.readFileSync('.env.local', 'utf-8');
} catch(e) {
  try {
    envContent = fs.readFileSync('.env', 'utf-8');
  } catch(e2) {
    console.log('No .env found');
    process.exit(1);
  }
}

const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) env[key.trim()] = val.join('=').trim().replace(/[\"']/g, '');
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('No supabase credentials found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['announcements', 'faqs', 'gallery_items', 'legal_docs', 'studio_settings', 'team_members'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log('Error in ' + table + ':', error.code, error.message);
    } else {
      console.log('Table ' + table + ' is OK.');
    }
  }
}
checkTables();
