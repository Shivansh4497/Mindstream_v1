import React, { useMemo } from 'react';
import { format, parseISO, subDays, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import type { Habit, HabitLog } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface HabitHeatmapProps {
    habit: Habit;
    logs: HabitLog[];
    days?: number;
    insight?: string | null;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habit, logs, days = 30, insight = null }) => {
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
            <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider truncate">
                        {habit.emoji} {habit.name}
                    </h3>
                    <InfoTooltip text="GitHub-style contribution graph showing daily habit completion. Each cell represents one day. Use this to identify streaks, spot gaps, and understand your consistency patterns." />
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                    {completionRate}% complete
                </div>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-brand-teal" />
                    <span>Completed</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-white/5" />
                    <span>Skipped</span>
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

            {insight && (
                <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-xs text-purple-300 leading-relaxed">
                        <strong>💡 AI Insight:</strong> {insight}
                    </p>
                </div>
            )}
        </div>
    );
};
