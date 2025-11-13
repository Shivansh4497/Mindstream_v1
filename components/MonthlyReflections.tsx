import React, { useMemo } from 'react';
import type { Reflection } from '../types';
import { getMonthId, getMonthDisplay } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface MonthlyReflectionsProps {
  dailyReflections: Reflection[];
  monthlyReflections: Reflection[];
  onGenerate: (monthId: string, dailyReflections: Reflection[]) => void;
  isGenerating: string | null;
}

export const MonthlyReflections: React.FC<MonthlyReflectionsProps> = ({ dailyReflections, monthlyReflections, onGenerate, isGenerating }) => {
  
  const groupedDailies = useMemo(() => {
    const groups: Record<string, Reflection[]> = {};
    dailyReflections.forEach(r => {
      const monthId = getMonthId(new Date(r.date));
      if (!groups[monthId]) {
        groups[monthId] = [];
      }
      groups[monthId].push(r);
    });
    return groups;
  }, [dailyReflections]);

  const existingMonthliesMap = useMemo(() => {
    return monthlyReflections.reduce((acc, r) => {
      acc[r.date] = r; // date is the monthId for monthly reflections
      return acc;
    }, {} as Record<string, Reflection>);
  }, [monthlyReflections]);

  const sortedMonthIds = useMemo(() => {
    return Object.keys(groupedDailies).sort().reverse();
  }, [groupedDailies]);

  const currentMonthId = getMonthId(new Date());

  if (sortedMonthIds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">No Monthly Reflections Yet</h2>
          <p>Generate some daily reflections first.<br/>Once a month is complete, you can summarize it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {sortedMonthIds.map(monthId => {
        const existingReflection = existingMonthliesMap[monthId];
        const dailiesForMonth = groupedDailies[monthId];
        const isGeneratingForThis = isGenerating === monthId;
        const isPastMonth = monthId !== currentMonthId;

        return (
          <div key={monthId} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getMonthDisplay(monthId)}</h2>
            {existingReflection ? (
              <ReflectionCard reflection={existingReflection} />
            ) : isPastMonth ? (
              <div className="mb-4">
                <button
                  onClick={() => onGenerate(monthId, dailiesForMonth)}
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
                      <span>Generate Monthly Reflection</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
                <div className="text-center text-gray-500 text-sm p-4 bg-dark-surface rounded-lg">
                    This month is still in progress. Check back later to generate a reflection.
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
