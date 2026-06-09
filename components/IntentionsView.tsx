import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Intention } from '../types';
import { IntentionCard } from './IntentionCard';
import { EmptyIntentionsState } from './EmptyIntentionsState';

interface IntentionsViewProps {
    intentions: Intention[];
    onToggleIntention: (id: string, currentStatus: Intention['status']) => void;
    onDeleteIntention: (id: string) => void;
    onEditIntention?: (intention: Intention) => void;
    onStarToggleIntention?: (id: string, isStarred: boolean) => void;
    onAddIntention?: (text: string) => void;
    isLoading?: boolean;
}

const LIFE_AREA_ORDER = ['Health', 'Career', 'Growth', 'Finance', 'Connection', 'System', 'Other'];

const LIFE_AREA_EMOJIS: Record<string, string> = {
    Health: '❤️',
    Career: '💼',
    Growth: '🌱',
    Finance: '💰',
    Connection: '🤝',
    System: '⚙️',
    Other: '📌'
};

export const IntentionsView: React.FC<IntentionsViewProps> = ({
    intentions,
    onToggleIntention,
    onDeleteIntention,
    onStarToggleIntention,
    onEditIntention,
    onAddIntention,
    isLoading
}) => {
    const [showCompleted, setShowCompleted] = useState(false);

    const { pendingByCategory, allCompleted } = useMemo(() => {
        const pendingGroups: Record<string, Intention[]> = {
            Health: [],
            Career: [],
            Growth: [],
            Finance: [],
            Connection: [],
            System: [],
            Other: [],
        };
        const completedIntentions: Intention[] = [];

        intentions.forEach(intention => {
            if (intention.status === 'completed') {
                completedIntentions.push(intention);
            } else {
                const category = intention.category && LIFE_AREA_ORDER.includes(intention.category) 
                  ? intention.category 
                  : 'Other';
                pendingGroups[category].push(intention);
            }
        });

        // Sort pending by Starred -> Due Date -> Created At
        Object.keys(pendingGroups).forEach(category => {
            pendingGroups[category].sort((a, b) => {
                // 1. Starred First
                if (a.is_starred && !b.is_starred) return -1;
                if (!a.is_starred && b.is_starred) return 1;

                // 2. Due Date (Ascending)
                if (a.due_date && b.due_date) {
                    const timeDiff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    if (timeDiff !== 0) return timeDiff;
                } else if (a.due_date && !b.due_date) {
                    return 1; // No due date goes to bottom
                } else if (!a.due_date && b.due_date) {
                    return -1;
                }

                // 3. Created At (Descending - Newest First)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        });

        // Sort completed by completion date (most recent first)
        completedIntentions.sort((a, b) => {
            if (!a.completed_at || !b.completed_at) return 0;
            return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        });

        return { pendingByCategory: pendingGroups, allCompleted: completedIntentions };
    }, [intentions]);

    const hasAnyIntentions = intentions.length > 0;

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            <header className="flex-shrink-0 p-4 border-b border-white/10">
                <h1 className="text-2xl font-bold text-white font-display">Intentions</h1>
                <p className="text-sm text-gray-400 mt-1">What you want to achieve, organized by timeline</p>
            </header>

            <main className="flex-grow overflow-y-auto p-4">
                {!hasAnyIntentions && (
                    <EmptyIntentionsState onCreateIntention={onAddIntention} />
                )}

                {/* Pending Intentions by Life Area */}
                {LIFE_AREA_ORDER.map(category => {
                    const pendingList = pendingByCategory[category];
                    if (pendingList.length === 0) return null;
                    
                    return (
                        <div key={category} className="mb-6">
                            <div className="w-full flex items-center justify-between p-3 bg-dark-surface-light rounded-lg hover:bg-white/5 transition-colors group mb-3">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold font-display text-white">
                                        <span className="mr-2">{LIFE_AREA_EMOJIS[category]}</span>
                                        {category}
                                    </h2>
                                </div>
                                <span className="text-sm font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                                    {pendingList.length}
                                </span>
                            </div>

                            <div className="pl-2 border-l-2 border-white/5 ml-4 animate-fade-in-down">
                                {pendingList.map(intention => (
                                    <IntentionCard
                                        key={intention.id}
                                        intention={intention}
                                        onToggle={onToggleIntention}
                                        onDelete={onDeleteIntention}
                                        onStarToggle={onStarToggleIntention}
                                        onEdit={onEditIntention}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Completed Intentions (Collapsible) */}
                {allCompleted.length > 0 && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            className="w-full flex items-center justify-between p-3 bg-dark-surface-light rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {showCompleted ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                                <span className="text-lg font-medium text-gray-200">
                                    Completed
                                </span>
                            </div>
                            <span className="text-sm text-gray-300">
                                {allCompleted.length}
                            </span>
                        </button>

                        {showCompleted && (
                            <div className="mt-4 space-y-2">
                                {allCompleted.map(intention => (
                                    <IntentionCard
                                        key={intention.id}
                                        intention={intention}
                                        onToggle={onToggleIntention}
                                        onDelete={onDeleteIntention}
                                        onEdit={onEditIntention}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};
