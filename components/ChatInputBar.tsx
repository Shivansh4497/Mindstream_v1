import React, { useState } from 'react';
import { SendIcon } from './icons/SendIcon';

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

// FIX: Create the ChatInputBar component for the chat interface.
export const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-20">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Ask me anything..."
          className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-brand-teal p-3 rounded-full hover:bg-teal-300 transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
          aria-label="Send message"
          disabled={isLoading || !text.trim()}
        >
          <SendIcon className="w-6 h-6 text-brand-indigo" />
        </button>
      </form>
    </footer>
  );
};