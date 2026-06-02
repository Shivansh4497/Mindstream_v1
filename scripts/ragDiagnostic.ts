import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envVars: Record<string, string> = {};
  try {
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
            envVars[key] = val;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse .env.local manually', e);
  }
  return envVars;
}

const env = { ...loadEnv(), ...process.env };
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.local");
  process.exit(1);
}

const targetUserId = "0051d9b8-a00f-4c1e-9534-45a428ffda63";

const queries = [
  // TEMPORAL
  "summarise my last 7 days",
  "what happened yesterday",
  "how was my week",
  "what did I do last month",
  
  // EMOTIONAL
  "when did I feel anxious",
  "when was I most proud",
  "times I felt frustrated",
  "my happiest moments",
  
  // HABIT
  "how consistent am I with exercise",
  "when do I skip my morning jog",
  "my meditation habit",
  "screen time before bed",
  
  // PATTERN
  "what patterns do you see in my behavior",
  "what topics come up most in my journal",
  "what affects my energy levels",
  
  // CROSS-DOMAIN
  "how does work affect my mood",
  "relationship between sleep and productivity",
  "career and anxiety",
  
  // SPECIFIC
  "what happened on May 19",
  "cold plunge experience",
  
  // EDGE CASES
  "quantum physics",
  "a",
  ""
];

async function run() {
  console.log(`Starting RAG Diagnostic on semantic search system for user ${targetUserId}...`);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("Signing in anonymously to authenticate requests...");
  const { data: { session }, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    console.error("❌ Sign in failed:", signInError);
    process.exit(1);
  }
  console.log("✅ Authenticated successfully!");

  for (let idx = 0; idx < queries.length; idx++) {
    const query = queries[idx];
    const num = idx + 1;
    console.log(`\n========================================`);
    console.log(`QUERY #${num}: "${query}"`);
    console.log(`========================================`);

    try {
      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: {
          action: 'semantic-search',
          payload: {
            userId: targetUserId,
            queryText: query,
            matchCount: 5,
            matchThreshold: 0.3
          }
        }
      });

      if (error) {
        console.error(`❌ Edge Function Error:`, error.message || error);
        continue;
      }

      const matches = data?.matches || [];
      console.log(`MATCHES: ${matches.length}`);
      
      if (matches.length > 0) {
        console.log(`RESULTS:`);
        matches.forEach((m: any, mIdx: number) => {
          const simPct = (m.similarity * 100).toFixed(1);
          const dateStr = m.timestamp ? new Date(m.timestamp).toISOString().split('T')[0] : 'N/A';
          console.log(`  ${mIdx + 1}. [${dateStr}] [${simPct}%] "${m.text.substring(0, 100).replace(/\n/g, ' ')}..."`);
        });
      } else {
        console.log(`RESULTS: (None)`);
      }
    } catch (e: any) {
      console.error(`❌ Exception during query execution:`, e.message || e);
    }
  }

  console.log(`\n========================================`);
  console.log(`RAG Diagnostic Test Finished!`);
  console.log(`========================================`);
}

run();
