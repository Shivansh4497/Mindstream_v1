
import React, { useMemo, useState } from 'react';
import type { Habit, HabitLog } from '../types';
import { HabitCard } from './HabitCard';
import { isSameDay } from '../utils/date';

interface HabitsViewProps {
  habits: Habit[];
  todaysLogs: HabitLog[]; // Contains logs for the last 35 days
  onToggle: (habitId: string, dateString?: string) => void;
  onDelete: (habitId: string) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ 
    habits, 
    todaysLogs, 
    onToggle, 
    onDelete
}) => {
    const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');
    
    const referenceDate = useMemo(() => {
        const d = new Date();
        if (viewMode === 'yesterday') {
            d.setDate(d.getDate() - 1);
        }
        return d;
    }, [viewMode]);

    // Sort habits: Completed at the bottom, Incomplete at the top (for the selected day)
    const sortedHabits = useMemo(() => {
        const sorted = [...habits].sort((a, b) => {
            // Check completion for reference date
            const aDone = todaysLogs.some(l => l.habit_id === a.id && isSameDay(new Date(l.completed_at), referenceDate));
            const bDone = todaysLogs.some(l => l.habit_id === b.id && isSameDay(new Date(l.completed_at), referenceDate));
            
            if (aDone === bDone) return 0;
            return aDone ? 1 : -1; // Push done items to bottom
        });
        return sorted;
    }, [habits, todaysLogs, referenceDate]);

    // Calculate progress for the selected day
    const completedCount = habits.filter(h => 
        todaysLogs.some(l => l.habit_id === h.id && isSameDay(new Date(l.completed_at), referenceDate))
    ).length;
    const progressPercentage = habits.length > 0 ? (completedCount / habits.length) * 100 : 0;

    return (
        <div className="h-full flex flex-col">
            {habits.length > 0 && (
                <header className="flex-shrink-0 p-6 pb-0">
                     <div className="flex justify-between items-center mb-4">
                        <div className="bg-dark-surface p-1 rounded-lg flex gap-1">
                            <button 
                                onClick={() => setViewMode('today')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'today' ? 'bg-brand-teal text-brand-indigo shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Today
                            </button>
                            <button 
                                onClick={() => setViewMode('yesterday')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === 'yesterday' ? 'bg-brand-teal text-brand-indigo shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Yesterday
                            </button>
                        </div>
                        <span className="text-sm text-brand-teal font-semibold">{Math.round(progressPercentage)}% Done</span>
                     </div>
                     <div className="h-2 w-full bg-dark-surface rounded-full overflow-hidden mb-2">
                        <div 
                            className="h-full bg-brand-teal transition-all duration-500 ease-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                     </div>
                </header>
            )}

            <main className="flex-grow overflow-y-auto p-4">
                {habits.length === 0 && (
                     <div className="h-full flex items-center justify-center text-center text-gray-400">
                        <div>
                            <h3 className="text-2xl font-bold font-display text-white mb-2">No Habits Yet</h3>
                            <p>Building a system starts with one small step.<br/>Add your first habit below.</p>
                        </div>
                    </div>
                )}
                
                <div className="flex flex-col gap-1">
                    {sortedHabits.map(habit => {
                        // Get logs specific to this habit
                        const habitLogs = todaysLogs.filter(l => l.habit_id === habit.id);
                        
                        return (
                            <HabitCard 
                                key={habit.id} 
                                habit={habit} 
                                logs={habitLogs}
                                onToggle={(dateString) => onToggle(habit.id, dateString)}
                                onDelete={() => onDelete(habit.id)}
                                referenceDate={referenceDate}
                            />
                        );
                    })}
                </div>
                
            </main>
        </div>
    );
};
