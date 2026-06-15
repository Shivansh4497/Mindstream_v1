import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import { AISuggestion, ExtractionChip } from '../types';
import { ActionableSuggestion } from './ActionableSuggestion';
import { ExtractionChipComponent } from './ExtractionChip';
import { glass } from '../styles/glass';

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
          <div 
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)'
            }}
            aria-label="Mindstream avatar"
          >
            ms
          </div>
        )}
        <div
          className={`w-fit overflow-x-hidden ${isUser
            ? 'ml-auto text-[rgba(255,255,255,0.9)]'
            : 'text-[rgba(255,255,255,0.75)]'
            } p-[11px_13px] max-w-[85%] text-[13px] leading-[1.55]`}
          style={{
             ...(isUser ? glass.highlighted : glass.regular),
             borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px'
          }}
        >
          <div className="prose prose-invert prose-p:my-0 w-full overflow-x-auto text-inherit text-[13px] leading-[1.55] prose-p:text-inherit prose-headings:text-inherit prose-strong:text-inherit prose-a:text-inherit prose-ul:text-inherit prose-ol:text-inherit prose-li:text-inherit">
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
