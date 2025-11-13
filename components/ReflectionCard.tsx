import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Reflection } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface ReflectionCardProps {
  reflection: Reflection;
  onExplore?: (summary: string) => void;
}

export const ReflectionCard: React.FC<ReflectionCardProps> = ({ reflection, onExplore }) => {
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
    <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 border border-brand-teal/30 rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up">
      <div className="flex items-center mb-3">
        <SparklesIcon className="w-6 h-6 text-brand-teal mr-3" />
        <h3 className="text-lg font-bold text-white font-display">{getTitle()}</h3>
      </div>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{reflection.summary}</p>
      {onExplore && (
        <div className="mt-4 pt-4 border-t border-brand-teal/20">
            <button
                onClick={() => onExplore(reflection.summary)}
                className="w-full flex items-center justify-center gap-2 bg-dark-surface/50 hover:bg-dark-surface text-brand-teal font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
                <ChatBubbleIcon className="w-5 h-5" />
                <span>Explore in Chat</span>
            </button>
        </div>
      )}
    </div>
  );
};
