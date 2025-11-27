import * as db from './dbService';
import { detectMoodPatterns, detectHabitPatterns, detectIntentionPatterns } from './patternDetector';
import { Entry, Habit, Intention, HabitLog } from '../types';

export const checkForNudges = async (
    userId: string,
    entries: Entry[],
    habits: Habit[],
    logs: HabitLog[],
    intentions: Intention[]
) => {
    // 1. Detect patterns
    const moodPattern = detectMoodPatterns(entries);
    const habitPattern = detectHabitPatterns(habits, logs);
    const intentionPattern = detectIntentionPatterns(intentions);

    const patterns = [moodPattern, habitPattern, intentionPattern].filter(Boolean);

    // 2. Process each pattern
    for (const pattern of patterns) {
        if (!pattern) continue;

        // Check if we recently nudged about this
        const recentNudges = await db.getRecentNudges(userId, pattern.type);
        if (recentNudges.length > 0) continue; // Skip if already nudged recently

        // 3. Create nudge
        await db.createNudge(userId, {
            pattern_type: pattern.type,
            message: pattern.message,
            suggested_action: pattern.suggestedAction,
            status: 'pending'
        });
    }
};
