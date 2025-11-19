
import React from 'react';
import type { Habit, HabitCategory } from '../types';
import { FlameIcon } from './icons/FlameIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

const categoryColors: Record<HabitCategory, string> = {
    Health: 'bg-rose-500/20 text-rose-300 ring-rose-500/50',
    Growth: 'bg-amber-500/20 text-amber-300 ring-amber-500/50',
    Career: 'bg-sky-500/20 text-sky-300 ring-sky-500/50',
    Finance: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50',
    Connection: 'bg-purple-500/20 text-purple-300 ring-purple-500/50',
    System: 'bg-slate-500/20 text-slate-300 ring-slate-500/50',
};

export const HabitCard: React.FC<HabitCardProps> = ({ habit, isCompleted, onToggle, onDelete }) => {
  return (
    <div className="flex items-center justify-between bg-dark-surface p-4 rounded-lg mb-3 transition-all duration-300 animate-fade-in-up hover:bg-dark-surface-light/50">
      
      <div className="flex items-center gap-4">
        <button
            onClick={onToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${isCompleted ? 'bg-brand-teal border-brand-teal text-brand-indigo' : 'bg-transparent border-gray-500 text-transparent hover:border-brand-teal'}`}
            aria-label={isCompleted ? "Uncheck habit" : "Check habit"}
        >
            <CheckCircleIcon className="w-5 h-5" />
        </button>
        
        <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{habit.emoji}</span>
                <h3 className={`text-lg font-medium ${isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {habit.name}
                </h3>
            </div>
            {/* Category Badge */}
            {habit.category && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${categoryColors[habit.category] || categoryColors.System}`}>
                    {habit.category.toUpperCase()}
                </span>
            )}
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
