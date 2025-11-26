import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Clock } from 'lucide-react';
import { differenceInHours, parseISO } from 'date-fns';

interface DailyPulseProps {
    summary: string;
    lastGeneratedDate: string | null;
    isGenerating: boolean;
    onGenerate: () => void;
}

export const DailyPulse: React.FC<DailyPulseProps> = ({
    summary,
    lastGeneratedDate,
    isGenerating,
    onGenerate
}) => {
    const canGenerate = useMemo(() => {
        if (!lastGeneratedDate) return true;

        const lastGenerated = parseISO(lastGeneratedDate);
        const hoursSinceGeneration = differenceInHours(new Date(), lastGenerated);

        return hoursSinceGeneration >= 24;
    }, [lastGeneratedDate]);

    const hoursUntilNext = useMemo(() => {
        if (!lastGeneratedDate || canGenerate) return 0;

        const lastGenerated = parseISO(lastGeneratedDate);
        const hoursSinceGeneration = differenceInHours(new Date(), lastGenerated);

        return 24 - hoursSinceGeneration;
    }, [lastGeneratedDate, canGenerate]);

    const hasInsight = summary !== "Keep tracking your habits and mood to unlock personalized insights.";

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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-brand-teal" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            Your Daily Pulse
                        </h2>
                    </div>

                    {/* Generate Button */}
                    {canGenerate ? (
                        <button
                            onClick={onGenerate}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-teal text-brand-indigo font-semibold text-sm hover:bg-brand-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {hasInsight ? 'Refresh Pulse' : 'Generate Pulse'}
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700/50 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" />
                            Next update in {hoursUntilNext}h
                        </div>
                    )}
                </div>

                {/* Summary Text */}
                <p className="text-lg md:text-xl font-display font-medium leading-relaxed text-white">
                    {summary}
                </p>

                {/* Last Updated */}
                {lastGeneratedDate && (
                    <p className="text-xs text-gray-500 mt-3">
                        Last updated: {new Date(lastGeneratedDate).toLocaleDateString()}
                    </p>
                )}
            </div>
        </motion.div>
    );
};
