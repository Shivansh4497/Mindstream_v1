import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import type { Entry, GranularSentiment } from '../types';
import { InfoTooltip } from './InfoTooltip';

interface SentimentTimelineProps {
    entries: Entry[];
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

export const SentimentTimeline: React.FC<SentimentTimelineProps> = ({ entries, days = 14 }) => {
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
        <div className="h-64 w-full p-4 bg-dark-surface rounded-xl border border-white/5">
            <div className="flex items-center mb-2">
                <div className="flex items-center min-w-0">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Mood Flow ({days} Days)</h3>
                    <InfoTooltip text="This chart shows your average emotional state each day. Higher values mean more positive moods, lower values mean more negative moods. The line trends help you spot patterns over time." />
                </div>
            </div>

            {/* Sentiment Scale Legend */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3 px-2">
                <span>😢 More Negative</span>
                <span className="text-gray-400">Neutral</span>
                <span>More Positive 😊</span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        hide
                        domain={[-1, 1]}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                        itemStyle={{ color: '#2DD4BF' }}
                        formatter={(value: number) => [value.toFixed(1), 'Mood Score']}
                        labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#2DD4BF"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                    />
                </AreaChart>
            </ResponsiveContainer>

            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
                💡 <strong>How to read:</strong> Watch for peaks and valleys. If you see a dip, check your journal entries from those days to understand what was happening.
            </p>
        </div>
    );
};
