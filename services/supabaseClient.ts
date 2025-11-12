import { createClient } from '@supabase/supabase-js';

// The build process in this environment appears to inject environment variables without a prefix.
// We will use the direct names as indicated by console errors.
const supabaseUrl = typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined;
const supabaseAnonKey = typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined;

let supabase: ReturnType<typeof createClient> | null = null;
let credentialsAvailable = false;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    credentialsAvailable = true;
  }
} catch (e) {
  console.error("Error initializing Supabase client. This could be due to an invalid URL.", e);
  supabase = null;
  credentialsAvailable = false;
}

if (!credentialsAvailable) {
    // This console error is a key diagnostic tool.
    console.error("Supabase credentials are not available or invalid. Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables correctly in your deployment settings.");
}

export const SUPABASE_CREDENTIALS_AVAILABLE = credentialsAvailable;
export { supabase };
