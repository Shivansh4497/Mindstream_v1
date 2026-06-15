import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { triggerHaptic } from '../utils/haptics';
import { useToast, Toast } from './Toast';
import { MicIcon } from './icons/MicIcon';
import { glass } from '../styles/glass';

interface SharedInputBarProps {
  placeholder: string;
  onSubmit: (text: string, actionType?: 'habit' | 'intention', usedVoice?: boolean, habitFrequency?: 'daily' | 'weekly' | 'monthly') => void;
  actionContext: 'stream' | 'life-today' | 'life-goals' | 'chat';
  isLoading?: boolean;
}

export const SharedInputBar: React.FC<SharedInputBarProps> = ({
  placeholder,
  onSubmit,
  actionContext,
  isLoading = false
}) => {
  const [text, setText] = useState('');
  const [usedVoice, setUsedVoice] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      setText(prev => prev + (prev.length > 0 ? ' ' : '') + transcript);
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
    if (!text.trim() || isLoading) return;

    onSubmit(text.trim(), undefined, usedVoice, undefined);
    
    setText('');
    setUsedVoice(false);
    if (isListening) {
      stopListening();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
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
    <div className="flex-shrink-0 z-20 w-full flex flex-col pb-safe" style={{ background: '#0D1520' }}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-[10px] rounded-[14px] p-[11px_14px] mx-[12px] my-[10px]"
        style={glass.input}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening..." : placeholder}
          className="flex-1 bg-transparent text-[13px] text-white placeholder-[rgba(255,255,255,0.22)] resize-none focus:outline-none min-h-[20px] max-h-[100px] overflow-y-auto"
          rows={1}
          disabled={isLoading}
        />
        <div className="flex items-center gap-2">
          {actionContext !== 'life-today' && text.trim() && actionContext !== 'stream' && actionContext !== 'life-goals' ? (
             <button
                type="submit"
                className="w-[34px] h-[34px] flex items-center justify-center bg-brand-teal rounded-full hover:bg-teal-300 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                aria-label="Send message"
                disabled={isLoading}
             >
             </button>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={toggleListening}
              className={`w-[34px] h-[34px] rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-brand-teal text-[#0A1628]' : 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.15)]'}`}
              aria-label="Start voice input"
              disabled={isLoading}
            >
              <MicIcon className="w-[15px] h-[15px]" />
            </button>
            {isListening && (
              <div className="absolute top-0 left-0 w-[34px] h-[34px] rounded-full border-2 border-brand-teal animate-pulse-ring pointer-events-none"></div>
            )}
          </div>
        </div>
      </form>

      <Toast message={toast.message} type={toast.type} isVisible={toast.isVisible} onClose={hideToast} />
    </div>
  );
};
