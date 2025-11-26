import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import type { Entry, GranularSentiment } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface SentimentTimelineProps {
    entries: Entry[];
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

export const SentimentTimeline: React.FC<SentimentTimelineProps> = ({ entries, days = 14, insight = null }) => {
    const data = useMemo(() => {
        const cutoff = subDays(new Date(), days);
        const relevantEntries = entries
            .filter(e => isAfter(parseISO(e.timestamp), cutoff))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Group by day and average sentiment
        const grouped: Record<string, { total: number; count: number; texts: string[] }> = {};

        relevantEntries.forEach(e => {
            const dateStr = format(parseISO(e.timestamp), 'MMM d');
            if (!grouped[dateStr]) grouped[dateStr] = { total: 0, count: 0, texts: [] };

            grouped[dateStr].total += getSentimentScore(e.primary_sentiment);
            grouped[dateStr].count += 1;
            if (e.title) grouped[dateStr].texts.push(e.title);
        });

        return Object.keys(grouped).map(date => ({
            date,
            score: grouped[date].total / grouped[date].count,
            details: grouped[date].texts.slice(0, 3).join(', ')
        }));
    }, [entries, days]);

    if (data.length < 2) return (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm bg-white/5 rounded-lg border border-white/10">
            Not enough data for timeline
        </div>
    );

    return (
        <div className="h-full w-full p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mood Flow</h3>
                    <InfoTooltip text="A gentle wave showing your emotional journey. Peaks are high energy/positive, valleys are low energy/challenging." />
                </div>
                <span className="text-xs text-brand-teal font-medium">Last {days} Days</span>
            </div>

            <div className="flex-1 relative">
                {/* Custom Labels */}
                <div className="absolute top-0 right-0 text-xs text-gray-500">Good Days</div>
                <div className="absolute bottom-0 right-0 text-xs text-gray-500">Hard Days</div>

                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6', fontSize: '12px' }}
                            itemStyle={{ color: '#2DD4BF' }}
                            formatter={(value: number) => [value.toFixed(1), 'Mood']}
                            labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#2DD4BF"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
