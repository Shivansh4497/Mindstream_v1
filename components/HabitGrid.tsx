import React, { useState, useRef } from 'react';
import type { Habit, HabitLog } from '../types';
import { HabitDetailPopup } from './HabitDetailPopup';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { Check } from 'lucide-react';
import { glass } from '../styles/glass';

interface HabitGridProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  onToggle: (habitId: string, date?: string) => void;
  onOpenDetail?: (habit: Habit) => void;
}

const HabitGridCell: React.FC<{
  habit: Habit;
  habitLogs: HabitLog[];
  onToggle: (habitId: string, date?: string) => void;
  onOpenDetail?: (habit: Habit) => void;
}> = ({ habit, habitLogs, onToggle, onOpenDetail }) => {
  const today = new Date();
  const isCompletedToday = habitLogs.some(log => {
    const logDate = new Date(log.completed_at);
    if (log.habit_id !== habit.id) return false;
    
    if (habit.frequency === 'daily') return isSameDay(logDate, today);
    if (habit.frequency === 'weekly') return getWeekId(logDate) === getWeekId(today);
    if (habit.frequency === 'monthly') return getMonthId(logDate) === getMonthId(today);
    return false;
  });

  const handleClick = (e: React.MouseEvent) => {
    onToggle(habit.id);
  };

  const baseClasses = "relative flex flex-col items-center justify-center gap-[6px] rounded-[12px] p-[12px_6px_10px] cursor-pointer transition-transform hover:scale-[1.02]";
  
  return (
    <>
      <div 
        className={baseClasses}
        style={{
          ...(isCompletedToday ? glass.cell.done : glass.cell.regular),
          aspectRatio: '1'
        }}
        onClick={handleClick}
      >
        <div className="text-[22px] leading-none">{habit.emoji}</div>
        <div className="text-[9px] font-medium text-center text-white/55 leading-tight line-clamp-2 px-1">
          {habit.name}
        </div>
        
        {isCompletedToday && (
          <div className="absolute top-[5px] right-[5px] w-[14px] h-[14px] rounded-full bg-[rgba(255,255,255,0.85)] flex items-center justify-center">
            <Check size={8} color="#0A1628" strokeWidth={4} />
          </div>
        )}

        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail?.(habit);
          }}
          style={{
            position: 'absolute',
            bottom: 5,
            right: 6,
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
            cursor: 'pointer',
            padding: '2px 4px',
            lineHeight: 1,
          }}
        >
          ···
        </div>
      </div>
    </>
  );
};

export const HabitGrid: React.FC<HabitGridProps> = ({ habits, habitLogs, onToggle, onOpenDetail }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-[6px] px-3">
      {habits.map(habit => (
        <HabitGridCell 
          key={habit.id} 
          habit={habit} 
          habitLogs={habitLogs} 
          onToggle={onToggle} 
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
};
