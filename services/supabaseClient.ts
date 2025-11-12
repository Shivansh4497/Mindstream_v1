import { createClient } from '@supabase/supabase-js';

// FIX: Safely access process.env to prevent "process is not defined" ReferenceError in browser environments.
const supabaseUrl = typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined;
const supabaseAnonKey = typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined;


let supabase: ReturnType<typeof createClient> | null = null;
let credentialsAvailable = false;

try {
  if (supabaseUrl && supabaseAnonKey) {
    // This will throw an error if the URL is invalid.
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    credentialsAvailable = true;
  }
} catch (e) {
  console.error("Error initializing Supabase client. This is likely due to an invalid SUPABASE_URL. Please check your environment variables.", e);
  // Ensure supabase is null and credentialsAvailable is false on error.
  supabase = null;
  credentialsAvailable = false;
}

if (!credentialsAvailable) {
    console.error("Supabase credentials are not available or invalid. Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables correctly.");
}


export const SUPABASE_CREDENTIALS_AVAILABLE = credentialsAvailable;
export { supabase };
