// FIX: This file was previously empty. It has been implemented as the EntryCard component.
import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Entry, GranularSentiment } from '../types';

interface EntryCardProps {
  entry: Entry;
  onTagClick?: (tag: string) => void;
}

const getSentimentClasses = (sentiment: GranularSentiment | null | undefined): string => {
  switch (sentiment) {
    // Positive
    case 'Joyful': return 'bg-yellow-800/50 text-yellow-300 ring-yellow-500/50';
    case 'Grateful': return 'bg-green-800/50 text-green-300 ring-green-500/50';
    case 'Proud': return 'bg-teal-800/50 text-teal-300 ring-teal-500/50';
    case 'Hopeful': return 'bg-cyan-800/50 text-cyan-300 ring-cyan-500/50';
    case 'Content': return 'bg-lime-800/50 text-lime-300 ring-lime-500/50';
    // Negative
    case 'Anxious': return 'bg-orange-800/50 text-orange-300 ring-orange-500/50';
    case 'Frustrated': return 'bg-red-800/50 text-red-300 ring-red-500/50';
    case 'Sad': return 'bg-blue-800/50 text-blue-300 ring-blue-500/50';
    case 'Overwhelmed': return 'bg-purple-800/50 text-purple-300 ring-purple-500/50';
    case 'Confused': return 'bg-indigo-800/50 text-indigo-300 ring-indigo-500/50';
    // Contemplative
    case 'Reflective': return 'bg-slate-700/50 text-slate-300 ring-slate-500/50';
    case 'Inquisitive': return 'bg-gray-700/50 text-gray-300 ring-gray-500/50';
    case 'Observational': return 'bg-zinc-700/50 text-zinc-300 ring-zinc-500/50';
    default: return 'bg-gray-700 text-gray-300 ring-gray-600';
  }
};


export const EntryCard: React.FC<EntryCardProps> = ({ entry, onTagClick }) => {
  const entryTime = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="bg-dark-surface rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white pr-2">
          {entry.emoji && <span className="mr-2">{entry.emoji}</span>}
          {entry.title}
        </h3>
        <time className="text-sm text-gray-400 flex-shrink-0">{entryTime}</time>
      </div>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
        {entry.text}
      </p>
      {(entry.tags && entry.tags.length > 0) || entry.primary_sentiment ? (
        <div className="flex flex-wrap items-center gap-2">
           {entry.primary_sentiment && (
             <div className={`text-xs font-bold py-1 px-2 rounded-full ring-1 ring-inset ${getSentimentClasses(entry.primary_sentiment)}`}>
               {entry.primary_sentiment}
             </div>
           )}
           {entry.secondary_sentiment && (
             <div className="text-xs font-medium py-1 px-2 rounded-full ring-1 ring-inset ring-gray-500/50 text-gray-300">
                {entry.secondary_sentiment}
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
