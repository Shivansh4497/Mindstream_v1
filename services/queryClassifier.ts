import { supabase } from './supabaseClient';
import { parseTemporalIntent } from './temporalParser';
import { callAIProxy } from './geminiClient';

export type QueryIntent =
  | 'TEMPORAL_SUMMARY'
  | 'SEMANTIC_TOPIC'
  | 'TEMPORAL_TOPIC'
  | 'BEHAVIORAL'
  | 'ANALYTICAL'
  | 'CONVERSATIONAL'
  | 'HABIT_QUERY'
  | 'GOAL_QUERY';

export interface ClassifiedQuery {
  intent: QueryIntent;
  hasTemporalIntent: boolean;
  temporalExpression: string | null;
  topicKeywords: string[];
  detectedTopic: string | null;
  startDate: Date | null;
  endDate: Date | null;
  confidence: number;
  reasoning: string;
  requiresStructuredContext?: boolean;
  classifierProvider?: string;
}

export async function classifyQueryIntent(
  userMessage: string,
  conversationHistory: string[],
  retries = 1
): Promise<ClassifiedQuery> {
  // Build conversation context (last 2 messages maximum)
  const recentHistory = conversationHistory
    .slice(-2)
    .join('\n');

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

3. TEMPORAL_TOPIC
- The user asks about a SPECIFIC topic constrained to an EXPLICIT time window.
- Example: "how was my sleep last week?", "my anxiety over the past 3 days".

4. HABIT_QUERY
- The user explicitly asks about their habits, workouts, sleep consistency, or exercise streaks.
- Example: "how is my exercise going?", "am I consistent with meditation?".

5. GOAL_QUERY
- The user asks about their goals, targets, milestones, or progress tracking.
- Example: "am I on track with my goals?", "progress on my writing target".

6. ANALYTICAL
- The user asks the AI to find overarching patterns, trends, or insights across their data.
- Example: "what are my common stress triggers?", "do you see any patterns in my sleep?".

7. CONVERSATIONAL
- The user is purely chatting, acknowledging, or asking a direct follow-up about the AI's previous message.
- Example: "interesting", "tell me more", "thanks", "what do you mean by that?".
- CRITICAL: "When do I...", "How did I...", "Why was I..." are NEVER conversational. They are SEMANTIC_TOPIC or ANALYTICAL.

### EXTRACTION RULES
- hasTemporalIntent: Set to true ONLY if there is an explicit time window mentioned (e.g., "last 7 days", "this week"). Time of day ("morning") or general words ("when", "last") do not count.
- temporalExpression: Extract the exact time phrase (e.g., "last 2 weeks") or null.
- requiresStructuredContext: Set to true ONLY if the query mixes emotional/reflective questions with habit/goal questions (e.g., "I feel low, how is my routine holding up?").

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

Current query: "${userMessage}"

Context (recent conversation):
${recentHistory}
`;

  try {
    // Use Groq 8B — fast and cheap for classification tasks
    // We will call the edge function directly
    const response = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'classify-intent',
        payload: { prompt, userMessage, temperature: 0 }
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const data = response.data.data || response.data;
    const aiProxyMeta = response.data._meta;
    const classifierProvider = aiProxyMeta?.provider || 'Groq 8B';
    
    let textToParse = typeof data.text === 'string' ? data.text : '';
    if (textToParse) {
      const start = textToParse.indexOf('{');
      const end = textToParse.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        textToParse = textToParse.substring(start, end + 1);
      }
    }
    const classified = textToParse ? JSON.parse(textToParse) : data;

    let finalIntent = classified.intent;
    let finalHasTemporalIntent = classified.hasTemporalIntent;
    let finalTemporalExpression = classified.temporalExpression;

    // Post-check to enforce strict rule for TEMPORAL_TOPIC
    if (finalIntent === 'TEMPORAL_TOPIC' && !finalHasTemporalIntent) {
      finalIntent = 'SEMANTIC_TOPIC';
    }

    // Parse temporal dates if present
    let startDate = null;
    let endDate = null;
    if (
      finalHasTemporalIntent &&
      finalTemporalExpression
    ) {
      const temporal = parseTemporalIntent(
        finalTemporalExpression
      );
      startDate = temporal.startDate;
      endDate = temporal.endDate;
    }

    const detectedTopic = classified.detectedTopic ?? (classified.topicKeywords?.[0] ?? null);

    return {
      ...classified,
      intent: finalIntent,
      hasTemporalIntent: finalHasTemporalIntent,
      temporalExpression: finalTemporalExpression,
      detectedTopic,
      startDate,
      endDate,
      requiresStructuredContext: classified.requiresStructuredContext ?? false,
      classifierProvider
    };

  } catch (error) {
    if (retries > 0) {
      console.warn(`[classifyQueryIntent] Retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 1000));
      return classifyQueryIntent(userMessage, conversationHistory, retries - 1);
    }
    
    console.error('Intent classification failed:', error);
    // Fallback to SEMANTIC_TOPIC on error
    return {
      intent: 'SEMANTIC_TOPIC',
      hasTemporalIntent: false,
      temporalExpression: null,
      topicKeywords: [],
      detectedTopic: null,
      startDate: null,
      endDate: null,
      confidence: 0.5,
      reasoning: 'Classification failed, defaulting to semantic',
      requiresStructuredContext: false,
      classifierProvider: 'Fallback (SEMANTIC_TOPIC)'
    };
  }
}
