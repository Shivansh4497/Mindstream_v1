import React, { useState } from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { OnboardingSuggestion } from '../services/onboardingSuggestions';

interface OnboardingSuggestionCardProps {
    suggestion: OnboardingSuggestion;
    onAccept: (suggestion: OnboardingSuggestion) => void;
    onReject: () => void;
}

export const OnboardingSuggestionCard: React.FC<OnboardingSuggestionCardProps> = ({
    suggestion,
    onAccept,
    onReject
}) => {
    const [isAccepted, setIsAccepted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(suggestion.name);

    const handleAccept = () => {
        setIsAccepted(true);
        onAccept({ ...suggestion, name: editedName });
    };

    const handleEdit = () => {
        setIsEditing(!isEditing);
    };

    return (
        <div
            className={`relative p-4 rounded-xl border transition-all duration-300 ${isAccepted
                ? 'bg-brand-teal/10 border-brand-teal'
                : 'bg-dark-surface border-white/10 hover:border-white/20'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className="text-3xl">{suggestion.emoji}</div>

                <div className="flex-grow">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-teal"
                            autoFocus
                        />
                    ) : (
                        <h3 className="text-white font-medium text-sm mb-1">
                            {editedName}
                        </h3>
                    )}

                    <div className="flex items-center gap-2 text-xs mt-2">
                        {suggestion.type === 'habit' && suggestion.category && (
                            <span className="px-2 py-1 rounded-full bg-white/5 text-gray-400">
                                {suggestion.category}
                            </span>
                        )}
                        {suggestion.frequency && (
                            <span className="px-2 py-1 rounded-full bg-white/5 text-gray-400 capitalize">
                                {suggestion.frequency}
                            </span>
                        )}
                        {suggestion.timeframe && (
                            <span className="px-2 py-1 rounded-full bg-white/5 text-gray-400 capitalize">
                                {suggestion.timeframe}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isAccepted && (
                        <>
                            <button
                                onClick={handleEdit}
                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleAccept}
                                className="p-2 rounded-lg bg-brand-teal/20 text-brand-teal hover:bg-brand-teal hover:text-white transition-colors"
                                title="Accept"
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={onReject}
                                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                title="Reject"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {isAccepted && (
                        <div className="p-2 rounded-lg bg-brand-teal/20 text-brand-teal">
                            <Check className="w-4 h-4" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
