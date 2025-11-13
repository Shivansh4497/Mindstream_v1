import React, { useMemo } from 'react';
import type { Entry, Reflection } from '../types';
import { getMonthId, getMonthDisplay } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface MonthlyReflectionsProps {
  entries: Entry[];
  monthlyReflections: Reflection[];
  onGenerate: (monthId: string, entriesForMonth: Entry[]) => void;
  onExplore: (summary: string) => void;
  isGenerating: string | null;
}

export const MonthlyReflections: React.FC<MonthlyReflectionsProps> = ({ entries, monthlyReflections, onGenerate, onExplore, isGenerating }) => {
  
  const groupedEntriesByMonth = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach(e => {
      const monthId = getMonthId(new Date(e.timestamp));
      if (!groups[monthId]) {
        groups[monthId] = [];
      }
      groups[monthId].push(e);
    });
    return groups;
  }, [entries]);

  const existingMonthliesMap = useMemo(() => {
    return monthlyReflections.reduce((acc, r) => {
      acc[r.date] = r; // date is the monthId for monthly reflections
      return acc;
    }, {} as Record<string, Reflection>);
  }, [monthlyReflections]);

  const sortedMonthIds = useMemo(() => {
    const allMonthIds = new Set([...Object.keys(groupedEntriesByMonth), ...Object.keys(existingMonthliesMap)]);
    return Array.from(allMonthIds).sort().reverse();
  }, [groupedEntriesByMonth, existingMonthliesMap]);

  if (sortedMonthIds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">No Monthly Reflections Yet</h2>
          <p>Write some journal entries first.<br/>Once you have entries, you can summarize your month here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {sortedMonthIds.map(monthId => {
        const existingReflection = existingMonthliesMap[monthId];
        const entriesForMonth = groupedEntriesByMonth[monthId] || [];
        const isGeneratingForThis = isGenerating === monthId;
        const canGenerate = entriesForMonth.length > 0;

        return (
          <div key={monthId} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getMonthDisplay(monthId)}</h2>
            
            {existingReflection && (
              <ReflectionCard reflection={existingReflection} onExplore={onExplore} />
            )}

            {canGenerate && (
              <div className="mt-4">
                <button
                  onClick={() => onGenerate(monthId, entriesForMonth)}
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
                          ? 'Update monthly reflection'
                          : 'Generate monthly reflection'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {!existingReflection && !canGenerate && (
                <div className="text-center text-gray-500 text-sm p-4 bg-dark-surface rounded-lg">
                    You have no journal entries for this month.
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
