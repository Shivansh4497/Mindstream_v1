// FIX: Removed vite/client reference and cast `import.meta` to `any` to resolve type errors.
import { createClient } from '@supabase/supabase-js';

// FIX: Reverted to VITE_ prefix as required by the Vite build tool for client-side exposure.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;


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
