
import React, { useMemo, useState } from 'react';
import type { Habit, HabitLog, HabitFrequency } from '../types';
import { HabitCard } from './HabitCard';

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
        <div className="flex-grow flex flex-col overflow-hidden">
            {/* Frequency Tabs Header */}
            <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center overflow-x-auto">
                <div className="flex items-center gap-2">
                    {frequencies.map(freq => (
                        <button
                            key={freq.id}
                            onClick={() => onFrequencyChange(freq.id)}
                            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeFrequency === freq.id
                                    ? 'bg-brand-teal text-brand-indigo'
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
                    <div className="h-full flex items-center justify-center text-center text-gray-400">
                        <div>
                            <h3 className="text-2xl font-bold font-display text-white mb-2">No {activeFrequency} Habits Yet</h3>
                            <p>Building a system starts with one small step.<br />Add your first {activeFrequency} habit below.</p>
                        </div>
                    </div>
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
                                    onToggle={(dateString) => onToggle(habit.id, dateString)}
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
