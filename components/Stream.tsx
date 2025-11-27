
import React, { useMemo } from 'react';
import { getDisplayDate, getFormattedDate, isSameDay } from '../utils/date';
import type { Entry, Intention, EntrySuggestion, InsightCard, Reflection } from '../types';
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
  onTagClick?: (tag: string) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onAcceptSuggestion: (entryId: string, suggestion: EntrySuggestion) => void;
  onDismissInsight: (insightId: string) => void;
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
  onTagClick,
  onEditEntry,
  onDeleteEntry,
  onAcceptSuggestion,
  onDismissInsight,
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
      {todaysIntentions.length > 0 && <TodaysFocusBanner intentions={todaysIntentions} />}
      <div className="p-4">
        {sortedDates.map(date => {
          const itemsForDay = groupedFeed[date];

          return (
            <div key={date} className="mb-8">
              <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>
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
                  return (
                    <InsightCardComponent
                      key={`insight-${item.data.id}`}
                      insight={item.data}
                      onDismiss={onDismissInsight}
                    />
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
