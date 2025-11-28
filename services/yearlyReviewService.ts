import { supabase } from './supabaseClient';
import { Entry, Habit, Intention, Reflection } from '../types';
import { getAiClient } from './geminiService';

export interface YearlyStats {
    totalEntries: number;
    totalWords: number;
    topMoods: { mood: string; count: number }[];
    longestStreak: number;
    mostActiveMonth: string;
    totalHabitsCompleted: number;
    intentionsCompleted: number;
}

export interface YearTheme {
    title: string;
    description: string;
    emoji: string;
}

export interface YearlyReviewData {
    year: number;
    stats: YearlyStats;
    themes: YearTheme[];
    coreMemories: Entry[]; // Top 3-5 significant entries
    monthByMonth: { month: string; mood: string; summary: string }[];
}

export const generateYearlyStats = (entries: Entry[], habits: Habit[], intentions: Intention[], habitLogs: any[]): YearlyStats => {
    // 1. Total Entries & Words
    const totalEntries = entries.length;
    const totalWords = entries.reduce((acc, entry) => acc + entry.text.split(' ').length, 0);

    // 2. Top Moods
    const moodCounts: Record<string, number> = {};
    entries.forEach(entry => {
        if (entry.primary_sentiment) {
            moodCounts[entry.primary_sentiment] = (moodCounts[entry.primary_sentiment] || 0) + 1;
        }
    });
    const topMoods = Object.entries(moodCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([mood, count]) => ({ mood, count }));

    // 3. Longest Streak (Simplified calculation for now)
    const longestStreak = Math.max(...habits.map(h => h.longest_streak), 0);

    // 4. Most Active Month
    const monthCounts: Record<string, number> = {};
    entries.forEach(entry => {
        const month = new Date(entry.timestamp).toLocaleString('default', { month: 'long' });
        monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    const mostActiveMonth = Object.entries(monthCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // 5. Completions
    const totalHabitsCompleted = habitLogs.length; // Assuming we pass all logs for the year
    const intentionsCompleted = intentions.filter(i => i.status === 'completed').length;

    return {
        totalEntries,
        totalWords,
        topMoods,
        longestStreak,
        mostActiveMonth,
        totalHabitsCompleted,
        intentionsCompleted
    };
};

export const generateYearlyReview = async (userId: string, year: number): Promise<YearlyReviewData> => {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Fetch Data
    const [entriesRes, habitsRes, intentionsRes, reflectionsRes] = await Promise.all([
        supabase.from('entries').select('*').eq('user_id', userId).gte('timestamp', startDate).lte('timestamp', endDate),
        supabase.from('habits').select('*').eq('user_id', userId),
        supabase.from('intentions').select('*').eq('user_id', userId).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('reflections').select('*').eq('user_id', userId).eq('type', 'monthly').gte('date', startDate).lte('date', endDate)
    ]);

    if (entriesRes.error) throw entriesRes.error;

    const entries = entriesRes.data || [];
    const habits = habitsRes.data || [];
    const intentions = intentionsRes.data || [];
    const reflections = reflectionsRes.data || [];

    // We need habit logs for the year to count completions accurately
    // For now, we'll use a simplified count or fetch logs if needed. 
    // Let's assume we fetch logs separately or estimate.
    // To be precise, let's fetch logs.
    const { data: habitLogs } = await supabase.from('habit_logs')
        .select('*')
        .gte('completed_at', startDate)
        .lte('completed_at', endDate);

    const stats = generateYearlyStats(entries, habits, intentions, habitLogs || []);

    // AI Generation for Themes & Core Memories
    const model = await getAiClient();
    const prompt = `
        Analyze this user's year based on their journal entries and monthly reflections.
        
        Entries: ${JSON.stringify(entries.slice(0, 50).map(e => ({ date: e.timestamp, text: e.text, mood: e.primary_sentiment })))}... (truncated)
        Reflections: ${JSON.stringify(reflections.map(r => ({ month: r.date, summary: r.summary })))}

        1. Identify 3 major themes for the year.
        2. Select 3 "Core Memories" (significant positive or pivotal moments) from the entries.
        3. Provide a 1-sentence summary for each month.

        Return JSON:
        {
            "themes": [{ "title": "...", "description": "...", "emoji": "..." }],
            "coreMemories": [ { "date": "...", "reason": "..." } ], 
            "monthSummaries": [ { "month": "January", "summary": "..." } ]
        }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON safely
    let aiData;
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        aiData = jsonMatch ? JSON.parse(jsonMatch[0]) : { themes: [], coreMemories: [], monthSummaries: [] };
    } catch (e) {
        console.error("Failed to parse AI yearly review", e);
        aiData = { themes: [], coreMemories: [], monthSummaries: [] };
    }

    // Map Core Memories back to full entry objects if possible, or create synthetic ones
    const coreMemories = aiData.coreMemories.map((cm: any) => {
        const original = entries.find(e => e.timestamp.startsWith(cm.date));
        return original || { ...entries[0], text: cm.reason, timestamp: cm.date, title: "Core Memory" };
    }).filter(Boolean);

    return {
        year,
        stats,
        themes: aiData.themes,
        coreMemories,
        monthByMonth: aiData.monthSummaries
    };
};
