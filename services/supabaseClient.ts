import { createClient } from '@supabase/supabase-js';

// ====================================================================================
// DEVELOPER ACTION REQUIRED:
//
// Because this is a "build-less" project, we cannot securely load environment
// variables from a hosting provider like Vercel into the browser.
//
// Please replace the placeholder values below with your actual Supabase credentials.
// These keys are considered "public" and are safe to be in your client-side code.
// Your data is secured by Supabase's Row Level Security (RLS) policies.
//
// 1. Get your URL and Anon Key from your Supabase project dashboard:
//    Settings > API > Project API keys
// ====================================================================================
const supabaseUrl = 'https://keaqaxoyfoeepgsriwqq.supabase.co'; // e.g., 'https://your-project-id.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODczMjMsImV4cCI6MjA3ODQ2MzMyM30.GOc6tF79xMWhCxf6-Hbx7IE8YbffRBGowr0E5PN-aAo'; // e.g., 'ey...'


let supabase: ReturnType<typeof createClient> | null = null;
let credentialsAvailable = false;

// Basic validation to check if the placeholders have been replaced.
if (supabaseUrl.startsWith('https') && supabaseAnonKey.startsWith('ey')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    credentialsAvailable = true;
  } catch (e) {
    console.error("Error initializing Supabase client. Please check if the URL is correct.", e);
    supabase = null;
    credentialsAvailable = false;
  }
}

if (!credentialsAvailable) {
    console.error("Supabase credentials have not been configured. Please edit services/supabaseClient.ts and add your Supabase URL and Anon Key.");
}

export const SUPABASE_CREDENTIALS_AVAILABLE = credentialsAvailable;
export { supabase };
