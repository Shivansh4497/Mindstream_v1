import React, { useMemo } from 'react';
import type { Entry, Reflection, AISuggestion } from '../types';
import { getWeekId, getWeekDisplay } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface WeeklyReflectionsProps {
  entries: Entry[];
  weeklyReflections: Reflection[];
  onGenerate: (weekId: string, entriesForWeek: Entry[]) => void;
  onExplore: (summary: string) => void;
  isGenerating: string | null;
  onAddSuggestion: (suggestion: AISuggestion) => void;
}

export const WeeklyReflections: React.FC<WeeklyReflectionsProps> = ({ entries, weeklyReflections, onGenerate, onExplore, isGenerating, onAddSuggestion }) => {
  
  const groupedEntriesByWeek = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach(e => {
      const weekId = getWeekId(new Date(e.timestamp));
      if (!groups[weekId]) {
        groups[weekId] = [];
      }
      groups[weekId].push(e);
    });
    return groups;
  }, [entries]);

  const existingWeekliesMap = useMemo(() => {
    return weeklyReflections.reduce((acc, r) => {
      acc[r.date] = r; // date is the weekId for weekly reflections
      return acc;
    }, {} as Record<string, Reflection>);
  }, [weeklyReflections]);

  const sortedWeekIds = useMemo(() => {
    const allWeekIds = new Set([...Object.keys(groupedEntriesByWeek), ...Object.keys(existingWeekliesMap)]);
    return Array.from(allWeekIds).sort().reverse();
  }, [groupedEntriesByWeek, existingWeekliesMap]);

  if (sortedWeekIds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">No Weekly Reflections Yet</h2>
          <p>Write some journal entries first.<br/>Once you have entries, you can summarize your week here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {sortedWeekIds.map(weekId => {
        const existingReflection = existingWeekliesMap[weekId];
        const entriesForWeek = groupedEntriesByWeek[weekId] || [];
        const isGeneratingForThis = isGenerating === weekId;
        const canGenerate = entriesForWeek.length > 0;

        return (
          <div key={weekId} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getWeekDisplay(weekId)}</h2>
            
            {existingReflection && (
              <div className="mb-4">
                <ReflectionCard reflection={existingReflection} onExplore={onExplore} onAddSuggestion={onAddSuggestion} />
              </div>
            )}

            {canGenerate && (
                 <div className="mt-4">
                 <button
                   onClick={() => onGenerate(weekId, entriesForWeek)}
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
                         {existingReflection
                           ? 'Update weekly reflection'
                           : 'Generate weekly reflection'}
                        </span>
                     </>
                   )}
                 </button>
               </div>
            )}
            
            {!existingReflection && !canGenerate && (
                <div className="text-center text-gray-500 text-sm p-4 bg-dark-surface rounded-lg">
                    You have no journal entries for this week.
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
