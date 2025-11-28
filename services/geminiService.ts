
import type { Entry, Message, HabitCategory, InstantInsight, EntrySuggestion, UserContext } from '../types';
import { getAiClient, callWithFallback, parseGeminiJson, verifyApiKey, GEMINI_API_KEY_AVAILABLE } from './geminiClient';
import { getPersonality, DEFAULT_PERSONALITY, PersonalityId } from '../config/personalities';

export { verifyApiKey, GEMINI_API_KEY_AVAILABLE, getAiClient };

// --- RAG HELPERS ---

export const extractSearchKeywords = async (userQuery: string): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return [];
    const prompt = `Extract 2-4 key search terms from this query to find relevant past journal entries. Ignore filler words. 
    Query: "${userQuery}"
    Respond with a JSON object: { "keywords": ["term1", "term2"] }`;

    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const res = parseGeminiJson<{ keywords: string[] }>(response.text || "{}");
            return res.keywords || [];
        });
    } catch (e) {
        console.warn("Failed to extract keywords:", e);
        return [];
    }
};

const buildSystemContext = (context: UserContext): string => {
    // Optimize Context Window: Limit tokens by slicing arrays
    const recentEntriesSummary = context.recentEntries
        .slice(0, 10) // Limit to 10 most recent
        .map(e => `- On ${new Date(e.timestamp).toLocaleDateString()}, feeling ${e.primary_sentiment}, I wrote: "${e.text}"`)
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

    if (context.searchResults && context.searchResults.length > 0) {
        const historySummary = context.searchResults.map(e =>
            `- [HISTORICAL] On ${new Date(e.timestamp).toLocaleDateString()}: "${e.text}"`
        ).join('\n');
        contextString += `RELEVANT PAST HISTORY (Use this to answer specific questions about the past):\n${historySummary}\n\n`;
    }

    contextString += `CONTEXT from my recent journal entries:\n${recentEntriesSummary || "No recent entries."}\n\n`;
    contextString += `CONTEXT from my active intentions/goals:\n${intentionsSummary || "No active goals."}\n\n`;
    contextString += `CONTEXT from my active habits:\n${habitsSummary || "No habits."}\n\n`;

    if (context.latestReflection) {
        contextString += `CONTEXT: My latest reflection was: "${context.latestReflection.summary}"`;
    }

    return contextString;
}

// --- CHAT ---

export const getChatResponseStream = async (history: Message[], context: UserContext) => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI functionality is disabled.");

    const contextPrompt = buildSystemContext(context);

    // Get personality from context or default
    const personalityId = (context.personalityId as PersonalityId) || DEFAULT_PERSONALITY;
    const personality = getPersonality(personalityId) || getPersonality(DEFAULT_PERSONALITY);

    const systemInstruction = `${personality.systemPrompt}
    
You have access to my full context, including recent entries, goals, habits, and relevant historical entries found via search.
${contextPrompt}

Use this information to answer my questions contextually. 
- If I ask "Have I felt this way before?", check the RELEVANT PAST HISTORY.
- If I talk about stress, check habits/goals.
- Be empathetic and concise.`;

    const userPrompt = history[history.length - 1].text;

    const chatHistory = history.slice(0, -1).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
    }));

    // @ts-ignore
    return callWithFallback(m => ai.models.generateContentStream({
        model: m,
        contents: [...chatHistory, { role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction }
    }));
}

// --- SILENT OBSERVER & BRIDGES ---

export const generateEntrySuggestions = async (entryText: string): Promise<EntrySuggestion[] | null> => {
    const ai = getAiClient();
    if (!ai) return null;
    const isTest = entryText.startsWith("TEST:");
    console.log(`[SILENT OBSERVER] Analysis starting... Test: ${isTest}`);

    const prompt = `Analyze this entry. Does the user express a clear need for a Habit, Intention, or Reflection?
    Entry: "${entryText}"
    Rules: ${isTest ? "TEST MODE: FORCE SUGGESTION." : "Be Strict: Return empty if just venting."}
    Respond with JSON object: { "suggestions": [{ "type": "habit|intention|reflection", "label": "...", "data": {...} }] }`;

    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const result = parseGeminiJson<{ suggestions: EntrySuggestion[] }>(response.text || "{}");
            return result.suggestions?.length > 0 ? result.suggestions : null;
        });
    } catch (e) {
        console.warn("[SILENT OBSERVER] Failed:", e);
        return null;
    }
}

// --- CORE PROCESSING ---

export const processEntry = async (entryText: string): Promise<Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'>> => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI client not initialized.");
    const prompt = `
    Analyze this journal entry. 
    1. Generate a short, punchy Title (max 5 words).
    2. Assign 1-3 relevant Tags.
    3. Determine Primary Sentiment (from: Joyful, Grateful, Proud, Hopeful, Content, Anxious, Frustrated, Sad, Overwhelmed, Confused, Reflective, Inquisitive, Observational).
    4. Select a single Emoji that best represents the entry.
    
    Entry: "${entryText}"
    
    Respond with JSON: { "title": "...", "tags": ["..."], "primary_sentiment": "...", "emoji": "..." }
  `;

    return callWithFallback(async (model) => {
        // @ts-ignore
        const res = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        return parseGeminiJson(res.text || "{}");
    });
};

export const analyzeHabit = async (habitName: string): Promise<{ emoji: string, category: HabitCategory }> => {
    const ai = getAiClient();
    if (!ai) return { emoji: "⚡️", category: "System" };
    const prompt = `
      Classify this habit into one of these categories: Health, Growth, Career, Finance, Connection, System.
      Also assign a relevant Emoji.
      Habit: "${habitName}"
      JSON Response: { "emoji": "...", "category": "..." }
    `;
    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const res = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
            return parseGeminiJson(res.text || "{}");
        });
    } catch (e) { return { emoji: "⚡️", category: "System" }; }
};

export const generateInstantInsight = async (text: string, sentiment: string, lifeArea: string, trigger: string): Promise<InstantInsight> => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI disabled.");
    const prompt = `
      The user is onboarding. They feel "${sentiment}" about "${lifeArea}" regarding "${trigger}".
      They wrote: "${text}"
      
      Act as a wise, empathetic coach. 
      1. Validate their feeling using the context (Trigger/Area).
      2. Offer a specific "Perspective Shift" or "Comforting Truth" (The Insight).
      3. Ask ONE simple follow-up question to deepen the reflection (The Question).
      
      JSON Response: { "insight": "...", "followUpQuestion": "..." }
    `;
    return callWithFallback(async (model) => {
        // @ts-ignore
        const res = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
        return parseGeminiJson(res.text || "{}");
    });
};
