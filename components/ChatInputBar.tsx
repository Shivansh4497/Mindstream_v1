import React, { useState, useRef, useEffect } from 'react';
import { MicIcon } from './icons/MicIcon';
import { SendIcon } from './icons/SendIcon';
import { useToast, Toast } from './Toast';

// Web Speech API Type Definitions
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ChatInputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  hasMessages?: boolean;
}

// Initialize Speech Recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSendMessage, isLoading, hasMessages = false }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(recognition);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setText(prevText => prevText + (prevText.length > 0 ? ' ' : '') + finalTranscript);
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);

      // User-friendly error messages
      switch (event.error) {
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
        default:
          showToast(`🎤 Voice input error: ${event.error}`, 'error');
      }
    };

    return () => {
      if (rec) {
        rec.stop();
      }
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast('🎤 Voice input not supported in this browser. Try Chrome.', 'warning');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex-shrink-0 z-20 w-full pb-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-[10px] bg-[#1A3352] border-[0.5px] border-[rgba(255,255,255,0.09)] rounded-[14px] p-[11px_14px] mx-[12px] mt-[8px]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={isListening ? "Listening..." : hasMessages ? "Reply..." : "What's on your mind?"}
          className="flex-1 bg-transparent text-white placeholder-[rgba(255,255,255,0.35)] resize-none focus:outline-none text-[14px] leading-[20px] max-h-[100px] overflow-y-auto min-h-[20px]"
          rows={1}
          disabled={isLoading}
        />
        <div className="flex items-center gap-2">
          {text.trim() ? (
            <button
              type="submit"
              className="w-[36px] h-[36px] flex items-center justify-center bg-brand-teal rounded-full hover:bg-teal-300 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              aria-label="Send message"
              disabled={isLoading || !text.trim()}
            >
              <SendIcon className="w-5 h-5 text-white" />
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={toggleListening}
                className={`w-[36px] h-[36px] flex items-center justify-center rounded-full transition-colors ${isListening ? 'bg-brand-teal' : 'bg-transparent hover:bg-white/10'}`}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
                disabled={isLoading}
              >
                <MicIcon className={`w-5 h-5 ${isListening ? 'text-brand-indigo' : 'text-white/50'}`} />
              </button>
              {isListening && (
                <div className="absolute top-0 left-0 w-[36px] h-[36px] rounded-full border-2 border-brand-teal animate-pulse-ring pointer-events-none"></div>
              )}
            </div>
          )}
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={hideToast} />}
    </div>
  );
};