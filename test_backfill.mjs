import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://keaqaxoyfoeepgsriwqq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4NzMyMywiZXhwIjoyMDc4NDYzMzIzfQ.opzsf4AeG3juoUA2I7cKToighF0R2kex9DLS9NqoJFI';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runBackfill() {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('id, text')
    .is('embedding', null)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .limit(30);

  if (error || !entries?.length) {
    console.log('[Backfill Test] No entries or error:', error);
    return;
  }

  console.log(`[Backfill Test] Processing ${entries.length} entries...`);
  
  for (const entry of entries) {
    try {
      console.log(`Generating for: ${entry.text.substring(0, 30)}`);
      const result = await supabase.functions.invoke('ai-proxy', {
        body: { action: 'generate-embedding', payload: { text: entry.text } }
      });
      
      const embedding = result.data?.embedding || result.data?.data?.embedding;
      console.log(`Result: success? ${!!embedding}, type: ${typeof embedding}, isArray: ${Array.isArray(embedding)}, length: ${embedding?.length}`);
      
      if (embedding && embedding.length === 384) {
        const { error: updateError } = await supabase
          .from('entries')
          .update({ embedding })
          .eq('id', entry.id);
        if (updateError) console.error('Update failed:', updateError);
        else console.log('Update success for', entry.id);
      }
    } catch (e) {
      console.error('Error generating:', e.message);
    }
  }
}
runBackfill();
