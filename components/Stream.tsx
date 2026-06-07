
import React, { useMemo } from 'react';
import { getDisplayDate, getFormattedDate, isSameDay } from '../utils/date';
import type { Entry, Intention, EntrySuggestion, InsightCard, Reflection, Nudge } from '../types';
import { EntryCard } from './EntryCard';
import { InsightCard as InsightCardComponent } from './InsightCard';
import { AutoReflectionCard } from './AutoReflectionCard';
import { TodaysFocusBanner } from './TodaysFocusBanner';
import { EmptyStreamState } from './EmptyStreamState';


interface StreamProps {
  entries: Entry[];
  intentions: Intention[];
  insights: InsightCard[];
  autoReflections: Reflection[];
  nudges: Nudge[];
  onTagClick?: (tag: string) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onAcceptSuggestion: (entryId: string, suggestion: EntrySuggestion) => void;
  onDismissInsight: (insightId: string) => void;
  onAcceptNudge: (nudge: Nudge) => void;
  onDismissNudge: (nudge: Nudge) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

type FeedItem =
  | { type: 'entry'; data: Entry; date: string }
  | { type: 'insight'; data: InsightCard; date: string }
  | { type: 'reflection'; data: Reflection; date: string };

export const Stream: React.FC<StreamProps> = ({
  entries,
  intentions,
  insights,
  autoReflections,
  nudges,
  onTagClick,
  onEditEntry,
  onDeleteEntry,
  onAcceptSuggestion,
  onDismissInsight,
  onAcceptNudge,
  onDismissNudge,
  onLoadMore,
  hasMore,
  isLoadingMore
}) => {
  // Merge all feed items and sort by date
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [
      ...entries.map(e => ({ type: 'entry' as const, data: e, date: e.timestamp })),
      ...insights.map(i => ({ type: 'insight' as const, data: i, date: i.created_at })),
      ...autoReflections.map(r => ({ type: 'reflection' as const, data: r, date: r.timestamp }))
    ];

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, insights, autoReflections]);

  // Group feed items by date
  const groupedFeed = useMemo(() => {
    const groups: Record<string, FeedItem[]> = {};
    feedItems.forEach(item => {
      const date = getFormattedDate(new Date(item.date));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return groups;
  }, [feedItems]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedFeed).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedFeed]);

  const todaysIntentions = useMemo(() => {
    const now = new Date();
    return intentions.filter(i =>
      i.status === 'pending' &&
      i.timeframe === 'daily' &&
      isSameDay(new Date(i.created_at), now)
    );
  }, [intentions]);

  const todayEntries = useMemo(() => entries.filter(e => isSameDay(new Date(e.timestamp), new Date())), [entries]);
  const dominantSentiment = useMemo(() => {
    const counts = todayEntries.reduce((acc, e) => {
      if (e.primary_sentiment) acc[e.primary_sentiment] = (acc[e.primary_sentiment] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [todayEntries]);

  const MOOD_GRADIENTS: Record<string, string> = {
    positive: 'from-teal-900/40 to-transparent',
    neutral: 'from-blue-900/30 to-transparent',
    negative: 'from-amber-900/30 to-transparent',
  };

  const SENTIMENT_VALENCE: Record<string, 'positive'|'neutral'|'negative'> = {
    Joyful: 'positive', Grateful: 'positive', Proud: 'positive', Hopeful: 'positive', Content: 'positive',
    Reflective: 'neutral', Inquisitive: 'neutral', Observational: 'neutral', Confused: 'neutral',
    Anxious: 'negative', Frustrated: 'negative', Overwhelmed: 'negative', Sad: 'negative',
  };

  const SENTIMENT_EMOJIS: Record<string, string> = {
    Joyful: '😄', Grateful: '🙏', Proud: '🌟', Hopeful: '🌱', Content: '😌',
    Reflective: '🤔', Inquisitive: '🧐', Observational: '👀', Confused: '❓',
    Anxious: '😰', Frustrated: '😤', Overwhelmed: '😵', Sad: '😢'
  };

  const gradientClass = dominantSentiment ? MOOD_GRADIENTS[SENTIMENT_VALENCE[dominantSentiment] || 'neutral'] : '';
  const moodEmoji = dominantSentiment ? SENTIMENT_EMOJIS[dominantSentiment] : '';

  if (feedItems.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {todaysIntentions.length > 0 && <TodaysFocusBanner intentions={todaysIntentions} />}
        <EmptyStreamState />
      </div>
    );
  }

  return (
    <div>
      {todayEntries.length > 0 && dominantSentiment && (
        <div className={`h-16 flex items-center px-4 bg-gradient-to-b ${gradientClass}`}>
          <span className="text-gray-300 font-medium text-sm flex items-center gap-2">
            Today {moodEmoji && <span className="text-lg">{moodEmoji}</span>}
          </span>
        </div>
      )}
      {todaysIntentions.length > 0 && <TodaysFocusBanner intentions={todaysIntentions} />}

      <div className="p-4">
        {sortedDates.map(date => {
          const itemsForDay = groupedFeed[date];

          return (
            <div key={date} className="mb-8">
              <h2 className="text-xl font-bold text-white font-display mb-4">{getDisplayDate(date)}</h2>
              {itemsForDay.map((item, index) => {
                if (item.type === 'entry') {
                  return (
                    <EntryCard
                      key={`entry-${item.data.id}`}
                      entry={item.data}
                      onTagClick={onTagClick}
                      onEdit={onEditEntry}
                      onDelete={onDeleteEntry}
                      onAcceptSuggestion={onAcceptSuggestion}
                    />
                  );
                }

                if (item.type === 'insight') {
                  const getColor = (t: string) => {
                    switch (t) {
                      case 'correlation': return 'bg-purple-500';
                      case 'pattern': return 'bg-blue-500';
                      case 'milestone': return 'bg-amber-500';
                      default: return 'bg-brand-teal';
                    }
                  };

                  return (
                    <div key={`insight-${item.data.id}`} className="mb-4 relative group">
                      {/* Dismiss Button (Absolute positioned) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissInsight(item.data.id);
                        }}
                        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                      <InsightCardComponent
                        title={item.data.title}
                        insight={item.data.content}
                        color={getColor(item.data.type)}
                      >
                        <div className="p-4 text-sm text-gray-400 italic bg-white/5 rounded-lg">
                          Analysis Source: {Array.isArray(item.data.metadata?.tags) ? item.data.metadata?.tags.join(', ') : 'Mindstream AI'}
                        </div>
                      </InsightCardComponent>
                    </div>
                  );
                }

                if (item.type === 'reflection') {
                  return (
                    <AutoReflectionCard
                      key={`reflection-${item.data.id}`}
                      reflection={item.data}
                    />
                  );
                }

                return null;
              })}
            </div>
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center mt-6 pb-20">
            <button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2 bg-dark-surface hover:bg-white/10 text-brand-teal text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isLoadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading older thoughts...</span>
                </div>
              ) : (
                "Load older thoughts"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
