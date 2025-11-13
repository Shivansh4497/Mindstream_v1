import React, { useMemo } from 'react';
import type { Reflection } from '../types';
import { getWeekId, getWeekDisplay } from '../utils/date';
import { ReflectionCard } from './ReflectionCard';
import { SparklesIcon } from './icons/SparklesIcon';

interface WeeklyReflectionsProps {
  dailyReflections: Reflection[];
  weeklyReflections: Reflection[];
  onGenerate: (weekId: string, dailyReflections: Reflection[]) => void;
  isGenerating: string | null;
}

export const WeeklyReflections: React.FC<WeeklyReflectionsProps> = ({ dailyReflections, weeklyReflections, onGenerate, isGenerating }) => {
  
  const groupedDailies = useMemo(() => {
    const groups: Record<string, Reflection[]> = {};
    dailyReflections.forEach(r => {
      const weekId = getWeekId(new Date(r.date));
      if (!groups[weekId]) {
        groups[weekId] = [];
      }
      groups[weekId].push(r);
    });
    return groups;
  }, [dailyReflections]);

  const existingWeekliesMap = useMemo(() => {
    return weeklyReflections.reduce((acc, r) => {
      acc[r.date] = r; // date is the weekId for weekly reflections
      return acc;
    }, {} as Record<string, Reflection>);
  }, [weeklyReflections]);

  const sortedWeekIds = useMemo(() => {
    // Also include weeks that have a reflection but maybe no underlying dailies visible anymore
    const allWeekIds = new Set([...Object.keys(groupedDailies), ...Object.keys(existingWeekliesMap)]);
    return Array.from(allWeekIds).sort().reverse();
  }, [groupedDailies, existingWeekliesMap]);

  const currentWeekId = getWeekId(new Date());

  if (sortedWeekIds.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">No Weekly Reflections Yet</h2>
          <p>Generate some daily reflections first.<br/>Once a week is complete, you can summarize it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 animate-fade-in-up">
      {sortedWeekIds.map(weekId => {
        const existingReflection = existingWeekliesMap[weekId];
        const dailiesForWeek = groupedDailies[weekId] || [];
        const isGeneratingForThis = isGenerating === weekId;
        const isPastWeek = weekId < currentWeekId; // Correct check for past weeks

        const canGenerate = dailiesForWeek.length > 0 && isPastWeek;

        return (
          <div key={weekId} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getWeekDisplay(weekId)}</h2>
            
            {existingReflection && (
              <ReflectionCard reflection={existingReflection} />
            )}

            {(canGenerate || existingReflection) && (
                 <div className="mt-4">
                 <button
                   onClick={() => onGenerate(weekId, dailiesForWeek)}
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
                           ? 'Update your weekly reflection'
                           : 'Wanna know how your week was?'}
                        </span>
                     </>
                   )}
                 </button>
               </div>
            )}

            {!existingReflection && !isPastWeek && (
                <div className="text-center text-gray-500 text-sm p-4 bg-dark-surface rounded-lg">
                    This week is still in progress. Check back later to generate a reflection.
                </div>
            )}
            
          </div>
        );
      })}
    </div>
  );
};
