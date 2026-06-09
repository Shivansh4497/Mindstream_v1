const prompt = `You are a precision NLP intent classifier for an AI personal journaling assistant.
Your job is to strictly categorize the user's query into one of the following intents.

### INTENT CATEGORIES
1. SEMANTIC_TOPIC
- The user is asking to retrieve specific memories, events, or emotions from their journal.
- Example: "when do I feel happy?", "tell me about my run", "why was I anxious yesterday?", "who did I meet?".
- NEVER classify these questions as CONVERSATIONAL. They are database queries.

2. TEMPORAL_SUMMARY
- The user wants a general recap or summary of a specific time period, without naming a specific topic.
- Example: "how did my last 9 days go?", "summarize my week", "what happened this month?".

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

async function test() {
  const model = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Try 17B Scout first!
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `,
      },
      body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' }
      })
  });

  if (!response.ok) {
      console.log('Error 17B:', await response.text());
  } else {
      const json = await response.json();
      console.log('Success 17B:', json.choices[0].message.content);
  }
}
test();
