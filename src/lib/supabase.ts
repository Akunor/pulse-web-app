import { createClient } from '@supabase/supabase-js';

// Debug logging
console.log('Environment check:', {
  hasViteEnv: typeof import.meta !== 'undefined',
  envKeys: Object.keys(import.meta.env),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing'
});

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables:', {
    url: import.meta.env.VITE_SUPABASE_URL ? 'present' : 'missing',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);