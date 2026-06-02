import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const targetUserId = "0051d9b8-a00f-4c1e-9534-45a428ffda63";

const testQueries = [
  "summarise my last 7 days",
  "what happened yesterday",
  "what did I do last month",
  "what happened on May 19",
  "when did I feel anxious",
  "quantum physics",
  "a",
  ""
];

// Load env variables manually and set them on process.env so supabaseClient can read them
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  });
}

// Now import supabase Client and dbService
import { supabase } from '../services/supabaseClient';
import { semanticSearchEntries } from '../services/dbService';

async function run() {
  console.log("==================================================");
  console.log("RAG VERIFICATION RUN");
  console.log(`Target User ID: ${targetUserId}`);
  console.log("==================================================");

  if (!supabase) {
    console.error("❌ Supabase client failed to initialize!");
    process.exit(1);
  }

  console.log("Signing in anonymously to authenticate session...");
  const { data: { session }, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    console.error("❌ Sign in failed:", signInError);
    process.exit(1);
  }
  console.log(`✅ Authenticated successfully! User: ${session?.user?.id}`);

  for (let idx = 0; idx < testQueries.length; idx++) {
    const query = testQueries[idx];
    const num = idx + 1;
    console.log(`\n--------------------------------------------------`);
    console.log(`QUERY #${num}: "${query}"`);
    console.log(`--------------------------------------------------`);

    try {
      const start = Date.now();
      const matches = await semanticSearchEntries(targetUserId, query, 5, 0.82);
      const duration = Date.now() - start;
      
      console.log(`MATCHES: ${matches.length} (Retrieved in ${duration}ms)`);
      if (matches.length > 0) {
        console.log("RESULTS:");
        matches.forEach((m: any, mIdx: number) => {
          const simPct = (m.similarity * 100).toFixed(1);
          const dateStr = m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : 'N/A';
          console.log(`  ${mIdx + 1}. [${dateStr}] [${simPct}%] "${m.text.substring(0, 100).replace(/\n/g, ' ')}..."`);
        });
      } else {
        console.log("RESULTS: (None)");
      }
    } catch (e: any) {
      console.error(`❌ Error querying semantic search:`, e.message || e);
    }
  }

  console.log("\n==================================================");
  console.log("RAG VERIFICATION RUN COMPLETED");
  console.log("==================================================");
}

run();
