
import React, { useMemo } from 'react';
import { getDisplayDate, getFormattedDate, isSameDay } from '../utils/date';
import type { Entry, Intention, EntrySuggestion } from '../types';
import { EntryCard } from './EntryCard';
import { TodaysFocusBanner } from './TodaysFocusBanner';

interface StreamProps {
  entries: Entry[];
  intentions: Intention[];
  onTagClick?: (tag: string) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onAcceptSuggestion: (entryId: string, suggestion: EntrySuggestion) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const Stream: React.FC<StreamProps> = ({ 
    entries, 
    intentions, 
    onTagClick, 
    onEditEntry, 
    onDeleteEntry, 
    onAcceptSuggestion,
    onLoadMore,
    hasMore,
    isLoadingMore
}) => {
  const groupedEntries = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach(entry => {
      const date = getFormattedDate(new Date(entry.timestamp));
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });
    return groups;
  }, [entries]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedEntries]);

  const todaysIntentions = useMemo(() => {
    const now = new Date();
    return intentions.filter(i => 
      i.status === 'pending' && 
      i.timeframe === 'daily' && 
      isSameDay(new Date(i.created_at), now)
    );
  }, [intentions]);

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {todaysIntentions.length > 0 && <TodaysFocusBanner intentions={todaysIntentions} />}
        <div className="flex-grow flex items-center justify-center text-center text-gray-400 p-4">
            <div>
                <h2 className="text-2xl font-bold font-display text-white mb-2">Your Stream is Empty</h2>
                <p>Use the bar below to add your first thought.<br/>What's on your mind right now?</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {todaysIntentions.length > 0 && <TodaysFocusBanner intentions={todaysIntentions} />}
      <div className="p-4">
        {sortedDates.map(date => {
          const entriesForDay = groupedEntries[date];

          return (
            <div key={date} className="mb-8">
              <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>
              {entriesForDay.map(entry => (
                <EntryCard 
                  key={entry.id} 
                  entry={entry} 
                  onTagClick={onTagClick} 
                  onEdit={onEditEntry}
                  onDelete={onDeleteEntry}
                  onAcceptSuggestion={onAcceptSuggestion}
                />
              ))}
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
