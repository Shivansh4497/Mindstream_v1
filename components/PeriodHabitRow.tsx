import React from 'react';
import type { Habit } from '../types';

interface PeriodHabitRowProps {
  habit: Habit;
  isCompleted: boolean;
  dueIn: number;
  onToggle: (habitId: string) => void;
}

export const PeriodHabitRow: React.FC<PeriodHabitRowProps> = ({ habit, isCompleted, dueIn, onToggle }) => {
  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 14px',
    margin: '0 12px 6px',
    background: isCompleted
      ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 60%, rgba(255,255,255,0.26) 100%)'
      : 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 60%, rgba(255,255,255,0.08) 100%)',
    border: isCompleted
      ? '0.5px solid rgba(255,255,255,0.3)'
      : '0.5px solid rgba(255,255,255,0.13)',
    borderTop: isCompleted
      ? '0.5px solid rgba(255,255,255,0.5)'
      : '0.5px solid rgba(255,255,255,0.22)',
    borderRadius: '10px',
  };

  return (
    <div style={rowStyle}>
      <span style={{ fontSize: 20 }}>{habit.emoji}</span>
      <span style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: isCompleted ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.85)',
        textDecoration: isCompleted ? 'line-through' : 'none',
      }}>
        {habit.name}
      </span>

      {/* due-soon amber label — only when pending and due within threshold */}
      {!isCompleted && dueIn <= (habit.frequency === 'weekly' ? 2 : 7) && (
        <span style={{ fontSize: 10, color: 'rgba(245,158,11,0.8)' }}>
          {dueIn === 0 ? 'today' : dueIn === 1 ? 'tomorrow' : `${dueIn}d`}
        </span>
      )}

      {/* toggle circle */}
      <div
        onClick={() => onToggle(habit.id)}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: isCompleted ? 'rgba(255,255,255,0.88)' : 'transparent',
          border: isCompleted ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {isCompleted && (
          <i className="ti ti-check" style={{ fontSize: 12, color: '#0D1520' }} />
        )}
      </div>
    </div>
  );
};
