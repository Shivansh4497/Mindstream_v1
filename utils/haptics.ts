/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile interactions using Web Vibration API
 */

export const HapticPatterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    error: [50, 100, 50],
    warning: [20, 50, 20],
    selection: [5],
    impact: [15],
    notification: [10, 20, 10]
} as const;

export type HapticPattern = keyof typeof HapticPatterns;

/**
 * Trigger haptic feedback
 * @param pattern - The haptic pattern to use
 * @returns true if haptic was triggered, false if not supported
 */
export const triggerHaptic = (pattern: HapticPattern = 'light'): boolean => {
    // Check if vibration API is supported
    if (!navigator.vibrate) {
        return false;
    }

    try {
        const vibrationPattern = HapticPatterns[pattern];
        navigator.vibrate(vibrationPattern);
        return true;
    } catch (error) {
        console.warn('Haptic feedback failed:', error);
        return false;
    }
};

/**
 * Stop any ongoing vibration
 */
export const stopHaptic = (): void => {
    if (navigator.vibrate) {
        navigator.vibrate(0);
    }
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
    return 'vibrate' in navigator;
};

/**
 * React hook for haptic feedback
 */
export const useHaptic = () => {
    const trigger = (pattern: HapticPattern = 'light') => {
        return triggerHaptic(pattern);
    };

    return {
        trigger,
        stop: stopHaptic,
        isSupported: isHapticSupported()
    };
};
