import React, { useState, useMemo } from 'react';
import type { Habit, HabitLog } from '../types';
import { calculateStreak } from '../utils/streak';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { subDays, format } from 'date-fns';
import { Edit2, Trash2, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HabitDetailPopupProps {
  habit: Habit;
  habitLogs: HabitLog[];
  onClose: () => void;
  onToggleDate: (habitId: string, date: string) => void;
  onSave: (habitId: string, updates: Partial<Habit>) => void | Promise<void>;
  onDelete: (habitId: string) => void;
}

export const HabitDetailPopup: React.FC<HabitDetailPopupProps> = ({
  habit,
  habitLogs,
  onClose,
  onToggleDate,
  onSave,
  onDelete,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [editName, setEditName] = useState(habit.name);
  const [editEmoji, setEditEmoji] = useState(habit.emoji);
  const [editFrequency, setEditFrequency] = useState(habit.frequency);
  const [editCategory, setEditCategory] = useState(habit.category);

  const hasChanges = 
    editName !== habit.name || 
    editEmoji !== habit.emoji || 
    editFrequency !== habit.frequency || 
    editCategory !== habit.category;

  const currentStreak = useMemo(() => {
    const logDates = habitLogs.map(l => new Date(l.completed_at));
    return calculateStreak(logDates, habit.frequency);
  }, [habitLogs, habit.frequency]);

  const thisWeekCount = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return habitLogs.filter(l => new Date(l.completed_at) >= startOfWeek).length;
  }, [habitLogs]);

  const thisMonthCount = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return habitLogs.filter(l => new Date(l.completed_at) >= startOfMonth).length;
  }, [habitLogs]);

  const DailyHistoryBoxes = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const isCompleted = habitLogs.some(log =>
        format(new Date(log.completed_at), 'yyyy-MM-dd') === dateStr
      );
      return { date, dateStr, isCompleted, label: format(date, 'EEE')[0] };
    });

    return (
      <div style={{ display: 'flex', gap: 6, width: '100%' }}>
        {last7Days.map(day => (
          <div
            key={day.dateStr}
            onClick={() => onToggleDate(habit.id, day.dateStr)}
            style={{
              flex: 1,
              aspectRatio: '1',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              cursor: 'pointer',
              background: day.isCompleted
                ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: day.isCompleted
                ? '0.5px solid rgba(255,255,255,0.3)'
                : '0.5px solid rgba(255,255,255,0.1)',
              borderTop: day.isCompleted
                ? '0.5px solid rgba(255,255,255,0.5)'
                : '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{day.label}</span>
            {day.isCompleted && (
              <i className="ti ti-check" style={{ fontSize: 9, color: 'rgba(255,255,255,0.9)' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const WeeklyHistoryBoxes = () => {
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
      const date = subDays(new Date(), (3 - i) * 7);
      const isCompleted = habitLogs.some(log => getWeekId(new Date(log.completed_at)) === getWeekId(date));
      return { dateStr: date.toISOString(), isCompleted, label: `W${i + 1}` };
    });

    return (
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        {last4Weeks.map(week => (
          <div
            key={week.dateStr}
            onClick={() => onToggleDate(habit.id, week.dateStr)}
            style={{
              flex: 1,
              aspectRatio: '1.5',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              background: week.isCompleted
                ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: week.isCompleted
                ? '0.5px solid rgba(255,255,255,0.3)'
                : '0.5px solid rgba(255,255,255,0.1)',
              borderTop: week.isCompleted
                ? '0.5px solid rgba(255,255,255,0.5)'
                : '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{week.label}</span>
            {week.isCompleted && (
              <i className="ti ti-check" style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const MonthlyHistoryBoxes = () => {
    const last4Months = Array.from({ length: 4 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (3 - i));
      const isCompleted = habitLogs.some(log => getMonthId(new Date(log.completed_at)) === getMonthId(date));
      return { dateStr: date.toISOString(), isCompleted, label: format(date, 'MMM') };
    });

    return (
      <div style={{ display: 'flex', gap: 8, width: '100%' }}>
        {last4Months.map(month => (
          <div
            key={month.dateStr}
            onClick={() => onToggleDate(habit.id, month.dateStr)}
            style={{
              flex: 1,
              aspectRatio: '1.5',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              cursor: 'pointer',
              background: month.isCompleted
                ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 100%)'
                : 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              border: month.isCompleted
                ? '0.5px solid rgba(255,255,255,0.3)'
                : '0.5px solid rgba(255,255,255,0.1)',
              borderTop: month.isCompleted
                ? '0.5px solid rgba(255,255,255,0.5)'
                : '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{month.label}</span>
            {month.isCompleted && (
              <i className="ti ti-check" style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const ViewMode = () => (
    <>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>{habit.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>
            {habit.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
            {habit.category ? ` · ${habit.category}` : ''}
          </div>
        </div>
      </div>

      {/* History boxes — different per frequency */}
      {habit.frequency === 'daily' && <DailyHistoryBoxes />}
      {habit.frequency === 'weekly' && <WeeklyHistoryBoxes />}
      {habit.frequency === 'monthly' && <MonthlyHistoryBoxes />}

      {/* Stats row — daily only */}
      {habit.frequency === 'daily' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Streak', value: `🔥${currentStreak}` },
            { label: 'This week', value: `${thisWeekCount}/7` },
            { label: 'This month', value: `${thisMonthCount}` },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={() => {
            setEditName(habit.name);
            setEditEmoji(habit.emoji);
            setEditFrequency(habit.frequency);
            setEditCategory(habit.category);
            setMode('edit');
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)',
            transition: 'all 0.2s',
          }}
        >
          <Edit2 size={14} />
          Edit
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: 'rgba(226,75,74,0.1)',
            border: '0.5px solid rgba(226,75,74,0.2)',
            color: 'rgba(226,75,74,0.9)',
            transition: 'all 0.2s',
          }}
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </>
  );

  const EditMode = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Emoji + Name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => {
            const newEmoji = prompt("Enter a new emoji:", editEmoji);
            if (newEmoji) setEditEmoji(newEmoji);
          }}
          style={{
            fontSize: 28,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            padding: 8,
            cursor: 'pointer',
          }}
        >
          {editEmoji}
        </button>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.14)',
            borderTop: '0.5px solid rgba(255,255,255,0.22)',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            outline: 'none',
          }}
          placeholder="Habit name"
        />
      </div>

      {/* Frequency selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {(['daily', 'weekly', 'monthly'] as const).map(freq => (
          <button
            key={freq}
            onClick={() => setEditFrequency(freq)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              background: editFrequency === freq
                ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 100%)'
                : 'rgba(255,255,255,0.06)',
              border: editFrequency === freq
                ? '0.5px solid rgba(255,255,255,0.3)'
                : '0.5px solid rgba(255,255,255,0.1)',
              borderTop: editFrequency === freq
                ? '0.5px solid rgba(255,255,255,0.5)'
                : '0.5px solid rgba(255,255,255,0.16)',
              color: editFrequency === freq
                ? 'rgba(255,255,255,0.92)'
                : 'rgba(255,255,255,0.4)',
            }}
          >
            {freq.charAt(0).toUpperCase() + freq.slice(1)}
          </button>
        ))}
      </div>

      {/* Category input */}
      <input
        value={editCategory}
        onChange={(e) => setEditCategory(e.target.value as any)}
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '0.5px solid rgba(255,255,255,0.14)',
          borderTop: '0.5px solid rgba(255,255,255,0.22)',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
          color: 'rgba(255,255,255,0.9)',
          outline: 'none',
        }}
        placeholder="Category (Health, Growth, Career...)"
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button
          onClick={() => {
            setEditName(habit.name);
            setEditEmoji(habit.emoji);
            setEditFrequency(habit.frequency);
            setEditCategory(habit.category);
            setMode('view');
          }}
          style={{
            flex: 1,
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Cancel
        </button>
        <button
          disabled={!hasChanges || isSaving}
          onClick={async () => {
            if (!hasChanges || isSaving) return;
            setIsSaving(true);
            await onSave(habit.id, {
              name: editName,
              emoji: editEmoji,
              frequency: editFrequency,
              category: editCategory,
            });
            setIsSaving(false);
            setMode('view');
          }}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 0',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
            background: hasChanges 
              ? 'linear-gradient(160deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.18) 100%)'
              : 'rgba(255,255,255,0.08)',
            border: hasChanges
              ? '0.5px solid rgba(255,255,255,0.3)'
              : '0.5px solid rgba(255,255,255,0.1)',
            borderTop: hasChanges
              ? '0.5px solid rgba(255,255,255,0.5)'
              : '0.5px solid rgba(255,255,255,0.1)',
            color: hasChanges ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,21,32,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 360,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0.1) 100%)',
          border: '0.5px solid rgba(255,255,255,0.16)',
          borderTop: '0.5px solid rgba(255,255,255,0.26)',
          borderRadius: 24,
          padding: 24,
          overflow: 'hidden'
        }}
        className="animate-fade-in-up"
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            zIndex: 10,
          }}
        >
          <X size={16} />
        </button>

        <AnimatePresence mode="wait">
          {mode === 'view' ? (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ViewMode />
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <EditMode />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13,21,32,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 320,
              background: 'linear-gradient(160deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 60%, rgba(255,255,255,0.1) 100%)',
              border: '0.5px solid rgba(255,255,255,0.16)',
              borderTop: '0.5px solid rgba(255,255,255,0.26)',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>
              Delete "{habit.name}"?
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.5 }}>
              This will permanently remove this habit and all its history.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.08)',
                  border: '0.5px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(habit.id);
                  onClose();
                }}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: 'linear-gradient(160deg, rgba(226,75,74,0.35) 0%, rgba(226,75,74,0.18) 100%)',
                  border: '0.5px solid rgba(226,75,74,0.4)',
                  borderTop: '0.5px solid rgba(226,75,74,0.6)',
                  color: 'rgba(255,100,100,0.9)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
