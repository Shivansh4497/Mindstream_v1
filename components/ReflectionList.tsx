import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Reflection } from '../types';
import { ReflectionCard } from './ReflectionCard';
import { getDisplayDate } from '../utils/date';

interface ReflectionListProps {
  reflections: Record<string, Reflection>;
}

export const ReflectionList: React.FC<ReflectionListProps> = ({ reflections }) => {
  const sortedReflections = Object.values(reflections).sort(
    // FIX: Add explicit types for sort parameters to resolve TS error.
    (a: Reflection, b: Reflection) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (sortedReflections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">Your Reflections</h2>
          <p>Generate a daily reflection from your Stream to see it here.<br/>It's a great way to find patterns in your thoughts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      {/* FIX: Add explicit type for map parameter to resolve TS error. */}
      {sortedReflections.map((reflection: Reflection) => (
        <div key={reflection.id} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(reflection.date)}</h2>
            <ReflectionCard reflection={reflection} />
        </div>
      ))}
    </div>
  );
};