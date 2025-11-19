
// FIX: This file was previously empty. It has been implemented as the EntryCard component.
import React, { useState, useEffect, useRef } from 'react';
// FIX: Corrected the import path to be relative.
import type { Entry, GranularSentiment, EntrySuggestion } from '../types';
import { MoreOptionsIcon } from './icons/MoreOptionsIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PlusCircleIcon } from './icons/PlusCircleIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

interface EntryCardProps {
  entry: Entry;
  onTagClick?: (tag: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onAcceptSuggestion?: (entryId: string, suggestion: EntrySuggestion) => void;
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


export const EntryCard: React.FC<EntryCardProps> = ({ entry, onTagClick, onEdit, onDelete, onAcceptSuggestion }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isProcessing = entry.emoji === "⏳";
  const isUnprocessed = entry.tags?.includes("Unprocessed");
  const hasSuggestions = entry.suggestions && entry.suggestions.length > 0;

  const entryTime = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`bg-dark-surface rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up transition-transform hover:scale-[1.02] ${isProcessing ? 'opacity-70' : ''}`}>
      
      <div className="flex justify-between items-start mb-3 gap-4">
        <div className="flex-grow">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {entry.emoji && <span>{entry.emoji}</span>}
                <span>{entry.title}</span>
                {isProcessing && <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin ml-2"></div>}
            </h3>
            {isUnprocessed && (
                <div className="text-xs text-gray-500 mt-1 italic">
                    AI processing unavailable. Saved as draft.
                </div>
            )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasSuggestions && !isProcessing && (
            <button
                onClick={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
                className={`p-2 rounded-full transition-all duration-300 ${isSuggestionsOpen ? 'bg-brand-teal/20 text-brand-teal rotate-12' : 'text-brand-teal hover:bg-brand-teal/10 hover:scale-110 animate-pulse'}`}
                aria-label="View AI Suggestions"
            >
                <SparklesIcon className="w-5 h-5" />
            </button>
          )}

          <time className="text-sm text-gray-400">{entryTime}</time>
          
          {!isProcessing && (
            <div className="relative" ref={menuRef}>
                <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 -m-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="More options"
                >
                <MoreOptionsIcon className="w-5 h-5" />
                </button>
                {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-dark-surface-light rounded-md shadow-lg py-1 z-10 animate-fade-in">
                    <button
                    onClick={() => { onEdit(entry); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10"
                    >
                    <PencilIcon className="w-4 h-4" />
                    Edit Entry
                    </button>
                    <button
                    onClick={() => { onDelete(entry); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
                    >
                    <TrashIcon className="w-4 h-4" />
                    Delete Entry
                    </button>
                </div>
                )}
            </div>
          )}
        </div>
      </div>
      
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
        {entry.text}
      </p>

      {!isProcessing && ((entry.tags && entry.tags.length > 0) || entry.primary_sentiment) && (
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
              onClick={() => tag !== "Unprocessed" && onTagClick?.(tag)}
              className={`text-xs font-medium py-1 px-2 rounded-full transition-colors ${tag === "Unprocessed" ? 'bg-gray-700 text-gray-400 cursor-default' : 'bg-brand-teal/20 text-brand-teal hover:bg-brand-teal/40'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Drawer */}
      {isSuggestionsOpen && hasSuggestions && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in-up">
              <div className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-2 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  Mindstream Suggests
              </div>
              <div className="flex flex-col gap-2">
                  {entry.suggestions!.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => onAcceptSuggestion?.(entry.id, suggestion)}
                        className="flex items-center justify-between w-full p-3 rounded-lg bg-brand-indigo/50 hover:bg-brand-indigo border border-brand-teal/20 hover:border-brand-teal/50 transition-all group text-left"
                      >
                          <div className="flex items-center gap-3">
                                {suggestion.type === 'habit' && <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400"><PlusCircleIcon className="w-4 h-4" /></div>}
                                {suggestion.type === 'intention' && <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400"><PlusCircleIcon className="w-4 h-4" /></div>}
                                {suggestion.type === 'reflection' && <div className="p-1.5 rounded-full bg-sky-500/20 text-sky-400"><ChatBubbleIcon className="w-4 h-4" /></div>}
                                
                                <div>
                                    <div className="text-sm font-medium text-white group-hover:text-brand-teal transition-colors">
                                        {suggestion.label}
                                    </div>
                                    <div className="text-[10px] text-gray-400 capitalize">
                                        {suggestion.type === 'habit' ? `${suggestion.data.frequency} Habit` : 
                                         suggestion.type === 'intention' ? `${suggestion.data.timeframe} Goal` : 'Discuss in Chat'}
                                    </div>
                                </div>
                          </div>
                          <div className="text-brand-teal opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">
                              {suggestion.type === 'reflection' ? 'Start Chat' : 'Add'} &rarr;
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};
