import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      <main className="flex-grow overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <MessageBubble key={index} sender={msg.sender} text={msg.text} />
        ))}
        {isLoading && (
            <div className="flex items-start gap-3 my-4 justify-start animate-fade-in-up">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-800 to-indigo-900 flex-shrink-0" aria-label="AI avatar"></div>
                <div className="max-w-md lg:max-w-2xl rounded-2xl p-4 text-white bg-dark-surface-light rounded-bl-lg">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </main>
      {/* The duplicate ChatInputBar that was here has been removed. */}
    </div>
  );
};