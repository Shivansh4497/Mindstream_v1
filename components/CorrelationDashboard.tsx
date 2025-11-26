import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from 'recharts';
import { parseISO, subDays, isSameDay, startOfDay, eachDayOfInterval } from 'date-fns';
import type { Entry, Habit, HabitLog, GranularSentiment } from '../types';
import { InfoTooltip } from './InfoTooltip';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface CorrelationDashboardProps {
    entries: Entry[];
    habits: Habit[];
    habitLogs: HabitLog[];
    days?: number;
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
    days = 14
}) => {
    const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
        habits.length > 0 ? habits[0].id : null
    );

    const impactData = useMemo(() => {
        if (!selectedHabitId) return null;

        const today = startOfDay(new Date());
        const firstDay = subDays(today, days - 1);
        const dateRange = eachDayOfInterval({ start: firstDay, end: today });

        let withHabitTotal = 0;
        let withHabitCount = 0;
        let withoutHabitTotal = 0;
        let withoutHabitCount = 0;

        dateRange.forEach(date => {
            // Get sentiment for this day
            const dayEntries = entries.filter(e =>
                isSameDay(parseISO(e.timestamp), date)
            );

            if (dayEntries.length === 0) return; // Skip days with no mood data

            const avgSentiment = dayEntries.reduce((sum, e) => sum + getSentimentScore(e.primary_sentiment), 0) / dayEntries.length;

            // Check if habit was done
            const habitCompleted = habitLogs.some(log =>
                log.habit_id === selectedHabitId &&
                isSameDay(parseISO(log.completed_at), date)
            );

            if (habitCompleted) {
                withHabitTotal += avgSentiment;
                withHabitCount++;
            } else {
                withoutHabitTotal += avgSentiment;
                withoutHabitCount++;
            }
        });

        const scoreWith = withHabitCount > 0 ? withHabitTotal / withHabitCount : 0;
        const scoreWithout = withoutHabitCount > 0 ? withoutHabitTotal / withoutHabitCount : 0;
        const difference = scoreWith - scoreWithout;
        const percentChange = scoreWithout !== 0 ? ((scoreWith - scoreWithout) / Math.abs(scoreWithout)) * 100 : 0;

        return {
            with: scoreWith,
            without: scoreWithout,
            diff: difference,
            percent: percentChange,
            countWith: withHabitCount,
            countWithout: withoutHabitCount
        };
    }, [entries, habitLogs, selectedHabitId, days]);

    const selectedHabit = habits.find(h => h.id === selectedHabitId);

    if (habits.length === 0) return (
        <div className="h-full flex items-center justify-center text-gray-500 text-sm">
            Create habits to see their impact
        </div>
    );

    if (!impactData || (impactData.countWith === 0 && impactData.countWithout === 0)) return (
        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
            <p>Not enough data yet</p>
            <p className="text-xs opacity-60">Track your mood and habits to see insights</p>
        </div>
    );

    const chartData = [
        { name: 'Without Habit', score: impactData.without, fill: '#4B5563' }, // Gray
        { name: 'With Habit', score: impactData.with, fill: '#2DD4BF' },       // Teal
    ];

    return (
        <div className="h-full flex flex-col p-4">
            {/* Header / Controls */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Impact Score
                    </h3>
                    <InfoTooltip text="See the difference! This compares your average mood on days you did the habit vs. days you didn't." />
                </div>
                <select
                    value={selectedHabitId || ''}
                    onChange={(e) => setSelectedHabitId(e.target.value)}
                    className="text-xs bg-white/5 text-white rounded-lg px-3 py-1.5 border border-white/10 focus:outline-none focus:border-brand-teal"
                >
                    {habits.map(h => (
                        <option key={h.id} value={h.id}>
                            {h.emoji} {h.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Big Impact Number */}
            <div className="flex-1 flex flex-col items-center justify-center mb-4">
                <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-display font-bold ${impactData.diff > 0 ? 'text-brand-teal' : impactData.diff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {impactData.diff > 0 ? '+' : ''}{Math.round(impactData.percent)}%
                    </span>
                    <span className="text-sm text-gray-400 font-medium">Mood Boost</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    {impactData.diff > 0 ? <ArrowUpRight size={16} className="text-brand-teal" /> : impactData.diff < 0 ? <ArrowDownRight size={16} className="text-red-400" /> : <Minus size={16} />}
                    <span>
                        {impactData.diff > 0
                            ? `You feel better when you ${selectedHabit?.name.toLowerCase()}`
                            : `No clear benefit from ${selectedHabit?.name.toLowerCase()} yet`}
                    </span>
                </div>
            </div>

            {/* Simple Bar Chart */}
            <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <XAxis type="number" hide domain={[-1, 1]} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            width={80}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                                dataKey="score"
                                position="right"
                                formatter={(val: number) => val > 0 ? '😊' : val < 0 ? '😔' : '😐'}
                                style={{ fontSize: '14px' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
