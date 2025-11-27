import React, { useRef, useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Message, AISuggestion } from '../types';
import { MessageBubble } from './MessageBubble';
import { speak, stopSpeaking, initializeTTS } from '../utils/tts';

interface ChatViewProps {
  messages: Message[];
  isLoading: boolean;
  onAddSuggestion: (suggestion: AISuggestion) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, isLoading, onAddSuggestion }) => {
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('ttsEnabled');
    return saved ? JSON.parse(saved) : false;
  });
  const lastMessageRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize TTS on mount
  useEffect(() => {
    initializeTTS();
  }, []);

  // Save TTS preference
  useEffect(() => {
    localStorage.setItem('ttsEnabled', JSON.stringify(ttsEnabled));
  }, [ttsEnabled]);

  // Auto-speak AI responses
  useEffect(() => {
    if (!ttsEnabled || isLoading) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender === 'ai' && lastMessage.text && lastMessage.text !== lastMessageRef.current) {
      lastMessageRef.current = lastMessage.text;
      speak(lastMessage.text);
    }
  }, [messages, ttsEnabled, isLoading]);

  // Stop speaking when component unmounts or TTS is disabled
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!ttsEnabled) {
      stopSpeaking();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const toggleTTS = () => {
    setTtsEnabled(!ttsEnabled);
    if (ttsEnabled) {
      stopSpeaking();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* TTS Toggle Button */}
      <div className="flex justify-end p-3 border-b border-white/5">
        <button
          onClick={toggleTTS}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${ttsEnabled
              ? 'bg-brand-teal/20 text-brand-teal border border-brand-teal/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          title={ttsEnabled ? 'Voice enabled' : 'Voice disabled'}
        >
          {ttsEnabled ? (
            <>
              <Volume2 className="w-4 h-4" />
              <span>Voice On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Voice Off</span>
            </>
          )}
        </button>
      </div>

      <main className="flex-grow overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id || index}
            sender={msg.sender}
            text={msg.text}
            suggestions={msg.suggestions}
            onAddSuggestion={onAddSuggestion}
          />
        ))}
        {isLoading && messages[messages.length - 1]?.text !== '' && (
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
    </div>
  );
};
