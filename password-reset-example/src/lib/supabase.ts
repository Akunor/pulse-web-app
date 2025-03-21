import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseInitialized = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseInitialized
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;