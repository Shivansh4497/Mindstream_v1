import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

// FIX: Create a functional MessageBubble component.
interface MessageBubbleProps {
  sender: 'user' | 'ai';
  text: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, text }) => {
    const { profile } = useAuth();
  const isUser = sender === 'user';

  return (
    <div className={`flex items-start gap-3 my-4 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-800 to-indigo-900 flex-shrink-0" aria-label="AI avatar"></div>
      )}
      <div
        className={`max-w-md lg:max-w-2xl rounded-2xl p-4 text-white ${
          isUser
            ? 'bg-brand-teal/80 rounded-br-lg'
            : 'bg-dark-surface-light rounded-bl-lg'
        }`}
      >
        <div className="prose prose-invert prose-p:my-0">
             <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
      {isUser && profile && (
          <img 
            src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.email}`} 
            alt="User avatar"
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
      )}
    </div>
  );
};