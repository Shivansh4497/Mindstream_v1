
import React, { useState } from 'react';
import type { Habit, HabitCategory, HabitLog } from '../types';
import { FlameIcon } from './icons/FlameIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { HabitLogButton } from './HabitLogButton';

interface HabitCardProps {
  habit: Habit;
  logs: HabitLog[];
  onToggle: (dateString: string) => void;
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

export const HabitCard: React.FC<HabitCardProps> = ({ habit, logs, onToggle, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to check if a specific date/period is logged
  const isLogged = (date: Date) => {
      if (habit.frequency === 'daily') {
          return logs.some(l => isSameDay(new Date(l.completed_at), date));
      } else if (habit.frequency === 'weekly') {
          const wId = getWeekId(date);
          return logs.some(l => getWeekId(new Date(l.completed_at)) === wId);
      } else {
          const mId = getMonthId(date);
          return logs.some(l => getMonthId(new Date(l.completed_at)) === mId);
      }
  };

  // Generate visualization items based on frequency
  const getHistoryItems = () => {
      const now = new Date();
      const items = [];
      
      if (habit.frequency === 'daily') {
          // Last 7 days
          for (let i = 6; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - i);
              items.push(d);
          }
      } else if (habit.frequency === 'weekly') {
          // Last 4 weeks
          for (let i = 3; i >= 0; i--) {
              const d = new Date(now);
              d.setDate(d.getDate() - (i * 7));
              items.push(d);
          }
      } else {
          // Last 6 months
          for (let i = 5; i >= 0; i--) {
              const d = new Date(now);
              d.setMonth(d.getMonth() - i);
              items.push(d);
          }
      }
      return items;
  };

  const historyDates = getHistoryItems();

  return (
    <div className="bg-dark-surface rounded-lg mb-3 shadow-lg transition-all duration-300 animate-fade-in-up overflow-hidden">
      
      {/* MAIN ROW */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        
        {/* LEFT: Info */}
        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1 mr-4">
            <span className="text-2xl flex-shrink-0">{habit.emoji}</span>
            <div className="min-w-0">
                <h3 className="text-lg font-medium text-white truncate">{habit.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    {habit.category && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${categoryColors[habit.category] || categoryColors.System}`}>
                            {habit.category.toUpperCase()}
                        </span>
                    )}
                    {habit.current_streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-400 text-xs font-bold">
                            <FlameIcon className="w-3 h-3" />
                            {habit.current_streak} {habit.frequency === 'daily' ? 'day' : habit.frequency === 'weekly' ? 'wk' : 'mo'} streak
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT: Visual History */}
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5 items-center">
                {historyDates.map((date, i) => (
                    <HabitLogButton 
                        key={i}
                        date={date}
                        isLogged={isLogged(date)}
                        isToday={isSameDay(date, new Date())}
                        frequency={habit.frequency}
                        onToggle={() => onToggle(date.toISOString())}
                    />
                ))}
            </div>
            {/* Mobile Chevron (Hidden on larger screens if desired, but good for expansion affordance) */}
            <div className="ml-2 pl-2 border-l border-white/10">
                 <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
        </div>
      </div>

      {/* EXPANDED DRAWER: Delete / Edit Options */}
      {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
              <div className="flex justify-end items-center my-2 pt-2">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 py-2 px-3 rounded hover:bg-red-900/20 transition-colors">
                      <TrashIcon className="w-3 h-3" /> Delete Habit
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
