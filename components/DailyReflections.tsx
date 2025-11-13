import React, { useMemo } from 'react';
import type { Entry, Intention, Reflection } from '../types';
import { getDisplayDate, getFormattedDate } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface DailyReflectionsProps {
  entries: Entry[];
  intentions: Intention[];
  dailyReflections: Reflection[];
  onGenerate: (date: string, entries: Entry[]) => void;
  isGenerating: string | null;
}

export const DailyReflections: React.FC<DailyReflectionsProps> = ({ entries, dailyReflections, onGenerate, isGenerating }) => {
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

  const dailyReflectionsMap = useMemo(() => {
    return dailyReflections.reduce((acc, r) => {
        acc[r.date] = r;
        return acc;
    }, {} as Record<string, Reflection>);
  }, [dailyReflections]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedEntries]);

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">Your Reflections</h2>
          <p>Add some thoughts to your Stream to get started.<br/>Reflections about your day will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {sortedDates.map(date => {
        const entriesForDay = groupedEntries[date];
        const reflectionForDay = dailyReflectionsMap[date];
        const isGeneratingForThis = isGenerating === date;
        const hasEntries = entriesForDay && entriesForDay.length > 0;

        return (
          <div key={date} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>
            
            {reflectionForDay && (
              <ReflectionCard reflection={reflectionForDay} />
            )}
            
            {hasEntries && (
              <div className="mt-4">
                <button
                  onClick={() => onGenerate(date, entriesForDay)}
                  disabled={isGeneratingForThis}
                  className="w-full flex items-center justify-center gap-2 bg-dark-surface hover:bg-dark-surface-light disabled:bg-dark-surface/50 disabled:cursor-wait text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  {isGeneratingForThis ? (
                    <>
                      <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 text-brand-teal" />
                      <span>
                        {reflectionForDay
                          ? 'Update your daily reflection'
                          : 'Wanna know how your day was?'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
