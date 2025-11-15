import React from 'react';
import type { Intention } from '../types';

interface TodaysFocusBannerProps {
  intentions: Intention[];
}

export const TodaysFocusBanner: React.FC<TodaysFocusBannerProps> = ({ intentions }) => {
  if (intentions.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 bg-dark-surface p-3 border-b border-white/10 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-brand-teal flex-shrink-0">Today's Focus:</span>
        <div className="flex-grow overflow-x-auto whitespace-nowrap text-sm text-gray-300">
          {intentions.map((intention, index) => (
            <span key={intention.id}>
              {index > 0 && <span className="mx-2 text-gray-500">&bull;</span>}
              {intention.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
