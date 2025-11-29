import React, { useRef } from 'react';
import type { Intention, IntentionStatus } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { celebrate, CelebrationType } from '../utils/celebrations';
import { triggerHaptic } from '../utils/haptics';
import { formatDueDate } from '../utils/etaCalculator';

interface IntentionCardProps {
  intention: Intention;
  onToggle: (id: string, currentStatus: IntentionStatus) => void;
  onDelete: (id: string) => void;
}

export const IntentionCard: React.FC<IntentionCardProps> = ({ intention, onToggle, onDelete }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const isCompleting = intention.status === 'pending';

    // Trigger the actual toggle
    onToggle(intention.id, intention.status);

    // Only celebrate on completion
    if (isCompleting) {
      // Haptic feedback
      triggerHaptic('success');

      // Confetti celebration
      setTimeout(() => {
        celebrate(CelebrationType.INTENTION_COMPLETE, cardRef.current || undefined);
      }, 100);
    }
  };

  const dueDate = intention.due_date ? new Date(intention.due_date) : null;
  const isLifeGoal = intention.is_life_goal || false;
  const dueDateText = formatDueDate(dueDate, isLifeGoal);

  return (
    <div ref={cardRef} className="flex items-start bg-dark-surface p-4 rounded-lg mb-3 transition-all duration-300 animate-fade-in-up hover:bg-white/5">
      <input
        type="checkbox"
        checked={intention.status === 'completed'}
        onChange={handleToggle}
        className="w-6 h-6 mt-0.5 text-brand-teal bg-gray-700 border-gray-600 rounded focus:ring-brand-teal focus:ring-2 cursor-pointer transition-transform hover:scale-110 flex-shrink-0"
      />
      <div className="flex-grow mx-4">
        <span className={`text-lg block ${intention.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
          {intention.text}
        </span>
        <span className={`text-sm block mt-1 ${intention.status === 'completed' ? 'text-gray-500' : 'text-gray-300'}`}>
          {dueDateText}
        </span>
      </div>
      <button
        onClick={() => onDelete(intention.id)}
        className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
        aria-label="Delete intention"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
};