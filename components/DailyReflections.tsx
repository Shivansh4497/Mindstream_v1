
import React, { useMemo } from 'react';
import type { Entry, Intention, Reflection, AISuggestion, AIStatus } from '../types';
import { getDisplayDate, getFormattedDate } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface DailyReflectionsProps {
  entries: Entry[];
  intentions: Intention[];
  dailyReflections: Reflection[];
  onGenerate: (date: string, entries: Entry[]) => void;
  onExplore: (summary: string) => void;
  isGenerating: string | null;
  onAddSuggestion: (suggestion: AISuggestion) => void;
  aiStatus: AIStatus;
  onDebug: () => void;
  debugOutput: string | null;
}

const SHOW_DEBUG = false; // Set to true to reveal developer diagnostics

export const DailyReflections: React.FC<DailyReflectionsProps> = ({ entries, dailyReflections, onGenerate, onExplore, isGenerating, onAddSuggestion, aiStatus, onDebug, debugOutput }) => {
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
    const entryDates = Object.keys(groupedEntries);
    const reflectionDates = Object.keys(dailyReflectionsMap);
    const allDates = new Set([...entryDates, ...reflectionDates]);
    return Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedEntries, dailyReflectionsMap]);

  if (entries.length === 0 && dailyReflections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">Your Reflections</h2>
          <p>Add some thoughts to your Stream to get started.<br />Reflections about your day will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {/* --- DEBUGGING UI --- */}
      {SHOW_DEBUG && (
        <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg">
          <h3 className="font-bold text-red-300 mb-2 font-display">Developer Diagnostics</h3>
          <p className="text-sm text-red-200 mb-3">If AI features are not working, click this button. It will attempt one API call and show the raw success or error message below, bypassing any app logic.</p>
          <button
            onClick={onDebug}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Debug AI Connection
          </button>
          {debugOutput && (
            <div className="mt-4 p-3 bg-red-900/30 rounded">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Raw AI Output:</h4>
              <pre className="text-xs text-white whitespace-pre-wrap font-mono">{debugOutput}</pre>
            </div>
          )}
        </div>
      )}
      {/* --- END DEBUGGING UI --- */}

      {sortedDates.map(date => {
        const entriesForDay = groupedEntries[date];
        const reflectionForDay = dailyReflectionsMap[date];
        const isGeneratingForThis = isGenerating === date;
        const hasEntries = entriesForDay && entriesForDay.length > 0;
        const isAiDisabled = aiStatus !== 'ready';

        return (
          <div key={date} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>

            {reflectionForDay && (
              <div className="mb-4">
                <ReflectionCard reflection={reflectionForDay} onExplore={onExplore} onAddSuggestion={onAddSuggestion} />
              </div>
            )}

            {hasEntries && (
              <div className="mt-4">
                <button
                  onClick={() => onGenerate(date, entriesForDay)}
                  disabled={isGeneratingForThis || isAiDisabled}
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
