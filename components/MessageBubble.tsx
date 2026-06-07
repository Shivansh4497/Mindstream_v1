import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { AISuggestion, ExtractionChip } from '../types';
import { ActionableSuggestion } from './ActionableSuggestion';
import { ExtractionChipComponent } from './ExtractionChip';

interface MessageBubbleProps {
  sender: 'user' | 'ai';
  text: string;
  suggestions?: AISuggestion[];
  onAddSuggestion: (suggestion: AISuggestion) => void;
  extraction?: ExtractionChip;
  onConfirmExtraction?: (chip: ExtractionChip) => void;
  onUndoExtraction?: (chip: ExtractionChip) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  sender, 
  text, 
  suggestions, 
  onAddSuggestion,
  extraction,
  onConfirmExtraction,
  onUndoExtraction
}) => {
  const { profile } = useAuth();
  const isUser = sender === 'user';

  return (
    <div className="flex flex-col w-full">
      <div className={`flex items-start gap-3 my-4 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-800 to-indigo-900 flex-shrink-0" aria-label="Mindstream avatar"></div>
        )}
        <div
          className={`max-w-md lg:max-w-2xl rounded-2xl text-white ${isUser
            ? 'bg-brand-teal/80 rounded-br-lg'
            : 'bg-dark-surface-light rounded-bl-lg'
            }`}
        >
          <div className="prose prose-invert prose-p:my-0 p-4 w-full overflow-x-auto">
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
          </div>
          {suggestions && suggestions.length > 0 && (
            <div className="p-3 border-t border-brand-teal/20 flex flex-col gap-2">
              {suggestions.map((suggestion, index) => (
                <ActionableSuggestion
                  key={index}
                  suggestion={suggestion}
                  onAdd={() => onAddSuggestion(suggestion)}
                />
              ))}
            </div>
          )}
        </div>
        {isUser && profile && (
          <img
            src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.email}`}
            alt="User avatar"
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
      </div>
      {!isUser && extraction && extraction.status !== 'dismissed' && (
        <ExtractionChipComponent
          chip={extraction}
          onConfirm={onConfirmExtraction}
          onUndo={onUndoExtraction}
        />
      )}
    </div>
  );
};
