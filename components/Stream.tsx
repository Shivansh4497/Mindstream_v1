import React, { useMemo } from 'react';
import { getDisplayDate, getFormattedDate } from '../utils/date';
import type { Entry } from '../types';
import { EntryCard } from './EntryCard';

interface StreamProps {
  entries: Entry[];
}

export const Stream: React.FC<StreamProps> = ({ entries }) => {
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

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-400 p-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-white mb-2">Your Stream is Empty</h2>
          <p>Use the bar below to add your first thought.<br/>What's on your mind right now?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {sortedDates.map(date => {
        const entriesForDay = groupedEntries[date];

        return (
          <div key={date} className="mb-8">
            <h2 className="text-xl font-bold text-gray-200 font-display mb-4">{getDisplayDate(date)}</h2>
            {entriesForDay.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
