import React from 'react';

interface DeleteConfirmationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div 
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
        onClick={onCancel}
    >
      <div 
        className="bg-dark-surface rounded-xl p-8 max-w-md w-full text-center shadow-2xl animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold font-display text-white mb-4">Delete Entry?</h2>
        <p className="text-gray-300 mb-8">
          Are you sure you want to permanently delete this entry? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-dark-surface-light text-white font-bold py-3 px-6 rounded-full hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors shadow-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
