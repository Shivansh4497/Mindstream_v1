import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, PenLine, MessageCircle, Mic } from 'lucide-react';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { triggerHaptic } from '../utils/haptics';

interface FABProps {
  onQuickEntry: (text: string, viaVoice: boolean) => void;
  onOpenChat: () => void;
  onVoiceCapture: (text: string, viaVoice: boolean) => void;
}

export const FAB: React.FC<FABProps> = ({ onQuickEntry, onOpenChat, onVoiceCapture }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [writeText, setWriteText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsWriting(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { isListening, startListening, stopListening, isSupported } = useSpeechRecognition({
    onResult: (transcript) => {
      onVoiceCapture(transcript, true);
    },
    onError: (err) => {
      console.error(err);
    }
  });

  const handleWriteSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (writeText.trim()) {
      onQuickEntry(writeText.trim(), false);
      setWriteText('');
      setIsWriting(false);
      setIsOpen(false);
    }
  };

  const staggerVariants = {
    open: { opacity: 1, y: 0, scale: 1 },
    closed: { opacity: 0, y: 20, scale: 0.8 }
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3" ref={menuRef}>
      <AnimatePresence>
        {isWriting && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-dark-surface p-4 rounded-xl shadow-2xl border border-white/10"
          >
            <form onSubmit={handleWriteSubmit} className="flex flex-col gap-3">
              <textarea
                autoFocus
                value={writeText}
                onChange={(e) => setWriteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleWriteSubmit();
                  }
                }}
                placeholder="What's on your mind?"
                className="w-full bg-dark-surface-light rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-brand-teal focus:outline-none"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWriting(false)}
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!writeText.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-teal text-white font-medium disabled:opacity-50 hover:bg-teal-400 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isWriting && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={{ open: { transition: { staggerChildren: 0.05 } }, closed: {} }}
            className="flex flex-col gap-3 items-end mb-2"
          >
            <motion.button
              variants={staggerVariants}
              onPointerDown={(e) => {
                e.preventDefault();
                if (isSupported) {
                   startListening();
                   triggerHaptic('medium');
                } else {
                   alert("Voice not supported");
                }
              }}
              onPointerUp={() => {
                 stopListening();
                 triggerHaptic('light');
                 setIsOpen(false);
              }}
              onPointerCancel={() => {
                 stopListening();
                 setIsOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              <span className="bg-dark-surface text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow border border-white/10 group-hover:text-white transition-colors">
                {isListening ? "Listening..." : "Voice"}
              </span>
              <div className={`p-3 rounded-full shadow-lg text-white transition-colors ${isListening ? 'bg-brand-teal animate-pulse' : 'bg-brand-indigo border border-white/10 group-hover:bg-brand-teal/20'}`}>
                <Mic className="w-5 h-5" />
              </div>
            </motion.button>
            
            <motion.button
              variants={staggerVariants}
              onClick={() => {
                onOpenChat();
                setIsOpen(false);
              }}
              className="flex items-center gap-3 group"
            >
              <span className="bg-dark-surface text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow border border-white/10 group-hover:text-white transition-colors">
                Chat
              </span>
              <div className="bg-brand-indigo border border-white/10 p-3 rounded-full shadow-lg text-white group-hover:bg-brand-teal/20 transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
            </motion.button>
            
            <motion.button
              variants={staggerVariants}
              onClick={() => {
                setIsWriting(true);
              }}
              className="flex items-center gap-3 group"
            >
              <span className="bg-dark-surface text-gray-300 px-3 py-1.5 rounded-lg text-sm shadow border border-white/10 group-hover:text-white transition-colors">
                Write
              </span>
              <div className="bg-brand-indigo border border-white/10 p-3 rounded-full shadow-lg text-white group-hover:bg-brand-teal/20 transition-colors">
                <PenLine className="w-5 h-5" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!isWriting && (
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            triggerHaptic('light');
          }}
          className={`p-4 rounded-full shadow-xl text-white transition-all duration-300 ${isOpen ? 'bg-gray-700 rotate-45' : 'bg-brand-teal hover:bg-teal-400 hover:scale-105'}`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      )}
    </div>
  );
};
