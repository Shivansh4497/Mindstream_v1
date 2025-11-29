import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendIcon } from './icons/SendIcon';
import { ETASelector } from './ETASelector';
import type { ETAPreset } from '../utils/etaCalculator';

interface IntentionsInputBarProps {
  onAddIntention: (text: string, dueDate: Date | null, isLifeGoal: boolean) => void;
}

export const IntentionsInputBar: React.FC<IntentionsInputBarProps> = ({ onAddIntention }) => {
  const [text, setText] = useState('');
  const [showETASelector, setShowETASelector] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ETAPreset>('this_week');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const [customDate, setCustomDate] = useState<Date | undefined>();

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim()) {
      setShowETASelector(true);
    }
  };

  const handleConfirmETA = () => {
    if (text.trim()) {
      const isLifeGoal = selectedPreset === 'life';
      onAddIntention(text.trim(), selectedDueDate, isLifeGoal);
      setText('');
      setShowETASelector(false);
      setSelectedPreset('this_week'); // Reset to default
      setSelectedDueDate(null);
      setCustomDate(undefined);
    }
  };

  const handleCancel = () => {
    setShowETASelector(false);
  };

  const handlePresetSelect = (preset: ETAPreset, dueDate: Date | null) => {
    setSelectedPreset(preset);
    setSelectedDueDate(dueDate);
  };

  return (
    <>
      <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-40">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What do you want to achieve?"
            className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
          />
          <button
            type="submit"
            className="bg-brand-teal p-3 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
            aria-label="Add intention"
            disabled={!text.trim()}
          >
            <SendIcon className="w-6 h-6 text-brand-indigo" />
          </button>
        </form>
      </footer>

      {/* ETA Selector Modal */}
      <AnimatePresence>
        {showETASelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-dark-surface rounded-2xl p-6 shadow-2xl border border-white/10"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-1">Set Your Timeline</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{text}</p>
              </div>

              <ETASelector
                selectedPreset={selectedPreset}
                onSelectPreset={handlePresetSelect}
                customDate={customDate}
                onCustomDateChange={setCustomDate}
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmETA}
                  className="flex-1 px-4 py-3 bg-brand-teal hover:bg-teal-400 rounded-lg text-brand-indigo font-medium transition-colors"
                >
                  Create Intention
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
