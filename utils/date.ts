/**
 * Formats a Date object into a 'YYYY-MM-DD' string.
 * This is used for grouping entries by day in Local Time.
 */
export const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string (YYYY-MM-DD or ISO) into a user-friendly display string.
 * It shows 'Today', 'Yesterday', or a formatted date.
 */
export const getDisplayDate = (dateString: string): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // FIX: Create a Date object from the ISO string. 
  // This automatically handles the conversion from UTC (DB) to Local Time (Browser).
  const date = new Date(dateString);
  
  // Get the YYYY-MM-DD string for the Local Time version of the date
  const dateInputFormatted = getFormattedDate(date);
  
  const todayFormatted = getFormattedDate(today);
  const yesterdayFormatted = getFormattedDate(yesterday);

  if (dateInputFormatted === todayFormatted) {
    return 'Today';
  }
  if (dateInputFormatted === yesterdayFormatted) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

export const isDateInCurrentWeek = (date: Date): boolean => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return date >= startOfWeek && date <= endOfWeek;
}

export const isDateInCurrentMonth = (date: Date): boolean => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export const isDateInCurrentYear = (date: Date): boolean => {
    return date.getFullYear() === new Date().getFullYear();
}

/**
 * Gets the ISO week number for a date.
 */
const getWeekNumber = (d: Date): [number, number] => {
  // Use UTC to avoid daylight saving issues when calculating week numbers
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
}

/**
 * Returns a unique string identifier for the week a date belongs to.
 * e.g., "2024-W28"
 */
export const getWeekId = (date: Date): string => {
  const [year, weekNo] = getWeekNumber(date);
  return `${year}-W${weekNo.toString().padStart(2, '0')}`;
};

/**
 * Returns a unique string identifier for the month a date belongs to.
 * e.g., "2024-07"
 */
export const getMonthId = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Converts a week ID string back to a Date object (start of that week).
 */
export const getDateFromWeekId = (weekId: string): Date => {
    const [year, week] = weekId.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const isoWeekStart = simple;
    if (dow <= 4)
        isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return isoWeekStart;
}

/**
 * Returns a display string for a week ID.
 * e.g., "Week of July 15, 2024"
 */
export const getWeekDisplay = (weekId: string): string => {
    const startDate = getDateFromWeekId(weekId);
    return `Week of ${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

/**
 * Returns a display string for a month ID.
 * e.g., "July 2024"
 */
export const getMonthDisplay = (monthId: string): string => {
    const [year, month] = monthId.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
