
import React, { useState } from 'react';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import type { HabitFrequency } from '../types';

interface HabitsInputBarProps {
  onAddHabit: (name: string, frequency: HabitFrequency) => void;
  isLoading: boolean;
  activeFrequency: HabitFrequency;
}

export const HabitsInputBar: React.FC<HabitsInputBarProps> = ({ onAddHabit, isLoading, activeFrequency }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && !isLoading) {
      onAddHabit(name.trim(), activeFrequency);
      setName('');
    }
  };

  return (
    <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-40">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Create a new ${activeFrequency} habit...`}
          className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-brand-teal p-3 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
          aria-label="Add habit"
          disabled={!name.trim() || isLoading}
        >
          {isLoading ? (
            <div className="w-6 h-6 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <PlusCircleIcon className="w-6 h-6 text-white" />
          )}
        </button>
      </form>
    </footer>
  );
};
