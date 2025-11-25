/**
 * Intelligence Engine
 * 
 * Auto-generates insights from user data without manual input.
 * Runs via cron jobs and real-time triggers.
 * 
 * @module services/intelligenceEngine
 */

import type { Entry, Habit, HabitLog, Intention, Reflection, InsightCard, AISuggestion } from '../types';

// ============================================
// DAILY REFLECTION (Auto-Generate at 11 PM)
// ============================================

/**
 * Generates daily reflection for a user automatically
 * Called by cron job every night at 11 PM
 */
export async function generateDailyReflection(userId: string): Promise<void> {
    try {
        console.log(`[Intelligence] Generating daily reflection for user: ${userId}`);

        // TODO: Implement fetching logic (will wire up in Task 5)
        // 1. Fetch today's entries
        // 2. Fetch today's habit logs
        // 3. Fetch today's intentions
        // 4. Call Gemini API
        // 5. Save to DB

        console.log(`[Intelligence] Daily reflection generated successfully`);
    } catch (error) {
        console.error(`[Intelligence] Failed to generate daily reflection:`, error);
        // Don't throw - graceful degradation
    }
}

// ============================================
// WEEKLY PATTERN DETECTION (Every Sunday 9 AM)
// ============================================

/**
 * Analyzes last 7 days and generates insight cards
 * Detects: sentiment trends, habit correlations, tag frequency
 */
export async function detectWeeklyPatterns(userId: string): Promise<void> {
    try {
        console.log(`[Intelligence] Detecting weekly patterns for user: ${userId}`);

        // TODO: Implement in Task 5
        // 1. Fetch 7 days of data
        // 2. Run pattern analysis
        // 3. Generate insight cards

        console.log(`[Intelligence] Pattern detection complete`);
    } catch (error) {
        console.error(`[Intelligence] Pattern detection failed:`, error);
    }
}

// ============================================
// TAG SATURATION MONITOR (Real-time trigger)
// ============================================

/**
 * Checks if a tag has appeared too frequently (5+ times in 7 days)
 * If yes, triggers thematic deep-dive
 */
export async function checkTagThresholds(userId: string, newEntry: Entry): Promise<void> {
    if (!newEntry.tags || newEntry.tags.length === 0) return;

    try {
        console.log(`[Intelligence] Checking tag thresholds for: ${newEntry.tags.join(', ')}`);

        // TODO: Implement in Task 5
        // 1. For each tag, count occurrences this week
        // 2. If count >= 5, trigger generateThematicInsight()

    } catch (error) {
        console.error(`[Intelligence] Tag threshold check failed:`, error);
    }
}

// ============================================
// PATTERN ANALYSIS HELPERS
// ============================================

interface SentimentAnalysis {
    direction: 'improving' | 'declining' | 'stable';
    percentage: number;
    dominantEmotion: string;
}

/**
 * Analyzes sentiment trend over a period
 */
function analyzeSentimentTrend(entries: Entry[]): SentimentAnalysis {
    if (entries.length === 0) {
        return { direction: 'stable', percentage: 0, dominantEmotion: 'none' };
    }

    // Simple sentiment mapping
    const sentimentScores: Record<string, number> = {
        'Joyful': 2, 'Grateful': 2, 'Proud': 2, 'Hopeful': 1, 'Content': 1,
        'Anxious': -2, 'Frustrated': -2, 'Sad': -2, 'Overwhelmed': -2, 'Confused': -1,
        'Reflective': 0, 'Inquisitive': 0, 'Observational': 0
    };

    // Calculate average sentiment for first half vs second half
    const midpoint = Math.floor(entries.length / 2);
    const firstHalf = entries.slice(0, midpoint);
    const secondHalf = entries.slice(midpoint);

    const getAvgSentiment = (items: Entry[]) => {
        const scores = items
            .filter(e => e.primary_sentiment)
            .map(e => sentimentScores[e.primary_sentiment!] || 0);
        return scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
    };

    const firstAvg = getAvgSentiment(firstHalf);
    const secondAvg = getAvgSentiment(secondHalf);
    const change = secondAvg - firstAvg;
    const percentageChange = Math.abs(change) * 50; // Scale to percentage

    // Find dominant emotion
    const sentimentCounts: Record<string, number> = {};
    entries.forEach(e => {
        if (e.primary_sentiment) {
            sentimentCounts[e.primary_sentiment] = (sentimentCounts[e.primary_sentiment] || 0) + 1;
        }
    });
    const dominantEmotion = Object.keys(sentimentCounts).sort((a, b) =>
        sentimentCounts[b] - sentimentCounts[a]
    )[0] || 'none';

    return {
        direction: change > 0.5 ? 'improving' : change < -0.5 ? 'declining' : 'stable',
        percentage: Math.round(percentageChange),
        dominantEmotion
    };
}

interface HabitAnalysis {
    variance: number;
    topHabits: string[];
    avgCompletionRate: number;
}

/**
 * Analyzes habit completion patterns
 */
function analyzeHabitCompletion(habits: Array<{ habit: Habit; logs: HabitLog[] }>): HabitAnalysis {
    if (habits.length === 0) {
        return { variance: 0, topHabits: [], avgCompletionRate: 0 };
    }

    const completionRates = habits.map(h => h.logs.length);
    const avg = completionRates.reduce((a, b) => a + b, 0) / completionRates.length;
    const variance = completionRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / completionRates.length;

    // Get top 3 most completed habits
    const topHabits = habits
        .sort((a, b) => b.logs.length - a.logs.length)
        .slice(0, 3)
        .map(h => h.habit.id);

    return {
        variance: variance / (avg || 1), // Normalized variance
        topHabits,
        avgCompletionRate: avg / 7 // Assuming 7 days
    };
}

/**
 * Extracts top N most frequent tags
 */
function getTopTags(entries: Entry[], topN: number = 3): string[] {
    const tagCounts: Record<string, number> = {};

    entries.forEach(entry => {
        entry.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, topN)
        .map(([tag]) => tag);
}

// ============================================
// CORRELATION DETECTION
// ============================================

/**
 * Generates AI-powered insight about sentiment-habit correlation
 * Uses simple heuristics for now, can be enhanced with ML
 */
async function generateCorrelationInsight(
    sentiment: SentimentAnalysis,
    habits: HabitAnalysis
): Promise<string> {
    // Simple rule-based insight generation
    if (sentiment.direction === 'improving' && habits.avgCompletionRate > 0.7) {
        return `Your mood improved ${sentiment.percentage}% this week, aligning with ${Math.round(habits.avgCompletionRate * 100)}% habit completion. Consistency pays off!`;
    }

    if (sentiment.direction === 'declining' && habits.avgCompletionRate < 0.5) {
        return `Mood dipped ${sentiment.percentage}% as habit completion dropped to ${Math.round(habits.avgCompletionRate * 100)}%. Consider restarting one keystone habit.`;
    }

    if (sentiment.direction === 'stable') {
        return `Mood stayed ${sentiment.dominantEmotion.toLowerCase()} this week. Your habits are providing a stable foundation.`;
    }

    return `Mood ${sentiment.direction} by ${sentiment.percentage}% this week. Dominant feeling: ${sentiment.dominantEmotion}.`;
}

// ============================================
// THEMATIC DEEP-DIVE
// ============================================

/**
 * Generates deep analysis when a tag appears frequently
 */
async function generateThematicInsight(userId: string, tag: string): Promise<void> {
    try {
        console.log(`[Intelligence] Generating thematic insight for tag: ${tag}`);

        // TODO: Implement in Task 5
        // 1. Fetch all entries with this tag from last 7 days
        // 2. Call Gemini for thematic synthesis
        // 3. Create insight card

    } catch (error) {
        console.error(`[Intelligence] Thematic insight generation failed:`, error);
    }
}

// ============================================
// EXPORTS
// ============================================

export const intelligenceEngine = {
    generateDailyReflection,
    detectWeeklyPatterns,
    checkTagThresholds
};

// Export helper functions for testing
export const _internal = {
    analyzeSentimentTrend,
    analyzeHabitCompletion,
    getTopTags,
    generateCorrelationInsight,
    generateThematicInsight
};
