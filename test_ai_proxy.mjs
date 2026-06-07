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
    .limit(1);

  if (error || !entries?.length) return;

  const entry = entries[0];
  console.log(`Generating for: ${entry.text.substring(0, 30)}`);
  
  const result = await supabase.functions.invoke('ai-proxy', {
    body: { action: 'generate-embedding', payload: { text: entry.text } },
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` }
  });
  
  if (result.error) {
    console.log('Error:', result.error);
    if (result.error.context) {
       console.log('Context:', await result.error.context.text());
    }
  }
  console.log('Success:', !!result.data);
}
runBackfill();
