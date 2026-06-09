async function test() {
  const prompt = `You are a precision NLP intent classifier for an AI personal journaling assistant.
Return ONLY a valid JSON object matching this schema. The "intent" field MUST be exactly one of the categories above.
{
  "intent": "SEMANTIC_TOPIC",
  "hasTemporalIntent": false,
  "temporalExpression": null,
  "topicKeywords": [],
  "detectedTopic": null,
  "confidence": 0.99,
  "reasoning": "Brief explanation",
  "requiresStructuredContext": false
}
Current query: "how did my last 9 days went?"
Context (recent conversation):
`;
  
  const response = await fetch('https://keaqaxoyfoeepgsriwqq.supabase.co/functions/v1/ai-proxy', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlYXFheG95Zm9lZXBnc3Jpd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODczMjMsImV4cCI6MjA3ODQ2MzMyM30.GOc6tF79xMWhCxf6-Hbx7IE8YbffRBGowr0E5PN-aAo`
      },
      body: JSON.stringify({
          action: 'classify-intent',
          payload: { prompt, userMessage: "how did my last 9 days went?", temperature: 0 }
      })
  });

  console.log('Status:', response.status);
  console.log('Body:', await response.text());
}
test();
