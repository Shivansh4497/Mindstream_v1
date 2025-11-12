// FIX: This file was previously empty. It has been implemented as the EntryCard component.
import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Entry } from '../types';

interface EntryCardProps {
  entry: Entry;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry }) => {
  const entryTime = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-dark-surface rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-white">{entry.title || 'Entry'}</h3>
        <time className="text-sm text-gray-400">{entryTime}</time>
      </div>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
        {entry.text}
      </p>
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((tag, index) => (
            <span key={index} className="text-xs bg-brand-teal/20 text-brand-teal font-medium py-1 px-2 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};