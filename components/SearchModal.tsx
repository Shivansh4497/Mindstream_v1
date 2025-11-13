import React, { useState, useMemo, useEffect } from 'react';
// FIX: Corrected the import path to be relative.
import type { Entry, Reflection } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { getDisplayDate } from '../utils/date';

interface SearchModalProps {
  entries: Entry[];
  reflections: Reflection[];
  onClose: () => void;
  initialQuery?: string;
}

type SearchResult = 
  | { type: 'entry'; data: Entry }
  | { type: 'reflection'; data: Reflection };


export const SearchModal: React.FC<SearchModalProps> = ({ entries, reflections, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<'all' | 'entries' | 'reflections'>('all');
  
  // Add keyboard listener for Esc key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const searchResults = useMemo(() => {
    const lowerCaseQuery = query.toLowerCase().trim();
    if (!lowerCaseQuery) {
      return [];
    }

    const results: SearchResult[] = [];

    if (filter === 'all' || filter === 'entries') {
      entries.forEach(entry => {
        const titleMatch = entry.title?.toLowerCase().includes(lowerCaseQuery);
        const textMatch = entry.text.toLowerCase().includes(lowerCaseQuery);
        const tagsMatch = entry.tags?.some(tag => tag.toLowerCase().includes(lowerCaseQuery));
        if (titleMatch || textMatch || tagsMatch) {
          results.push({ type: 'entry', data: entry });
        }
      });
    }

    if (filter === 'all' || filter === 'reflections') {
      reflections.forEach(reflection => {
        if (reflection.summary.toLowerCase().includes(lowerCaseQuery)) {
          results.push({ type: 'reflection', data: reflection });
        }
      });
    }

    return results.sort((a, b) => {
        const dateA = new Date(a.type === 'entry' ? a.data.timestamp : a.data.date).getTime();
        const dateB = new Date(b.type === 'entry' ? b.data.timestamp : b.data.date).getTime();
        return dateB - dateA;
    });

  }, [query, entries, reflections, filter]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-brand-teal/50 rounded">{part}</span>
          ) : (
            part
          )
        )}
      </span>
    );
  };
  
  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex justify-center p-4 pt-[10vh] animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-dark-surface rounded-xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-4 border-b border-white/10 flex items-center gap-4">
          <SearchIcon className="w-6 h-6 text-gray-400"/>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your thoughts..."
            className="w-full bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <XCircleIcon className="w-7 h-7 text-gray-400" />
          </button>
        </header>

        <div className="flex-shrink-0 p-3 border-b border-white/10 flex items-center gap-2">
            <span className="text-sm text-gray-400">Filter:</span>
            <button onClick={() => setFilter('all')} className={`text-sm py-1 px-3 rounded-full ${filter === 'all' ? 'bg-brand-teal text-brand-indigo font-semibold' : 'bg-white/10 hover:bg-white/20'}`}>All</button>
            <button onClick={() => setFilter('entries')} className={`text-sm py-1 px-3 rounded-full ${filter === 'entries' ? 'bg-brand-teal text-brand-indigo font-semibold' : 'bg-white/10 hover:bg-white/20'}`}>Entries</button>
            <button onClick={() => setFilter('reflections')} className={`text-sm py-1 px-3 rounded-full ${filter === 'reflections' ? 'bg-brand-teal text-brand-indigo font-semibold' : 'bg-white/10 hover:bg-white/20'}`}>Reflections</button>
        </div>

        <main className="flex-grow overflow-y-auto p-4">
            {query.trim() === '' && (
                <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <p>Start typing to search your entries and reflections.</p>
                </div>
            )}
            {query.trim() !== '' && searchResults.length === 0 && (
                 <div className="h-full flex items-center justify-center text-center text-gray-500">
                    <p>No results found for "{query}".</p>
                </div>
            )}
            {searchResults.map((result, index) => (
                <div key={`${result.type}-${result.type === 'entry' ? result.data.id : result.data.id}-${index}`} className="p-4 mb-3 bg-dark-surface-light rounded-lg hover:bg-white/5 transition-colors">
                    {result.type === 'entry' && (
                        <>
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-white">{highlightText(result.data.title || 'Entry', query)}</h4>
                                <span className="text-xs text-gray-400">{getDisplayDate(result.data.timestamp)}</span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2">
                                {highlightText(result.data.text, query)}
                            </p>
                        </>
                    )}
                    {result.type === 'reflection' && (
                         <>
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-white">Daily Reflection</h4>
                                <span className="text-xs text-gray-400">{getDisplayDate(result.data.date)}</span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2">
                                {highlightText(result.data.summary, query)}
                            </p>
                        </>
                    )}
                </div>
            ))}
        </main>
      </div>
    </div>
  );
};
