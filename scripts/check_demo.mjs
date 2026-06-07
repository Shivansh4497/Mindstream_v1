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

async function check() {
    // 1. Get recent users (by checking profiles)
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1);
    const userId = profiles[0].id;
    console.log("Checking Demo User:", userId);
    console.log("Profile is_demo:", profiles[0].is_demo);

    // 2. Count entries
    const { data: entries, error } = await supabase.from('entries').select('id, text, timestamp, embedding').eq('user_id', userId).order('timestamp', { ascending: false });
    console.log("Total entries:", entries ? entries.length : 0);
    if (error) console.error("Error:", error);

    // 3. Check embeddings
    const withEmbeddings = entries.filter(e => e.embedding !== null).length;
    console.log(`Entries with embeddings: ${withEmbeddings} out of ${entries ? entries.length : 0}`);

    if (entries && entries.length > 0) {
        console.log("First entry timestamp:", entries[0].timestamp);
        console.log("First entry text:", entries[0].text);
    }
}

check();
