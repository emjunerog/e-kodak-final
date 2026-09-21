import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

let cachedEnv = null;

export function loadEnv() {
  if (cachedEnv) return cachedEnv;
  cachedEnv = { ...process.env };
  for (const filename of ['.env.local', '.env']) {
    try {
      const fullPath = path.join(rootDir, filename);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!cachedEnv[key]) {
              cachedEnv[key] = val;
            }
          }
        }
      }
    } catch {}
  }
  return cachedEnv;
}

export function getDatabaseUrl() {
  const env = loadEnv();
  return env.DATABASE_URL || env.SUPABASE_DB_URL || null;
}

export function getSupabaseCredentials() {
  const env = loadEnv();
  return {
    supabaseUrl: env.VITE_SUPABASE_URL || '',
    supabaseKey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}
