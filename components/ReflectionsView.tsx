import React, { useState, useMemo } from 'react';
import type { Reflection } from '../types';
import { ReflectionList } from './ReflectionList';
import { WeeklyReflections } from './WeeklyReflections';
import { MonthlyReflections } from './MonthlyReflections';

type ReflectionTimeframe = 'daily' | 'weekly' | 'monthly';

interface ReflectionsViewProps {
  reflections: Reflection[];
  onGenerateWeekly: (weekId: string, dailyReflections: Reflection[]) => void;
  onGenerateMonthly: (monthId: string, dailyReflections: Reflection[]) => void;
  isGenerating: string | null;
}

const timeframes: { id: ReflectionTimeframe; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
];

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({ reflections, onGenerateWeekly, onGenerateMonthly, isGenerating }) => {
  const [activeTimeframe, setActiveTimeframe] = useState<ReflectionTimeframe>('daily');

  const { daily, weekly, monthly } = useMemo(() => {
    const daily: Reflection[] = [];
    const weekly: Reflection[] = [];
    const monthly: Reflection[] = [];
    reflections.forEach(r => {
      if (r.type === 'daily') daily.push(r);
      else if (r.type === 'weekly') weekly.push(r);
      else if (r.type === 'monthly') monthly.push(r);
    });
    return { daily, weekly, monthly };
  }, [reflections]);

  const renderContent = () => {
    switch(activeTimeframe) {
      case 'daily':
        return <ReflectionList reflections={daily} />;
      case 'weekly':
        return <WeeklyReflections dailyReflections={daily} weeklyReflections={weekly} onGenerate={onGenerateWeekly} isGenerating={isGenerating} />;
      case 'monthly':
        return <MonthlyReflections dailyReflections={daily} monthlyReflections={monthly} onGenerate={onGenerateMonthly} isGenerating={isGenerating} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center overflow-x-auto">
          <div className="flex items-center gap-2">
              {timeframes.map(tf => (
                  <button
                      key={tf.id}
                      onClick={() => setActiveTimeframe(tf.id)}
                      className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                          activeTimeframe === tf.id
                          ? 'bg-brand-teal text-brand-indigo'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                      {tf.label}
                  </button>
              ))}
          </div>
      </header>
      <main className="flex-grow overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};
