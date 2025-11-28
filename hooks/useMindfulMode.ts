import { useState, useEffect } from 'react';
import * as db from '../services/dbService';

interface UseMindfulModeReturn {
    mindfulModeEnabled: boolean;
    toggleMindfulMode: () => Promise<void>;
    isLoading: boolean;
}

/**
 * Hook to manage mindful mode settings
 * Fetches and updates user preference for breathing pause
 */
export const useMindfulMode = (userId: string | undefined): UseMindfulModeReturn => {
    const [mindfulModeEnabled, setMindfulModeEnabled] = useState<boolean>(true); // Default ON
    const [isLoading, setIsLoading] = useState(true);

    // Fetch preference on mount
    useEffect(() => {
        const fetchPreference = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }

            try {
                const preferences = await db.getUserPreferences(userId);

                // Default to true if preference doesn't exist yet
                setMindfulModeEnabled(preferences?.mindful_mode_enabled ?? true);
            } catch (error) {
                console.error('Failed to fetch mindful mode preference:', error);
                // Keep default (true) on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchPreference();
    }, [userId]);

    const toggleMindfulMode = async () => {
        if (!userId) return;

        const newValue = !mindfulModeEnabled;

        // Optimistic update
        setMindfulModeEnabled(newValue);

        try {
            await db.updateUserPreference(userId, { mindful_mode_enabled: newValue });
        } catch (error) {
            console.error('Failed to update mindful mode:', error);
            // Revert on error
            setMindfulModeEnabled(!newValue);
        }
    };

    return {
        mindfulModeEnabled,
        toggleMindfulMode,
        isLoading,
    };
};
