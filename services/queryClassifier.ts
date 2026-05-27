import { supabase } from './supabaseClient';
import { parseTemporalIntent } from './temporalParser';
import { callAIProxy } from './geminiClient';

export type QueryIntent =
  | 'TEMPORAL_SUMMARY'
  | 'SEMANTIC_TOPIC'
  | 'TEMPORAL_TOPIC'
  | 'BEHAVIORAL'
  | 'ANALYTICAL'
  | 'CONVERSATIONAL';

export interface ClassifiedQuery {
  intent: QueryIntent;
  hasTemporalIntent: boolean;
  temporalExpression: string | null;
  topicKeywords: string[];
  detectedTopic: string | null;  // NEW
  startDate: Date | null;
  endDate: Date | null;
  confidence: number;
  reasoning: string;
}

export async function classifyQueryIntent(
  userMessage: string,
  conversationHistory: string[]
): Promise<ClassifiedQuery> {

  // Build conversation context (last 2 messages maximum)
  const recentHistory = conversationHistory
    .slice(-2)
    .join('\n');

  const prompt = `You are a query classifier for a personal AI journaling assistant.

CRITICAL RULE FOR HISTORY CONTEXT:
The "Recent conversation" history is provided ONLY for resolving ambiguity (such as "tell me more" or pronouns).
You MUST weight the "Current query" heavily over the conversation history. Do NOT let previous queries bias the classification of the current query.
For example, if the history contains a summary request like "summarise my week", but the current query is "what has been my running pattern last 15 days", the current query is asking about a specific topic ("running") over a time frame, so it MUST be classified as TEMPORAL_TOPIC, not TEMPORAL_SUMMARY.

Recent conversation:
${recentHistory || 'None'}

Current query: "${userMessage}"

PRE-CHECK RULES (apply in order before decision tree):
1. "when did I" pattern: If query contains "when did I", "when have I", "when was I", or "when did I last" -> ALWAYS SEMANTIC_TOPIC. hasTemporalIntent MUST be false, and temporalExpression MUST be null. Never classify as TEMPORAL_TOPIC. (Example: "when did I last feel proud" -> SEMANTIC_TOPIC with hasTemporalIntent: false, temporalExpression: null).
2. "streak" / "consistency" keywords: If query contains "streak", "my streak", "current streak", "streak going", "consistent", "consistency", or "completion rate" -> ALWAYS BEHAVIORAL. hasTemporalIntent MUST be false, and temporalExpression MUST be null. (Example: "how consistent am I with habits" -> BEHAVIORAL, hasTemporalIntent: false, temporalExpression: null).
3. "habit" + time window: If query contains the word "habit" or a specific activity name AND an explicit time period (like "last 2 weeks", "this week", "last month") but does NOT ask about "streak", "consistency", or "completion rate" -> ALWAYS TEMPORAL_TOPIC. hasTemporalIntent MUST be true. (Example: "my meditation habit last 2 weeks" -> TEMPORAL_TOPIC).

DECISION TREE (follow in order):
1. CONVERSATIONAL: If query is a follow-up, acknowledgement, reaction (e.g. "interesting"), or conversational question (e.g. "what do you mean?", "tell me more") -> CONVERSATIONAL. Stop.
2. BEHAVIORAL: If query asks about habit consistency, goal progress, streaks, completion rates, or tracking -> BEHAVIORAL. Stop.
3. TEMPORAL_SUMMARY Special Rule: Any query starting/containing "summarise", "summarize", "recap", "catch me up", or "what happened" followed ONLY by a time expression with NO named activity/emotion/topic -> ALWAYS TEMPORAL_SUMMARY. (Examples: "summarise my last 7 days" -> TEMPORAL_SUMMARY; "what happened this week" -> TEMPORAL_SUMMARY; "catch me up on the last 10 days" -> TEMPORAL_SUMMARY). Stop.
4. TEMPORAL_TOPIC: ONLY if BOTH: (a) an EXPLICIT time expression exists ("last N days", "this week", "last month", "in the past X days" - NOT "when", "last", or habit names on their own), AND (b) a SPECIFIC activity/emotion/topic is named (running, anxiety, sleep, work, etc.). Generic summary actions like "what happened", "summarise", "summarize", "recap", "catch me up" are NOT topics. If no specific topic is named, do NOT classify as TEMPORAL_TOPIC. Stop.
5. TEMPORAL_SUMMARY: If explicit time expression exists but no specific topic -> TEMPORAL_SUMMARY. Stop.
6. SEMANTIC_TOPIC: If specific topic/emotion is named but no explicit time expression -> SEMANTIC_TOPIC. Stop.
7. ANALYTICAL: Pattern/insight questions with no specific time or topic -> ANALYTICAL. Stop.

INTENT DEFINITIONS:
- TEMPORAL_SUMMARY: BROAD OVERVIEW of a time period, generic query with no specific topic. (e.g., "what happened this week").
- TEMPORAL_TOPIC: SPECIFIC topic within a time window. (e.g., "how has my anxiety been this week", "sleep quality over the last month").
- SEMANTIC_TOPIC: Specific topic/emotion/memory lookup, no explicit time window. (e.g., "when did I last feel proud", "tell me about my running").
- BEHAVIORAL: Habits, goals, streaks, tracking, consistency. (e.g., "am I hitting my goals").
- ANALYTICAL: Patterns, trends, insights.
- CONVERSATIONAL: Chat, follow-ups, acknowledgement, conversational questions. (e.g., "tell me more", "interesting", "what do you mean?").

EXTRACT:
- hasTemporalIntent: true if an explicit time period is mentioned (e.g., "last 7 days", "this week"). Time of day words (like "morning", "night") or habit names (like "morning jog") are NOT explicit time periods and do NOT trigger hasTemporalIntent.
- temporalExpression: exact time phrase (e.g., "this week", "last 2 weeks") or null. Do NOT extract words like "last" or "when" on their own, or habit names. You MUST ONLY extract a temporalExpression if it is explicitly written in the "Current query". NEVER extract placeholders like "last N days", and NEVER extract any time expression that is not present in the user's query.
- topicKeywords: specific topics/keywords (e.g., ["running"], ["anxiety"]) or []
- detectedTopic: single main noun representing topic (e.g., "running", "anxiety") or null
- confidence: 0.0-1.0
- reasoning: brief explanation of classification

Return ONLY a valid JSON object matching this schema. The "intent" field MUST be one of these exact strings: "TEMPORAL_SUMMARY", "TEMPORAL_TOPIC", "SEMANTIC_TOPIC", "BEHAVIORAL", "ANALYTICAL", "CONVERSATIONAL". Do NOT use typos like "SEMIC_TOPIC" or any other values.
{
  "intent": "TEMPORAL_TOPIC",
  "hasTemporalIntent": false,
  "temporalExpression": null,
  "topicKeywords": [],
  "detectedTopic": null,
  "confidence": 0.95,
  "reasoning": "Explanation based on classification rules."
}`;

  try {
    // Use Groq 8B — fast and cheap for classification tasks
    // We will call the edge function directly
    const response = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'classify-intent',
        payload: { prompt, userMessage }
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const data = response.data.data || response.data;
    let textToParse = typeof data.text === 'string' ? data.text : '';
    if (textToParse) {
      const start = textToParse.indexOf('{');
      const end = textToParse.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        textToParse = textToParse.substring(start, end + 1);
      }
    }
    const classified = textToParse ? JSON.parse(textToParse) : data;

    // Parse temporal dates if present
    let startDate = null;
    let endDate = null;
    if (
      classified.hasTemporalIntent &&
      classified.temporalExpression
    ) {
      const temporal = parseTemporalIntent(
        classified.temporalExpression
      );
      startDate = temporal.startDate;
      endDate = temporal.endDate;
    }

    const detectedTopic = classified.detectedTopic ?? (classified.topicKeywords?.[0] ?? null);

    return {
      ...classified,
      detectedTopic,
      startDate,
      endDate
    };

  } catch (error) {
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
      reasoning: 'Classification failed, defaulting to semantic'
    };
  }
}
