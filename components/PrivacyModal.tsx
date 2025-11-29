import React from 'react';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-dark-surface rounded-xl p-8 max-w-md w-full text-center shadow-2xl animate-fade-in-up">
        <h2 className="text-2xl font-bold font-display text-white mb-4">Welcome to Mindstream</h2>
        <p className="text-gray-300 mb-6">
          Mindstream wants to help you reflect. Your thoughts are 100% private and encrypted. They are securely stored in the cloud and can only be viewed by you.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-brand-teal text-white font-bold py-3 px-6 rounded-full hover:bg-teal-300 transition-all duration-300 shadow-lg"
        >
          I Understand, Let's Begin
        </button>
      </div>
    </div>
  );
};