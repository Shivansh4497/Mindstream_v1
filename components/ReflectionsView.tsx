import React, { useState, useMemo, useEffect } from 'react';
import type { Entry, Intention, Reflection, AISuggestion, Habit, HabitLog } from '../types';
import { DailyReflections } from './DailyReflections';
import { WeeklyReflections } from './WeeklyReflections';
import { MonthlyReflections } from './MonthlyReflections';
import { SentimentTimeline } from './SentimentTimeline';
import { HabitHeatmap } from './HabitHeatmap';
import { CorrelationDashboard } from './CorrelationDashboard';
import { AIStatus } from '../MindstreamApp';
import { supabase } from '../services/supabaseClient';

type ReflectionTimeframe = 'daily' | 'weekly' | 'monthly' | 'insights';

interface ReflectionsViewProps {
  entries: Entry[];
  intentions: Intention[];
  reflections: Reflection[];
  habits: Habit[];
  habitLogs: HabitLog[];
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
  { id: 'insights', label: 'Insights' },
];

export const ReflectionsView: React.FC<ReflectionsViewProps> = ({
  entries,
  intentions,
  reflections,
  habits,
  habitLogs,
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
  const [insights, setInsights] = useState<{
    correlation: string | null;
    sentiment: string | null;
    heatmaps: Array<{ habitIndex: number; text: string }>;
  }>({ correlation: null, sentiment: null, heatmaps: [] });

  // Fetch insights when Insights tab is active
  useEffect(() => {
    if (activeTimeframe !== 'insights') return;

    async function fetchInsights() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('chart_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(20); // Get latest insights

      if (!data || data.length === 0) {
        console.log('No insights found');
        return;
      }

      // Group by type and get the latest
      const correlation = data.find(i => i.insight_type === 'correlation');
      const sentiment = data.find(i => i.insight_type === 'sentiment');
      const heatmaps = data
        .filter(i => i.insight_type === 'heatmap')
        .map(i => ({
          habitIndex: i.metadata?.habit_index ?? 0,
          text: i.insight_text
        }))
        .sort((a, b) => a.habitIndex - b.habitIndex);

      setInsights({
        correlation: correlation?.insight_text ?? null,
        sentiment: sentiment?.insight_text ?? null,
        heatmaps
      });
    }

    fetchInsights();
  }, [activeTimeframe]);

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
    switch (activeTimeframe) {
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
        />;
      case 'weekly':
        return <WeeklyReflections entries={entries} weeklyReflections={weekly} onGenerate={onGenerateWeekly} onExplore={onExploreInChat} isGenerating={isGenerating} onAddSuggestion={onAddSuggestion} />;
      case 'monthly':
        return <MonthlyReflections entries={entries} monthlyReflections={monthly} onGenerate={onGenerateMonthly} onExplore={onExploreInChat} isGenerating={isGenerating} onAddSuggestion={onAddSuggestion} />;
      case 'insights':
        return (
          <div className="p-4">
            <header className="mb-6">
              < h2 className="text-2xl font-bold font-display text-white mb-2" > Data Insights</h2 >
              <p className="text-sm text-gray-400">Visualize the connection between your habits and feelings.</p>
            </header >

            <div className="space-y-6">
              <CorrelationDashboard
                entries={entries}
                habits={habits}
                habitLogs={habitLogs}
                days={14}
                insight={insights.correlation}
              />

              <SentimentTimeline
                entries={entries}
                days={14}
                insight={insights.sentiment}
              />

              {habits.slice(0, 3).map((habit, idx) => (
                <HabitHeatmap
                  key={habit.id}
                  habit={habit}
                  logs={habitLogs.filter(log => log.habit_id === habit.id)}
                  days={30}
                  insight={insights.heatmaps[idx]?.text ?? null}
                />
              ))}
            </div>
          </div >
        );
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
              className={`py-2 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTimeframe === tf.id
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
