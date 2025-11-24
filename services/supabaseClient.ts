// FIX: Removed vite/client reference and cast `import.meta` to `any` to resolve type errors.
import { createClient } from '@supabase/supabase-js';

// Helper function to robustly get environment variables in various environments
const getEnvVar = (key: string) => {
  // 1. Try Vite's import.meta.env (Standard for Vite apps)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  
  // 2. Try process.env (Standard for Node/Webpack/Some Vercel setups)
  // We catch errors because 'process' might not be defined in strict browser environments.
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore ReferenceError if process is not defined
  }
  
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

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
