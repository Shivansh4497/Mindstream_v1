import type { Habit, Intention } from '../types';

export type TimeOfDay = 'morning' | 'work' | 'evening' | 'night';

/**
 * Smart Defaults Service
 * Provides context-aware defaults based on time of day
 */

export function getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'work';
    if (hour >= 17 && hour < 23) return 'evening';
    return 'night';
}

export function getStreamPrompt(): string {
    const timeOfDay = getTimeOfDay();

    const prompts = {
        morning: [
            "How did you sleep?",
            "What's the vibe today?",
            "How are you showing up today?",
            "What's on your mind this morning?"
        ],
        work: [
            "How's the day going?",
            "What's on your mind?",
            "Quick check-in?",
            "Any thoughts to capture?"
        ],
        evening: [
            "What was the highlight?",
            "How was your day?",
            "Any lingering thoughts?",
            "Ready to close the loop?"
        ],
        night: [
            "How are you feeling?",
            "What's keeping you up?",
            "Final thoughts for the day?",
            "Ready to let go?"
        ]
    };

    const options = prompts[timeOfDay];
    return options[Math.floor(Math.random() * options.length)];
}

export function sortHabitsByRelevance(habits: Habit[]): Habit[] {
    const timeOfDay = getTimeOfDay();

    // Keywords that indicate time-of-day relevance
    const morningKeywords = ['morning', 'wake', 'breakfast', 'journal', 'meditation', 'exercise'];
    const eveningKeywords = ['evening', 'night', 'sleep', 'reflect', 'wind down', 'unwind'];

    return [...habits].sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (timeOfDay === 'morning') {
            const aIsMorning = morningKeywords.some(kw => aName.includes(kw));
            const bIsMorning = morningKeywords.some(kw => bName.includes(kw));
            if (aIsMorning && !bIsMorning) return -1;
            if (!aIsMorning && bIsMorning) return 1;
        }

        if (timeOfDay === 'evening' || timeOfDay === 'night') {
            const aIsEvening = eveningKeywords.some(kw => aName.includes(kw));
            const bIsEvening = eveningKeywords.some(kw => bName.includes(kw));
            if (aIsEvening && !bIsEvening) return -1;
            if (!aIsEvening && bIsEvening) return 1;
        }

        // Default sort (alphabetical)
        return 0;
    });
}

export function shouldShowQuickReflection(hasEntriesToday: boolean): boolean {
    const timeOfDay = getTimeOfDay();
    return (timeOfDay === 'evening' || timeOfDay === 'night') && !hasEntriesToday;
}

export function getQuickReflectionPrompt(): string {
    return "Quick Evening Reflection?";
}

export function getIntentionPrompt(): string {
    const timeOfDay = getTimeOfDay();

    if (timeOfDay === 'morning') {
        return "What's your main intention for today?";
    }

    return "Set a new goal";
}
