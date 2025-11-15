import React, { useState } from 'react';
import type { IntentionTimeframe } from '../types';
import { SendIcon } from './icons/SendIcon';

interface IntentionsInputBarProps {
  onAddIntention: (text: string, timeframe: IntentionTimeframe) => void;
  activeTimeframe: IntentionTimeframe;
}

export const IntentionsInputBar: React.FC<IntentionsInputBarProps> = ({ onAddIntention, activeTimeframe }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAddIntention(text.trim(), activeTimeframe);
      setText('');
    }
  };
  
  const getPlaceholder = () => {
    switch(activeTimeframe) {
      case 'daily': return 'Set a new intention for today...';
      case 'weekly': return 'Add a new goal for this week...';
      case 'monthly': return 'Add a new target for this month...';
      case 'yearly': return 'Add a new goal for this year...';
      case 'life': return 'What is a life goal you want to achieve?';
      default: return 'Set a new intention...';
    }
  }

  return (
    <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-10">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
        />
        <button 
          type="submit" 
          className="bg-brand-teal p-3 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
          aria-label="Add intention"
          disabled={!text.trim()}
        >
          <SendIcon className="w-6 h-6 text-brand-indigo" />
        </button>
      </form>
    </footer>
  );
};
