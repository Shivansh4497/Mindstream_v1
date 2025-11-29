import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Repeat } from 'lucide-react';
import { HabitsView } from './HabitsView';
import { IntentionsView } from './IntentionsView';
import { HabitsInputBar } from './HabitsInputBar';
import { IntentionsInputBar } from './IntentionsInputBar';
import { sortHabitsByRelevance } from '../services/smartDefaults';
import type { Habit, HabitLog, Intention, HabitFrequency } from '../types';

interface FocusViewProps {
    // Habits Props
    habits: Habit[];
    todaysLogs: HabitLog[];
    onToggleHabit: (id: string) => void;
    onEditHabit: (habit: Habit) => void;
    onDeleteHabit: (id: string) => void;
    onAddHabit: (name: string, emoji: string, frequency: HabitFrequency, category: string) => Promise<void>;
    isAddingHabit: boolean;
    activeHabitFrequency: HabitFrequency;
    onHabitFrequencyChange: (freq: HabitFrequency) => void;

    // Intentions Props
    intentions: Intention[];
    onToggleIntention: (id: string, status: string) => void;
    onDeleteIntention: (id: string) => void;
    onAddIntention: (text: string, dueDate: Date | null, isLifeGoal: boolean) => Promise<void>;
}

type FocusTab = 'habits' | 'goals';

export const FocusView: React.FC<FocusViewProps> = ({
    habits, todaysLogs, onToggleHabit, onEditHabit, onDeleteHabit, onAddHabit, isAddingHabit, activeHabitFrequency, onHabitFrequencyChange,
    intentions, onToggleIntention, onDeleteIntention, onAddIntention
}) => {
    const [activeTab, setActiveTab] = useState<FocusTab>('habits');

    // Smart sort habits by time of day
    const sortedHabits = useMemo(() => sortHabitsByRelevance(habits), [habits]);

    return (
        <div className="flex flex-col h-full relative">
            {/* Tab Switcher */}
            <div className="flex-shrink-0 px-4 pt-2 pb-0">
                <div className="flex p-1 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
                    <button
                        onClick={() => setActiveTab('habits')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'habits'
                            ? 'bg-brand-teal text-brand-indigo shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Repeat className="w-4 h-4" />
                        Habits
                    </button>
                    <button
                        onClick={() => setActiveTab('goals')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'goals'
                            ? 'bg-brand-teal text-brand-indigo shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Target className="w-4 h-4" />
                        Goals
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'habits' ? (
                        <motion.div
                            key="habits"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <HabitsView
                                habits={sortedHabits}
                                todaysLogs={todaysLogs}
                                onToggle={onToggleHabit}
                                onEdit={onEditHabit}
                                onDelete={onDeleteHabit}
                                activeFrequency={activeHabitFrequency}
                                onFrequencyChange={onHabitFrequencyChange}
                            />
                            <HabitsInputBar
                                onAddHabit={onAddHabit}
                                isLoading={isAddingHabit}
                                activeFrequency={activeHabitFrequency}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="goals"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <IntentionsView
                                intentions={intentions}
                                onToggle={onToggleIntention}
                                onDelete={onDeleteIntention}
                            />
                            <IntentionsInputBar onAddIntention={onAddIntention} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
