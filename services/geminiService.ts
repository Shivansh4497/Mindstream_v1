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
    conversationHistory: string[]
): Promise<AdaptiveRetrievalResult> {
    const retrievalStart = Date.now();

    const [intent, preGeneratedEmbedding] = await Promise.all([
        classifyQueryIntent(userMessage, conversationHistory),
        generateQueryEmbedding(userMessage)
    ]);

    const classifierLatencyMs = Date.now() - retrievalStart;

    let matches: Array<Entry & { similarity?: number }> = [];
    let behavioralContext;
    let analyticalContext;
    
    // Ensure exact string match for switch statement (Fix B)
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
                    0.70,
                    preGeneratedEmbedding ?? undefined
                );
            } else {
                matches = await db.semanticSearchEntries(
                    userId,
                    userMessage,
                    3,
                    0.82,
                    null,
                    null,
                    preGeneratedEmbedding ?? undefined
                );
                retrievalStrategy = 'TEMPORAL_TOPIC_FALLBACK';
            }
            break;
            
        case 'SEMANTIC_TOPIC':
            console.log('[DEBUG] adaptiveRetrieval hit SEMANTIC_TOPIC case');
            matches = await db.semanticSearchEntries(
                userId,
                userMessage,
                5,
                0.82,
                null,
                null,
                preGeneratedEmbedding ?? undefined
            );
            retrievalStrategy = 'Vector search · threshold 0.82';
            break;
            
        case 'BEHAVIORAL':
            behavioralContext = await db.getBehavioralContext(userId);
            matches = await db.getRecentEntries(userId, 5); // Add recent entries as grounding
            break;
            
        case 'ANALYTICAL':
            const analytics = await db.getAnalyticalContext(userId);
            analyticalContext = { topTags: analytics.topTags, sentimentDistribution: analytics.sentimentDistribution };
            matches = analytics.entries.slice(0, 5); // Top 5 recent for context
            break;
            
        case 'CONVERSATIONAL':
            matches = await db.getConversationContext(userId);
            break;
    }

    if (normalizedIntent === 'SEMANTIC_TOPIC' && matches.length === 0) {
        const keywords = await extractSearchKeywords(userMessage);
        const results = await db.searchUniversal(userId, keywords);
        matches = results
            .filter((r: SearchResult) => r.type === 'entry')
            .map((r: SearchResult) => ({ ...r.item, similarity: 0.5 })) as Array<Entry & { similarity?: number }>;
        retrievalStrategy = 'KEYWORD_FALLBACK';
    }

    return {
        intent,
        queryIntent: intent,
        matches,
        entries: matches,
        retrievalStrategy,
        strategy: retrievalStrategy,
        classifierLatencyMs,
        embeddingLatencyMs: classifierLatencyMs,
        behavioralContext,
        analyticalContext
    };
}

export const buildSystemContext = (context: UserContext, retrieval?: AdaptiveRetrievalResult): string => {
    // Optimize Context Window: Limit tokens by slicing arrays
    const recentEntriesSummary = context.recentEntries
        .slice(0, 10) // Limit to 10 most recent
        .map(e => `- On ${new Date(e.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, feeling ${e.primary_sentiment}, I wrote: "${e.text}"`)
        .join('\n');

    const intentionsSummary = context.pendingIntentions
        .slice(0, 10) // Limit to top 10
        .map(i => `- My [${i.timeframe}] goal is: "${i.text}"`)
        .join('\n');

    const habitsSummary = context.activeHabits
        .slice(0, 15) // Limit to 15 habits
        .map(h => `- Habit: ${h.name} (${h.category}, Streak: ${h.current_streak})`)
        .join('\n');

    let contextString = "";

    // Add explicit entry count to help AI understand user's experience level
    const entryCount = context.recentEntries.length;
    contextString += `USER STATUS: This user has ${entryCount} journal entries total.\n`;
    if (entryCount <= 2) {
        contextString += `⚠️ THIS IS A BRAND NEW USER - they just started using the app. Do NOT claim they have patterns, history, or "X days of..." anything.\n\n`;
    } else {
        contextString += `\n`;
    }

    // PHASE 1: TEMPORAL MEMORY - Similar past moments
    if (context.similarMoments && context.similarMoments.length > 0) {
        const similarMomentsSummary = context.similarMoments.map(m => {
            const date = new Date(m.entry.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            return `- [${m.matchType.toUpperCase()} MATCH] On ${date}, feeling ${m.entry.primary_sentiment}: "${m.entry.text.slice(0, 150)}${m.entry.text.length > 150 ? '...' : ''}"`;
        }).join('\n');

        contextString += `🕐 SIMILAR PAST MOMENTS (Use these to show temporal awareness and continuity):
${similarMomentsSummary}

When referencing these, use phrases like:
- "I remember in [month] you felt similar..."
- "The last time this came up, you mentioned..."
- "You've navigated feelings like this before, when..."
\n\n`;
    }

    if (context.searchResults && context.searchResults.length > 0) {
        const historySummary = context.searchResults.map(r => {
            const date = new Date(r.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (r.type === 'entry') return `- [ENTRY] On ${date}: "${r.matchText}"`;
            if (r.type === 'habit') return `- [HABIT] Created ${date}: ${r.matchText}`;
            if (r.type === 'intention') return `- [GOAL] Set on ${date}: "${r.matchText}"`;
            return '';
        }).join('\n');
        contextString += `RELEVANT PAST HISTORY (Entries, Habits, Goals):\n${historySummary}\n\n`;
    }

    if (retrieval?.behavioralContext) {
        const { habits, goals } = retrieval.behavioralContext;
        const habitStats = habits.map(h => `- ${h.name} (Streak: ${h.current_streak}, Completion: ${((h as any).completion_rate || 0).toFixed(1)}%)`).join('\n');
        const goalStats = goals.map(g => `- [${g.timeframe}] ${g.text}`).join('\n');
        contextString += `BEHAVIORAL CONTEXT (Prominent Stats):\nHABITS:\n${habitStats || "None"}\nGOALS:\n${goalStats || "None"}\n\n`;
    } else {
        contextString += `CONTEXT from my active intentions/goals:\n${intentionsSummary || "No active goals."}\n\n`;
        contextString += `CONTEXT from my active habits:\n${habitsSummary || "No habits."}\n\n`;
    }

    if (retrieval?.analyticalContext) {
        const { topTags, sentimentDistribution } = retrieval.analyticalContext;
        const sentiments = Object.entries(sentimentDistribution).map(([k,v]) => `${k}: ${v}`).join(', ');
        contextString += `ANALYTICAL CONTEXT:\nTop Tags: ${topTags.join(', ')}\nSentiment Distribution: ${sentiments}\n\n`;
    }

    contextString += `CONTEXT from my recent journal entries:\n${recentEntriesSummary || "No recent entries."}\n\n`;
    contextString += `CONTEXT: My latest reflection was: "${context.latestReflection?.summary || "None"}"\n\n`;

    // Balanced instruction: Use context only when semantically aligned
    contextString += `
🎯 USING THE CONTEXT ABOVE — BALANCE IS KEY

ONLY reference their data when there's a CLEAR SEMANTIC MATCH:
✓ User says "I feel lazy" + has entry about "deadline stress" → These connect, mention it gently
✗ User says "I feel lazy" + has entry about "groceries" → No connection, don't mention

WHEN TO CONNECT:
- Their current feeling clearly relates to something in their entries/goals/habits
- They're stuck and their own data could unlock insight
- The connection feels NATURAL, not forced

WHEN TO STAY QUIET:
- No clear semantic alignment
- Bringing it up would feel like "reading their diary at them"
- They just need to be heard, not analyzed
- You're not sure if it connects

THE GOAL: Feel like you KNOW them when it matters, not like you're constantly cross-referencing.
If in doubt, just listen.
`;

    return contextString;
}

// --- CHAT ---
// Chat uses a simplified non-streaming approach for now
// Can be upgraded to streaming Edge Function later

export const getChatResponseStream = async (history: Message[], context: UserContext, retrieval?: AdaptiveRetrievalResult) => {
    const userMessage = history[history.length - 1]?.text ?? '';
    const temporal = parseTemporalIntent(userMessage);

    if (
        temporal.hasTemporalIntent &&
        temporal.startDate &&
        temporal.endDate
    ) {
    }

    const contextPrompt = buildSystemContext(context);

    // Compute and enrich context inventory for GlassBox Retrieval step
    const contextInventory = {
        recentEntriesCount: context.recentEntries ? context.recentEntries.slice(0, 10).length : 0,
        semanticMatchCount: context.searchResults ? context.searchResults.length : 0,
        habits: context.activeHabits ? context.activeHabits.slice(0, 15).map(h => ({ name: h.name, category: h.category, streak: h.current_streak ?? 0 })) : [],
        goals: context.pendingIntentions ? context.pendingIntentions.slice(0, 10).map(i => ({ text: i.text, category: i.category ?? 'Growth' })) : [],
        hasReflection: !!context.latestReflection
    };
    enrichLastAIMeta({ context_inventory: contextInventory });
    const personalityId = (context.personalityId as PersonalityId) || DEFAULT_PERSONALITY;
    const personality = getPersonality(personalityId) || getPersonality(DEFAULT_PERSONALITY);

    // Check if temporal memory is available
    const hasTemporalMemory = context.similarMoments && context.similarMoments.length > 0;

    // Check if user has actionable data (for personalized suggestions)
    const hasPendingGoals = context.pendingIntentions.length > 0;
    const hasActiveHabits = context.activeHabits.length > 0;
    const entryCount = context.recentEntries.length;
    const hasActionableData = hasPendingGoals || hasActiveHabits || hasTemporalMemory;

    // Build personalized data references for the AI
    const personalizedRefs = [];
    if (hasPendingGoals) personalizedRefs.push(`Goals: "${context.pendingIntentions[0]?.text}"`);
    if (hasActiveHabits) personalizedRefs.push(`Habits: "${context.activeHabits[0]?.name}"`);
    if (hasTemporalMemory) personalizedRefs.push(`Past moments available`);

    const personalitySection = personality.systemPrompt;
    const systemInstruction = `${personalitySection}

=== MINDSTREAM CHAT ===

You are a wise friend texting someone you care about.
Not a therapist. Not a coach. Not an interview bot.
A friend who listens, knows when to speak, and knows when to shut up.

USER CONTEXT:
${contextPrompt}

---

STEP 0: USER OVERRIDE (HIGHEST PRIORITY)

If user gives EXPLICIT instruction, OBEY IT ABSOLUTELY:
- "just summarize" → NO questions, give summary only
- "last 3 days only" → ONLY use entries from last 3 days
- "don't ask questions" → NO questions in your response
- "be direct" → No exploration, just answer
- "keep it short" → 1-2 sentences max

USER'S EXPLICIT WORDS > ALL OTHER RULES

OFF-TOPIC HANDLING:
If user asks about weather, coding, facts, trivia, or anything unrelated to:
- Their thoughts, feelings, patterns, journal entries
- Their habits, goals, or personal reflection
→ Respond: "I'm tuned for reflection, not facts. What's been on your mind lately?"
This is a journaling companion, not a general AI assistant.

---

STEP 1: PICK YOUR MODE

Detect the mode FIRST. Then follow ONLY that mode's rules.

MODE A - RESPOND
Trigger: User asks direct question OR gives instruction
Examples: "What should I do?", "Summarize my week", "Is this normal?"
Behavior:
- Answer the question directly
- No exploratory reflection
- No follow-up question unless clarification absolutely required
- Be helpful, not therapeutic

MODE B - LISTEN
Trigger: Emotional content, venting, frustration, sharing experience
Examples: "I'm so tired", "Work was awful today", expressing feelings
Behavior:
- Mirror briefly (1 sentence max)
- Don't solve their problem
- Ending WITHOUT a question is often the right move
- "That makes sense." is a complete, valid response
- Let them lead

MODE C - NUDGE
Trigger: User stuck on same topic 3+ turns OR explicitly asks "help me"
Examples: Circling same issue, "I don't know what to do, help"
Behavior:
- Offer ONE concrete insight or suggestion
- Optional: ONE permission-based question ("Want a suggestion?")
- Then stop. Don't pile on.

DEFAULT: When unsure which mode → choose LISTEN.

---

STEP 2: QUESTION RULE (ABSOLUTE)

If your LAST message ended with a question:
→ Your NEXT message MUST NOT end with a question.

This is absolute. No exceptions. Binary rule.
Prevents interview mode and question spam.

---

STEP 3: STOP MODE

Trigger: User says anything like:
- "Stop asking questions"
- "Just answer"
- "Be direct"
- "You're repeating yourself"
- "That's not what I asked"

When triggered, for your NEXT 2 responses:
- Statements only
- No empathy preambles ("That sounds tough...")
- No follow-up questions
- Direct and concise

If you apologize, you must ACTUALLY CHANGE in the same message:
✅ "Got it – here's the direct answer: [answer]"
❌ "I'm sorry, let me try again. What's the one thing..." (WRONG - same pattern)

---

STEP 4: VOICE

DO:
- Use contractions: "You've", "That's", "I'm"
- Sound like texting: "Yeah", "Got it", "Makes sense"
- Keep it SHORT: 1-3 sentences, max 50 words
- Use natural fillers: "Look,", "Honestly,"

NEVER SAY:
- "I understand how you feel" (you don't)
- "Have you tried..." (condescending)
- "It's important to..." (preachy)
- "Practice mindfulness" (buzzword)
- "I'm sorry you're going through this" (corporate)
- "What's the one thing..." (overused, banned)
- "That sounds really tough/hard" as opener (robotic)

NEVER USE:
- Bullet points or lists
- Asterisks (*text*) or markdown
- Multiple paragraphs
- Parenthetical asides

---

STEP 5: USING THEIR DATA

ONLY reference their journal entries, goals, or habits when:
- They explicitly ask about their history
- Clear semantic connection to what they're saying
- They're stuck and their own data would unlock insight

DON'T reference data when:
- They're just saying hi
- They're venting (just listen)
- No obvious connection exists
- You're not sure if it connects

If in doubt, just listen. Don't cross-reference.

${hasTemporalMemory ? `
TEMPORAL MEMORY AVAILABLE:
You can reference similar past moments naturally:
- "I remember last month when..."
- "You've navigated this before..."
Use sparingly. Only when it genuinely helps.
` : ''}

---

STEP 6: ENDINGS

Ending a conversation cleanly is a SUCCESS, not a failure.

Not every message needs to invite continuation.
Silence is confidence, not abandonment.

Good complete responses (no question needed):
- "Got it."
- "That makes sense."
- "I'm here when you need me."
- "Sounds like you've got clarity. Nice."

The wise friend knows when to stop talking.

---

FINAL: The one thing to remember

Less eagerness. More listening. Know when to shut up.
You're valuable because you DON'T need to prove it every message.`;


    const userPrompt = history[history.length - 1]?.text ?? '';

    // --- PER-LAYER TOKEN INSTRUMENTATION ---
    // Build the conversation history string to measure its tokens
    const chatHistoryForTokens = history.slice(0, -1)
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');

    const cleanSystemPrompt = systemInstruction.replace(contextPrompt, '');

    console.log(`[Token Est] cleanSystemPrompt length: ${cleanSystemPrompt.length}`);
    console.log(`[Token Est] contextPrompt length: ${contextPrompt.length}`);
    console.log(`[Token Est] chatHistoryForTokens length: ${chatHistoryForTokens.length}`);
    console.log(`[Token Est] userPrompt length: ${userPrompt.length}`);

    const estSystem = estimateTokens(cleanSystemPrompt);
    const estRag = estimateTokens(contextPrompt);
    const estHistory = estimateTokens(chatHistoryForTokens);
    const estUser = estimateTokens(userPrompt);
    const estTotal = estSystem + estRag + estHistory + estUser;

    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    let result;
    try {
        // Call the AI proxy with chat action
        result = await callAIProxy<{ response: string }>('chat', {
            history: chatHistory,
            userPrompt,
            systemInstruction
        });

        // Get the real tokens_in from the server response metadata
        const updatedMeta = getLastAIMeta();
        const realTotal = updatedMeta?.tokens_in ?? 0;

        let systemPromptTokens = estSystem;
        let ragContextTokens = estRag;
        let historyTokens = estHistory;
        let userMessageTokens = estUser;

        if (realTotal > 0 && estTotal > 0) {
            const scale = realTotal / estTotal;
            systemPromptTokens = Math.round(estSystem * scale);
            ragContextTokens = Math.round(estRag * scale);
            historyTokens = Math.round(estHistory * scale);
            userMessageTokens = realTotal - systemPromptTokens - ragContextTokens - historyTokens;
        }

        // Enrich meta with token counts after API call resolves (so they aren't overwritten)
        enrichLastAIMeta({
            system_prompt_tokens: systemPromptTokens,
            rag_context_tokens: ragContextTokens,
            history_tokens: historyTokens,
            user_message_tokens: userMessageTokens,
            userMessage: userPrompt,
        });
    } catch (e: any) {
        console.error("[AI] Chat failed:", e);

        // Do NOT swallow DemoLimitError - rethrow to trigger the UI modal
        if (e && e.name === 'DemoLimitError') {
            throw e;
        }

        // RAG FALLBACK: If AI fails but we have RAG data, construct a useful response
        if (context.searchResults && context.searchResults.length > 0) {
            const ragSummary = context.searchResults
                .slice(0, 3)
                .map(r => `• ${r.type.toUpperCase()}: ${r.matchText.substring(0, 100)}...`)
                .join('\n');

            result = {
                response: `I'm having trouble connecting to my main processing unit right now. However, I found these relevant memories in your journal that might help:\n\n${ragSummary}\n\n(I'll be back online shortly to analyze this deeper!)`
            };
        } else {
            // Generic fallback
            result = { response: "I'm having trouble connecting right now. Please check your internet connection and try again in a moment." };
        }
    }

    // TRUE RAG LOGGING — always enrich so GlassBox knows if we tried and found nothing
    if (context.searchResults !== undefined) {
        enrichLastAIMeta({ rag_matches: context.searchResults });
    }

    // Return an async generator that yields the response at once
    // This maintains compatibility with existing streaming code
    const unwrappedText = unwrapResponse(result.response || '');
    return {
        [Symbol.asyncIterator]: async function* () {
            yield { text: unwrappedText };
        }
    };
}

// --- SILENT OBSERVER & BRIDGES ---

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
