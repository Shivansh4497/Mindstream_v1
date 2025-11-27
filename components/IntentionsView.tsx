
import React, { useMemo } from 'react';
import type { Intention, IntentionTimeframe } from '../types';
import { IntentionCard } from './IntentionCard';
import { getDisplayDate, getFormattedDate } from '../utils/date';
import { EmptyIntentionsState } from './EmptyIntentionsState';

interface IntentionsViewProps {
    intentions: Intention[];
    onToggle: (id: string, currentStatus: Intention['status']) => void;
    onDelete: (id: string) => void;
    activeTimeframe: IntentionTimeframe;
    onTimeframeChange: (timeframe: IntentionTimeframe) => void;
}

const timeframes: { id: IntentionTimeframe; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
    { id: 'life', label: 'Life' },
];

export const IntentionsView: React.FC<IntentionsViewProps> = ({
    intentions,
    onToggle,
    onDelete,
    activeTimeframe,
    onTimeframeChange
}) => {

    const groupedIntentions = useMemo(() => {
        const filtered = intentions.filter(i => i.timeframe === activeTimeframe);

        const groups: Record<string, { pending: Intention[], completed: Intention[] }> = {};

        filtered.forEach(intention => {
            const date = getFormattedDate(new Date(intention.created_at));
            if (!groups[date]) {
                groups[date] = { pending: [], completed: [] };
            }
            if (intention.status === 'pending') {
                groups[date].pending.push(intention);
            } else {
                groups[date].completed.push(intention);
            }
        });

        return groups;
    }, [intentions, activeTimeframe]);

    const sortedDates = useMemo(() => {
        return Object.keys(groupedIntentions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [groupedIntentions]);

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center overflow-x-auto">
                <div className="flex items-center gap-2">
                    {timeframes.map(tf => (
                        <button
                            key={tf.id}
                            onClick={() => onTimeframeChange(tf.id)}
                            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTimeframe === tf.id
                                ? 'bg-brand-teal text-brand-indigo'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-grow overflow-y-auto p-4">
                {sortedDates.length === 0 && (
                    <EmptyIntentionsState />
                )}

                {sortedDates.map(date => (
                    <div key={date} className="mb-8">
                        <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>

                        {groupedIntentions[date].pending.length > 0 && (
                            groupedIntentions[date].pending.map(intention => (
                                <IntentionCard key={intention.id} intention={intention} onToggle={onToggle} onDelete={onDelete} />
                            ))
                        )}

                        {groupedIntentions[date].completed.length > 0 && (
                            <div className="mt-4">
                                {groupedIntentions[date].pending.length > 0 && (
                                    <div className="border-b border-white/10 my-3"></div>
                                )}
                                {groupedIntentions[date].completed.map(intention => (
                                    <IntentionCard key={intention.id} intention={intention} onToggle={onToggle} onDelete={onDelete} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </main>
        </div>
    );
};
