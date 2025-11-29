import React from 'react';
import { Target } from 'lucide-react';

interface EmptyHabitsStateProps {
  onCreateHabit?: (name: string, emoji: string) => void;
}

export const EmptyHabitsState: React.FC<EmptyHabitsStateProps> = ({
  onCreateHabit
}) => {
  const starterHabits = [
    { name: 'Read 5 pages', emoji: '📖', category: 'Growth' },
    { name: 'Meditate 5 minutes', emoji: '🧘', category: 'Health' },
    { name: 'Drink 8 glasses of water', emoji: '💧', category: 'Health' },
    { name: 'Exercise 30 minutes', emoji: '🏋️', category: 'Health' },
    { name: 'Journal 10 minutes', emoji: '✍️', category: 'Growth' },
    { name: 'Learn something new', emoji: '🎯', category: 'Growth' }
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      < div className="max-w-lg text-center space-y-6" >
        {/* Icon */}
        < div className="flex justify-center" >
          <div className="relative">
            <Target className="w-16 h-16 text-brand-teal" />
            <div className="absolute inset-0 bg-brand-teal/20 blur-2xl rounded-full" />
          </div>
        </div >

        {/* Heading */}
        < div >
          <h2 className="text-2xl font-display font-bold text-white mb-2">
            Your first habit starts here
          </h2>
          <p className="text-gray-400">
            Small, consistent actions compound into extraordinary results
          </p>
        </div >

        {/* Starter Habits */}
        < div className="space-y-3" >
          <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
            Popular starters:
          </p>

          <div className="grid grid-cols-2 gap-3">
            {starterHabits.map((habit, index) => (
              <button
                key={index}
                onClick={() => onCreateHabit?.(habit.name, habit.emoji)}
                className="flex items-center gap-2 p-3 rounded-lg bg-dark-surface border border-white/10 hover:border-brand-teal/40 hover:bg-white/5 transition-all group text-left"
              >
                <span className="text-2xl">{habit.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {habit.name}
                  </div>
                  <div className="text-xs text-gray-500">{habit.category}</div>
                </div>
              </button>
            ))}
          </div>
        </div >

        {/* Custom Habit CTA */}
        < div className="pt-4 border-t border-white/10" >
          <p className="text-sm text-gray-400 mb-3">
            Or create your own custom habit below
          </p>
          <div className="flex items-center justify-center gap-2 text-brand-teal">
            <span className="text-2xl">↓</span>
            <span className="font-semibold">Use the input bar</span>
          </div>
        </div >
      </div >
    </div >
  );
};
