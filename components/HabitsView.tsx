
import React, { useMemo, useState, useRef } from 'react';
import type { Habit, HabitLog, HabitFrequency } from '../types';
import { HabitCard } from './HabitCard';
import { celebrate, getCelebrationTypeForStreak } from '../utils/celebrations';
import { calculateStreak } from '../utils/streak';
import { EmptyHabitsState } from './EmptyHabitsState';

interface HabitsViewProps {
    habits: Habit[];
    todaysLogs: HabitLog[];
    onToggle: (habitId: string, dateString?: string) => void;
    onEdit: (habit: Habit) => void;
    onDelete: (habitId: string) => void;
    activeFrequency: HabitFrequency;
    onFrequencyChange: (frequency: HabitFrequency) => void;
}

const frequencies: { id: HabitFrequency; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
];

export const HabitsView: React.FC<HabitsViewProps> = ({
    habits,
    todaysLogs,
    onToggle,
    onEdit,
    onDelete,
    activeFrequency,
    onFrequencyChange
}) => {
    const celebrationTriggerRef = useRef<HTMLDivElement>(null);

    // Enhanced toggle handler with celebrations
    const handleToggleWithCelebration = (habitId: string, dateString?: string) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        // Get logs for this habit
        const habitLogs = todaysLogs.filter(log => log.habit_id === habitId);
        const logDates = habitLogs.map(l => new Date(l.completed_at));
        const currentStreak = calculateStreak(logDates, habit.frequency);

        // Check if this is a completion (not unchecking)
        const isCompleting = !habitLogs.some(log =>
            new Date(log.completed_at).toDateString() === new Date(dateString || new Date()).toDateString()
        );

        // Trigger the actual toggle
        onToggle(habitId, dateString);

        // Only celebrate on completion, not on unchecking
        if (isCompleting) {
            const isFirstCompletion = habitLogs.length === 0;
            const newStreak = currentStreak + 1;
            const celebrationType = getCelebrationTypeForStreak(newStreak, isFirstCompletion);

            // Trigger celebration
            setTimeout(() => {
                celebrate(celebrationType, celebrationTriggerRef.current || undefined);
            }, 100); // Small delay for smooth UX
        }
    };

    // Optimize: Group logs by habit ID once, instead of filtering for every card.
    // This reduces complexity from O(N*M) to O(N).
    const logsByHabitId = useMemo(() => {
        const map: Record<string, HabitLog[]> = {};
        todaysLogs.forEach(log => {
            if (!map[log.habit_id]) {
                map[log.habit_id] = [];
            }
            map[log.habit_id].push(log);
        });
        return map;
    }, [todaysLogs]);

    // Filter habits by active frequency
    const filteredHabits = useMemo(() => {
        return habits.filter(h => h.frequency === activeFrequency);
    }, [habits, activeFrequency]);

    return (
        <div ref={celebrationTriggerRef} className="flex-grow flex flex-col overflow-hidden">
            {/* Frequency Tabs Header */}
            <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center overflow-x-auto">
                <div className="flex items-center gap-2">
                    {frequencies.map(freq => (
                        <button
                            key={freq.id}
                            onClick={() => onFrequencyChange(freq.id)}
                            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeFrequency === freq.id
                                ? 'bg-brand-teal text-white'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {freq.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-4">
                {filteredHabits.length === 0 && (
                    <EmptyHabitsState />
                )}

                {/* Habits List */}
                {filteredHabits.length > 0 && (
                    <div>
                        <header className="p-6 pb-2">
                            <h2 className="text-xl font-bold font-display text-white">Your {activeFrequency.charAt(0).toUpperCase() + activeFrequency.slice(1)} Systems</h2>
                            <p className="text-sm text-gray-400">Track the habits that power your life.</p>
                        </header>
                        <div className="flex flex-col gap-1">
                            {filteredHabits.map(habit => (
                                <HabitCard
                                    key={habit.id}
                                    habit={habit}
                                    logs={logsByHabitId[habit.id] || []}
                                    onToggle={(dateString) => handleToggleWithCelebration(habit.id, dateString)}
                                    onEdit={() => onEdit(habit)}
                                    onDelete={() => onDelete(habit.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
