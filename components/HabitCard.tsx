
import React from 'react';
import type { Habit } from '../types';
import { FlameIcon } from './icons/FlameIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HabitCardProps {
  habit: Habit;
  isCompletedToday: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit, isCompletedToday, onToggle, onDelete }) => {
  return (
    <div className="flex items-center justify-between bg-dark-surface p-4 rounded-lg mb-3 transition-all duration-300 animate-fade-in-up">
      
      <div className="flex items-center gap-4">
        <button
            onClick={onToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isCompletedToday ? 'bg-brand-teal border-brand-teal text-brand-indigo' : 'bg-transparent border-gray-500 text-transparent hover:border-brand-teal'}`}
            aria-label={isCompletedToday ? "Uncheck habit" : "Check habit"}
        >
            <CheckCircleIcon className="w-5 h-5" />
        </button>
        
        <div>
            <div className="flex items-center gap-2">
                <span className="text-2xl">{habit.emoji}</span>
                <h3 className={`text-lg font-medium ${isCompletedToday ? 'text-gray-400' : 'text-white'}`}>
                    {habit.name}
                </h3>
            </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {habit.current_streak > 1 && (
            <div className="flex items-center gap-1 text-orange-400 bg-orange-900/30 px-2 py-1 rounded-md">
                <FlameIcon className="w-4 h-4" />
                <span className="text-xs font-bold">{habit.current_streak}</span>
            </div>
        )}
        
        <button 
          onClick={onDelete}
          className="p-2 rounded-full hover:bg-white/10 text-gray-600 hover:text-red-400 transition-colors"
          aria-label="Delete habit"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
