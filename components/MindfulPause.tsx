import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BreathingCircle } from './BreathingCircle';

interface MindfulPauseProps {
    onComplete: () => void;
    duration?: number; // Default 3000ms
    canSkip?: boolean; // Default true
}

/**
 * Mindful pause overlay that appears before user starts writing
 * Creates space for intentional reflection
 */
export const MindfulPause: React.FC<MindfulPauseProps> = ({
    onComplete,
    duration = 3000,
    canSkip = true,
}) => {
    const [showSkipButton, setShowSkipButton] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Show skip button after 1 second
        const skipTimer = setTimeout(() => {
            setShowSkipButton(true);
        }, 1000);

        // Progress bar animation
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                const increment = 100 / (duration / 50); // Update every 50ms
                return Math.min(prev + increment, 100);
            });
        }, 50);

        // Auto-complete after duration
        const completeTimer = setTimeout(() => {
            onComplete();

            // Haptic feedback on mobile (if supported)
            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }
        }, duration);

        return () => {
            clearTimeout(skipTimer);
            clearTimeout(completeTimer);
            clearInterval(progressInterval);
        };
    }, [duration, onComplete]);

    const handleSkip = () => {
        onComplete();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                data-testid="mindful-pause"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="flex flex-col items-center gap-8 px-6"
                >
                    {/* Breathing Circle */}
                    <BreathingCircle />

                    {/* Gentle message */}
                    <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-center"
                    >
                        <h3 className="text-lg font-medium text-white mb-2">
                            Take a breath...
                        </h3>
                        <p className="text-sm text-gray-400">
                            Ground yourself in this moment
                        </p>
                    </motion.div>

                    {/* Progress indicator (subtle) */}
                    <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-brand-teal/50 rounded-full"
                            style={{ width: `${progress}%` }}
                            transition={{ ease: 'linear' }}
                        />
                    </div>

                    {/* Skip button (appears after 1s) */}
                    <AnimatePresence>
                        {canSkip && showSkipButton && (
                            <motion.button
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 10, opacity: 0 }}
                                onClick={handleSkip}
                                className="px-6 py-2 text-sm text-gray-400 hover:text-white transition-colors border border-white/20 rounded-full hover:border-white/40"
                            >
                                I'm ready
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
