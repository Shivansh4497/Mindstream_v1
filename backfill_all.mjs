import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://keaqaxoyfoeepgsriwqq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4NzMyMywiZXhwIjoyMDc4NDYzMzIzfQ.opzsf4AeG3juoUA2I7cKToighF0R2kex9DLS9NqoJFI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function backfillAll() {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, text')
    .is('embedding', null)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false });

  if (error || !entries?.length) {
    console.log('No entries to backfill or error:', error);
    return;
  }
  
  console.log(`Found ${entries.length} entries to backfill.`);
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    try {
      const result = await supabase.functions.invoke('ai-proxy', {
        body: { 
          action: 'generate-and-store-embedding', 
          payload: { entryId: entry.id, entryText: entry.text } 
        },
        headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } // this action ignores auth check in edge function
      });
      
      if (result.error) {
        console.error(`Failed to backfill ${entry.id}:`, result.error);
      } else {
        console.log(`[${i+1}/${entries.length}] Backfilled ${entry.id}`);
      }
    } catch (e) {
      console.error(`Error on ${entry.id}:`, e.message);
    }
  }
  
  console.log('Done!');
}

backfillAll();
