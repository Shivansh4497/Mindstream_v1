import React from 'react';
import type { Intention, IntentionStatus } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface IntentionCardProps {
  intention: Intention;
  onToggle: (id: string, currentStatus: IntentionStatus) => void;
  onDelete: (id: string) => void;
}

export const IntentionCard: React.FC<IntentionCardProps> = ({ intention, onToggle, onDelete }) => {
  return (
    <div className="flex items-center bg-dark-surface p-4 rounded-lg mb-3 transition-all duration-300 animate-fade-in-up">
      <input
        type="checkbox"
        checked={intention.status === 'completed'}
        onChange={() => onToggle(intention.id, intention.status)}
        className="w-6 h-6 text-brand-teal bg-gray-700 border-gray-600 rounded focus:ring-brand-teal focus:ring-2 cursor-pointer"
      />
      <span className={`flex-grow mx-4 text-lg ${intention.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
        {intention.text}
      </span>
      <button 
        onClick={() => onDelete(intention.id)}
        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
        aria-label="Delete intention"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
};