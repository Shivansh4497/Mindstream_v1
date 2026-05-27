export interface TemporalBounds {
  startDate: Date | null;
  endDate: Date | null;
  hasTemporalIntent: boolean;
}

export function parseTemporalIntent(
  query: string
): TemporalBounds {
  const lower = query.toLowerCase();

  // TODAY
  if (/\btoday\b/.test(lower)) {
    const startUTC = new Date();
    startUTC.setUTCHours(0, 0, 0, 0);
    const endUTC = new Date();
    endUTC.setUTCHours(23, 59, 59, 999);
    return { 
      startDate: startUTC, 
      endDate: endUTC, 
      hasTemporalIntent: true 
    };
  }

  // YESTERDAY
  if (/\byesterday\b/.test(lower)) {
    const startUTC = new Date();
    startUTC.setUTCHours(0, 0, 0, 0);
    startUTC.setUTCDate(startUTC.getUTCDate() - 1);
    const endUTC = new Date();
    endUTC.setUTCHours(0, 0, 0, 0);
    return { 
      startDate: startUTC, 
      endDate: endUTC, 
      hasTemporalIntent: true 
    };
  }

  // LAST N DAYS (general pattern)
  const nDaysMatch = lower.match(
    /last\s+(\d+)\s+days?|past\s+(\d+)\s+days?/
  );
  if (nDaysMatch) {
    const n = parseInt(
      nDaysMatch[1] || nDaysMatch[2], 10
    );
    if (!isNaN(n) && n > 0) {
      const endUTC = new Date();
      endUTC.setUTCHours(23, 59, 59, 999);
      const startUTC = new Date();
      startUTC.setUTCHours(0, 0, 0, 0);
      startUTC.setUTCDate(
        startUTC.getUTCDate() - n
      );
      return {
        startDate: startUTC,
        endDate: endUTC,
        hasTemporalIntent: true
      };
    }
  }

  // LAST 7 DAYS / THIS WEEK / LAST WEEK
  if (/last\s*7\s*days?|past\s*7\s*days?|this\s+week|last\s+week/.test(lower)) {
    const endUTC = new Date();
    endUTC.setUTCHours(23, 59, 59, 999);
    const startUTC = new Date();
    startUTC.setUTCHours(0, 0, 0, 0);
    startUTC.setUTCDate(startUTC.getUTCDate() - 7);
    return { 
      startDate: startUTC, 
      endDate: endUTC, 
      hasTemporalIntent: true 
    };
  }

  // LAST 30 DAYS / LAST MONTH / THIS MONTH
  if (/last\s*30\s*days?|past\s*30\s*days?|last\s+month|this\s+month/.test(lower)) {
    const endUTC = new Date();
    endUTC.setUTCHours(23, 59, 59, 999);
    const startUTC = new Date();
    startUTC.setUTCHours(0, 0, 0, 0);
    startUTC.setUTCDate(startUTC.getUTCDate() - 30);
    return { 
      startDate: startUTC, 
      endDate: endUTC, 
      hasTemporalIntent: true 
    };
  }

  // SPECIFIC DATE: "May 19", "April 28" etc.
  const months = [
    'january','february','march','april',
    'may','june','july','august',
    'september','october','november','december'
  ];
  const now = new Date();
  for (let i = 0; i < months.length; i++) {
    const pattern = new RegExp(
      `${months[i]}\\s+(\\d{1,2})`, 'i'
    );
    const match = lower.match(pattern);
    if (match) {
      const day = parseInt(match[1]);
      const year = now.getUTCFullYear();
      const startUTC = new Date(Date.UTC(year, i, day, 0, 0, 0, 0));
      const endUTC = new Date(Date.UTC(year, i, day, 23, 59, 59, 999));
      return { 
        startDate: startUTC, 
        endDate: endUTC, 
        hasTemporalIntent: true 
      };
    }
  }

  // NO TEMPORAL INTENT
  return { 
    startDate: null, 
    endDate: null, 
    hasTemporalIntent: false 
  };
}

