import { execSync } from 'child_process';
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
  console.log("Starting backfill script...");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("Fetching entries with null embeddings via Supabase CLI...");

  let entries: Array<{ id: string; text: string }> = [];
  try {
    const query = "select id, text from entries where embedding is null and deleted_at is null order by timestamp desc";
    const output = execSync(`supabase db query --linked -o json "${query}"`, { encoding: 'utf-8' });
    
    // The output contains "Initialising login role..." and then the json object.
    const jsonStart = output.indexOf('{');
    if (jsonStart === -1) {
      throw new Error("Could not find JSON in Supabase CLI output: " + output);
    }
    const jsonStr = output.substring(jsonStart);
    const result = JSON.parse(jsonStr);
    entries = result.rows || [];
  } catch (error: any) {
    console.error("Failed to query database:", error.message || error);
    process.exit(1);
  }

  console.log(`Found ${entries.length} entries that need embeddings.`);
  if (entries.length === 0) {
    console.log("Nothing to backfill!");
    return;
  }

  const batchSize = 25;
  const delayMs = 100;
  const total = entries.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(total / batchSize)} (entries ${i + 1} to ${Math.min(i + batchSize, total)})...`);

    await Promise.all(batch.map(async (entry) => {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            action: 'generate-and-store-embedding',
            payload: {
              entryId: entry.id,
              entryText: entry.text
            }
          })
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`❌ Failed for entry ${entry.id}: HTTP ${response.status} - ${text}`);
        } else {
          console.log(`✅ Generated & stored embedding for entry ${entry.id}`);
        }
      } catch (error: any) {
        console.error(`❌ Network error for entry ${entry.id}:`, error.message || error);
      }
    }));

    if (i + batchSize < total) {
      console.log(`Sleeping for ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.log("Backfill completed!");
}

run();
