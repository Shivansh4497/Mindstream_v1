import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface DailyPulseProps {
    summary: string;
    isExpanded: boolean;
    onToggle: () => void;
}

export const DailyPulse: React.FC<DailyPulseProps> = ({ summary, isExpanded, onToggle }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-teal/10 via-purple-500/5 to-transparent border border-white/10 shadow-xl"
        >
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-teal/5 to-purple-500/5 blur-3xl opacity-50" />

            <div className="relative p-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-brand-teal" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Your Daily Pulse
                    </h2>
                </div>

                {/* Summary Text */}
                <p className="text-lg md:text-xl font-display font-medium leading-relaxed text-white mb-4">
                    {summary || "Keep tracking your habits and mood to unlock personalized insights."}
                </p>

                {/* Toggle Button */}
                <button
                    onClick={onToggle}
                    className="flex items-center gap-2 text-sm text-brand-teal hover:text-brand-teal/80 transition-colors group"
                >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </motion.div>
                    <div className="h-px flex-1 bg-brand-teal/20 group-hover:bg-brand-teal/40 transition-colors" />
                </button>
            </div>
        </motion.div>
    );
};
