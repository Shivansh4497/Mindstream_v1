import React, { useState } from 'react';
import type { Entry } from '../types';

interface EditEntryModalProps {
  entry: Entry;
  onSave: (newText: string) => Promise<void>;
  onCancel: () => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, onSave, onCancel }) => {
  const [text, setText] = useState(entry.text);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanged = text !== entry.text;

  const handleSave = async () => {
    if (!hasChanged || isSaving) return;
    setIsSaving(true);
    await onSave(text);
    // The parent component will close the modal upon successful save
    setIsSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onCancel}
    >
      <div
        className="bg-dark-surface rounded-xl p-6 max-w-2xl w-full flex flex-col shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold font-display text-white mb-4">Edit Entry</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 resize-y focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow mb-6"
          autoFocus
        />
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="bg-dark-surface-light text-white font-bold py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanged || isSaving}
            className="bg-brand-teal text-white font-bold py-3 px-6 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <div className="w-5 h-5 border-2 border-brand-indigo border-t-transparent rounded-full animate-spin"></div>}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
