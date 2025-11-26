import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, Sparkles } from 'lucide-react';

interface InsightCardProps {
    title: string;
    insight: string;
    children: React.ReactNode; // The chart goes here
    color: string; // e.g., 'bg-brand-teal' or 'bg-purple-500'
}

export const InsightCard: React.FC<InsightCardProps> = ({ title, insight, children, color }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <motion.div
            layout
            onClick={() => setIsExpanded(!isExpanded)}
            className={`relative w-full overflow-hidden rounded-2xl cursor-pointer border border-white/10 shadow-xl transition-colors duration-500 ${isExpanded ? 'bg-gray-900/90' : 'bg-gray-800/50 hover:bg-gray-800'
                }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
            {/* Background Gradient */}
            <div className={`absolute inset-0 opacity-10 ${color} blur-3xl`} />

            <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            {title}
                        </h3>
                    </div>
                    <button className="text-gray-500 hover:text-white transition-colors">
                        {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>

                {/* Insight Text (The "Story") */}
                <motion.div layout className="mb-6">
                    <p className={`text-xl md:text-2xl font-display font-medium leading-relaxed ${isExpanded ? 'text-gray-300' : 'text-white'
                        }`}>
                        {insight || "Gathering more data to find patterns..."}
                    </p>
                </motion.div>

                {/* The Chart (The "Proof") - Only visible when expanded */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 border-t border-white/10">
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Call to Action (Hint to click) */}
                {!isExpanded && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-2 text-xs text-gray-500 mt-2"
                    >
                        <span>Tap to view proof</span>
                        <div className={`h-px flex-1 ${color} opacity-20`} />
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
