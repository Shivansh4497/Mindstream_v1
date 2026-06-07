import React, { useEffect, useState } from 'react';
import { ExtractionChip } from '../types';

const ICONS = {
  create_habit: '🔁',
  log_habit: '✅',
  create_goal: '🎯'
};

const LABELS = {
  create_habit: 'Added to habits',
  log_habit: 'Habit logged',
  create_goal: 'Added to goals'
};

interface Props {
  chip: ExtractionChip;
  onConfirm?: (chip: ExtractionChip) => void;
  onUndo?: (chip: ExtractionChip) => void;
}

export const ExtractionChipComponent: React.FC<Props> = ({ chip, onConfirm, onUndo }) => {
  const [showUndo, setShowUndo] = useState(chip.status === 'confirmed');
  
  // Auto-hide undo after 8 seconds
  useEffect(() => {
    if (chip.status === 'confirmed') {
      const timer = setTimeout(() => setShowUndo(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [chip.status]);

  // Definite — auto-confirmed, show undo
  if (chip.commitment_level === 'definite' && chip.status === 'confirmed') {
    return (
      <div className="mt-2 ml-11 flex items-center gap-2 animate-fade-in-up">
        <span className="text-xs bg-dark-surface-light border border-white/10 
                         text-gray-300 rounded-full px-3 py-1 flex items-center gap-1.5">
          {ICONS[chip.action]} {LABELS[chip.action]}: <strong>"{chip.name}"</strong>
          {showUndo && (
            <button
              onClick={() => onUndo?.(chip)}
              className="ml-2 text-brand-teal underline text-xs hover:text-brand-teal/70"
            >
              Undo
            </button>
          )}
        </span>
      </div>
    );
  }

  // Aspirational — ask for confirmation
  if (chip.commitment_level === 'aspirational' && chip.status === 'pending') {
    return (
      <div className="mt-2 ml-11 flex items-center gap-2 animate-fade-in-up">
        <span className="text-xs text-gray-400">
          {ICONS[chip.action]} Want to track <strong>"{chip.name}"</strong>?
        </span>
        <button
          onClick={() => onConfirm?.(chip)}
          className="text-xs bg-brand-teal/20 text-brand-teal border border-brand-teal/30 
                     rounded-full px-3 py-1 hover:bg-brand-teal/30 transition-colors"
        >
          Yes, track it
        </button>
        <button
          onClick={() => onUndo?.(chip)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          No
        </button>
      </div>
    );
  }

  return null;
};
