
import React, { useMemo } from 'react';
import type { Habit, HabitLog } from '../types';
import { HabitCard } from './HabitCard';
import { isSameDay, isDateInCurrentWeek, isDateInCurrentMonth } from '../utils/date';

interface HabitsViewProps {
  habits: Habit[];
  todaysLogs: HabitLog[]; // Note: This now contains logs from the start of the month
  onToggle: (habitId: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ 
    habits, 
    todaysLogs, 
    onToggle, 
    onDelete
}) => {
    
    // Helper to check completion based on frequency
    const isHabitCompleted = (habit: Habit) => {
        const now = new Date();
        return todaysLogs.some(log => {
            if (log.habit_id !== habit.id) return false;
            const logDate = new Date(log.completed_at);
            
            if (habit.frequency === 'daily') return isSameDay(logDate, now);
            if (habit.frequency === 'weekly') return isDateInCurrentWeek(logDate);
            if (habit.frequency === 'monthly') return isDateInCurrentMonth(logDate);
            return false;
        });
    };

    const { daily, weekly, monthly } = useMemo(() => {
        const daily: Habit[] = [];
        const weekly: Habit[] = [];
        const monthly: Habit[] = [];
        
        habits.forEach(h => {
            if (h.frequency === 'daily') daily.push(h);
            else if (h.frequency === 'weekly') weekly.push(h);
            else if (h.frequency === 'monthly') monthly.push(h);
            else daily.push(h); // Default fallback
        });
        
        return { daily, weekly, monthly };
    }, [habits]);

    // Calculate progress
    const totalHabits = habits.length;
    const completedCount = habits.filter(h => isHabitCompleted(h)).length;
    const progressPercentage = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

    const renderSection = (title: string, habitsList: Habit[]) => {
        if (habitsList.length === 0) return null;
        return (
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 pl-1">{title}</h3>
                <div className="flex flex-col gap-2">
                    {habitsList.map(habit => (
                        <HabitCard 
                            key={habit.id} 
                            habit={habit} 
                            isCompleted={isHabitCompleted(habit)}
                            onToggle={() => onToggle(habit.id)}
                            onDelete={() => onDelete(habit.id)}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {totalHabits > 0 && (
                <header className="flex-shrink-0 p-6 pb-0">
                     <div className="flex justify-between items-end mb-2">
                        <h2 className="text-xl font-bold font-display text-white">Your Rituals</h2>
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
                
                {renderSection("Daily Rituals", daily)}
                {renderSection("Weekly Targets", weekly)}
                {renderSection("Monthly Goals", monthly)}
                
            </main>
        </div>
    );
};
