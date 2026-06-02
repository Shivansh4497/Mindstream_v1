import { supabase } from '../services/supabaseClient';

async function test() {
  if (supabase) {
    await supabase.auth.signInAnonymously();
  }
  console.log('Calling ai-proxy invoke test-gemini...');
  const res = await supabase.functions.invoke('ai-proxy', {
    body: {
      action: 'test-gemini'
    }
  });
  console.log('Test Gemini result:', JSON.stringify(res, null, 2));
  
  if (res.error) {
    console.log('Error properties:', Object.keys(res.error));
    console.log('Error stringified:', String(res.error));
    try {
      const text = await (res.error as any).context.text();
      console.log('Error context text:', text);
    } catch (e) {
      console.log('Could not read error context text:', e);
    }
  }
}

test().catch(console.error);
