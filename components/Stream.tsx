
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
}

export const Stream: React.FC<StreamProps> = ({ entries, intentions, onTagClick, onEditEntry, onDeleteEntry, onAcceptSuggestion }) => {
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
      </div>
    </div>
  );
};
