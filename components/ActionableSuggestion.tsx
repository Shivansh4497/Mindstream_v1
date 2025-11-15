import React from 'react';
import type { AISuggestion } from '../types';
import { PlusCircleIcon } from './icons/PlusCircleIcon';

interface ActionableSuggestionProps {
  suggestion: AISuggestion;
  onAdd: () => void;
}

export const ActionableSuggestion: React.FC<ActionableSuggestionProps> = ({ suggestion, onAdd }) => {
  return (
    <div className="flex items-center justify-between gap-2 bg-dark-surface/50 p-2 rounded-lg">
      <div className="flex-grow text-sm text-gray-200">
        <span className="font-semibold text-brand-teal/80 mr-1.5">{suggestion.timeframe === 'daily' ? 'Daily:' : 'Weekly:'}</span>
        <span>{suggestion.text}</span>
      </div>
      <button
        onClick={onAdd}
        className="flex-shrink-0 p-1 rounded-full text-brand-teal hover:bg-brand-teal/20 transition-colors"
        aria-label={`Add suggestion as ${suggestion.timeframe} intention`}
      >
        <PlusCircleIcon className="w-6 h-6" />
      </button>
    </div>
  );
};
