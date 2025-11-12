import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const SUPABASE_CREDENTIALS_AVAILABLE = !!(supabaseUrl && supabaseAnonKey);

let supabase = null;

if (SUPABASE_CREDENTIALS_AVAILABLE) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error("Supabase URL or Anon Key is missing. Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
}

export { supabase };
