import React from 'react';
import type { Reflection } from '../types';

interface AutoReflectionCardProps {
    reflection: Reflection;
}

export const AutoReflectionCard: React.FC<AutoReflectionCardProps> = ({ reflection }) => {
    const displayDate = new Date(reflection.timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="bg-dark-surface rounded-lg p-5 mb-4 border-l-4 border-brand-teal shadow-lg animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌙</span>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                        {reflection.type === 'daily' ? 'Daily' : reflection.type === 'weekly' ? 'Weekly' : 'Monthly'} Reflection
                    </h3>
                    <p className="text-xs text-gray-500">{displayDate}</p>
                </div>
                {reflection.auto_generated && (
                    <span className="text-xs bg-brand-teal/20 text-brand-teal px-2 py-1 rounded-full font-medium">
                        Auto-generated
                    </span>
                )}
            </div>

            <p className="text-gray-200 leading-relaxed mb-4 whitespace-pre-wrap">{reflection.summary}</p>

            {reflection.suggestions && reflection.suggestions.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">AI Suggestions</p>
                    {reflection.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 py-2 px-3 bg-white/5 rounded hover:bg-white/10 transition-colors">
                            <span className="text-brand-teal mt-0.5">→</span>
                            <div className="flex-1">
                                <p className="text-sm text-gray-300">{suggestion.text}</p>
                                <span className="text-xs text-gray-500 capitalize">{suggestion.timeframe}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
