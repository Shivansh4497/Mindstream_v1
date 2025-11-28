import React from 'react';
import { motion } from 'framer-motion';

interface BreathingCircleProps {
    className?: string;
}

/**
 * Animated breathing circle that guides user through inhale/exhale cycle
 * Uses Framer Motion for smooth, spring-based animation
 */
export const BreathingCircle: React.FC<BreathingCircleProps> = ({ className = '' }) => {
    return (
        <div className={`relative w-32 h-32 ${className}`}>
            {/* Outer glow effect */}
            <motion.div
                className="absolute inset-0 rounded-full bg-brand-teal/20 blur-xl"
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Main breathing circle */}
            <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-teal to-teal-400 flex items-center justify-center shadow-lg"
                animate={{
                    scale: [1, 1.5, 1],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                {/* Inner subtle pulse */}
                <motion.div
                    className="w-16 h-16 rounded-full bg-white/20"
                    animate={{
                        scale: [1, 0.8, 1],
                        opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>

            {/* Breathing instruction text (optional, commented for minimal design) */}
            {/* <motion.div
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-400"
        animate={{
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 4,
          times: [0, 0.1, 0.9, 1],
          repeat: Infinity,
        }}
      >
        <span>Breathe...</span>
      </motion.div> */}
        </div>
    );
};
