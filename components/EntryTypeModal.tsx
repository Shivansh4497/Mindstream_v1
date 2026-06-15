import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Target, RotateCw } from 'lucide-react';
import { addDays, endOfWeek, endOfMonth, format } from 'date-fns';
import { PremiumCalendar } from './PremiumCalendar';

interface EntryTypeModalProps {
  text: string;
  context?: 'today' | 'goals';
  onClose: () => void;
  onSaveHabit: (text: string, frequency: 'daily' | 'weekly' | 'monthly') => void;
  onSaveTask: (text: string, deadline: string | null, isLifeGoal: boolean) => void;
}

export const EntryTypeModal: React.FC<EntryTypeModalProps> = ({ text, context = 'today', onClose, onSaveHabit, onSaveTask }) => {
  const [mode, setMode] = useState<'type_selection' | 'task_deadline'>(context === 'goals' ? 'task_deadline' : 'type_selection');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedCustomDate, setSelectedCustomDate] = useState<Date | null>(null);

  const handleTaskOption = (option: 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'this_year' | 'life_goal') => {
    const today = new Date();
    if (option === 'today') onSaveTask(text, today.toISOString(), false);
    else if (option === 'tomorrow') onSaveTask(text, addDays(today, 1).toISOString(), false);
    else if (option === 'this_week') onSaveTask(text, endOfWeek(today, { weekStartsOn: 1 }).toISOString(), false);
    else if (option === 'this_month') onSaveTask(text, endOfMonth(today).toISOString(), false);
    else if (option === 'this_year') onSaveTask(text, new Date(today.getFullYear(), 11, 31).toISOString(), false);
    else if (option === 'life_goal') onSaveTask(text, null, true);
  };

  const getPillStyle = (isHovered: boolean = false) => ({
    background: isHovered 
      ? 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.1) 100%)' 
      : 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderTop: '0.5px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.85)',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(13,21,32,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 100,
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
          maxWidth: 400,
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

        <div style={{ marginBottom: 24, paddingRight: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            New Entry
          </div>
          <div style={{ fontSize: 18, color: 'white', lineHeight: 1.4, fontWeight: 400 }}>
            "{text}"
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'type_selection' ? (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Save as...</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => onSaveHabit(text, 'daily')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-white/10 transition-colors border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <RotateCw size={20} className="mb-2 text-emerald-400" />
                  <span className="text-sm font-medium text-white/90">Daily Habit</span>
                </button>
                <button
                  onClick={() => onSaveHabit(text, 'weekly')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-white/10 transition-colors border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <RotateCw size={20} className="mb-2 text-blue-400" />
                  <span className="text-sm font-medium text-white/90">Weekly Habit</span>
                </button>
                <button
                  onClick={() => onSaveHabit(text, 'monthly')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-white/10 transition-colors border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <RotateCw size={20} className="mb-2 text-purple-400" />
                  <span className="text-sm font-medium text-white/90">Monthly Habit</span>
                </button>
                <button
                  onClick={() => setMode('task_deadline')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl hover:bg-white/10 transition-colors border border-white/10"
                  style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)' }}
                >
                  <Target size={20} className="mb-2 text-brand-teal" />
                  <span className="text-sm font-medium text-white">Task</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="deadline"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Due date...</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {context === 'today' ? (
                  <>
                    <button
                      onClick={() => handleTaskOption('today')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleTaskOption('tomorrow')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={() => handleTaskOption('this_week')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => handleTaskOption('this_month')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      This Month
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleTaskOption('this_week')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      This Week
                    </button>
                    <button
                      onClick={() => handleTaskOption('this_month')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => handleTaskOption('this_year')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-white/10 text-white/90 hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      This Year
                    </button>
                    <button
                      onClick={() => handleTaskOption('life_goal')}
                      className="py-3 px-4 rounded-xl text-sm font-medium transition-colors border border-brand-teal/30 text-brand-teal hover:bg-brand-teal/10"
                      style={{ background: 'rgba(56,189,248,0.06)' }}
                    >
                      Life Goal
                    </button>
                  </>
                )}
              </div>

              {showCalendar ? (
                <div style={{ marginTop: 8 }}>
                  <PremiumCalendar 
                    value={selectedCustomDate} 
                    onChange={(date) => setSelectedCustomDate(date)} 
                  />
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      onClick={() => setShowCalendar(false)}
                      style={{ padding: '8px 16px', borderRadius: 12, fontSize: 13, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!selectedCustomDate}
                      onClick={() => {
                        if (selectedCustomDate) {
                          onSaveTask(text, selectedCustomDate.toISOString(), false);
                        }
                      }}
                      style={{
                        padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                        background: selectedCustomDate ? 'linear-gradient(160deg, #38bdf8 0%, #0ea5e9 100%)' : 'rgba(255,255,255,0.08)',
                        color: selectedCustomDate ? '#0A1628' : 'rgba(255,255,255,0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      Save Custom Date
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 8, display: 'flex' }}>
                  <button
                    onClick={() => setShowCalendar(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.06)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'background 0.2s'
                    }}
                    className="hover:bg-white/10"
                  >
                    <CalendarIcon size={16} />
                    Pick Custom Date
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
