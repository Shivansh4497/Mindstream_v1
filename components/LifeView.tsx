import React, { useState, useMemo, useRef } from 'react';
import type { Habit, HabitLog, Intention } from '../types';
import { HabitGrid } from './HabitGrid';
import { IntentionCard } from './IntentionCard';
import { SharedInputBar } from './SharedInputBar';
import { LifeEmptyState } from './illustrations/LifeEmptyState';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { parseISO, differenceInDays } from 'date-fns';
import { NudgeIcon } from './NudgeIcon';
import { HabitDetailPopup } from './HabitDetailPopup';
import { EntryTypeModal } from './EntryTypeModal';
import { EditIntentionModal } from './EditIntentionModal';

interface LifeViewProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  intentions: Intention[];
  onToggleHabit: (habitId: string, date?: string) => void;
  onToggleIntention: (id: string, currentStatus: Intention['status']) => void;
  onDeleteIntention: (id: string) => void;
  onUpdateIntention: (id: string, updates: Partial<Intention>) => void;
  onStarToggleIntention: (id: string, isStarred: boolean) => void;
  onAddIntention: (text: string, dueDate: Date | null, isLifeGoal: boolean) => void;
  onAddHabit: (text: string, frequency?: 'daily' | 'weekly' | 'monthly') => void;
  onEditHabit: (habitId: string, updates: Partial<Habit>) => void;
  onDeleteHabit: (habitId: string) => void;
}

const getDaysRemainingInPeriod = (habit: Habit): number => {
  const today = new Date();
  if (habit.frequency === 'weekly') {
    const dayOfWeek = today.getDay();
    return 7 - dayOfWeek;
  }
  if (habit.frequency === 'monthly') {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return Math.ceil((lastDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }
  return 999;
};

const isSameWeek = (date1: Date, date2: Date): boolean => {
  return getWeekId(date1) === getWeekId(date2);
};

const isCompletedThisPeriod = (habit: Habit, logs: HabitLog[]): boolean => {
  const today = new Date();
  return logs.some(log => {
    if (log.habit_id !== habit.id) return false;
    const logDate = new Date(log.completed_at);
    if (habit.frequency === 'weekly') {
      return isSameWeek(logDate, today);
    }
    if (habit.frequency === 'monthly') {
      return logDate.getMonth() === today.getMonth() &&
             logDate.getFullYear() === today.getFullYear();
    }
    if (habit.frequency === 'daily') {
      return isSameDay(logDate, today);
    }
    return false;
  });
};

const SubViewToggle: React.FC<{ active: 'today' | 'goals', onChange: (v: 'today' | 'goals') => void }> = ({ active, onChange }) => {
  return (
    <div className="flex border-b-[0.5px] border-[rgba(255,255,255,0.06)] px-4 mt-2">
      <button 
        onClick={() => onChange('today')}
        className={`px-4 py-3 text-sm font-medium transition-colors ${active === 'today' ? 'text-[rgba(255,255,255,0.88)] border-b-[1.5px] border-[rgba(255,255,255,0.7)]' : 'text-white/35'}`}
      >
        Today
      </button>
      <button 
        onClick={() => onChange('goals')}
        className={`px-4 py-3 text-sm font-medium transition-colors ${active === 'goals' ? 'text-[rgba(255,255,255,0.88)] border-b-[1.5px] border-[rgba(255,255,255,0.7)]' : 'text-white/35'}`}
      >
        Goals
      </button>
    </div>
  );
};

interface TodayViewProps extends LifeViewProps {
  weeklySectionRef: React.RefObject<HTMLDivElement>;
  monthlySectionRef: React.RefObject<HTMLDivElement>;
  onOpenDetail: (habit: Habit) => void;
}

const TodayView: React.FC<TodayViewProps> = ({ 
  habits, habitLogs, intentions, 
  onToggleHabit, onToggleIntention, 
  onAddHabit, onAddIntention, 
  onEditHabit, onDeleteHabit,
  weeklySectionRef, monthlySectionRef,
  onOpenDetail
}) => {
  const dailyHabits = useMemo(() => habits.filter(h => h.frequency === 'daily'), [habits]);
  const weeklyHabits = useMemo(() => habits.filter(h => h.frequency === 'weekly'), [habits]);
  const monthlyHabits = useMemo(() => habits.filter(h => h.frequency === 'monthly'), [habits]);
  
  const [pendingEntryText, setPendingEntryText] = useState<string | null>(null);
  
  const today = new Date();
  
  const dueTasks = useMemo(() => {
    return intentions.filter(i => {
      if (i.status === 'completed' || i.status === 'dismissed') return false;
      if (!i.due_date) return false;
      const dueDate = parseISO(i.due_date);
      return differenceInDays(dueDate, today) <= 0;
    });
  }, [intentions]);

  if (habits.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
          <div className="mb-6">
            <LifeEmptyState />
          </div>
          <h2 className="text-[16px] font-medium text-[rgba(255,255,255,0.88)] mb-2">
            Design your ideal day
          </h2>
          <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.5] max-w-[240px] mx-auto">
            Add habits and tasks to start building momentum.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 pb-16 bg-gradient-to-t from-[#0D1520] to-transparent pt-10 pointer-events-none"></div>
        <SharedInputBar
          actionContext="life-today"
          placeholder="Add habit or task..."
          onSubmit={(text) => setPendingEntryText(text)}
        />
        {pendingEntryText && (
          <EntryTypeModal
            text={pendingEntryText}
            onClose={() => setPendingEntryText(null)}
            onSaveHabit={(text, freq) => {
              onAddHabit(text, freq);
              setPendingEntryText(null);
            }}
            onSaveTask={(text, deadline, isLifeGoal) => {
              onAddIntention(text, deadline ? new Date(deadline) : null, isLifeGoal);
              setPendingEntryText(null);
            }}
          />
        )}
      </div>
    );
  }

  const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="px-4 py-4 text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(255,255,255,0.65)]">
      {children}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-4">
        <SectionLabel>Daily Habits</SectionLabel>
        <HabitGrid habits={dailyHabits} habitLogs={habitLogs} onToggle={onToggleHabit} onOpenDetail={onOpenDetail} />
        
        <div className="h-[1px] bg-[rgba(255,255,255,0.06)] mx-4 mt-6 mb-2"></div>

        <SectionLabel>Due today</SectionLabel>
        <div className="space-y-[6px]">
          {dueTasks.length === 0 && (
            <div className="px-4 text-xs text-[rgba(255,255,255,0.45)] italic mb-4">No tasks due today.</div>
          )}
          {dueTasks.map(task => {
            const isOverdue = differenceInDays(parseISO(task.due_date!), today) < 0;
            return (
              <div 
                key={task.id}
                className={`bg-[#1A3352] border-[0.5px] border-[rgba(255,255,255,0.07)] p-[11px_14px] mx-[12px] flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors ${
                  isOverdue ? 'border-l-[2px] border-l-[rgba(226,75,74,0.5)] rounded-[0_12px_12px_0]' : 'rounded-[12px]'
                }`}
                onClick={() => onToggleIntention(task.id, task.status)}
              >
                <div className="w-[18px] h-[18px] rounded border border-white/20 bg-dark-surface flex-shrink-0" />
                <div className="text-[14px] text-white/90 truncate flex-1">
                  {task.emoji && <span className="mr-2">{task.emoji}</span>}
                  {task.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly section */}
        {weeklyHabits.length > 0 && (
          <div ref={weeklySectionRef}>
            <div className="h-[1px] bg-[rgba(255,255,255,0.06)] mx-4 mt-6 mb-2"></div>
            <SectionLabel>Weekly Habits</SectionLabel>
            <HabitGrid habits={weeklyHabits} habitLogs={habitLogs} onToggle={onToggleHabit} onOpenDetail={onOpenDetail} />
          </div>
        )}

        {/* Monthly section */}
        {monthlyHabits.length > 0 && (
          <div ref={monthlySectionRef} className="pb-6">
            <div className="h-[1px] bg-[rgba(255,255,255,0.06)] mx-4 mt-6 mb-2"></div>
            <SectionLabel>Monthly Habits</SectionLabel>
            <HabitGrid habits={monthlyHabits} habitLogs={habitLogs} onToggle={onToggleHabit} onOpenDetail={onOpenDetail} />
          </div>
        )}
      </div>
      
      <SharedInputBar
        actionContext="life-today"
        placeholder="Add habit or task..."
        onSubmit={(text) => setPendingEntryText(text)}
      />
      {pendingEntryText && (
        <EntryTypeModal
          text={pendingEntryText}
          onClose={() => setPendingEntryText(null)}
          onSaveHabit={(text, freq) => {
            onAddHabit(text, freq);
            setPendingEntryText(null);
          }}
          onSaveTask={(text, deadline, isLifeGoal) => {
            onAddIntention(text, deadline ? new Date(deadline) : null, isLifeGoal);
            setPendingEntryText(null);
          }}
        />
      )}
    </div>
  );
};

const GoalsView: React.FC<LifeViewProps> = ({ intentions, onToggleIntention, onDeleteIntention, onUpdateIntention, onStarToggleIntention, onAddIntention }) => {
  const [newGoalText, setNewGoalText] = useState('');
  const [pendingGoalText, setPendingGoalText] = useState<string | null>(null);
  const [editingIntention, setEditingIntention] = useState<Intention | null>(null);

  const pendingIntentions = intentions.filter(i => i.status !== 'completed');
  
  const grouped = useMemo(() => {
    const groups: Record<string, Intention[]> = {};
    pendingIntentions.forEach(i => {
      const cat = i.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    return groups;
  }, [pendingIntentions]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pb-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-4 pt-6 pb-2 text-[11px] font-bold tracking-[0.15em] uppercase text-[rgba(255,255,255,0.65)]">{category}</div>
            <div className="px-4">
              {items.map(intention => (
                <IntentionCard
                  key={intention.id}
                  intention={intention}
                  onToggle={onToggleIntention}
                  onDelete={onDeleteIntention}
                  onEdit={(i) => setEditingIntention(i)}
                  onStarToggle={onStarToggleIntention}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <SharedInputBar
        actionContext="life-goals"
        placeholder="Add a goal..."
        onSubmit={(text) => setPendingGoalText(text)}
      />
      {pendingGoalText && (
        <EntryTypeModal
          text={pendingGoalText}
          context="goals"
          onClose={() => setPendingGoalText(null)}
          onSaveHabit={() => {}} // Not used in goals context
          onSaveTask={(text, deadline, isLifeGoal) => {
            onAddIntention(text, deadline ? new Date(deadline) : null, isLifeGoal);
            setPendingGoalText(null);
          }}
        />
      )}
      
      {editingIntention && (
        <EditIntentionModal
          intention={editingIntention}
          onSave={async (updates) => {
            onUpdateIntention(editingIntention.id, updates);
            setEditingIntention(null);
          }}
          onCancel={() => setEditingIntention(null)}
        />
      )}
    </div>
  );
};

export const LifeView: React.FC<LifeViewProps & {
  onAddIntention: any,
  onAddHabit: any,
  onEditHabit: (habitId: string, updates: Partial<Habit>) => void,
  onDeleteHabit: (id: string) => void
}> = (props) => {
  const [subView, setSubView] = useState<'today' | 'goals'>('today');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const weeklySectionRef = useRef<HTMLDivElement>(null);
  const monthlySectionRef = useRef<HTMLDivElement>(null);

  const selectedHabit = useMemo(() => 
    selectedHabitId ? props.habits.find(h => h.id === selectedHabitId) || null : null
  , [props.habits, selectedHabitId]);

  const handleSectionScroll = (section: 'weekly' | 'monthly') => {
    if (section === 'weekly') {
      weeklySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      monthlySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const nudgeItems = useMemo(() => {
    return props.habits
      .filter(h => h.frequency === 'weekly' || h.frequency === 'monthly')
      .filter(h => !isCompletedThisPeriod(h, props.habitLogs))
      .filter(h => {
        const daysRemaining = getDaysRemainingInPeriod(h);
        if (h.frequency === 'weekly') return daysRemaining <= 2;
        if (h.frequency === 'monthly') return daysRemaining <= 7;
        return false;
      })
      .map(h => ({
        id: h.id,
        name: h.name,
        dueIn: getDaysRemainingInPeriod(h),
        frequency: h.frequency as 'weekly' | 'monthly',
      }));
  }, [props.habits, props.habitLogs]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D1520', minHeight: '100%' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 16px 8px',
      }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }} className="font-display">
          Life
        </h1>
        <NudgeIcon nudgeItems={nudgeItems} onSectionScroll={handleSectionScroll} />
      </header>
      <SubViewToggle active={subView} onChange={setSubView} />
      {subView === 'today' ? (
        <TodayView 
          {...props} 
          onOpenDetail={(h) => setSelectedHabitId(h.id)}
          weeklySectionRef={weeklySectionRef} 
          monthlySectionRef={monthlySectionRef} 
        />
      ) : (
        <GoalsView {...props} />
      )}

      {selectedHabit && (
        <HabitDetailPopup
          habit={selectedHabit}
          habitLogs={props.habitLogs}
          onClose={() => setSelectedHabitId(null)}
          onToggleDate={(habitId, date) => props.onToggleHabit(habitId, date)}
          onSave={props.onEditHabit}
          onDelete={props.onDeleteHabit}
        />
      )}
    </div>
  );
};
