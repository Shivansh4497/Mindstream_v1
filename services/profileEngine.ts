import { callAIProxy } from './geminiClient';
import * as db from './dbService';
import type { Entry, Habit, HabitLog, Intention } from '../types';

// Returns true if profile needs updating (older than 7 days or doesn't exist)
function profileNeedsUpdate(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true;
  const daysSince = (Date.now() - new Date(lastUpdated).getTime()) / 86400000;
  return daysSince >= 7;
}

export async function runProfileEngine(
  userId: string,
  entries: Entry[],
  habits: Habit[],
  habitLogs: HabitLog[],
  intentions: Intention[]
): Promise<void> {
  const devMode = typeof window !== 'undefined' && 
    window.location.search.includes('dev_profile=true');

  // Gate: need minimum data
  if (!devMode && entries.length < 5) return;

  try {
    // Check if update needed
    const existing = await db.getAIProfile(userId);
    if (!devMode && !profileNeedsUpdate(existing?.last_updated ?? null)) return;

    // Get onboarding context for richer profile
    const onboardingContext = await db.getOnboardingContext(userId);

    // Build new profile
    const profile = await callAIProxy('build-ai-profile', {
      entries,
      habits,
      habitLogs,
      intentions,
      onboardingContext
    });

    if (!(profile as any)?.pattern_summary) return; // Guard against empty response

    await db.saveAIProfile(userId, {
      ...(profile as any),
      last_updated: new Date().toISOString()
    });

  } catch (err) {
    console.warn('[ProfileEngine] Failed silently:', err);
  }
}
