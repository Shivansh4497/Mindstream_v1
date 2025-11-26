import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { format, parseISO, subDays, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import type { Entry, Habit, HabitLog, GranularSentiment } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface CorrelationDashboardProps {
    entries: Entry[];
    habits: Habit[];
    habitLogs: HabitLog[];
    days?: number;
    insight?: string | null;
}

const SENTIMENT_SCORES: Record<GranularSentiment, number> = {
    'Joyful': 1, 'Grateful': 1, 'Proud': 1, 'Hopeful': 1, 'Content': 0.8,
    'Reflective': 0.2, 'Inquisitive': 0.1, 'Observational': 0,
    'Confused': -0.2, 'Overwhelmed': -0.6, 'Sad': -0.8, 'Frustrated': -0.8, 'Anxious': -0.9
};

const getSentimentScore = (s?: GranularSentiment | null): number => {
    if (!s) return 0;
    return SENTIMENT_SCORES[s] || 0;
};

export const CorrelationDashboard: React.FC<CorrelationDashboardProps> = ({
    entries,
    habits,
    habitLogs,
    days = 14,
    insight = null
}) => {
    const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
        habits.length > 0 ? habits[0].id : null
    );

    const data = useMemo(() => {
        const today = startOfDay(new Date());
        const firstDay = subDays(today, days - 1);
        const dateRange = eachDayOfInterval({ start: firstDay, end: today });

        return dateRange.map(date => {
            const dateStr = format(date, 'MMM d');

            // Get sentiment for this day
            const dayEntries = entries.filter(e =>
                isSameDay(parseISO(e.timestamp), date)
            );
            const avgSentiment = dayEntries.length > 0
                ? dayEntries.reduce((sum, e) => sum + getSentimentScore(e.primary_sentiment), 0) / dayEntries.length
                : 0;

            // Get habit completion for selected habit
            const habitCompleted = selectedHabitId
                ? habitLogs.some(log =>
                    log.habit_id === selectedHabitId &&
                    isSameDay(parseISO(log.completed_at), date)
                )
                : false;

            return {
                date: dateStr,
                sentiment: Number(avgSentiment.toFixed(2)),
                habitDone: habitCompleted ? 1 : 0
            };
        });
    }, [entries, habitLogs, selectedHabitId, days]);

    const selectedHabit = habits.find(h => h.id === selectedHabitId);

    if (habits.length === 0) return (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm bg-white/5 rounded-lg border border-white/10">
            Create some habits to see correlations
        </div>
    );

    return (
        <div className="p-4 bg-dark-surface rounded-xl border border-white/5">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="flex items-center min-w-0">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        The Moat: Habit ↔ Mood Correlation
                    </h3>
                    <InfoTooltip text="Composite chart overlaying habit completion (bars) with mood score (line). Use the dropdown to compare different habits. This visualization reveals which behaviors correlate with positive emotions." />
                </div>
                <select
                    value={selectedHabitId || ''}
                    onChange={(e) => setSelectedHabitId(e.target.value)}
                    className="text-xs bg-white/5 text-white rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-brand-teal flex-shrink-0"
                >
                    {habits.map(h => (
                        <option key={h.id} value={h.id}>
                            {h.emoji} {h.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#2DD4BF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={[-1, 1]}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#A78BFA"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 1]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1F2937',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#F3F4F6',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: '#2DD4BF' }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '12px' }}
                            iconType="circle"
                        />
                        <Bar
                            yAxisId="right"
                            dataKey="habitDone"
                            fill="#A78BFA"
                            opacity={0.6}
                            name={selectedHabit ? `${selectedHabit.emoji} ${selectedHabit.name}` : 'Habit'}
                        />
                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="sentiment"
                            stroke="#2DD4BF"
                            strokeWidth={2}
                            dot={{ fill: '#2DD4BF', r: 3 }}
                            name="Mood Score"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {insight && (
                <div className="mt-3 p-3 bg-brand-teal/10 border border-brand-teal/20 rounded-lg">
                    <p className="text-xs text-brand-teal leading-relaxed">
                        <strong>💡 AI Insight:</strong> {insight}
                    </p>
                </div>
            )}
        </div>
    );
};
