import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://keaqaxoyfoeepgsriwqq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg4NzMyMywiZXhwIjoyMDc4NDYzMzIzfQ.opzsf4AeG3juoUA2I7cKToighF0R2kex9DLS9NqoJFI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkVectors() {
  const { data, error } = await supabase
    .from('entries')
    .select('id, text, timestamp, embedding')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  for (const row of data) {
    console.log(`Text: ${row.text.substring(0, 50)}...`);
    if (!row.embedding) {
      console.log(`Embedding: NULL`);
    } else {
      console.log(`Embedding: length ${row.embedding.length}, [${row.embedding[0]}, ${row.embedding[1]}, ${row.embedding[2]}...]`);
    }
    console.log('---');
  }
}

checkVectors();
