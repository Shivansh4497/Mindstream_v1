import React, { useState, useMemo } from 'react';
import type { Entry, Intention, Reflection } from '../types';
import { DailyReflections } from './DailyReflections';
import { WeeklyReflections } from './WeeklyReflections';
import { MonthlyReflections } from './MonthlyReflections';

type ReflectionTimeframe = 'daily' | 'weekly' | 'monthly';

interface ReflectionsViewProps {
  entries: Entry[];
  intentions: Intention[];
  reflections: Reflection[];
  onGenerateDaily: (date: string, entriesForDay: Entry[]) => void;
  onGenerateWeekly: (weekId: string, entriesForWeek: Entry[]) => void;
  onGenerateMonthly: (monthId: string, entriesForMonth: Entry[]) => void;
  onExploreInChat: (summary: string) => void;
  isGenerating: string | null;
}

const timeframes: { id: ReflectionTimeframe; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
];

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({ entries, intentions, reflections, onGenerateDaily, onGenerateWeekly, onGenerateMonthly, onExploreInChat, isGenerating }) => {
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
        return <DailyReflections 
            entries={entries}
            intentions={intentions}
            dailyReflections={daily} 
            onGenerate={onGenerateDaily}
            onExplore={onExploreInChat}
            isGenerating={isGenerating}
        />;
      case 'weekly':
        return <WeeklyReflections entries={entries} weeklyReflections={weekly} onGenerate={onGenerateWeekly} onExplore={onExploreInChat} isGenerating={isGenerating} />;
      case 'monthly':
        return <MonthlyReflections entries={entries} monthlyReflections={monthly} onGenerate={onGenerateMonthly} onExplore={onExploreInChat} isGenerating={isGenerating} />;
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
