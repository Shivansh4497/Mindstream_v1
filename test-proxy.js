import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = 'https://keaqaxoyfoeepgsriwqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODczMjMsImV4cCI6MjA3ODQ2MzMyM30.GOc6tF79xMWhCxf6-Hbx7IE8YbffRBGowr0E5PN-aAo';
const supabase = createClient(supabaseUrl, supabaseKey);

const run = async () => {
  const { data: authData } = await supabase.auth.signInAnonymously();
  const token = authData.session.access_token;
  
  // Create a large context
  let largeContext = "";
  for (let i = 0; i < 200; i++) {
    largeContext += `Entry ${i}: This is a journal entry about how I feel today. I am feeling good and productive.\n`;
  }
  
  const res = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'chat',
      payload: {
        userPrompt: 'Summarize my data',
        systemInstruction: largeContext,
        history: []
      }
    })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
};
run();
