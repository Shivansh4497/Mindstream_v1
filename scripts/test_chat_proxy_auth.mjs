import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('/Users/director/Desktop/Mindstream_v1/.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testChat() {
  console.log("Signing in anonymously...");
  const { data: { session }, error: authError } = await supabase.auth.signInAnonymously();
  if (authError) {
     console.error("Auth Error:", authError);
     return;
  }
  
  console.log("Testing chat proxy...");
  const result = await supabase.functions.invoke('ai-proxy', {
    body: { 
      action: 'chat', 
      payload: { userPrompt: "Summarize my last 9 days ?", history: [] } 
    }
  });
  console.log("ai-proxy result:", result.data, result.error);
}
testChat();
