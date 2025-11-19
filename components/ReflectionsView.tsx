
import React, { useState, useMemo } from 'react';
import type { Entry, Intention, Reflection, AISuggestion, Habit, HabitLog } from '../types';
import { DailyReflections } from './DailyReflections';
import { WeeklyReflections } from './WeeklyReflections';
import { MonthlyReflections } from './MonthlyReflections';
import { AIStatus } from '../MindstreamApp';

type ReflectionTimeframe = 'daily' | 'weekly' | 'monthly';

interface ReflectionsViewProps {
  entries: Entry[];
  intentions: Intention[];
  habits: Habit[]; // New prop
  habitLogs: HabitLog[]; // New prop
  reflections: Reflection[];
  onGenerateDaily: (date: string, entriesForDay: Entry[]) => void;
  onGenerateWeekly: (weekId: string, entriesForWeek: Entry[]) => void;
  onGenerateMonthly: (monthId: string, entriesForMonth: Entry[]) => void;
  onExploreInChat: (summary: string) => void;
  isGenerating: string | null;
  onAddSuggestion: (suggestion: AISuggestion) => void;
  aiStatus: AIStatus;
  onDebug: () => void;
  debugOutput: string | null;
}

const timeframes: { id: ReflectionTimeframe; label: string }[] = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
];

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({ 
  entries, 
  intentions, 
  habits,
  habitLogs,
  reflections, 
  onGenerateDaily, 
  onGenerateWeekly, 
  onGenerateMonthly, 
  onExploreInChat, 
  isGenerating, 
  onAddSuggestion, 
  aiStatus,
  onDebug,
  debugOutput 
}) => {
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
            onAddSuggestion={onAddSuggestion}
            aiStatus={aiStatus}
            onDebug={onDebug}
            debugOutput={debugOutput}
            // Pass habit data to DailyReflections if needed for UI, 
            // but mainly the onGenerate function will use them from the parent's scope/handler.
            // However, DailyReflections component doesn't necessarily need to *display* habits, 
            // just generate based on them. The handler `onGenerateDaily` in `MindstreamApp` will have access to habits.
        />;
      case 'weekly':
        return <WeeklyReflections entries={entries} weeklyReflections={weekly} onGenerate={onGenerateWeekly} onExplore={onExploreInChat} isGenerating={isGenerating} onAddSuggestion={onAddSuggestion} />;
      case 'monthly':
        return <MonthlyReflections entries={entries} monthlyReflections={monthly} onGenerate={onGenerateMonthly} onExplore={onExploreInChat} isGenerating={isGenerating} onAddSuggestion={onAddSuggestion} />;
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
