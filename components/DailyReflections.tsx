
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
    return Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));
  }, [groupedEntries]);

  if (entries.length === 0 && dailyReflections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8 animate-fade-in">
        <div className="max-w-md space-y-6">
          {/* Icon with glow */}
          <div className="flex justify-center">
            <div className="relative">
              <SparklesIcon className="w-16 h-16 text-brand-teal" />
              <div className="absolute inset-0 bg-brand-teal/20 blur-2xl rounded-full" />
            </div>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold font-display text-white mb-2">
              Your Daily Reflections
            </h2>
            <p className="text-gray-400">
              Add thoughts to your Stream and get personalized reflections about your day.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-dark-surface/50 rounded-xl p-4 border border-white/5">
            <p className="text-sm text-gray-400 mb-2">How it works:</p>
            <ol className="text-left text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold">1.</span>
                <span>Write entries in your Stream</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold">2.</span>
                <span>Come back here to generate a reflection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-teal font-bold">3.</span>
                <span>Get insights about patterns and themes</span>
              </li>
            </ol>
          </div>
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
        if (!entriesForDay || entriesForDay.length === 0) return null;
        
        const reflectionForDay = dailyReflectionsMap[date];
        const isGeneratingForThis = isGenerating === date;
        const hasEntries = entriesForDay && entriesForDay.length > 0;
        const isAiDisabled = aiStatus !== 'ready';

        return (
          <div key={date}>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 mb-3 mt-6">{getDisplayDate(date)}</h2>

            <div className="mb-6 space-y-2">
              {reflectionForDay && (
                <ReflectionCard reflection={reflectionForDay} onExplore={onExplore} onAddSuggestion={onAddSuggestion} />
              )}

              {hasEntries && (
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
