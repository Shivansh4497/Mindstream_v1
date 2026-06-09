import type { Entry, Message, HabitCategory, InstantInsight, EntrySuggestion, UserContext, Habit, Intention, SearchResult } from '../types';
import { callAIProxy, verifyApiKey, parseGeminiJson, GEMINI_API_KEY_AVAILABLE, getAiClient, enrichLastAIMeta, getLastAIMeta } from './geminiClient';
export { GEMINI_API_KEY_AVAILABLE, verifyApiKey };
import { getPersonality, DEFAULT_PERSONALITY, PersonalityId } from '../config/personalities';
import { parseTemporalIntent } from './temporalParser';
import { classifyQueryIntent, ClassifiedQuery } from './queryClassifier';
import * as db from './dbService';
import { supabase } from './supabaseClient';

// --- TOKEN ESTIMATION ---
const estimateTokens = (text: string): number => {
    if (typeof text !== 'string' || !text) return 0;
    return Math.ceil(text.length / 4);
};
export const extractSearchKeywords = async (userQuery: string): Promise<string[]> => {
    // 1. Try AI extraction first
    try {
        // If query is very short, skip AI to save latency
        if (userQuery.length < 15) throw new Error("Query too short for AI extraction");

        const result = await callAIProxy<{ keywords: string[] }>('extract-keywords', { query: userQuery });
        if (result.keywords && result.keywords.length > 0) return result.keywords;
        throw new Error("No keywords returned from AI");
    } catch (e) {
        console.warn("[RAG] extract-keywords failed/skipped, using local fallback:", e);
    }

    // 2. Robust Local Fallback (Always runs if AI fails)
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'in', 'a', 'an', 'and', 'or', 'to', 'of', 'my', 'i', 'me', 'what', 'about', 'did', 'say', 'tell', 'know', 'review']);
    const keywords = userQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

    // Return unique keywords, max 4
    return [...new Set(keywords)].slice(0, 4);
};

export function unwrapResponse(text: string): string {
  try {
    const parsed = JSON.parse(text.trim());
    return parsed.response 
      || parsed.text 
      || parsed.content 
      || parsed.message
      || text;
  } catch {
    return text;
  }
}

async function generateQueryEmbedding(
  queryText: string,
  retries = 2
): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions
      .invoke('ai-proxy', {
        body: {
          action: 'generate-embedding',
          payload: { text: queryText }
        }
      });
    if (error || !data?.success) throw new Error(error?.message || 'Failed');
    
    const embedding = data?.data?.embedding ?? data?.embedding ?? null;
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Embedding payload is empty or invalid (possible edge function crash)');
    }
    return embedding;
  } catch (err) {
    if (retries > 0) {
      console.warn(`[generateQueryEmbedding] Retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 1500));
      return generateQueryEmbedding(queryText, retries - 1);
    }
    return null;
  }
}

export interface AdaptiveRetrievalResult {
    intent: ClassifiedQuery;
    queryIntent: ClassifiedQuery;
    matches: Array<Entry & { similarity?: number }>;
    entries: Array<Entry & { similarity?: number }>;
    retrievalStrategy: string;
    strategy: string;
    behavioralContext?: {
        habits: Habit[];
        goals: Intention[];
        habitLogs: any[];
    };
    analyticalContext?: {
        topTags: string[];
        sentimentDistribution: Record<string, number>;
    };
    structuredContext?: {
        habits?: string;
        goals?: string;
    };
    classifierLatencyMs?: number;
    embeddingLatencyMs?: number;
}

export async function adaptiveRetrieval(
    userId: string,
    userMessage: string,
    conversationHistory: string[],
    isDemoUser: boolean = false
): Promise<AdaptiveRetrievalResult | null> {
    const retrievalStart = Date.now();

    const [intent, preGeneratedEmbedding] = await Promise.all([
        classifyQueryIntent(userMessage, conversationHistory),
        generateQueryEmbedding(userMessage)
    ]);

    const classifierLatencyMs = Date.now() - retrievalStart;
    const semanticThreshold = isDemoUser ? 0.60 : 0.80;

    let matches: Array<Entry & { similarity?: number }> = [];
    let structuredContext: { habits?: string; goals?: string } = {};
    const normalizedIntent = intent.intent?.trim() || 'SEMANTIC_TOPIC';
    let retrievalStrategy: string = normalizedIntent;

    switch (normalizedIntent) {
        case 'TEMPORAL_SUMMARY':
            if (intent.startDate && intent.endDate) {
                matches = await db.getEntriesByDateRange(userId, intent.startDate, intent.endDate);
            } else {
                matches = await db.getRecentEntries(userId, 15);
                retrievalStrategy = 'TEMPORAL_SUMMARY_FALLBACK';
            }
            break;
            
        case 'TEMPORAL_TOPIC':
            if (intent.startDate && intent.endDate) {
                matches = await db.semanticSearchWithBounds(
                    userId,
                    userMessage,
                    intent.startDate,
                    intent.endDate,
                    5,
                    semanticThreshold,
                    preGeneratedEmbedding ?? undefined
                );
            } else {
                matches = await db.semanticSearchEntries(
                    userId,
                    userMessage,
                    3,
                    semanticThreshold,
                    null,
                    null,
                    preGeneratedEmbedding ?? undefined
                );
                retrievalStrategy = 'TEMPORAL_TOPIC_FALLBACK';
            }
            break;
            
        case 'SEMANTIC_TOPIC':
            if (!preGeneratedEmbedding) {
                console.error('[P1] SEMANTIC_TOPIC: preGeneratedEmbedding is UNDEFINED. Check getChatResponseStream() call site — embedding must be passed through to adaptiveRetrieval().');
                return {
                    intent,
                    queryIntent: intent,
                    matches: [],
                    entries: [],
                    retrievalStrategy: 'EMBEDDING_FAILED',
                    strategy: 'EMBEDDING_FAILED',
                    classifierLatencyMs,
                    embeddingLatencyMs: classifierLatencyMs
                };
            }
            
            const semanticPromise = db.semanticSearchEntries(
                userId,
                userMessage,
                5,
                semanticThreshold,
                undefined,
                undefined,
                preGeneratedEmbedding
            );

            if (intent.requiresStructuredContext) {
                const [semanticHits, habitsContext, goalsContext] = await Promise.all([
                    semanticPromise,
                    db.getHabitContextForChat(userId),
                    db.getGoalContextForChat(userId)
                ]);
                matches = semanticHits;
                if (habitsContext) structuredContext.habits = habitsContext;
                if (goalsContext) structuredContext.goals = goalsContext;
                retrievalStrategy = 'HYBRID_RETRIEVAL';
            } else {
                matches = await semanticPromise;
                retrievalStrategy = `Vector search · threshold ${semanticThreshold}`;
            }
            break;
            
        case 'HABIT_QUERY':
        case 'BEHAVIORAL':
            if (!preGeneratedEmbedding) {
                console.error('[P1] BEHAVIORAL/HABIT_QUERY: preGeneratedEmbedding is UNDEFINED.');
                return null;
            }
            
            const [habitSemanticHits, habitContextStr] = await Promise.all([
                db.semanticSearchEntries(
                    userId,
                    userMessage,
                    3,
                    semanticThreshold,
                    undefined,
                    undefined,
                    preGeneratedEmbedding
                ),
                db.getHabitContextForChat(userId)
            ]);
            
            matches = habitSemanticHits;
            if (habitContextStr) structuredContext.habits = habitContextStr;
            retrievalStrategy = normalizedIntent;
            break;
            
        case 'GOAL_QUERY':
            if (!preGeneratedEmbedding) {
                console.error('[P1] GOAL_QUERY: preGeneratedEmbedding is UNDEFINED.');
                return null;
            }
            
            const [goalSemanticHits, goalContextStr] = await Promise.all([
                db.semanticSearchEntries(
                    userId,
                    userMessage,
                    3,
                    semanticThreshold,
                    undefined,
                    undefined,
                    preGeneratedEmbedding
                ),
                db.getGoalContextForChat(userId)
            ]);
            
            matches = goalSemanticHits;
            if (goalContextStr) structuredContext.goals = goalContextStr;
            retrievalStrategy = 'GOAL_QUERY';
            break;
            
        case 'CONVERSATIONAL':
            return {
                intent,
                queryIntent: intent,
                matches: [],
                entries: [],
                retrievalStrategy: 'CONVERSATIONAL',
                strategy: 'CONVERSATIONAL',
                structuredContext: undefined,
                classifierLatencyMs,
                embeddingLatencyMs: classifierLatencyMs
            };
            
        case 'ANALYTICAL':
            const analytics = await db.getAnalyticalContext(userId);
            return {
                intent,
                queryIntent: intent,
                matches: analytics.entries.slice(0, 5),
                entries: analytics.entries.slice(0, 5),
                retrievalStrategy: 'ANALYTICAL',
                strategy: 'ANALYTICAL',
                analyticalContext: { topTags: analytics.topTags, sentimentDistribution: analytics.sentimentDistribution },
                classifierLatencyMs,
                embeddingLatencyMs: classifierLatencyMs
            };
    }

    return {
        intent,
        queryIntent: intent,
        matches,
        entries: matches,
        retrievalStrategy,
        strategy: retrievalStrategy,
        structuredContext: Object.keys(structuredContext).length > 0 ? structuredContext : undefined,
        classifierLatencyMs,
        embeddingLatencyMs: classifierLatencyMs
    };
}

const CONVERSATIONAL_INTELLIGENCE = `
=== CONVERSATIONAL INTELLIGENCE ===

You are NOT an AI assistant. You are a wise friend texting someone you care about.

STEP 1: READ THE ROOM (Context-Based Detection)
GOLDEN RULE: Match their energy. Don't over-interpret single words.

1. VENTING (sharing emotions): Mirror briefly. Don't solve. 1-2 sentences.
2. STUCK (decision paralysis): ONE fresh perspective. Not more analysis.
3. EXPLORING (vague): Ask ONE clarifying question. Don't assume.
4. CELEBRATING (sharing win): Celebrate WITH them. Let it land.
5. ASKING FOR HELP: Give ONE clear, personalized answer.

CRITICAL ANTI-PATTERNS:
- DON'T assume one short word = disengaged
- DON'T keep asking questions if they're not engaging

STEP 2: VOICE RULES
DO:
- Use contractions: "You've", "That's", "I'm"
- Keep it SHORT: 1-3 sentences max, one question at a time
- Sound like texting: "Yeah", "Makes sense", "Got it"
- Use fillers: "Look,", "Honestly,", "I mean,"

NEVER USE:
- Parenthetical asides like "(One thing to keep in mind...)" — feels robotic
- Multiple paragraphs — keep it to 1-2 at most
- Bullet points or lists in chat — too formal
- Asterisks (*text*) or any markdown formatting — this is chat, not a document

STEP 3: BREVITY
ABSOLUTE MAX: 50 words. If you write more, you've failed.

Format: [Brief mirror] + [ONE question OR insight — pick one, not both]

STEP 4: RESPONSE VARIETY
CRITICAL: Don't be a broken record. Vary your patterns.
RHYTHM: After 2-3 questions, offer an observation or suggestion instead.

FINAL CHECK:
□ Is my response SHORT enough for mobile?
□ Does it sound like a TEXT from a friend?
□ Am I following THEIR lead, not forcing my agenda?
□ Did I vary my response format from the last message?

Remember: You're a companion who cares, not a productivity app. Listen. Understand. Occasionally nudge. Never lecture.`;

export const buildSystemContext = (
    userProfile: string,
    recentContext: string,
    layer4Results: AdaptiveRetrievalResult | null,
    conversationHistory: Message[],
    personalitySystemPrompt: string,
    intent?: string
): string => {
    let contextString = `${personalitySystemPrompt}\n\n`;
    
    if (intent === 'TEMPORAL_SUMMARY' || intent === 'TEMPORAL_TOPIC') {
        contextString += `=== SUMMARIZATION INTELLIGENCE ===\n\nYou are providing a comprehensive, chronological summary. Do NOT limit to 50 words. You may use bullet points and lists to structure the information clearly. Focus on accuracy and completeness based on the retrieved context. Do not ask conversational follow-up questions.\n\n`;
    } else {
        contextString += `${CONVERSATIONAL_INTELLIGENCE}\n\n`;
    }

    contextString += `${userProfile}\n\n`;
    contextString += `${recentContext}\n\n`;

    if (layer4Results && layer4Results.entries && layer4Results.entries.length > 0) {
        const matchesText = layer4Results.entries.map((e: any) => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}: "${e.text}"`
        ).join('\n');
        contextString += `[RETRIEVED CONTEXT]\n${matchesText}\n\n`;
    }

    if (layer4Results && layer4Results.structuredContext) {
        contextString += `[STRUCTURED DATA - GROUNDED FACTS]\n`;
        contextString += `Use these numbers exactly as provided. Never calculate or estimate your own values.\n\n`;
        if (layer4Results.structuredContext.habits) {
            contextString += `${layer4Results.structuredContext.habits}\n\n`;
        }
        if (layer4Results.structuredContext.goals) {
            contextString += `${layer4Results.structuredContext.goals}\n\n`;
        }
    }

    // Include last 3 complete turns = 6 messages + 1 user prompt from history
    const recentHistoryMsgs = conversationHistory.slice(-6);
    if (recentHistoryMsgs.length > 0) {
        const historyText = recentHistoryMsgs.map(msg => 
            `User: ${msg.sender === 'user' ? msg.text : ''}\nAssistant: ${msg.sender === 'ai' ? msg.text : ''}`
        ).join('\n');
        contextString += `[CONVERSATION HISTORY]\n${historyText}\n\n`;
    }

    const GROUNDING_RULES = `
CRITICAL GROUNDING RULES:
1. When answering based on [RETRIEVED CONTEXT], YOU MUST CITE THE DATE of the journal entry you are drawing from. Example: "On May 12th, you wrote that..."
2. NEVER mix up the user's past entries with their current prompt.
3. If the retrieved context doesn't contain the answer, say so. Do not invent memories.
4. If there is NO [RETRIEVED CONTEXT] provided, and the user asks a question about their past, you MUST state that you do not have enough logged data to answer.
5. CRITICAL: You must NEVER state specific numbers (streak counts, completion rates, day counts, percentages) unless that exact number appears verbatim in the [STRUCTURED DATA - GROUNDED FACTS] block above. If no structured data is available for a question about habits or goals, say you don't have enough logged data to answer precisely rather than estimating.
6. RECENT CONVERSATION BIAS: For questions about your past, rely PRIMARILY on the [RETRIEVED CONTEXT]. The [CONVERSATION HISTORY] and [RECENT CONTEXT] are only provided for conversational flow. DO NOT extract historical facts, dates, or memories from the recent conversation unless it directly answers the question.
`;
    contextString += GROUNDING_RULES;

    return contextString;
}

export const getChatResponseStream = async (userId: string, history: Message[], isDemoUser: boolean) => {
    const userMessage = history[history.length - 1]?.text ?? '';
    
    const [userProfile, recentContext, retrieval, sessionSummaries, correlations, onboardingContext, aiProfile, baseProfile] = await Promise.all([
        db.getUserProfile(userId),
        db.getRecentAmbientContext(userId),
        adaptiveRetrieval(userId, userMessage, history.slice(0, -1).map(m => m.text), isDemoUser),
        db.getRecentSessionSummaries(userId, 3).catch(() => []),
        db.getRecentCorrelations(userId, 2).catch(() => []),
        db.getOnboardingContext(userId).catch(() => null),
        db.getAIProfile(userId).catch(() => null),
        db.getProfile(userId).catch(() => null)
    ]);
    
    const personality = getPersonality(DEFAULT_PERSONALITY);
    let systemInstruction = buildSystemContext(
        userProfile,
        recentContext,
        retrieval,
        history.slice(0, -1),
        personality.systemPrompt,
        retrieval?.intent?.intent
    );

    const firstName = baseProfile?.full_name?.split(' ')[0] 
        || baseProfile?.email?.split('@')[0] 
        || 'you';

    // Build comprehensive coach memory block
    let coachMemory = '';

    // Handle special summary requests gracefully in character
    if (retrieval?.intent?.intent === 'TEMPORAL_SUMMARY' || retrieval?.intent?.intent === 'TEMPORAL_TOPIC') {
        coachMemory += `\n\n[SPECIAL INSTRUCTION: TIME-BASED SUMMARY REQUEST]\nThe user is explicitly asking you to summarize their past entries.
CRITICAL RULES FOR SUMMARIZING:
1. DO NOT break character. You are still their conversational coach, NOT a data analyst or reporter.
2. DO NOT output long, clinical breakdowns, bullet points, or markdown tables.
3. Instead, provide a brief, conversational reflection (max 3-4 sentences) highlighting their dominant emotional arc or key actions related to their question.
4. Naturally weave in 1 or 2 specific facts from their data so they feel seen, then ask ONE brief follow-up question.`;
    }

    // 1. Who they were when they started
    if (onboardingContext) {
        const daysAgo = Math.round(
            (Date.now() - new Date(onboardingContext.onboarded_at).getTime()) / 86400000
        );
        coachMemory += `\n\nUSER ORIGIN CONTEXT (${daysAgo} days ago):\nWhen ${firstName} first started, they felt ${onboardingContext.sentiment} about ${onboardingContext.life_area} (specifically: ${onboardingContext.trigger}).\nThey said: "${onboardingContext.elaboration_summary}"`;
    }

    // 2. Who they are now (longitudinal profile)
    if (aiProfile?.pattern_summary) {
        const daysAgo = aiProfile.last_updated 
            ? Math.round((Date.now() - new Date(aiProfile.last_updated).getTime()) / 86400000) 
            : '?';
        coachMemory += `\n\nLONGITUDINAL PROFILE (updated ${daysAgo} days ago):\nDominant emotions: ${aiProfile.dominant_emotions?.join(', ') || 'unknown'}\nActive life areas: ${aiProfile.active_life_areas?.join(', ') || 'unknown'}\nPattern: ${aiProfile.pattern_summary}\nGoal trajectory: ${aiProfile.goal_trajectory}`;
    }

    // 3. Recent session memory
    if (sessionSummaries.length > 0) {
        coachMemory += `\n\nRECENT CONVERSATION MEMORY:` +
            sessionSummaries.map(s => {
                const daysAgo = Math.round(
                    (Date.now() - new Date(s.started_at).getTime()) / 86400000
                );
                return `\n- ${daysAgo === 0 ? 'Earlier today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}: ${s.summary}`;
            }).join('');
    }

    // 4. Detected behavioral patterns
    if (correlations.length > 0) {
        coachMemory += `\n\nDETECTED BEHAVIORAL PATTERNS (reference when relevant, don't force):` +
            correlations.map(c => `\n- ${c.pattern_text}`).join('');
    }

    // Append to system prompt
    if (coachMemory) {
        systemInstruction += `\n\n---\nCOACH MEMORY — Use this to personalize responses. Reference naturally, not robotically.${coachMemory}\n---`;
    }
    
    const historyContext = history.slice(0, -1)
        .filter(m => m.sender === 'ai')
        .slice(-2)
        .map(m => typeof m.text === 'string' ? m.text : '')
        .join('\n---\n');
        
    const profileTokens = Math.ceil((userProfile?.length || 0) / 4);
    const recentTokens = Math.ceil((recentContext?.length || 0) / 4);
    
    let retrievedTokens = 0;
    let retrievedContextText = '';
    if (retrieval && retrieval.entries && retrieval.entries.length > 0) {
        retrievedContextText = retrieval.entries.map((e: any) => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}: "${e.text}"`
        ).join('\n');
        retrievedTokens = Math.ceil(retrievedContextText.length / 4);
    }
    
    const historyTokens = Math.ceil(historyContext.length / 4);

    let structuredContextText = '';
    if (retrieval && retrieval.structuredContext) {
        structuredContextText = `[STRUCTURED DATA - GROUNDED FACTS]\n`;
        if (retrieval.structuredContext.habits) structuredContextText += `${retrieval.structuredContext.habits}\n`;
        if (retrieval.structuredContext.goals) structuredContextText += `${retrieval.structuredContext.goals}\n`;
    }

    enrichLastAIMeta({
        profile_tokens: profileTokens,
        recent_tokens: recentTokens,
        retrieved_tokens: retrievedTokens,
        history_tokens: historyTokens,
        rag_matches: retrieval ? retrieval.matches.map((m: any) => ({
            type: 'entry',
            item: m,
            matchText: m.text,
            timestamp: m.timestamp,
            similarity: m.similarity ?? null
        })) : [],
        query_intent: retrieval?.intent,
        retrieval_strategy: retrieval?.retrievalStrategy,
        classifier_latency_ms: retrieval?.classifierLatencyMs,
        embedding_latency_ms: retrieval?.embeddingLatencyMs,
        
        // Context fields for GlassBox evaluator
        contextSnippet: retrievedContextText || "No context provided",
        structuredContext: structuredContextText || undefined,
        profileContext: userProfile || undefined,
        recentContext: recentContext || undefined,
        historyContext: historyContext || undefined,
    });

    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    let result;
    try {
        result = await callAIProxy<{ response: string }>('chat', {
            history: chatHistory,
            userPrompt: userMessage,
            systemInstruction
        });

        if (retrieval?.intent) {
            let structuredContextText = '';
            if (retrieval.structuredContext) {
                structuredContextText = `[STRUCTURED DATA - GROUNDED FACTS]\n`;
                if (retrieval.structuredContext.habits) structuredContextText += `${retrieval.structuredContext.habits}\n`;
                if (retrieval.structuredContext.goals) structuredContextText += `${retrieval.structuredContext.goals}\n`;
            }
        }

    } catch (e: any) {
        console.error("[AI] Chat failed:", e);
        if (e && e.name === 'DemoLimitError') throw e;
        result = { response: "I'm having trouble connecting right now — please try again in a moment. Your data is safe." };
    }

    const unwrappedText = unwrapResponse(result.response || '');
    return {
        [Symbol.asyncIterator]: async function* () {
            yield { text: unwrappedText };
        }
    };
}

export const generateEntrySuggestions = async (entryText: string): Promise<EntrySuggestion[] | null> => {
    const isTest = entryText.startsWith("TEST:");
    console.log(`[SILENT OBSERVER] Analysis starting... Test: ${isTest}`);

    try {
        const result = await callAIProxy<{ suggestions: EntrySuggestion[] }>('suggestions', {
            entryText,
            isTest
        });
        return result.suggestions?.length > 0 ? result.suggestions : null;
    } catch (e) {
        console.warn("[SILENT OBSERVER] Failed:", e);
        return null;
    }
}

// --- CORE PROCESSING ---

export const processEntry = async (entryText: string): Promise<Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'>> => {
    try {
        return await callAIProxy<Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'>>('process-entry', {
            entryText
        });
    } catch (e) {
        console.error("[AI] Process entry failed:", e);
        // Return defaults if AI fails
        return { title: "Entry", tags: ["Unprocessed"], emoji: "📝", primary_sentiment: null };
    }
};

export const analyzeHabit = async (habitName: string): Promise<{ emoji: string, category: HabitCategory }> => {
    try {
        return await callAIProxy<{ emoji: string, category: HabitCategory }>('analyze-habit', {
            habitName
        });
    } catch (e) {
        return { emoji: "✨", category: "Growth" };
    }
};

export const generateInstantInsight = async (text: string, sentiment: string, lifeArea: string, trigger: string): Promise<InstantInsight> => {
    try {
        const result = await callAIProxy<InstantInsight>('instant-insight', {
            text,
            sentiment,
            lifeArea,
            trigger
        });

        // Ensure confidence is a valid number
        return {
            ...result,
            confidence: typeof result.confidence === 'number' ? result.confidence : 0.5
        };
    } catch (e) {
        console.error("[AI] Instant insight failed:", e);
        throw new Error("AI service unavailable");
    }
};
