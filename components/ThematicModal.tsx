import React from 'react';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ThematicModalProps {
  tag: string;
  onClose: () => void;
  onViewEntries: () => void;
  onGenerateReflection: () => void;
  isGenerating: boolean;
  reflectionResult: string | null;
}

export const ThematicModal: React.FC<ThematicModalProps> = ({
  tag,
  onClose,
  onViewEntries,
  onGenerateReflection,
  isGenerating,
  reflectionResult,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-dark-surface rounded-xl p-6 max-w-lg w-full shadow-2xl animate-fade-in-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold font-display text-white">
            Exploring '<span className="text-brand-teal">{tag}</span>'
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10">
            <XCircleIcon className="w-7 h-7 text-gray-400" />
          </button>
        </header>

        <main className="mb-6">
          <p className="text-gray-300 mb-6">
            You can either explore all entries with this tag, or generate a unique reflection that analyzes this theme across your entire journal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
                onClick={onViewEntries}
                className="flex-1 flex items-center justify-center gap-2 bg-dark-surface-light hover:bg-white/10 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                <SearchIcon className="w-5 h-5" />
                View all entries
            </button>
            <button
                onClick={onGenerateReflection}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 bg-dark-surface-light hover:bg-white/10 disabled:bg-dark-surface/50 disabled:cursor-wait text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                 {isGenerating ? (
                    <>
                        <div className="w-5 h-5 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                        <span>Generating...</span>
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5 text-brand-teal" />
                        <span>Generate thematic reflection</span>
                    </>
                )}
            </button>
          </div>
        </main>

        {reflectionResult && (
            <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 border border-brand-teal/30 rounded-lg p-5 shadow-lg animate-fade-in">
                <div className="flex items-center mb-3">
                    <SparklesIcon className="w-6 h-6 text-brand-teal mr-3" />
                    <h3 className="text-lg font-bold text-white font-display">Your Thematic Reflection</h3>
                </div>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{reflectionResult}</p>
            </div>
        )}
      </div>
    </div>
  );
};
