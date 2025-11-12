/**
 * Formats a Date object into a 'YYYY-MM-DD' string.
 * This is used for grouping entries by day.
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

  // The input can be 'YYYY-MM-DD' which is parsed as UTC midnight.
  // Or it can be a full ISO string. Creating a new Date object handles both.
  const date = new Date(dateString);
  // To correctly compare dates across timezones, we compare the 'YYYY-MM-DD' parts.
  const dateInputFormatted = dateString.split('T')[0];
  
  const todayFormatted = getFormattedDate(today);
  const yesterdayFormatted = getFormattedDate(yesterday);

  if (dateInputFormatted === todayFormatted) {
    return 'Today';
  }
  if (dateInputFormatted === yesterdayFormatted) {
    return 'Yesterday';
  }

  // When creating a date from 'YYYY-MM-DD', it's UTC.
  // toLocaleDateString uses local timezone, which can shift the day.
  // So, we add timezone offset to make sure it's the correct day locally.
  const displayDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);

  return displayDate.toLocaleDateString('en-US', {
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