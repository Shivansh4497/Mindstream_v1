import React from 'react';
import type { Reflection, AISuggestion } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { ActionableSuggestion } from './ActionableSuggestion';

interface ReflectionCardProps {
  reflection: Reflection;
  onExplore?: (summary: string) => void;
  onAddSuggestion: (suggestion: AISuggestion) => void;
}

export const ReflectionCard: React.FC<ReflectionCardProps> = ({ reflection, onExplore, onAddSuggestion }) => {
  const getTitle = () => {
    switch (reflection.type) {
      case 'daily':
        return 'Your Daily Reflection';
      case 'weekly':
        return 'Your Weekly Reflection';
      case 'monthly':
        return 'Your Monthly Reflection';
      default:
        return 'Your Reflection';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 border border-brand-teal/30 rounded-lg shadow-lg animate-fade-in-up">
      <div className="p-5">
        <div className="flex items-center mb-3">
          <SparklesIcon className="w-6 h-6 text-brand-teal mr-3" />
          <h3 className="text-lg font-bold text-white font-display">{getTitle()}</h3>
        </div>
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{reflection.summary}</p>
      </div>

      {reflection.suggestions && reflection.suggestions.length > 0 && (
        <div className="px-5 pb-4 flex flex-col gap-2">
          {reflection.suggestions.map((suggestion, index) => (
            <ActionableSuggestion
              key={index}
              suggestion={suggestion}
              onAdd={() => onAddSuggestion(suggestion)}
            />
          ))}
        </div>
      )}

      {onExplore && (
        <div className="border-t border-brand-teal/20 p-3">
          <button
            onClick={() => onExplore(reflection.summary)}
            className="w-full flex items-center justify-center gap-2 bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal font-semibold py-2 px-4 rounded-lg transition-colors text-sm border border-brand-teal/30"
          >
            <ChatBubbleIcon className="w-5 h-5" />
            <span>Explore in Chat</span>
          </button>
        </div>
      )}
    </div>
  );
};
