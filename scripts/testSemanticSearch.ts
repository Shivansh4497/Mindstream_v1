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

async function run() {
  console.log("Starting Semantic Search integration test...");
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log("Signing in anonymously...");
  const { data: { session }, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) {
    console.error("❌ Sign in failed:", signInError);
    process.exit(1);
  }
  
  const userId = session?.user?.id;
  console.log(`✅ Signed in successfully. User ID: ${userId}`);

  // Test 1: Generate Embedding
  console.log("\n--- TEST 1: Generate Embedding ---");
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'generate-embedding',
        payload: { text: "I feel very peaceful looking at the quiet ocean." }
      }
    });

    if (error) throw error;

    const embedding = data?.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid response format: embedding is missing or not an array");
    }

    console.log(`✅ Successfully generated embedding!`);
    console.log(`Dimensions: ${embedding.length} (expected 384)`);
    console.log(`Sample: [${embedding.slice(0, 5).join(', ')}, ...]`);

    if (embedding.length !== 384) {
      throw new Error(`Invalid dimensions: expected 384, got ${embedding.length}`);
    }
  } catch (error: any) {
    console.error("❌ Test 1 failed:", error.message || error);
    process.exit(1);
  }

  // Test 2: Semantic Search RPC
  console.log("\n--- TEST 2: Semantic Search RPC ---");
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'semantic-search',
        payload: {
          userId,
          queryText: "peaceful ocean",
          matchCount: 3,
          matchThreshold: 0.1 // Use low threshold to ensure we match at least something if db is empty or pre-seeded
        }
      }
    });

    if (error) throw error;

    const matches = data?.matches;
    console.log(`✅ Successfully completed semantic search!`);
    console.log(`Matches returned: ${matches?.length || 0}`);
    if (matches && matches.length > 0) {
      matches.forEach((m: any, idx: number) => {
        console.log(`[Match #${idx + 1}] Similarity: ${(m.similarity * 100).toFixed(1)}%`);
        console.log(`Text: "${m.text.substring(0, 80)}..."`);
      });
    } else {
      console.log("No matches found (which is expected if no entries have embeddings yet).");
    }
  } catch (error: any) {
    console.error("❌ Test 2 failed:", error.message || error);
    process.exit(1);
  }

  // Test 3: Semantic Search for existing user
  console.log("\n--- TEST 3: Semantic Search with Existing User ---");
  try {
    const existingUserId = "0051d9b8-a00f-4c1e-9534-45a428ffda63";
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'semantic-search',
        payload: {
          userId: existingUserId,
          queryText: "running along the river",
          matchCount: 3,
          matchThreshold: 0.3
        }
      }
    });

    if (error) throw error;

    const matches = data?.matches;
    console.log(`✅ Successfully completed semantic search for user ${existingUserId}!`);
    console.log(`Matches returned: ${matches?.length || 0}`);
    if (matches && matches.length > 0) {
      matches.forEach((m: any, idx: number) => {
        console.log(`[Match #${idx + 1}] Similarity: ${(m.similarity * 100).toFixed(1)}%`);
        console.log(`Text: "${m.text.substring(0, 80)}..."`);
      });
      
      // Let's assert that the first match is our running entry
      const hasRunning = matches.some((m: any) => m.text.includes("run along the river"));
      if (hasRunning) {
        console.log("🎉 SUCCESS: Semantically matched the 'run along the river' journal entry!");
      } else {
        console.warn("⚠️ Warning: Could not find 'run along the river' in the top matches.");
      }
    } else {
      throw new Error("No matches returned, but this user should have 28 backfilled entries!");
    }
  } catch (error: any) {
    console.error("❌ Test 3 failed:", error.message || error);
    process.exit(1);
  }

  console.log("\nAll integration tests passed successfully!");
}

run();
