import React, { useMemo } from 'react';
import { format, parseISO, subDays, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import type { Habit, HabitLog } from '../types';

interface HabitHeatmapProps {
    habit: Habit;
    logs: HabitLog[];
    days?: number;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habit, logs, days = 30 }) => {
    const heatmapData = useMemo(() => {
        const today = startOfDay(new Date());
        const firstDay = subDays(today, days - 1);
        const dateRange = eachDayOfInterval({ start: firstDay, end: today });

        return dateRange.map(date => {
            const hasLog = logs.some(log =>
                isSameDay(parseISO(log.completed_at), date)
            );
            return {
                date: format(date, 'yyyy-MM-dd'),
                display: format(date, 'MMM d'),
                completed: hasLog
            };
        });
    }, [logs, days]);

    const completionRate = useMemo(() => {
        const completed = heatmapData.filter(d => d.completed).length;
        return Math.round((completed / heatmapData.length) * 100);
    }, [heatmapData]);

    return (
        <div className="p-4 bg-dark-surface rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {habit.emoji} {habit.name}
                </h3>
                <div className="text-xs text-gray-500">
                    {completionRate}% complete
                </div>
            </div>

            <div className="flex flex-wrap gap-1">
                {heatmapData.map((day, idx) => (
                    <div
                        key={idx}
                        className={`w-3 h-3 rounded-sm transition-all ${day.completed
                                ? 'bg-brand-teal hover:bg-brand-teal/80'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                        title={`${day.display}: ${day.completed ? 'Completed' : 'Skipped'}`}
                    />
                ))}
            </div>

            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{format(subDays(new Date(), days - 1), 'MMM d')}</span>
                <span>Today</span>
            </div>
        </div>
    );
};
