import React, { useRef, useState } from 'react';
import type { Intention, IntentionStatus } from '../types';
import { PencilIcon } from './icons/PencilIcon';
import { Star, ChevronDown, ChevronUp } from 'lucide-react';
import { celebrate, CelebrationType } from '../utils/celebrations';
import { triggerHaptic } from '../utils/haptics';
import { formatDueDate } from '../utils/etaCalculator';
import { glass } from '../styles/glass';
import { differenceInDays, parseISO } from 'date-fns';

interface IntentionCardProps {
  intention: Intention;
  onToggle: (id: string, currentStatus: IntentionStatus) => void;
  onDelete: (id: string) => void;
  onStarToggle?: (id: string, isStarred: boolean) => void;
  onEdit?: (intention: Intention) => void;
}

export const IntentionCard: React.FC<IntentionCardProps> = ({ intention, onToggle, onDelete, onStarToggle, onEdit }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [pressTimer, setPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const handleToggle = () => {
    const isCompleting = intention.status === 'pending';

    // Trigger the actual toggle
    onToggle(intention.id, intention.status);

    // Only celebrate on completion
    if (isCompleting) {
      // Haptic feedback
      triggerHaptic('success');

      // Confetti celebration
      setTimeout(() => {
        celebrate(CelebrationType.INTENTION_COMPLETE, cardRef.current || undefined);
      }, 100);
    }
  };

  const dueDate = intention.due_date ? new Date(intention.due_date) : null;
  const isLifeGoal = intention.is_life_goal || false;
  let dueDateText = formatDueDate(dueDate, isLifeGoal);
  if (dueDateText === 'No deadline') dueDateText = '';
  const hasNotes = !!intention.notes?.trim();

  const createdAt = parseISO(intention.created_at);
  const parsedDueDate = intention.due_date ? parseISO(intention.due_date) : null;
  const now = new Date();

  const totalDays = parsedDueDate ? differenceInDays(parsedDueDate, createdAt) : null;
  const elapsedDays = differenceInDays(now, createdAt);
  const progressPercent = totalDays && totalDays > 0 ? Math.max(0, Math.min(elapsedDays / totalDays, 1)) * 100 : null;
  const daysRemaining = parsedDueDate ? differenceInDays(parsedDueDate, now) : null;

  return (
    <div 
      ref={cardRef} 
      className="flex flex-col p-4 rounded-[12px] mb-3 transition-all duration-300 animate-fade-in-up"
      style={glass.regular}
      onMouseDown={() => {
        const timer = setTimeout(() => setShowDelete(true), 600);
        setPressTimer(timer);
      }}
      onMouseUp={() => { if (pressTimer) { clearTimeout(pressTimer); setPressTimer(null); } }}
      onMouseLeave={() => { if (pressTimer) { clearTimeout(pressTimer); setPressTimer(null); } }}
      onTouchStart={() => {
        const timer = setTimeout(() => setShowDelete(true), 600);
        setPressTimer(timer);
      }}
      onTouchEnd={() => { if (pressTimer) { clearTimeout(pressTimer); setPressTimer(null); } }}
    >
      <div className="flex items-start">
        <button
          onClick={handleToggle}
          className={`w-6 h-6 mt-0.5 flex-shrink-0 rounded-full border-[1.5px] transition-all flex items-center justify-center cursor-pointer
            ${intention.status === 'completed' 
              ? 'bg-brand-teal border-brand-teal' 
              : 'border-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.05)] hover:border-brand-teal hover:bg-[rgba(56,189,248,0.1)]'
            }
          `}
        >
          {intention.status === 'completed' && (
            <svg className="w-3.5 h-3.5 text-[#0A1628]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-grow mx-4">
          <span className={`text-lg block ${intention.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
            {intention.emoji && <span className="mr-2">{intention.emoji}</span>}
            {intention.text}
          </span>
          {dueDateText && !isLifeGoal && (
            <span className={`text-sm block mt-1 ${intention.status === 'completed' ? 'text-gray-500' : 'text-gray-300'}`}>
              {dueDateText}
            </span>
          )}

          {/* Progress Bar / Life Goal Badge */}
          {isLifeGoal ? (
            <div className="mt-2 mb-1">
              <span className={`inline-block px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${intention.status === 'completed' ? 'bg-white/5 text-gray-500 border border-gray-600/30' : 'bg-[rgba(251,191,36,0.1)] text-amber-400 border border-amber-400/20'}`}>
                ♾️ Life goal
              </span>
            </div>
          ) : intention.status !== 'completed' && parsedDueDate && daysRemaining !== null && progressPercent !== null && totalDays !== null && totalDays > 0 ? (
            <div className="mt-2 mb-1">
              <div className="w-full">
                <div className="h-1 rounded-full bg-white/10 w-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      daysRemaining < 0 
                        ? 'bg-red-400' 
                        : (daysRemaining / totalDays < 0.2) 
                          ? 'bg-amber-400' 
                          : 'bg-brand-teal'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className={`text-[10px] mt-1 font-bold tracking-wider uppercase ${
                  daysRemaining < 0 ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {daysRemaining < 0 ? 'Overdue' : `${daysRemaining} days left`}
                </div>
              </div>
            </div>
          ) : null}
          {/* Notes: inline preview or Add notes prompt */}
          {hasNotes ? (
            <div className="mt-2">
              {/* Inline preview - first ~50 chars */}
              <button
                onClick={() => setShowNotes(!showNotes)}
                className="flex items-center justify-between text-sm text-gray-400 hover:text-brand-teal transition-colors w-full text-left"
              >
                <div className="flex items-center gap-2 truncate pr-4">
                  <span className="text-gray-500 flex-shrink-0">📝</span>
                  <span className="text-gray-300 italic truncate">
                    "{intention.notes!.slice(0, 50)}{intention.notes!.length > 50 ? '...' : ''}"
                  </span>
                </div>
                {intention.notes!.length > 50 && (
                  showNotes ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-gray-500" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
                )}
              </button>

              {/* Expanded full notes */}
              {showNotes && intention.notes!.length > 50 && (
                <div className="mt-2 p-3 bg-dark-surface-light rounded-lg text-sm text-gray-300 whitespace-pre-wrap border-l-2 border-brand-teal/30">
                  {intention.notes}
                </div>
              )}
            </div>
          ) : (
            onEdit && (
              <button
                onClick={() => onEdit(intention)}
                className="mt-2 text-xs text-white/25 hover:text-white transition-colors"
              >
                + Add notes
              </button>
            )
          )}
        </div>

        {/* Star Button */}
        {onStarToggle && (
          <button
            onClick={() => onStarToggle(intention.id, intention.is_starred || false)}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 mr-1 ${intention.is_starred ? 'text-amber-400' : 'text-gray-600 hover:text-amber-400'}`}
            aria-label="Toggle star"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={intention.is_starred ? "url(#glass-star-gradient)" : "none"} stroke={intention.is_starred ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={intention.is_starred ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : ""}>
              {intention.is_starred && (
                <defs>
                  <linearGradient id="glass-star-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                  </linearGradient>
                </defs>
              )}
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        )}

        {/* Edit Button */}
        {onEdit && (
          <button
            onClick={() => onEdit(intention)}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
            aria-label="Edit intention"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        )}

        {showDelete ? (
          <div className="flex items-center gap-1 animate-fade-in">
            <button
              onClick={() => { onDelete(intention.id); setShowDelete(false); }}
              className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDelete(false)}
              className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};