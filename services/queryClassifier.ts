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
  detectedTopic: string | null;  // NEW
  startDate: Date | null;
  endDate: Date | null;
  confidence: number;
  reasoning: string;
  requiresStructuredContext?: boolean;
}

function applyPreChecks(query: string): string | null {
  const q = query.toLowerCase();
  if (/^(summarize?|summarise?|recap|overview|review|how did|how was)\s+(my\s+)?(last|past|recent|this)\s+(\d+\s+)?(day|week|month)s?/.test(q)) return 'TEMPORAL_SUMMARY';
  
  const hasTemporalWindow = /(last|past|recent|this)\s+(\d+\s+)?(day(s)?|week(s)?|month(s)?|year(s)?)/.test(q);
  
  if (!hasTemporalWindow) {
    if (/when did i|when was i|when have i/.test(q)) return 'SEMANTIC_TOPIC';
    
    const isMixedEmotional = /(overwhelm|feel|mood|cope|sad|depress|anxious|stress|happy|low)/.test(q);
    const hasHabitKeywords = /(how is my .* going|am i consistent with|how often do i|\bhabit(s)?\b|\bworkout(s)?\b|\bexercis(e|ing)\b|\bsleep(ing)?\b|\bdiet\b|\bstreak\b|\bconsisten(t|cy)\b|completion rate)/.test(q);
    const hasGoalKeywords = /\b(goal(s)?|intention(s)?|target(s)?|milestone(s)?|progress|on track)\b/.test(q);

    // We can't set requiresStructuredContext from this deterministic function easily without refactoring,
    // so if it's mixed, we bypass pre-checks and let the LLM classify it properly with the flag.
    if (isMixedEmotional && (hasHabitKeywords || hasGoalKeywords)) {
       // Let the LLM handle it to set requiresStructuredContext: true
    } else {
        if (hasHabitKeywords) return 'HABIT_QUERY';
        if (hasGoalKeywords) return 'GOAL_QUERY';
    }

    if (/\bpattern(s)?\b/.test(q)) return 'ANALYTICAL';
    if (/(most common|what topics|trend(s)?|frequent(ly)?)/.test(q)) return 'ANALYTICAL';
  }
  
  const wordCount = q.trim().split(/\s+/).length;
  if (wordCount <= 5 && /^(tell me more|why|how|what about|and|so)/.test(q)) return 'CONVERSATIONAL';
  
  return null;
}

export async function classifyQueryIntent(
  userMessage: string,
  conversationHistory: string[]
): Promise<ClassifiedQuery> {
  const preCheckIntent = applyPreChecks(userMessage);
  if (preCheckIntent) {
    const temporal = parseTemporalIntent(userMessage);
    const isTemporal = preCheckIntent === 'TEMPORAL_TOPIC' || preCheckIntent === 'TEMPORAL_SUMMARY';
    return {
      intent: preCheckIntent as QueryIntent,
      hasTemporalIntent: isTemporal,
      temporalExpression: isTemporal ? userMessage : null,
      topicKeywords: [],
      detectedTopic: null,
      startDate: isTemporal ? temporal.startDate : null,
      endDate: isTemporal ? temporal.endDate : null,
      confidence: 1.0,
      reasoning: 'Deterministic pre-check',
      requiresStructuredContext: false
    };
  }

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
0. MIXED QUERY: If the query mixes emotional/reflective content with habits or goals (e.g. "I'm overwhelmed, what have I been doing to cope?", "feeling low, how is my routine holding up?") -> classify as SEMANTIC_TOPIC AND set requiresStructuredContext: true. Stop.
1. HABIT QUERY: If the query mentions specific habit names, exercise types, physical activities, sleep, diet, or asks "how is my [activity] going", "am I consistent with", "how often do I" -> classify as HABIT_QUERY. Stop.
2. GOAL QUERY: If the query asks about goals, intentions, targets, milestones, progress toward something, whether they're on track -> classify as GOAL_QUERY. Stop.
3. "when did I" pattern: If query contains "when did I", "when have I", "when was I", or "when did I last" -> ALWAYS SEMANTIC_TOPIC. hasTemporalIntent MUST be false, and temporalExpression MUST be null. Never classify as TEMPORAL_TOPIC. (Example: "when did I last feel proud" -> SEMANTIC_TOPIC with hasTemporalIntent: false, temporalExpression: null).
4. "habit" + time window: If query contains the word "habit" or a specific activity name AND an explicit time period (like "last 2 weeks", "this week", "last month") but does NOT ask about "streak", "consistency", or "completion rate" -> ALWAYS TEMPORAL_TOPIC. hasTemporalIntent MUST be true. (Example: "my meditation habit last 2 weeks" -> TEMPORAL_TOPIC).

DECISION TREE (follow in order):
1. CONVERSATIONAL: If query is a follow-up, acknowledgement, reaction (e.g. "interesting"), or conversational question (e.g. "what do you mean?", "tell me more") -> CONVERSATIONAL. Stop.
2. BEHAVIORAL: If query asks about habit consistency, goal progress, streaks, completion rates, or tracking -> BEHAVIORAL. Stop.
3. TEMPORAL_SUMMARY Special Rule: Any query starting/containing "summarise", "summarize", "recap", "catch me up", "how did", "how was", or "what happened" followed ONLY by a time expression with NO named activity/emotion/topic -> ALWAYS TEMPORAL_SUMMARY. (Examples: "how did my last 9 days went" -> TEMPORAL_SUMMARY; "summarise my last 7 days" -> TEMPORAL_SUMMARY; "what happened this week" -> TEMPORAL_SUMMARY). Stop.
4. TEMPORAL_TOPIC: ONLY if BOTH: (a) an EXPLICIT time expression exists ("last N days", "this week", "last month", "in the past X days" - NOT "when", "last", or habit names on their own), AND (b) a SPECIFIC activity/emotion/topic is named (running, anxiety, sleep, work, etc.). Generic summary actions like "what happened", "summarise", "summarize", "recap", "catch me up", "how did" are NOT topics. If no specific topic is named, do NOT classify as TEMPORAL_TOPIC. Stop.
5. TEMPORAL_SUMMARY: If explicit time expression exists but no specific topic -> TEMPORAL_SUMMARY. Stop.
6. SEMANTIC_TOPIC: If specific topic/emotion is named but no explicit time expression -> SEMANTIC_TOPIC. Stop.
7. ANALYTICAL: Pattern/insight questions with no specific time or topic -> ANALYTICAL. Stop.

INTENT DEFINITIONS:
- TEMPORAL_SUMMARY: BROAD OVERVIEW of a time period, generic query with no specific topic. (e.g., "what happened this week").
- TEMPORAL_TOPIC: SPECIFIC topic within a time window. (e.g., "how has my anxiety been this week", "sleep quality over the last month").
- SEMANTIC_TOPIC: Specific topic/emotion/memory lookup, no explicit time window. (e.g., "when did I last feel proud", "tell me about my running").
- BEHAVIORAL: Habits, goals, streaks, tracking, consistency. (e.g., "am I hitting my goals").
- HABIT_QUERY: Queries explicitly about specific habits, exercise, sleep, diet, consistency.
- GOAL_QUERY: Queries explicitly about goals, milestones, progress, intentions.
- ANALYTICAL: Patterns, trends, insights.
- CONVERSATIONAL: Chat, follow-ups, acknowledgement, conversational questions. (e.g., "tell me more", "interesting", "what do you mean?").

EXTRACT:
- hasTemporalIntent: true if an explicit time period is mentioned (e.g., "last 7 days", "this week"). Time of day words (like "morning", "night") or habit names (like "morning jog") are NOT explicit time periods and do NOT trigger hasTemporalIntent.
- temporalExpression: exact time phrase (e.g., "this week", "last 2 weeks") or null. Do NOT extract words like "last" or "when" on their own, or habit names. You MUST ONLY extract a temporalExpression if it is explicitly written in the "Current query". NEVER extract placeholders like "last N days", and NEVER extract any time expression that is not present in the user's query.
- topicKeywords: specific topics/keywords (e.g., ["running"], ["anxiety"]) or []
- detectedTopic: single main noun representing topic (e.g., "running", "anxiety") or null
- confidence: 0.0-1.0
- reasoning: brief explanation of classification
- requiresStructuredContext: boolean, true ONLY if the query mixes emotional/reflective content with habits or goals. Default false.

Return ONLY a valid JSON object matching this schema. The "intent" field MUST be one of these exact strings: "TEMPORAL_SUMMARY", "TEMPORAL_TOPIC", "SEMANTIC_TOPIC", "BEHAVIORAL", "HABIT_QUERY", "GOAL_QUERY", "ANALYTICAL", "CONVERSATIONAL". Do NOT use typos like "SEMIC_TOPIC" or any other values.
{
  "intent": "TEMPORAL_TOPIC",
  "hasTemporalIntent": false,
  "temporalExpression": null,
  "topicKeywords": [],
  "detectedTopic": null,
  "confidence": 0.95,
  "reasoning": "Explanation based on classification rules.",
  "requiresStructuredContext": false
}`;

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
      requiresStructuredContext: classified.requiresStructuredContext ?? false
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
      reasoning: 'Classification failed, defaulting to semantic',
      requiresStructuredContext: false
    };
  }
}
