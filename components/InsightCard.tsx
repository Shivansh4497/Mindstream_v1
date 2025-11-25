import React from 'react';
import type { InsightCard as InsightCardType } from '../types';

interface InsightCardProps {
    insight: InsightCardType;
    onDismiss: (id: string) => void;
}

const iconMap: Record<InsightCardType['type'], string> = {
    correlation: '📊',
    pattern: '🔍',
    milestone: '🎉',
    thematic: '💡'
};

const colorMap: Record<InsightCardType['type'], string> = {
    correlation: 'from-purple-500/20 to-blue-500/20',
    pattern: 'from-teal-500/20 to-green-500/20',
    milestone: 'from-amber-500/20 to-orange-500/20',
    thematic: 'from-rose-500/20 to-pink-500/20'
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onDismiss }) => {
    return (
        <div className={`bg-gradient-to-br ${colorMap[insight.type]} rounded-lg p-5 mb-4 border border-white/10 animate-fade-in-up hover:border-white/20 transition-all duration-300`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{iconMap[insight.type]}</span>
                    <h3 className="text-lg font-bold text-white">{insight.title}</h3>
                </div>
                <button
                    onClick={() => onDismiss(insight.id)}
                    className="text-gray-400 hover:text-white text-sm transition-colors px-2 py-1 rounded hover:bg-white/10"
                >
                    Dismiss
                </button>
            </div>

            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{insight.content}</p>

            {insight.metadata?.tags && insight.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {insight.metadata.tags.map(tag => (
                        <span
                            key={tag}
                            className="text-xs bg-white/10 px-2 py-1 rounded-full text-gray-300 hover:bg-white/20 transition-colors"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            )}

            {insight.metadata?.sentiment_shift !== undefined && (
                <div className="mt-3 text-sm text-gray-400">
                    <span className="font-semibold">Mood shift:</span> {insight.metadata.sentiment_shift > 0 ? '+' : ''}{insight.metadata.sentiment_shift}%
                </div>
            )}
        </div>
    );
};
