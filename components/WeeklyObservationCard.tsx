import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface WeeklyObservationCardProps {
  pattern_text: string;
  confidence: number;
  onDismiss: () => void;
  onExploreInChat: (context: string) => void;
}

export const WeeklyObservationCard: React.FC<WeeklyObservationCardProps> = ({
  pattern_text,
  confidence,
  onDismiss,
  onExploreInChat
}) => {
  if (!pattern_text) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 mb-4 p-4 rounded-xl border border-brand-teal/30 
                 bg-brand-teal/10 relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-teal" />
          <span className="text-xs font-medium text-brand-teal uppercase tracking-wider">
            This Week's Pattern
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Pattern text */}
      <p className="text-gray-100 text-sm leading-relaxed mb-3">
        {pattern_text}
      </p>

      {/* Confidence indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-teal rounded-full"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(confidence * 100)}% confidence
          </span>
        </div>
        <button
          onClick={() => onExploreInChat(
            `I want to explore this pattern you noticed: "${pattern_text}"`
          )}
          className="text-xs text-brand-teal hover:text-brand-teal/70 
                     underline transition-colors"
        >
          Explore in Chat →
        </button>
      </div>
    </motion.div>
  );
};
