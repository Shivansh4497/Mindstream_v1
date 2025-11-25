import type { Entry, Intention, Reflection, AISuggestion, Habit, HabitLog } from '../types';
import { getWeekId, getMonthId, getDateFromWeekId } from "../utils/date";
import { getAiClient, callWithFallback, parseGeminiJson } from './geminiClient';

const PRIMARY_MODEL = 'gemini-2.5-flash';

// --- REFLECTIONS ---

export const generateReflection = async (entries: Entry[], intentions: Intention[], habits?: Habit[], habitLogs?: HabitLog[]) => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI disabled");
    
    const entriesText = entries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.primary_sentiment}: ${e.text}`).join('\n');
    const intentionsText = intentions.map(i => `Goal: ${i.text} (${i.status})`).join('\n');
    const habitsText = habits?.map(h => {
        const logs = habitLogs?.filter(l => l.habit_id === h.id).length || 0;
        return `Habit: ${h.name} (Done ${logs} times)`;
    }).join('\n') || "";

    const prompt = `
      Generate a Daily Reflection based on today's data.
      
      Entries:
      ${entriesText}
      
      Intentions:
      ${intentionsText}
      
      Habits:
      ${habitsText}
      
      Task:
      1. Synthesize the user's day. Find connections between their mood (entries) and their actions (habits/goals).
      2. Highlight one key win and one gentle observation for improvement.
      3. Suggest 1-2 actionable intentions for tomorrow based on this.
      
      Respond with JSON: { "summary": "...", "suggestions": [{ "text": "...", "timeframe": "daily" }] }
    `;

    return callWithFallback(async (m) => {
        // @ts-ignore
        const r = await ai.models.generateContent({ model: m, contents: prompt, config: { responseMimeType: "application/json" } });
        return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(r.text || "{}");
    });
}

export const generateWeeklyReflection = async (entries: Entry[], intentions: Intention[]) => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI disabled");
    const entriesText = entries.map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.primary_sentiment}: ${e.text}`).join('\n');
    
    const prompt = `
      Generate a Weekly Reflection.
      Look for macro-patterns over the last 7 days.
      
      Entries:
      ${entriesText}
      
      Task:
      1. Identify the dominant emotional theme of the week.
      2. Summarize progress on intentions.
      3. Offer a strategic focus for next week.
      
      Respond with JSON: { "summary": "...", "suggestions": [{ "text": "...", "timeframe": "weekly" }] }
    `;

    return callWithFallback(async (m) => {
        // @ts-ignore
        const r = await ai.models.generateContent({ model: m, contents: prompt, config: { responseMimeType: "application/json" } });
        return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(r.text || "{}");
    });
};

export const generateMonthlyReflection = async (entries: Entry[], intentions: Intention[]) => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI disabled");
    const entriesText = entries.map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.primary_sentiment}: ${e.title}`).join('\n');
    
    const prompt = `
      Generate a Monthly Reflection.
      This is a high-level review. Focus on growth, shifts in perspective, and long-term trajectory.
      
      Entries (Titles & Sentiments):
      ${entriesText}
      
      Task:
      1. Summarize the "Chapter Title" for this month.
      2. Analyze how the user's sentiment has evolved.
      3. Suggest a Life/Monthly Goal for next month.
      
      Respond with JSON: { "summary": "...", "suggestions": [{ "text": "...", "timeframe": "monthly" }] }
    `;

    return callWithFallback(async (m) => {
        // @ts-ignore
        const r = await ai.models.generateContent({ model: m, contents: prompt, config: { responseMimeType: "application/json" } });
        return parseGeminiJson<{ summary: string; suggestions: AISuggestion[] }>(r.text || "{}");
    });
};

export const generateThematicReflection = async (tag: string, entries: Entry[]) => {
    const ai = getAiClient();
    if (!ai) throw new Error("AI disabled");
    const filteredEntries = entries.filter(e => e.tags?.includes(tag));
    const entriesText = filteredEntries.map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.text}`).join('\n');

    const prompt = `
      Perform a Thematic Analysis on the tag: "${tag}".
      
      Entries tagged with "${tag}":
      ${entriesText}
      
      Task:
      1. Trace the evolution of this theme over time.
      2. Identify triggers and resolutions mentioned by the user.
      3. Provide a deep, psychological insight about their relationship with this topic.
      
      Output raw text (Markdown formatted), not JSON.
    `;

    return callWithFallback(async (m) => {
        // @ts-ignore
        const r = await ai.models.generateContent({ model: m, contents: prompt });
        return r.text || "Could not generate reflection.";
    });
};

export const generateChatStarters = async (entries: Entry[], intentions?: Intention[]) => {
    const ai = getAiClient();
    if (!ai) return { starters: ["What's on your mind?", "How are you feeling?", "Reflect on today"] };
    
    const recentEntries = entries.slice(0, 5).map(e => e.text).join(" | ");
    const prompt = `
      Based on these recent user thoughts: "${recentEntries}"
      Generate 3 short, engaging conversation starter questions to help them dig deeper.
      JSON: { "starters": ["Question 1?", "Question 2?", "Question 3?"] }
    `;

    try {
        return await callWithFallback(async (model) => {
            // @ts-ignore
            const res = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json" } });
            return parseGeminiJson<{ starters: string[] }>(res.text || "{}");
        });
    } catch (e) {
        return { starters: ["What's on your mind?", "How are you feeling?", "Reflect on today"] };
    }
};

export const getRawReflectionForDebug = async (entries: Entry[], intentions: Intention[]) => { 
    const ai = getAiClient();
    if (!ai) return "AI Disabled";
    const prompt = "Test connection. Reply with 'AI Online'.";
    try {
        // @ts-ignore
        const res = await ai.models.generateContent({ model: PRIMARY_MODEL, contents: prompt });
        return res.text || "No text returned";
    } catch (e: any) {
        return `Error: ${e.message}`;
    }
};
