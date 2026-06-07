import { callAIProxy } from './geminiClient';
import * as db from './dbService';
import type { Entry, Habit, HabitLog } from '../types';

export function getWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil(
    ((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export async function runCorrelationEngine(
  userId: string,
  entries: Entry[],
  habits: Habit[],
  habitLogs: HabitLog[]
): Promise<{ pattern_text: string; confidence: number } | null> {

  // Dev bypass
  const isDevBypass = typeof window !== 'undefined' && window.location.search.includes('dev_correlation=true');

  // Gate: need minimum data to detect anything meaningful
  if (!isDevBypass && (entries.length < 7 || habitLogs.length < 5)) {
    console.warn('[CorrelationEngine] Not enough data to run correlation engine. Skipping.');
    return null;
  }

  const weekId = getWeekId();

  // Check if already ran this week
  if (!isDevBypass) {
    const existing = await db.getCorrelationInsight(userId, weekId);
    if (existing) return existing;
  }

  try {
    const result = await callAIProxy('detect-correlations', {
      entries,
      habits,
      habitLogs
    });

    // Gate: only store if confidence is meaningful
    if (!result.pattern_text || result.confidence < 0.6) {
      console.warn('[CorrelationEngine] Low confidence or no pattern found.');
      return null;
    }

    // Store in DB
    await db.saveCorrelationInsight(userId, {
      pattern_text: result.pattern_text,
      pattern_type: result.pattern_type ?? 'habit_mood',
      confidence: result.confidence,
      week_id: weekId,
      evidence_habit_ids: [],
      evidence_entry_ids: []
    });

    return { pattern_text: result.pattern_text, confidence: result.confidence };

  } catch (err) {
    console.warn('[CorrelationEngine] Failed silently:', err);
    return null;
  }
}
