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
  queryText: string
): Promise<number[] | null> {
  try {
    const { data } = await supabase.functions
      .invoke('ai-proxy', {
        body: {
          action: 'generate-embedding',
          payload: { text: queryText }
        }
      });
    return data?.data?.embedding ?? data?.embedding ?? null;
  } catch {
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
                return null;
            }
            matches = await db.semanticSearchEntries(
                userId,
                userMessage,
                5,
                semanticThreshold,
                undefined,
                undefined,
                preGeneratedEmbedding
            );
            retrievalStrategy = `Vector search · threshold ${semanticThreshold}`;
            break;
            
        case 'BEHAVIORAL':
        case 'CONVERSATIONAL':
            return null;
            
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
        classifierLatencyMs,
        embeddingLatencyMs: classifierLatencyMs
    };
}

export const buildSystemContext = (
    userProfile: string,
    recentContext: string,
    layer4Results: AdaptiveRetrievalResult | null,
    conversationHistory: Message[],
    personalitySystemPrompt: string
): string => {
    let contextString = `${personalitySystemPrompt}\n\n`;
    contextString += `${userProfile}\n\n`;
    contextString += `${recentContext}\n\n`;

    if (layer4Results && layer4Results.entries && layer4Results.entries.length > 0) {
        const matchesText = layer4Results.entries.map((e: any) => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}: "${e.text}"`
        ).join('\n');
        contextString += `[RETRIEVED CONTEXT]\n${matchesText}\n\n`;
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
GROUNDING RULES (apply to every response):
- Only state facts present in [USER PROFILE], [LIVE HABITS], 
  [ACTIVE GOALS], [RECENT ENTRIES], or [RETRIEVED CONTEXT] above.
- Do not cite statistics, percentages, or numeric claims from 
  previous Assistant responses in conversation history — those 
  are not verified sources of user data.
- Only use completion rates and streak counts that are explicitly 
  provided in [LIVE HABITS]. Do not calculate or estimate your own.
- If you cannot ground a claim in the labeled context above, 
  do not make it.
`;
    contextString += GROUNDING_RULES;

    return contextString;
}

export const getChatResponseStream = async (userId: string, history: Message[], isDemoUser: boolean) => {
    const userMessage = history[history.length - 1]?.text ?? '';
    
    const [userProfile, recentContext, retrieval] = await Promise.all([
        db.getUserProfile(userId),
        db.getRecentAmbientContext(userId),
        adaptiveRetrieval(userId, userMessage, history.slice(0, -1).map(m => m.text), isDemoUser)
    ]);
    
    const personality = getPersonality(DEFAULT_PERSONALITY);
    const systemInstruction = buildSystemContext(
        userProfile,
        recentContext,
        retrieval,
        history.slice(0, -1),
        personality.systemPrompt
    );
    
    const historyContext = history.slice(0, -1)
        .filter(m => m.sender === 'ai')
        .slice(-2)
        .map(m => typeof m.text === 'string' ? m.text : '')
        .join('\n---\n');
        
    const profileTokens = Math.ceil(userProfile.length / 4);
    const recentTokens = Math.ceil(recentContext.length / 4);
    
    let retrievedTokens = 0;
    let retrievedContextText = '';
    if (retrieval && retrieval.entries && retrieval.entries.length > 0) {
        retrievedContextText = retrieval.entries.map((e: any) => 
            `- On ${new Date(e.timestamp).toLocaleDateString()}: "${e.text}"`
        ).join('\n');
        retrievedTokens = Math.ceil(retrievedContextText.length / 4);
    }
    
    const historyTokens = Math.ceil(historyContext.length / 4);

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
        embedding_latency_ms: retrieval?.embeddingLatencyMs
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
            callAIProxy('evaluate-response', {
                userMessage,
                profileContext: userProfile,
                recentContext,
                retrievedContext: retrievedContextText,
                historyContext,
                aiResponse: result.response,
                queryIntent: retrieval.intent.intent
            }).then((evalResult: any) => {
                console.log("[RAGAS EVALUATION]", evalResult);
                enrichLastAIMeta({
                  // Store evaluation if needed
                });
            }).catch(console.error);
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
