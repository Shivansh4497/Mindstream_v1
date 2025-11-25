import { getFormattedDate, getWeekId, getMonthId } from './date';

/**
 * Calculates the current streak based on a list of log dates.
 * It is "retroactive", meaning it finds the longest continuous chain
 * ending at the current period (Today/This Week) or the immediately previous one.
 */
export const calculateStreak = (
  logDates: Date[], 
  frequency: 'daily' | 'weekly' | 'monthly'
): number => {
  if (!logDates || logDates.length === 0) return 0;

  // 1. Convert logs to unique period keys
  const uniquePeriods = new Set<string>();
  
  logDates.forEach(date => {
    if (frequency === 'daily') uniquePeriods.add(getFormattedDate(date));
    else if (frequency === 'weekly') uniquePeriods.add(getWeekId(date));
    else if (frequency === 'monthly') uniquePeriods.add(getMonthId(date));
  });

  // 2. Determine Anchor (The starting point of the check)
  const now = new Date();
  let currentKey = '';
  let previousKey = '';

  if (frequency === 'daily') {
    currentKey = getFormattedDate(now);
    const prev = new Date(now); prev.setDate(prev.getDate() - 1);
    previousKey = getFormattedDate(prev);
  } else if (frequency === 'weekly') {
    currentKey = getWeekId(now);
    const prev = new Date(now); prev.setDate(prev.getDate() - 7);
    previousKey = getWeekId(prev);
  } else if (frequency === 'monthly') {
    currentKey = getMonthId(now);
    const prev = new Date(now); prev.setMonth(prev.getMonth() - 1);
    previousKey = getMonthId(prev);
  }

  // 3. Determine if the streak is alive
  // A streak is alive if we have done it "This Period" OR "Last Period".
  const hasDoneCurrent = uniquePeriods.has(currentKey);
  const hasDonePrevious = uniquePeriods.has(previousKey);

  if (!hasDoneCurrent && !hasDonePrevious) return 0;

  // 4. Walk backwards to count the streak
  let streak = 0;
  
  // We start counting from the most recent completed period
  let currentDate = hasDoneCurrent ? now : (() => {
      const d = new Date(now);
      if(frequency === 'daily') d.setDate(d.getDate()-1);
      if(frequency === 'weekly') d.setDate(d.getDate()-7);
      if(frequency === 'monthly') d.setMonth(d.getMonth()-1);
      return d;
  })();

  // Safety break to prevent infinite loops (though logic shouldn't allow it)
  let safetyCounter = 0;
  const MAX_LOOPS = 3650; // 10 years

  while (safetyCounter < MAX_LOOPS) {
      let keyToCheck = '';
      if (frequency === 'daily') keyToCheck = getFormattedDate(currentDate);
      else if (frequency === 'weekly') keyToCheck = getWeekId(currentDate);
      else if (frequency === 'monthly') keyToCheck = getMonthId(currentDate);

      if (uniquePeriods.has(keyToCheck)) {
          streak++;
          // Decrement date for next iteration
          if (frequency === 'daily') currentDate.setDate(currentDate.getDate() - 1);
          else if (frequency === 'weekly') currentDate.setDate(currentDate.getDate() - 7);
          else if (frequency === 'monthly') currentDate.setMonth(currentDate.getMonth() - 1);
      } else {
          break; // Streak broken
      }
      safetyCounter++;
  }

  return streak;
}
