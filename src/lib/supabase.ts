import { createClient } from '@supabase/supabase-js';

// Debug logging
console.log('Environment check:', {
  hasProcessEnv: typeof process !== 'undefined',
  envKeys: Object.keys(process.env || {}),
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing'
});

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables:', {
    url: process.env.VITE_SUPABASE_URL ? 'present' : 'missing',
    key: process.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);