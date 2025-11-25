
import React, { useState } from 'react';
import type { Habit, HabitCategory } from '../types';

interface EditHabitModalProps {
  habit: Habit;
  onSave: (name: string, emoji: string, category: HabitCategory) => Promise<void>;
  onCancel: () => void;
}

const categories: HabitCategory[] = ['Health', 'Growth', 'Career', 'Finance', 'Connection', 'System'];
const emojis = ["⚡️", "🧘", "🏃", "📚", "💰", "❤️", "🎯", "💧", "🥗", "💊", "💤", "💻", "🎨", "🎵", "🌱"];

export const EditHabitModal: React.FC<EditHabitModalProps> = ({ habit, onSave, onCancel }) => {
  const [name, setName] = useState(habit.name);
  const [emoji, setEmoji] = useState(habit.emoji);
  const [category, setCategory] = useState<HabitCategory>(habit.category);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanged = name !== habit.name || emoji !== habit.emoji || category !== habit.category;

  const handleSave = async () => {
    if (!hasChanged || isSaving) return;
    setIsSaving(true);
    await onSave(name, emoji, category);
    setIsSaving(false);
  };

  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onCancel}
    >
      <div 
        className="bg-dark-surface rounded-xl p-6 max-w-sm w-full flex flex-col shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold font-display text-white mb-6">Edit Habit</h2>
        
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Icon</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {emojis.map(e => (
                    <button
                        key={e}
                        onClick={() => setEmoji(e)}
                        className={`w-10 h-10 flex-shrink-0 rounded-lg text-xl flex items-center justify-center transition-colors ${emoji === e ? 'bg-brand-teal text-brand-indigo' : 'bg-dark-surface-light text-white hover:bg-white/10'}`}
                    >
                        {e}
                    </button>
                ))}
            </div>
        </div>

        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Name</label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
            />
        </div>

        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                    <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${category === c ? 'bg-brand-teal/20 border-brand-teal text-brand-teal font-bold' : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-dark-surface-light text-white font-bold py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanged || isSaving || !name.trim()}
            className="flex-1 bg-brand-teal text-brand-indigo font-bold py-3 px-6 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
