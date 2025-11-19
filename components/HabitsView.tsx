
import React from 'react';
import type { Habit, HabitLog } from '../types';
import { HabitCard } from './HabitCard';
import { getDisplayDate, getFormattedDate } from '../utils/date';

interface HabitsViewProps {
  habits: Habit[];
  todaysLogs: HabitLog[];
  onToggle: (habitId: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ 
    habits, 
    todaysLogs, 
    onToggle, 
    onDelete
}) => {
    
    // Calculate completion for progress bar
    const totalHabits = habits.length;
    const completedCount = habits.filter(h => todaysLogs.some(l => l.habit_id === h.id)).length;
    const progressPercentage = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

    return (
        <div className="h-full flex flex-col">
            {totalHabits > 0 && (
                <header className="flex-shrink-0 p-6 pb-0">
                     <div className="flex justify-between items-end mb-2">
                        <h2 className="text-xl font-bold font-display text-white">Your Daily Rituals</h2>
                        <span className="text-sm text-brand-teal font-semibold">{Math.round(progressPercentage)}% Done</span>
                     </div>
                     <div className="h-2 w-full bg-dark-surface rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-brand-teal transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                     </div>
                </header>
            )}

            <main className="flex-grow overflow-y-auto p-4">
                {totalHabits === 0 && (
                     <div className="h-full flex items-center justify-center text-center text-gray-400">
                        <div>
                            <h3 className="text-2xl font-bold font-display text-white mb-2">No Habits Yet</h3>
                            <p>Building a system starts with one small step.<br/>Add your first habit below.</p>
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col gap-2">
                    {habits.map(habit => {
                        const isCompletedToday = todaysLogs.some(l => l.habit_id === habit.id);
                        return (
                            <HabitCard 
                                key={habit.id} 
                                habit={habit} 
                                isCompletedToday={isCompletedToday}
                                onToggle={() => onToggle(habit.id)}
                                onDelete={() => onDelete(habit.id)}
                            />
                        );
                    })}
                </div>
            </main>
        </div>
    );
};
