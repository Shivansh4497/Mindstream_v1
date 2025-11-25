
import React, { useState } from 'react';
import type { Habit, HabitCategory, HabitLog } from '../types';
import { FlameIcon } from './icons/FlameIcon';
import { TrashIcon } from './icons/TrashIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { isSameDay, getFormattedDate } from '../utils/date';

interface HabitCardProps {
  habit: Habit;
  logs: HabitLog[];
  onToggle: (dateString: string) => void;
  onDelete: () => void;
  referenceDate: Date; // The "Today" we are looking at (usually real Today, or Yesterday)
}

const categoryColors: Record<HabitCategory, string> = {
    Health: 'bg-rose-500/20 text-rose-300 ring-rose-500/50',
    Growth: 'bg-amber-500/20 text-amber-300 ring-amber-500/50',
    Career: 'bg-sky-500/20 text-sky-300 ring-sky-500/50',
    Finance: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/50',
    Connection: 'bg-purple-500/20 text-purple-300 ring-purple-500/50',
    System: 'bg-slate-500/20 text-slate-300 ring-slate-500/50',
};

export const HabitCard: React.FC<HabitCardProps> = ({ habit, logs, onToggle, onDelete, referenceDate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to check if a specific date is logged
  const isLogged = (date: Date) => {
      return logs.some(l => isSameDay(new Date(l.completed_at), date));
  };

  // Generate trailing 5 days for the collapsed view
  const trailingDays = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - (4 - i)); // Order: -4, -3, -2, Yesterday, Today
      return d;
  });

  // Generate 14 days for the expanded calendar
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() - (13 - i)); 
      return d;
  });

  return (
    <div className="bg-dark-surface rounded-lg mb-3 shadow-lg transition-all duration-300 animate-fade-in-up overflow-hidden">
      
      {/* MAIN ROW (Collapsed) */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        
        {/* LEFT: Info */}
        <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-2xl flex-shrink-0">{habit.emoji}</span>
            <div className="min-w-0">
                <h3 className="text-lg font-medium text-white truncate">{habit.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    {habit.category && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-inset ${categoryColors[habit.category] || categoryColors.System}`}>
                            {habit.category.toUpperCase()}
                        </span>
                    )}
                    {habit.current_streak > 1 && (
                        <div className="flex items-center gap-1 text-orange-400 text-xs font-bold">
                            <FlameIcon className="w-3 h-3" />
                            {habit.current_streak}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT: Visual History (Dots) */}
        <div className="flex items-center gap-4">
            <div className="flex gap-1.5 items-center">
                {trailingDays.map((date, i) => {
                    const done = isLogged(date);
                    const isToday = isSameDay(date, referenceDate);
                    return (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(date.toISOString());
                            }}
                            className={`
                                rounded-full transition-all duration-300 
                                ${isToday ? 'w-6 h-6' : 'w-3 h-3'} 
                                ${done 
                                    ? 'bg-brand-teal shadow-[0_0_10px_rgba(44,229,195,0.4)]' 
                                    : isToday 
                                        ? 'border-2 border-brand-teal/50 hover:bg-brand-teal/20' 
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }
                            `}
                            title={getFormattedDate(date)}
                        />
                    );
                })}
            </div>
            
            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* EXPANDED DRAWER: Mini Calendar */}
      {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20">
              <div className="flex justify-between items-center my-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">History</span>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                      <TrashIcon className="w-3 h-3" /> Delete Habit
                  </button>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((date, i) => {
                      const done = isLogged(date);
                      const isToday = isSameDay(date, referenceDate);
                      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
                      const dateLabel = date.getDate();

                      return (
                          <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(date.toISOString());
                            }}
                            className={`
                                flex flex-col items-center justify-center p-2 rounded-lg transition-colors
                                ${done ? 'bg-brand-teal/20 text-brand-teal' : 'bg-white/5 text-gray-500 hover:bg-white/10'}
                                ${isToday ? 'ring-1 ring-brand-teal' : ''}
                            `}
                          >
                              <span className="text-[9px] opacity-70">{dayLabel}</span>
                              <span className="text-xs font-bold">{dateLabel}</span>
                          </button>
                      )
                  })}
              </div>
          </div>
      )}
    </div>
  );
};
