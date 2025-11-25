
import React, { useMemo, useState } from 'react';
import type { Habit, HabitLog, HabitFrequency } from '../types';
import { HabitCard } from './HabitCard';

interface HabitsViewProps {
  habits: Habit[];
  todaysLogs: HabitLog[];
  onToggle: (habitId: string, dateString?: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ 
    habits, 
    todaysLogs, 
    onToggle, 
    onDelete
}) => {
    
    // Group habits by frequency
    const groupedHabits = useMemo(() => {
        const groups: Record<HabitFrequency, Habit[]> = {
            daily: [],
            weekly: [],
            monthly: []
        };
        habits.forEach(h => {
            if (groups[h.frequency]) groups[h.frequency].push(h);
            else groups.daily.push(h); // Fallback
        });
        return groups;
    }, [habits]);

    const hasHabits = habits.length > 0;

    return (
        <div className="h-full flex flex-col">
            {hasHabits && (
                <header className="flex-shrink-0 p-6 pb-2">
                     <h2 className="text-xl font-bold font-display text-white">Your Systems</h2>
                     <p className="text-sm text-gray-400">Track the habits that power your life.</p>
                </header>
            )}

            <main className="flex-grow overflow-y-auto p-4">
                {!hasHabits && (
                     <div className="h-full flex items-center justify-center text-center text-gray-400">
                        <div>
                            <h3 className="text-2xl font-bold font-display text-white mb-2">No Habits Yet</h3>
                            <p>Building a system starts with one small step.<br/>Add your first habit below.</p>
                        </div>
                    </div>
                )}
                
                {/* DAILY */}
                {groupedHabits.daily.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Daily Habits</h3>
                        <div className="flex flex-col gap-1">
                            {groupedHabits.daily.map(habit => (
                                <HabitCard 
                                    key={habit.id} 
                                    habit={habit} 
                                    logs={todaysLogs.filter(l => l.habit_id === habit.id)}
                                    onToggle={(dateString) => onToggle(habit.id, dateString)}
                                    onDelete={() => onDelete(habit.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* WEEKLY */}
                {groupedHabits.weekly.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Weekly Habits</h3>
                        <div className="flex flex-col gap-1">
                            {groupedHabits.weekly.map(habit => (
                                <HabitCard 
                                    key={habit.id} 
                                    habit={habit} 
                                    logs={todaysLogs.filter(l => l.habit_id === habit.id)}
                                    onToggle={(dateString) => onToggle(habit.id, dateString)}
                                    onDelete={() => onDelete(habit.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* MONTHLY */}
                {groupedHabits.monthly.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Monthly Habits</h3>
                        <div className="flex flex-col gap-1">
                            {groupedHabits.monthly.map(habit => (
                                <HabitCard 
                                    key={habit.id} 
                                    habit={habit} 
                                    logs={todaysLogs.filter(l => l.habit_id === habit.id)}
                                    onToggle={(dateString) => onToggle(habit.id, dateString)}
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
