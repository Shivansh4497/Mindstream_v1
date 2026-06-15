
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
import { glass } from '../styles/glass';
import { Tag } from './Tag';

const mapSentiment = (s: string | null | undefined): 'proud' | 'joyful' | 'frustrated' | 'reflective' | 'content' | undefined => {
  if (!s) return undefined;
  const l = s.toLowerCase();
  if (['proud', 'joyful', 'frustrated', 'reflective', 'content'].includes(l)) return l as any;
  if (['grateful', 'hopeful'].includes(l)) return 'joyful';
  if (['anxious', 'overwhelmed', 'sad', 'confused'].includes(l)) return 'frustrated';
  if (['inquisitive', 'observational'].includes(l)) return 'reflective';
  return undefined;
};

interface EntryCardProps {
  entry: Entry;
  onTagClick?: (tag: string) => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onAcceptSuggestion?: (entryId: string, suggestion: EntrySuggestion) => void;
  isMostRecentOfDay?: boolean;
}

const SENTIMENT_COLORS: Record<string, string> = {
  // Positive
  Joyful: 'border-emerald-400',
  Grateful: 'border-emerald-400',
  Proud: 'border-emerald-400',
  Hopeful: 'border-teal-400',
  Content: 'border-teal-400',
  // Neutral
  Reflective: 'border-blue-400',
  Inquisitive: 'border-blue-400',
  Observational: 'border-gray-400',
  Confused: 'border-gray-400',
  // Negative
  Anxious: 'border-amber-400',
  Frustrated: 'border-amber-400',
  Overwhelmed: 'border-red-400',
  Sad: 'border-red-400',
};

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
    case 'Inquisitive': return 'bg-gray-600/50 text-gray-200 ring-gray-500/50';
    case 'Observational': return 'bg-zinc-700/50 text-zinc-300 ring-zinc-500/50';
    default: return 'bg-gray-600 text-gray-200 ring-gray-600';
  }
};


export const EntryCard: React.FC<EntryCardProps> = ({ entry, onTagClick, onEdit, onDelete, onAcceptSuggestion, isMostRecentOfDay }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isProcessing = entry.emoji === "⏳";
  const isUnprocessed = entry.tags?.includes("Unprocessed");
  const hasSuggestions = entry.suggestions && entry.suggestions.length > 0;
  const isChatTakeaway = entry.source === 'chat_takeaway';

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className={`rounded-[12px] p-[14px] px-4 mb-4 mx-3 shadow-lg animate-fade-in-up transition-transform ${isProcessing ? 'opacity-70' : ''} cursor-pointer`}
      style={isMostRecentOfDay ? glass.highlighted : glass.regular}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Title + Timestamp Row */}
      <div className="flex justify-between items-start mb-2 gap-4">
        <h3 className="flex items-center gap-2">
          {entry.emoji && <span className="text-[20px]">{entry.emoji}</span>}
          <span className="text-[14px] font-medium text-[rgba(255,255,255,0.88)]">{entry.title}</span>
          {isProcessing && <div className="w-4 h-4 border-2 border-brand-teal border-t-transparent rounded-full animate-spin ml-2"></div>}
          {isChatTakeaway && (
            <span className="text-xs font-normal text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full ml-2">
              💬 From Chat
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <time className="text-[11px] text-[rgba(255,255,255,0.22)]">{entryTime}</time>
          {/* Only show menu when expanded */}
          {isExpanded && !isProcessing && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1 -m-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="More options"
              >
                <MoreOptionsIcon className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-dark-surface-light rounded-md shadow-lg py-1 z-10 animate-fade-in">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(entry); setIsMenuOpen(false); }}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-white hover:bg-white/10"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit Entry
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(entry); setIsMenuOpen(false); }}
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

      {isUnprocessed && (
        <div className="text-xs text-gray-400 mb-2 italic">
          Processing unavailable. Saved as draft.
        </div>
      )}

      {/* Body Text */}
      <p className={`text-[13px] text-white/50 leading-[1.5] whitespace-pre-wrap mb-3 ${!isExpanded ? 'line-clamp-2' : ''}`}>
        {entry.text}
      </p>

      {/* Tags Row */}
      {!isProcessing && ((entry.tags && entry.tags.length > 0) || entry.primary_sentiment) && (
        <div className="flex flex-wrap items-center gap-[6px]">
          {entry.primary_sentiment && (
            <Tag label={entry.primary_sentiment} sentiment={mapSentiment(entry.primary_sentiment)} />
          )}
          {entry.secondary_sentiment && (
            <Tag label={entry.secondary_sentiment} sentiment={mapSentiment(entry.secondary_sentiment)} />
          )}
          {entry.tags?.map((tag, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (tag !== "Unprocessed") onTagClick?.(tag);
              }}
              className="appearance-none p-0 bg-transparent border-none cursor-pointer"
            >
              <Tag label={tag} />
            </button>
          ))}
        </div>
      )}

      {/* Expanded State: Suggestions */}
      {isExpanded && hasSuggestions && !isProcessing && (
        <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
          <div className="text-[10px] font-bold text-brand-teal uppercase tracking-wider mb-2 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            Mindstream Suggests
          </div>
          <div className="flex flex-col gap-2">
            {entry.suggestions!.map((suggestion, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptSuggestion?.(entry.id, suggestion);
                }}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-brand-indigo/50 hover:bg-brand-indigo border border-brand-teal/20 hover:border-brand-teal/50 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  {suggestion.type === 'habit' && <div className="p-1.5 rounded-full bg-rose-500/20 text-rose-400"><PlusCircleIcon className="w-4 h-4" /></div>}
                  {suggestion.type === 'intention' && <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400"><PlusCircleIcon className="w-4 h-4" /></div>}
                  {suggestion.type === 'reflection' && <div className="p-1.5 rounded-full bg-sky-500/20 text-sky-400"><ChatBubbleIcon className="w-4 h-4" /></div>}

                  <div>
                    <div className="text-[13px] font-medium text-white group-hover:text-brand-teal transition-colors">
                      {suggestion.label}
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize">
                      {suggestion.type === 'habit' ? `${suggestion.data?.frequency || 'daily'} Habit` :
                        suggestion.type === 'intention' ? `${suggestion.data?.timeframe || 'weekly'} Goal` : 'Discuss in Chat'}
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
