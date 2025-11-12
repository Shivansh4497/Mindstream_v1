import React, { useMemo } from 'react';
import { getDisplayDate, getFormattedDate } from '../utils/date';
import type { Entry, Reflection } from '../types';
import { EntryCard } from './EntryCard';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface StreamProps {
  entries: Entry[];
  reflections: Record<string, Reflection>;
  onGenerateReflection: (date: string, entries: Entry[]) => void;
  isGeneratingReflection: string | null;
}

export const Stream: React.FC<StreamProps> = ({ entries, reflections, onGenerateReflection, isGeneratingReflection }) => {
  const groupedEntries = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach(entry => {
      const date = getFormattedDate(new Date(entry.timestamp));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    return groups;
  }, [entries]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedEntries]);

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">Your Stream is Empty</h2>
          <p>Use the bar below to add your first thought.<br/>What's on your mind right now?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {sortedDates.map(date => {
        const entriesForDay = groupedEntries[date];
        const reflectionForDay = reflections[date];
        const isGenerating = isGeneratingReflection === date;

        return (
          <div key={date} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>
            
            {reflectionForDay ? (
              <ReflectionCard reflection={reflectionForDay} />
            ) : (
              <div className="mb-4">
                <button
                  onClick={() => onGenerateReflection(date, entriesForDay)}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 bg-dark-surface hover:bg-dark-surface-light disabled:bg-dark-surface/50 disabled:cursor-wait text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 text-brand-teal" />
                      <span>Generate Daily Reflection</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {entriesForDay.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        );
      })}
    </div>
  );
};