import React from 'react';

interface SuggestionChipsProps {
  starters: string[];
  onStarterClick: (text: string) => void;
  isLoading: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ starters, onStarterClick, isLoading }) => {
  return (
    <div className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-10 animate-fade-in-up">
      {isLoading ? (
        <div className="flex justify-center items-center h-8">
            <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3">
          {starters.map((starter, index) => (
            <button
              key={index}
              onClick={() => onStarterClick(starter)}
              className="flex-shrink-0 text-sm bg-dark-surface-light hover:bg-white/10 text-white py-2 px-4 rounded-full transition-colors whitespace-nowrap"
            >
              {starter}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
