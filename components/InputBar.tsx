import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { celebrate, CelebrationType } from '../utils/celebrations';
import { triggerHaptic } from '../utils/haptics';
import { useToast, Toast } from './Toast';

import { useSpeechRecognition } from '../utils/useSpeechRecognition';

interface InputBarProps {
  onAddEntry: (text: string, viaVoice: boolean) => void;
}

const GUIDED_PROMPTS = [
  "What's one thing I'm grateful for today?",
  "How am I feeling right now, really?",
  "What's taking up most of my headspace?",
  "A small win from today was..."
];

export const InputBar: React.FC<InputBarProps> = ({ onAddEntry }) => {
  const [text, setText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setText(prevText => prevText + (prevText.length > 0 ? ' ' : '') + transcript);
      setUsedVoice(true);
    },
    onError: (error) => {
      switch (error) {
        case 'not-allowed':
          showToast('🎤 Microphone access denied. Please enable in browser settings.', 'error');
          break;
        case 'no-speech':
          showToast('🎤 No speech detected. Try again.', 'warning');
          break;
        case 'network':
          showToast('🎤 Network error. Check your connection.', 'error');
          break;
        case 'audio-capture':
          showToast('🎤 No microphone found. Check your device.', 'error');
          break;
        case 'not-supported':
          showToast('🎤 Voice input not supported in this browser. Try Chrome.', 'warning');
          break;
        default:
          showToast(`🎤 Voice input error: ${error}`, 'error');
      }
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim()) {
      onAddEntry(text.trim(), usedVoice);
      setText('');
      setUsedVoice(false); // Reset voice flag

      // Show success feedback
      showToast('Entry saved ✓', 'success');
      celebrate(CelebrationType.ENTRY_SAVED);
      triggerHaptic('light');
    }
  };

  const handlePromptClick = (prompt: string) => {
    setText(prompt);
  };

  const toggleListening = () => {
    if (!isSupported) {
      showToast('🎤 Voice input not supported in this browser. Try Chrome.', 'warning');
      return;
    }
    if (isListening) {
      stopListening();
      triggerHaptic('light');
    } else {
      startListening();
      triggerHaptic('medium');
    }
  };

  return (
    <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-[14px_16px] border-t border-white/10 z-20 w-full">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar hide-scrollbars">
        {GUIDED_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            onClick={() => handlePromptClick(prompt)}
            className="flex-shrink-0 text-[12px] bg-white/5 hover:bg-white/10 text-white/50 py-1.5 px-3 rounded-full transition-colors whitespace-nowrap max-w-[80vw] truncate"
            style={{ width: 'max-content', maxWidth: '30%' }}
            title={prompt}
          >
            <span className="truncate block">{prompt}</span>
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isListening ? "Listening..." : "What's on your mind?"}
          className="w-full bg-dark-surface-light rounded-xl p-[14px_16px] pr-12 text-[14px] text-white placeholder-white/30 resize-none focus:ring-1 focus:ring-brand-teal focus:outline-none transition-shadow"
          rows={1}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <button
            type="button"
            onClick={toggleListening}
            className={`w-[36px] h-[36px] flex items-center justify-center rounded-full transition-colors ${isListening ? 'bg-brand-teal' : 'bg-transparent hover:bg-white/10'}`}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <MicIcon className={`w-5 h-5 ${isListening ? 'text-brand-indigo' : 'text-white/50'}`} />
          </button>
          {isListening && (
            <div className="absolute top-0 left-0 w-[36px] h-[36px] rounded-full border-2 border-brand-teal animate-pulse-ring pointer-events-none"></div>
          )}
        </div>
      </form>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </footer>
  );
};