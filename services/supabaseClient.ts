// FIX: Add a triple-slash directive to include Vite's client types.
// This resolves the TypeScript error "Property 'env' does not exist on type 'ImportMeta'"
// without needing to add a separate `vite-env.d.ts` file.
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Supabase credentials are now sourced from import.meta.env, the standard Vite way.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


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
