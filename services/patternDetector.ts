import { Entry, Habit, Intention, HabitLog } from '../types';
import { differenceInDays, parseISO, isSameDay, subDays } from 'date-fns';

export interface DetectedPattern {
    type: 'mood_decline' | 'habit_abandonment' | 'intention_stagnation' | 'positive_reinforcement';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestedAction: 'chat_reflection' | 'log_entry' | 'review_goals';
    context?: any;
}

const NEGATIVE_MOODS = ['anxious', 'stressed', 'sad', 'overwhelmed', 'tired', 'frustrated', 'angry', 'lonely'];
const POSITIVE_MOODS = ['excited', 'calm', 'inspired', 'grateful', 'joyful', 'hopeful', 'proud', 'content'];

export const detectMoodPatterns = (entries: Entry[]): DetectedPattern | null => {
    if (entries.length < 3) return null;

    // Sort by date descending
    const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const last3Days = sortedEntries.slice(0, 3);

    // Check for consecutive negative moods
    const negativeStreak = last3Days.filter(e =>
        e.primary_sentiment && NEGATIVE_MOODS.includes(e.primary_sentiment.toLowerCase())
    ).length;

    if (negativeStreak >= 3) {
        const sentiments = last3Days.map(e => e.primary_sentiment).join(', ');
        return {
            type: 'mood_decline',
            severity: 'high',
            message: `I've noticed you've been feeling ${last3Days[0].primary_sentiment?.toLowerCase()} lately. Want to talk about it?`,
            suggestedAction: 'chat_reflection',
            context: { sentiments }
        };
    }

    // Check for positive streak
    const positiveStreak = last3Days.filter(e =>
        e.primary_sentiment && POSITIVE_MOODS.includes(e.primary_sentiment.toLowerCase())
    ).length;

    if (positiveStreak >= 3) {
        return {
            type: 'positive_reinforcement',
            severity: 'medium',
            message: "You're on a roll! What's working well for you right now?",
            suggestedAction: 'chat_reflection',
            context: { streak: positiveStreak }
        };
    }

    return null;
};

export const detectHabitPatterns = (habits: Habit[], logs: HabitLog[]): DetectedPattern | null => {
    const today = new Date();

    for (const habit of habits) {
        // Check for abandonment: Was consistent, now stopped
        // Simple logic: Completed 3+ times in last 10 days, but 0 in last 3 days

        const logsForHabit = logs.filter(l => l.habit_id === habit.id);
        if (logsForHabit.length < 3) continue;

        const lastLog = logsForHabit.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
        if (!lastLog) continue;

        const daysSinceLastLog = differenceInDays(today, parseISO(lastLog.completed_at));

        if (daysSinceLastLog >= 3 && daysSinceLastLog <= 7) {
            // Check if they were active before
            const activeBefore = logsForHabit.filter(l => differenceInDays(today, parseISO(l.completed_at)) > 3 && differenceInDays(today, parseISO(l.completed_at)) <= 14).length >= 3;

            if (activeBefore) {
                return {
                    type: 'habit_abandonment',
                    severity: 'medium',
                    message: `You were doing great with ${habit.name}. What happened?`,
                    suggestedAction: 'chat_reflection',
                    context: { habitName: habit.name, daysSince: daysSinceLastLog }
                };
            }
        }
    }

    return null;
};

export const detectIntentionPatterns = (intentions: Intention[]): DetectedPattern | null => {
    const pendingIntentions = intentions.filter(i => i.status === 'pending');
    const today = new Date();

    for (const intention of pendingIntentions) {
        const daysPending = differenceInDays(today, parseISO(intention.created_at));

        if (daysPending >= 7) {
            return {
                type: 'intention_stagnation',
                severity: 'low',
                message: `This goal has been pending for a week. Is it still relevant?`,
                suggestedAction: 'review_goals',
                context: { intentionText: intention.text, daysPending }
            };
        }
    }

    return null;
};

export const detectWeeklyPatterns = (
  entries: Entry[],
  habits: Habit[],
  habitLogs: HabitLog[]
): DetectedPattern | null => {
  const oneWeekAgo = subDays(new Date(), 7);
  const weekEntries = entries.filter(e => parseISO(e.timestamp) >= oneWeekAgo);
  const weekLogs = habitLogs.filter(l => parseISO(l.completed_at) >= oneWeekAgo);

  if (weekEntries.length < 3) return null;

  // Check habit completion rate this week
  const dailyHabits = habits.filter(h => h.frequency === 'daily');
  if (dailyHabits.length > 0) {
    const expectedLogs = dailyHabits.length * 7;
    const actualLogs = weekLogs.filter(log =>
      dailyHabits.some(h => h.id === log.habit_id)
    ).length;
    const completionRate = actualLogs / expectedLogs;

    if (completionRate < 0.3 && weekEntries.length >= 3) {
      return {
        type: 'habit_abandonment',
        severity: 'medium',
        message: `Habit completion was low this week (${Math.round(completionRate * 100)}%). Want to talk about what got in the way?`,
        suggestedAction: 'chat_reflection',
        context: { completionRate, weekLogs: actualLogs, expected: expectedLogs }
      };
    }
  }

  return null;
};

export const checkTagThresholds = (entries: Entry[]): DetectedPattern | null => {
  // Count tag frequency across last 14 days
  const twoWeeksAgo = subDays(new Date(), 14);
  const recentEntries = entries.filter(e => parseISO(e.timestamp) >= twoWeeksAgo);

  const tagCounts: Record<string, number> = {};
  recentEntries.forEach(e => {
    (e.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Find dominant tag (appears in > 40% of entries)
  const threshold = recentEntries.length * 0.4;
  const dominantTag = Object.entries(tagCounts)
    .find(([_, count]) => count >= threshold && count >= 3);

  if (dominantTag) {
    return {
      type: 'mood_decline',
      severity: 'low',
      message: `"${dominantTag[0]}" has come up in ${dominantTag[1]} of your recent entries. Worth exploring?`,
      suggestedAction: 'chat_reflection',
      context: { tag: dominantTag[0], count: dominantTag[1] }
    };
  }

  return null;
};
