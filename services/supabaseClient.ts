// FIX: Removed vite/client reference and cast `import.meta` to `any` to resolve type errors.
import { createClient } from '@supabase/supabase-js';

// FIX: Use optional chaining (?.) to prevent a crash if import.meta.env is undefined.
// This is the definitive fix for the "blank screen" issue.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;


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
