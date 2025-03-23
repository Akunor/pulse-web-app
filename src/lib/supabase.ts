import { createClient } from '@supabase/supabase-js';

// Debug logging
console.log('Environment check:', {
  hasProcessEnv: typeof process !== 'undefined',
  envKeys: Object.keys(process.env || {}),
  supabaseUrl: import.meta.env.SUPABASE_URL,
  supabaseKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'
});

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);