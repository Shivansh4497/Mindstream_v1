import { createClient } from '@supabase/supabase-js';

// Supabase credentials are now sourced from environment variables with the VITE_ prefix.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;


let supabase: ReturnType<typeof createClient> | null = null;
let credentialsAvailable = false;

// Check if both environment variables are provided.
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    credentialsAvailable = true;
  } catch (e) {
    console.error("Error initializing Supabase client. Please check your credentials.", e);
    supabase = null;
    credentialsAvailable = false;
  }
}

if (!credentialsAvailable) {
    console.error("Supabase credentials are not configured. The application will not be able to connect to the backend.");
}

export const SUPABASE_CREDENTIALS_AVAILABLE = credentialsAvailable;
export { supabase };
