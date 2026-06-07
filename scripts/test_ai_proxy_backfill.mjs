import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('/Users/director/Desktop/Mindstream_v1/.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackfill() {
    // 1. Get recent users (by checking profiles)
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1);
    const userId = profiles[0].id;
    console.log("Checking Demo User:", userId);

    const { data: entries, error } = await supabase
    .from('entries')
    .select('id, text')
    .eq('user_id', userId)
    .is('embedding', null)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .limit(30);

    console.log("Found entries:", entries ? entries.length : 0);
    
    if (entries && entries.length > 0) {
        console.log("First entry text:", entries[0].text);
        
        console.log("Invoking ai-proxy for first entry...");
        const result = await supabase.functions.invoke('ai-proxy', {
            body: { 
                action: 'generate-and-store-embedding', 
                payload: { entryId: entries[0].id, entryText: entries[0].text } 
            }
        });
        
        console.log("ai-proxy result:", result.data, result.error);
    }
}

runBackfill();
