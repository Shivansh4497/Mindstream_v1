import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Activity, ChevronRight } from 'lucide-react';
import { ReflectionsView } from './ReflectionsView';
import { LifeAreaDashboard } from './LifeAreaDashboard';
import type { Entry, Intention, Reflection, Habit, HabitLog, AIStatus, EntrySuggestion } from '../types';

interface InsightsViewProps {
    // Reflections Props
    entries: Entry[];
    intentions: Intention[];
    reflections: Reflection[];
    habits: Habit[];
    habitLogs: HabitLog[];
    onGenerateDaily: (date: string, dayEntries: Entry[]) => Promise<void>;
    onGenerateWeekly: (weekId: string, weekEntries: Entry[]) => Promise<void>;
    onGenerateMonthly: (monthId: string, monthEntries: Entry[]) => Promise<void>;
    onExploreInChat: (summary: string) => void;
    isGenerating: string | null;
    onAddSuggestion: (suggestion: EntrySuggestion) => void;
    aiStatus: AIStatus;
    onDebug: () => void;
    debugOutput: any;

    // Life Dashboard Props
    onOpenYearlyReview: () => void;
    isGeneratingYearly: boolean;
}

type InsightsTab = 'reflect' | 'deep_dive';

export const InsightsView: React.FC<InsightsViewProps> = ({
    entries, intentions, reflections, habits, habitLogs,
    onGenerateDaily, onGenerateWeekly, onGenerateMonthly, onExploreInChat,
    isGenerating, onAddSuggestion, aiStatus, onDebug, debugOutput,
    onOpenYearlyReview, isGeneratingYearly
}) => {
    const [activeTab, setActiveTab] = useState<InsightsTab>('reflect');

    return (
        <div className="flex flex-col h-full relative">
            {/* Header / Tab Switcher */}
            <div className="flex-shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white font-display">Insights</h1>

                {activeTab === 'reflect' && (
                    <button
                        onClick={() => setActiveTab('deep_dive')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-brand-teal transition-colors border border-brand-teal/20"
                    >
                        <Activity className="w-3 h-3" />
                        Deep Dive
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}

                {activeTab === 'deep_dive' && (
                    <button
                        onClick={() => setActiveTab('reflect')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs font-medium text-gray-400 hover:text-white transition-colors border border-white/10"
                    >
                        <Sparkles className="w-3 h-3" />
                        Back to Reflections
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'reflect' ? (
                        <motion.div
                            key="reflect"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <ReflectionsView
                                entries={entries}
                                intentions={intentions}
                                reflections={reflections}
                                habits={habits}
                                habitLogs={habitLogs}
                                onGenerateDaily={onGenerateDaily}
                                onGenerateWeekly={onGenerateWeekly}
                                onGenerateMonthly={onGenerateMonthly}
                                onExploreInChat={onExploreInChat}
                                isGenerating={isGenerating}
                                onAddSuggestion={onAddSuggestion}
                                aiStatus={aiStatus}
                                onDebug={onDebug}
                                debugOutput={debugOutput}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="deep_dive"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <LifeAreaDashboard
                                habits={habits}
                                entries={entries}
                                intentions={intentions}
                                habitLogs={habitLogs}
                                onBack={() => setActiveTab('reflect')}
                                onOpenYearlyReview={onOpenYearlyReview}
                                isGeneratingYearly={isGeneratingYearly}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
