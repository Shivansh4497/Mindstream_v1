import confetti from 'canvas-confetti';

/**
 * Celebration utility functions for micro-interactions
 */

export const CelebrationType = {
    HABIT_FIRST: 'habit_first',
    HABIT_REGULAR: 'habit_regular',
    STREAK_3: 'streak_3',
    STREAK_7: 'streak_7',
    STREAK_30: 'streak_30',
    INTENTION_COMPLETE: 'intention_complete',
    ENTRY_SAVED: 'entry_saved'
} as const;

export type CelebrationTypeKey = typeof CelebrationType[keyof typeof CelebrationType];

/**
 * Trigger confetti celebration based on type
 */
export const celebrate = (type: CelebrationTypeKey, element?: HTMLElement) => {
    const origin = element ? getElementCenter(element) : { x: 0.5, y: 0.5 };

    switch (type) {
        case CelebrationType.HABIT_FIRST:
            // Full-screen confetti for first completion
            confetti({
                particleCount: 150,
                spread: 180,
                origin,
                colors: ['#4ECDC4', '#44A08D', '#FFD700', '#FF6B6B'],
                ticks: 200,
                gravity: 1.2,
                scalar: 1.2
            });
            break;

        case CelebrationType.HABIT_REGULAR:
            // Subtle burst for regular completions
            confetti({
                particleCount: 30,
                spread: 60,
                origin,
                colors: ['#4ECDC4', '#44A08D'],
                ticks: 100,
                gravity: 1,
                scalar: 0.8
            });
            break;

        case CelebrationType.STREAK_3:
            // Bronze confetti for 3-day streak
            confetti({
                particleCount: 80,
                spread: 120,
                origin,
                colors: ['#CD7F32', '#FFD700', '#4ECDC4'],
                ticks: 150,
                gravity: 1.1
            });
            break;

        case CelebrationType.STREAK_7:
            // Silver confetti for 7-day streak
            confetti({
                particleCount: 100,
                spread: 140,
                origin,
                colors: ['#C0C0C0', '#FFD700', '#4ECDC4'],
                ticks: 180,
                gravity: 1.1,
                scalar: 1.1
            });
            break;

        case CelebrationType.STREAK_30:
            // Gold confetti for 30-day streak
            confetti({
                particleCount: 200,
                spread: 180,
                origin,
                colors: ['#FFD700', '#FFA500', '#4ECDC4', '#FF6B6B'],
                ticks: 250,
                gravity: 1.2,
                scalar: 1.5
            });
            // Add second burst for extra celebration
            setTimeout(() => {
                confetti({
                    particleCount: 100,
                    spread: 120,
                    origin,
                    colors: ['#FFD700', '#FFA500'],
                    ticks: 150
                });
            }, 200);
            break;

        case CelebrationType.INTENTION_COMPLETE:
            // Gentle burst for intention completion
            confetti({
                particleCount: 50,
                spread: 80,
                origin,
                colors: ['#9B59B6', '#8E44AD', '#4ECDC4'],
                ticks: 120,
                gravity: 0.8,
                scalar: 0.9
            });
            break;

        case CelebrationType.ENTRY_SAVED:
            // Minimal sparkle for entry saved
            confetti({
                particleCount: 20,
                spread: 40,
                origin,
                colors: ['#4ECDC4', '#44A08D'],
                ticks: 80,
                gravity: 0.6,
                scalar: 0.6
            });
            break;

        default:
            // Default celebration
            confetti({
                particleCount: 50,
                spread: 70,
                origin
            });
    }
};

/**
 * Get center coordinates of an element for confetti origin
 */
const getElementCenter = (element: HTMLElement): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
    };
};

/**
 * Determine celebration type based on streak
 */
export const getCelebrationTypeForStreak = (
    streak: number,
    isFirstCompletion: boolean
): CelebrationTypeKey => {
    if (isFirstCompletion) return CelebrationType.HABIT_FIRST;
    if (streak === 30) return CelebrationType.STREAK_30;
    if (streak === 7) return CelebrationType.STREAK_7;
    if (streak === 3) return CelebrationType.STREAK_3;
    return CelebrationType.HABIT_REGULAR;
};
