/**
 * ETA (Estimated Time of Arrival) preset calculator
 * Converts natural language presets to exact due dates
 */

export type ETAPreset =
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'next_week'
    | 'this_month'
    | 'next_month'
    | 'this_year'
    | 'next_year'
    | 'life'
    | 'custom';

export interface ETAOption {
    id: ETAPreset;
    label: string;
    description?: string;
}

export const ETA_PRESETS: ETAOption[] = [
    { id: 'today', label: 'Today', description: 'By end of day' },
    { id: 'tomorrow', label: 'Tomorrow', description: 'By tomorrow night' },
    { id: 'this_week', label: 'This Week', description: 'By this Sunday' },
    { id: 'next_week', label: 'Next Week', description: 'By next Sunday' },
    { id: 'this_month', label: 'This Month', description: 'By end of month' },
    { id: 'next_month', label: 'Next Month', description: 'By end of next month' },
    { id: 'this_year', label: 'This Year', description: 'By Dec 31' },
    { id: 'next_year', label: 'Next Year', description: 'By next Dec 31' },
    { id: 'life', label: 'Life Goal', description: 'Ongoing, no deadline' },
    { id: 'custom', label: 'Custom Date', description: 'Pick a specific date' },
];

/**
 * Calculate due date from preset
 * All dates set to 23:59:59 local time
 */
export const calculateDueDate = (preset: ETAPreset, customDate?: Date): Date | null => {
    const now = new Date();

    // Helper to set time to end of day
    const endOfDay = (date: Date): Date => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    switch (preset) {
        case 'today':
            return endOfDay(now);

        case 'tomorrow': {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return endOfDay(tomorrow);
        }

        case 'this_week': {
            // End of this week (Sunday)
            const daysUntilSunday = 7 - now.getDay();
            const sunday = new Date(now);
            sunday.setDate(sunday.getDate() + daysUntilSunday);
            return endOfDay(sunday);
        }

        case 'next_week': {
            // End of next week (next Sunday)
            const daysUntilSunday = 7 - now.getDay();
            const nextSunday = new Date(now);
            nextSunday.setDate(nextSunday.getDate() + daysUntilSunday + 7);
            return endOfDay(nextSunday);
        }

        case 'this_month': {
            // Last day of current month
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return endOfDay(lastDay);
        }

        case 'next_month': {
            // Last day of next month
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0);
            return endOfDay(lastDay);
        }

        case 'this_year': {
            // Dec 31 of current year
            const dec31 = new Date(now.getFullYear(), 11, 31);
            return endOfDay(dec31);
        }

        case 'next_year': {
            // Dec 31 of next year
            const dec31 = new Date(now.getFullYear() + 1, 11, 31);
            return endOfDay(dec31);
        }

        case 'life':
            // No due date for life goals
            return null;

        case 'custom':
            return customDate ? endOfDay(customDate) : null;

        default:
            return null;
    }
};

/**
 * Get human-readable due date string
 */
export const formatDueDate = (dueDate: Date | null, isLifeGoal: boolean): string => {
    if (isLifeGoal) return 'Life Goal';
    if (!dueDate) return 'No deadline';

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months`;

    return dueDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: dueDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
};

/**
 * Get display date with calculated value for preset
 */
export const getPresetDisplayDate = (preset: ETAPreset): string => {
    const date = calculateDueDate(preset);
    if (!date) return '';

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

/**
 * Determine urgency category for sorting/grouping
 */
export type UrgencyCategory = 'overdue' | 'today' | 'this_week' | 'this_month' | 'later' | 'life';

export const getUrgencyCategory = (dueDate: Date | null, isLifeGoal: boolean): UrgencyCategory => {
    if (isLifeGoal) return 'life';
    if (!dueDate) return 'later';

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 7) return 'this_week';
    if (diffDays <= 30) return 'this_month';
    return 'later';
};

/**
 * Get urgency display label
 */
export const getUrgencyCategoryLabel = (category: UrgencyCategory): string => {
    switch (category) {
        case 'overdue': return 'Overdue';
        case 'today': return 'Today';
        case 'this_week': return 'This Week';
        case 'this_month': return 'This Month';
        case 'later': return 'Later';
        case 'life': return 'Life Goals';
    }
};
