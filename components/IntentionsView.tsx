import React, { useMemo } from 'react';
import type { Intention } from '../types';
import { IntentionCard } from './IntentionCard';
import { EmptyIntentionsState } from './EmptyIntentionsState';
import { getUrgencyCategory, getUrgencyCategoryLabel, type UrgencyCategory } from '../utils/etaCalculator';

interface IntentionsViewProps {
    intentions: Intention[];
    onToggle: (id: string, currentStatus: Intention['status']) => void;
    onDelete: (id: string) => void;
}

const urgencyCategoryOrder: UrgencyCategory[] = ['overdue', 'today', 'this_week', 'this_month', 'later', 'life'];

export const IntentionsView: React.FC<IntentionsViewProps> = ({
    intentions,
    onToggle,
    onDelete
}) => {

    const groupedIntentions = useMemo(() => {
        const groups: Record<UrgencyCategory, { pending: Intention[], completed: Intention[] }> = {
            overdue: { pending: [], completed: [] },
            today: { pending: [], completed: [] },
            this_week: { pending: [], completed: [] },
            this_month: { pending: [], completed: [] },
            later: { pending: [], completed: [] },
            life: { pending: [], completed: [] },
        };

        intentions.forEach(intention => {
            const dueDate = intention.due_date ? new Date(intention.due_date) : null;
            const isLifeGoal = intention.is_life_goal || false;
            const category = getUrgencyCategory(dueDate, isLifeGoal);

            if (intention.status === 'pending') {
                groups[category].pending.push(intention);
            } else {
                groups[category].completed.push(intention);
            }
        });

        // Sort within each category by due date (earliest first)
        Object.keys(groups).forEach(key => {
            const category = key as UrgencyCategory;
            groups[category].pending.sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            });
            groups[category].completed.sort((a, b) => {
                if (!a.completed_at || !b.completed_at) return 0;
                return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
            });
        });

        return groups;
    }, [intentions]);

    const hasAnyIntentions = intentions.length > 0;

    const getCategoryColor = (category: UrgencyCategory): string => {
        switch (category) {
            case 'overdue': return 'text-red-400';
            case 'today': return 'text-brand-teal';
            case 'this_week': return 'text-blue-400';
            case 'this_month': return 'text-purple-400';
            case 'later': return 'text-gray-400';
            case 'life': return 'text-amber-400';
        }
    };

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            <header className="flex-shrink-0 p-4 border-b border-white/10">
                <h1 className="text-2xl font-bold text-white font-display">Intentions</h1>
                <p className="text-sm text-gray-400 mt-1">What you want to achieve, organized by timeline</p>
            </header>

            <main className="flex-grow overflow-y-auto p-4">
                {!hasAnyIntentions && (
                    <EmptyIntentionsState />
                )}

                {urgencyCategoryOrder.map(category => {
                    const group = groupedIntentions[category];
                    const totalCount = group.pending.length + group.completed.length;

                    if (totalCount === 0) return null;

                    return (
                        <div key={category} className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className={`text-xl font-bold font-display ${getCategoryColor(category)}`}>
                                    {getUrgencyCategoryLabel(category)}
                                </h2>
                                <span className="text-sm text-gray-500">
                                    {group.pending.length} pending
                                </span>
                            </div>

                            {/* Pending Intentions */}
                            {group.pending.map(intention => (
                                <IntentionCard
                                    key={intention.id}
                                    intention={intention}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                />
                            ))}

                            {/* Completed Intentions */}
                            {group.completed.length > 0 && (
                                <div className="mt-4">
                                    {group.pending.length > 0 && (
                                        <div className="flex items-center gap-2 my-3">
                                            <div className="flex-1 border-b border-white/10"></div>
                                            <span className="text-xs text-gray-500 px-2">Completed</span>
                                            <div className="flex-1 border-b border-white/10"></div>
                                        </div>
                                    )}
                                    {group.completed.map(intention => (
                                        <IntentionCard
                                            key={intention.id}
                                            intention={intention}
                                            onToggle={onToggle}
                                            onDelete={onDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </main>
        </div>
    );
};
