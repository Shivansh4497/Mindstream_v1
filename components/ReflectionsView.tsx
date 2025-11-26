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
import { InsightDeck } from './InsightDeck';
import { InsightCard } from './InsightCard';
import { DailyPulse } from './DailyPulse';

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
  const [showCharts, setShowCharts] = useState(false);
  const [insights, setInsights] = useState<{
    dailyPulse: string | null;
    correlation: string | null;
    sentiment: string | null;
    heatmaps: Array<{ habitIndex: number; text: string }>;
  }>({ dailyPulse: null, correlation: null, sentiment: null, heatmaps: [] });

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
        .order('insight_date', { ascending: false })
        .limit(1); // Get latest daily insights

      if (!data || data.length === 0) {
        console.log('No insights found');
        return;
      }

      const latestInsight = data[0];
      const heatmaps = Array.isArray(latestInsight.heatmap_insights)
        ? latestInsight.heatmap_insights.map((text: string, idx: number) => ({
          habitIndex: idx,
          text
        }))
        : [];

      setInsights({
        dailyPulse: latestInsight.daily_pulse ?? null,
        correlation: latestInsight.correlation_insight ?? null,
        sentiment: latestInsight.sentiment_insight ?? null,
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
            <DailyPulse
              summary={insights.dailyPulse || "Keep tracking your habits and mood to unlock personalized insights."}
              isExpanded={showCharts}
              onToggle={() => setShowCharts(!showCharts)}
            />

            {showCharts && (
              <div className="py-4">
                <InsightDeck>
                  {/* Card 1: Correlation (The Moat) */}
                  <InsightCard
                    title="The Moat: Habit ↔ Mood"
                    insight={insights.correlation || "Analyzing your patterns..."}
                    color="bg-brand-teal"
                  >
                    <div className="h-[300px] w-full">
                      <CorrelationDashboard
                        entries={entries}
                        habits={habits}
                        habitLogs={habitLogs}
                        days={14}
                      // No insight prop passed here, so no duplicate box
                      />
                    </div>
                  </InsightCard>

                  {/* Card 2: Sentiment (Mood Flow) */}
                  <InsightCard
                    title="Mood Flow"
                    insight={insights.sentiment || "Tracking your emotional trends..."}
                    color="bg-indigo-500"
                  >
                    <div className="h-[200px] w-full">
                      <SentimentTimeline
                        entries={entries}
                        days={14}
                      />
                    </div>
                  </InsightCard>

                  {/* Cards 3+: Habits */}
                  {habits.slice(0, 3).map((habit, idx) => (
                    <InsightCard
                      key={habit.id}
                      title={`Consistency: ${habit.name}`}
                      insight={insights.heatmaps[idx]?.text || "Building your streak..."}
                      color="bg-purple-500"
                    >
                      <div className="h-[200px] w-full">
                        <HabitHeatmap
                          habit={habit}
                          logs={habitLogs.filter(log => log.habit_id === habit.id)}
                          days={30}
                        />
                      </div>
                    </InsightCard>
                  ))}
                </InsightDeck>
              </div>
            )}
          </div>
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
