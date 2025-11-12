import { createClient } from '@supabase/supabase-js';

// IMPORTANT: These values are now loaded from environment variables.
// You must set SUPABASE_URL and SUPABASE_ANON_KEY in your deployment environment (e.g., Vercel).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase URL or Anon Key is missing. Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");
}

// The client is now created directly. If the credentials are not valid or are missing,
// Supabase methods will fail at runtime, which is expected until configured.
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);