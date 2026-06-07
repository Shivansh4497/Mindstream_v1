import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';
import { celebrate, CelebrationType } from '../utils/celebrations';
import { triggerHaptic } from '../utils/haptics';
import { useToast, Toast } from './Toast';
import { getStreamPrompt } from '../services/smartDefaults';

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
  const [placeholder, setPlaceholder] = useState(getStreamPrompt());

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
    <footer className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-3 border-t border-white/10 z-20">
      <div className="flex gap-2 mb-2 overflow-x-auto pb-2 -mx-3 px-3">
        {GUIDED_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            onClick={() => handlePromptClick(prompt)}
            className="flex-shrink-0 text-sm bg-white/10 hover:bg-white/20 text-white py-1 px-3 rounded-full transition-colors whitespace-nowrap"
          >
            {prompt}
          </button>
        ))}
      </div>
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
          placeholder={isListening ? "Listening..." : placeholder}
          className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-brand-teal focus:outline-none transition-shadow"
          rows={1}
        />
        <div className="relative">
          <button
            type="button"
            onClick={toggleListening}
            className={`p-3 rounded-full transition-colors ${isListening ? 'bg-brand-teal' : 'hover:bg-white/10'}`}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
          >
            <MicIcon className={`w-6 h-6 ${isListening ? 'text-brand-indigo' : 'text-white'}`} />
          </button>
          {isListening && (
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-2 border-brand-teal animate-pulse-ring pointer-events-none"></div>
          )}
        </div>
        <button type="submit" className="bg-brand-teal p-3 rounded-full hover:bg-teal-300 transition-colors shadow-lg" aria-label="Send thought">
          <SendIcon className="w-6 h-6 text-white" />
        </button>
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