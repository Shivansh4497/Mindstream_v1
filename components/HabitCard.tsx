
import React, { useState, useMemo } from 'react';
import type { Habit, HabitCategory, HabitLog } from '../types';
import { FlameIcon } from './icons/FlameIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { calculateStreak } from '../utils/streak';
import { HabitLogButton } from './HabitLogButton';

interface HabitCardProps {
    habit: Habit;
    logs: HabitLog[];
    onToggle: (dateString: string) => void;
    onEdit: () => void;
    onDelete: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    Health: 'border-emerald-400',
    Growth: 'border-blue-400',
    Career: 'border-purple-400',
    Finance: 'border-yellow-400',
    Connection: 'border-pink-400',
    System: 'border-gray-400',
};

export const HabitCard: React.FC<HabitCardProps> = ({ habit, logs, onToggle, onEdit, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Helper to check if a specific date/period is logged
    const isLogged = (date: Date) => {
        if (habit.frequency === 'daily') {
            return logs.some(l => isSameDay(new Date(l.completed_at), date));
        } else if (habit.frequency === 'weekly') {
            const wId = getWeekId(date);
            return logs.some(l => getWeekId(new Date(l.completed_at)) === wId);
        } else {
            const mId = getMonthId(date);
            return logs.some(l => getMonthId(new Date(l.completed_at)) === mId);
        }
    };

    // Derived State: Calculate streak on the fly from the logs props.
    // This ensures that as soon as 'logs' updates (optimistically in parent), the streak flips instantly.
    const currentStreak = useMemo(() => {
        const logDates = logs.map(l => new Date(l.completed_at));
        return calculateStreak(logDates, habit.frequency);
    }, [logs, habit.frequency]);

    // Generate visualization items based on frequency
    // Only show dates from when the habit was created (Option A: fewer dots)
    const getHistoryItems = () => {
        const now = new Date();
        const createdAt = new Date(habit.created_at);
        const items: Date[] = [];

        if (habit.frequency === 'daily') {
            // Last 7 days, but only from creation date
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                // Only include if date is >= creation date (comparing just dates, not times)
                if (d.setHours(0, 0, 0, 0) >= createdAt.setHours(0, 0, 0, 0)) {
                    items.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
                }
            }
        } else if (habit.frequency === 'weekly') {
            // Last 4 weeks, but only from creation week
            const createdWeekStart = new Date(createdAt);
            createdWeekStart.setDate(createdAt.getDate() - createdAt.getDay()); // Start of creation week
            createdWeekStart.setHours(0, 0, 0, 0);

            for (let i = 3; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - (i * 7));
                const weekStart = new Date(d);
                weekStart.setDate(d.getDate() - d.getDay());
                weekStart.setHours(0, 0, 0, 0);

                if (weekStart >= createdWeekStart) {
                    items.push(d);
                }
            }
        } else {
            // Last 6 months, but only from creation month
            const createdMonthStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);

            for (let i = 5; i >= 0; i--) {
                const d = new Date(now);
                d.setMonth(d.getMonth() - i);
                const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);

                if (monthStart >= createdMonthStart) {
                    items.push(d);
                }
            }
        }
        return items;
    };

    const historyDates = getHistoryItems();

    return (
        <div className={`bg-dark-surface rounded-lg mb-3 shadow-lg transition-all duration-300 animate-fade-in-up overflow-hidden border-l-4 ${CATEGORY_COLORS[habit.category || 'System']}`}>

            {/* MAIN ROW */}
            <div className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>

                {/* LEFT: Info */}
                <div className="flex items-center gap-3 overflow-hidden flex-grow min-w-0 mr-4">
                    <span className="text-2xl flex-shrink-0">{habit.emoji}</span>
                    <h3 className="text-lg font-medium text-white truncate">{habit.name}</h3>
                </div>

                {/* RIGHT: Streak, Checkbox, Chevron */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    {currentStreak > 0 && (
                        <div className="flex items-center gap-1 text-orange-400 text-sm font-bold">
                            <FlameIcon className="w-4 h-4" />
                            {currentStreak}
                        </div>
                    )}
                    <input
                        type="checkbox"
                        checked={isLogged(new Date())}
                        onChange={(e) => { e.stopPropagation(); onToggle(new Date().toISOString()); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 text-brand-teal bg-gray-700 border-gray-600 rounded focus:ring-brand-teal focus:ring-2 cursor-pointer transition-transform hover:scale-110 flex-shrink-0"
                    />
                    <div className="pl-2 border-l border-white/10">
                        <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>
            </div>

            {/* EXPANDED DRAWER: History & Edit / Delete Options */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-white/5">
                    <div className="flex gap-1.5 items-center mt-4 overflow-x-auto pb-2">
                        {historyDates.map((date, i) => (
                            <HabitLogButton
                                key={i}
                                date={date}
                                isLogged={isLogged(date)}
                                isToday={isSameDay(date, new Date())}
                                frequency={habit.frequency}
                                onToggle={() => onToggle(date.toISOString())}
                            />
                        ))}
                    </div>
                    <div className="flex justify-end items-center my-2 pt-2 gap-3 border-t border-white/5 mt-2">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-brand-teal hover:text-teal-200 flex items-center gap-1 py-2 px-3 rounded hover:bg-brand-teal/10 transition-colors">
                            <PencilIcon className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 py-2 px-3 rounded hover:bg-red-900/20 transition-colors">
                            <TrashIcon className="w-3 h-3" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
