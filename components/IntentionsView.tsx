import React, { useMemo } from 'react';
import type { Intention, IntentionTimeframe } from '../types';
import { IntentionCard } from './IntentionCard';
import { isSameDay, isDateInCurrentWeek, isDateInCurrentMonth, isDateInCurrentYear } from '../utils/date';


interface IntentionsViewProps {
  intentions: Intention[];
  onToggle: (id: string, currentStatus: Intention['status']) => void;
  onDelete: (id: string) => void;
  activeTimeframe: IntentionTimeframe;
  onTimeframeChange: (timeframe: IntentionTimeframe) => void;
}

const timeframes: { id: IntentionTimeframe; label: string }[] = [
    { id: 'daily', label: 'Daily To-dos' },
    { id: 'weekly', label: 'Weekly To-dos' },
    { id: 'monthly', label: 'Monthly To-dos' },
    { id: 'yearly', label: 'Year Goals' },
    { id: 'life', label: 'Life Goals' },
];

export const IntentionsView: React.FC<IntentionsViewProps> = ({ 
    intentions, 
    onToggle, 
    onDelete,
    activeTimeframe,
    onTimeframeChange
}) => {
    
    const filteredIntentions = useMemo(() => {
        const now = new Date();
        let filtered = intentions.filter(i => i.timeframe === activeTimeframe);

        if (activeTimeframe === 'daily') {
            filtered = filtered.filter(i => isSameDay(new Date(i.created_at), now));
        } else if (activeTimeframe === 'weekly') {
            filtered = filtered.filter(i => isDateInCurrentWeek(new Date(i.created_at)));
        } else if (activeTimeframe === 'monthly') {
            filtered = filtered.filter(i => isDateInCurrentMonth(new Date(i.created_at)));
        } else if (activeTimeframe === 'yearly') {
            filtered = filtered.filter(i => isDateInCurrentYear(new Date(i.created_at)));
        }
        // 'life' goals are not filtered by date

        const pending = filtered.filter(i => i.status === 'pending');
        const completed = filtered.filter(i => i.status === 'completed');
        return { pending, completed };
    }, [intentions, activeTimeframe]);


    return (
        <div className="h-full flex flex-col">
            <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center overflow-x-auto">
                <div className="flex items-center gap-2">
                    {timeframes.map(tf => (
                        <button
                            key={tf.id}
                            onClick={() => onTimeframeChange(tf.id)}
                            className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                                activeTimeframe === tf.id
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
                {filteredIntentions.pending.length === 0 && filteredIntentions.completed.length === 0 && (
                     <div className="h-full flex items-center justify-center text-center text-gray-400">
                        <div>
                            <h3 className="text-2xl font-bold font-display text-white mb-2">Your Intentions</h3>
                            <p>Set daily or weekly intentions to focus your mind.<br/>What do you want to accomplish?</p>
                        </div>
                    </div>
                )}
                
                {filteredIntentions.pending.map(intention => (
                    <IntentionCard key={intention.id} intention={intention} onToggle={onToggle} onDelete={onDelete} />
                ))}

                {filteredIntentions.completed.length > 0 && (
                    <div className="mt-8">
                        <div className="border-b border-white/10 mb-3">
                            <h3 className="text-lg font-bold text-gray-400 font-display mb-1">Completed</h3>
                        </div>
                        {filteredIntentions.completed.map(intention => (
                             <IntentionCard key={intention.id} intention={intention} onToggle={onToggle} onDelete={onDelete} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};