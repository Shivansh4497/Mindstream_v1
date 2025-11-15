// FIX: This file was previously empty. It has been implemented as the EntryCard component.
import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Entry, Sentiment } from '../types';

interface EntryCardProps {
  entry: Entry;
  onTagClick?: (tag: string) => void;
}

const getSentimentClasses = (sentiment: Sentiment | null): string => {
  switch (sentiment) {
    case 'positive':
      return 'bg-green-900/50 text-green-300 ring-green-500/50';
    case 'negative':
      return 'bg-orange-900/50 text-orange-300 ring-orange-500/50';
    case 'neutral':
      return 'bg-gray-700/50 text-gray-300 ring-gray-500/50';
    default:
      return 'bg-gray-700 text-gray-300 ring-gray-600';
  }
};


export const EntryCard: React.FC<EntryCardProps> = ({ entry, onTagClick }) => {
  const entryTime = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  
  const isMicro = entry.text.length < 75;

  if (isMicro) {
    return (
      <div className="bg-dark-surface/80 rounded-2xl p-4 mb-4 shadow-lg animate-fade-in-up transition-transform hover:scale-[1.02] flex items-center gap-3">
        {entry.emoji && <span className="text-2xl">{entry.emoji}</span>}
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap flex-grow">
          {entry.text}
        </p>
        <time className="text-sm text-gray-500 self-start flex-shrink-0">{entryTime}</time>
      </div>
    );
  }

  return (
    <div className="bg-dark-surface rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white pr-2">
          {entry.emoji && <span className="mr-2">{entry.emoji}</span>}
          {entry.title || 'Entry'}
        </h3>
        <time className="text-sm text-gray-400 flex-shrink-0">{entryTime}</time>
      </div>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
        {entry.text}
      </p>
      {(entry.tags && entry.tags.length > 0) || entry.sentiment ? (
        <div className="flex flex-wrap items-center gap-2">
           {entry.sentiment && (
             <div className={`text-xs font-bold py-1 px-2 rounded-full ring-1 ring-inset ${getSentimentClasses(entry.sentiment)}`}>
               {entry.sentiment}
             </div>
           )}
          {entry.tags?.map((tag, index) => (
            <button
              key={index}
              onClick={() => onTagClick?.(tag)}
              className="text-xs bg-brand-teal/20 text-brand-teal font-medium py-1 px-2 rounded-full hover:bg-brand-teal/40 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
