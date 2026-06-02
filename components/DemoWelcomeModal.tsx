import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, ArrowRight, X } from 'lucide-react';

interface DemoWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreChat: () => void;
}

export const DemoWelcomeModal: React.FC<DemoWelcomeModalProps> = ({
  isOpen,
  onClose,
  onExploreChat,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Glass backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-brand-indigo/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bg-dark-surface/95 border border-white/10 rounded-2xl p-6 shadow-2xl z-10 overflow-hidden"
          >
            {/* Glowing background highlights */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-brand-teal/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

            {/* Dismiss Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="flex flex-col items-center text-center">
              {/* Header Icon */}
              <div className="w-16 h-16 bg-gradient-to-tr from-brand-teal/20 to-teal-500/20 border border-brand-teal/30 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-teal/10">
                <Database className="w-8 h-8 text-brand-teal animate-pulse" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold font-display text-white mb-3">
                Welcome to your Demo Sandbox!
              </h2>

              {/* Description */}
              <p className="text-gray-300 text-sm leading-relaxed mb-6">
                We've pre-filled your database with <strong className="text-white font-semibold">30+ days of realistic daily reflections, moods, and habits</strong> to simulate a real user. 
                <br /><br />
                Feel free to browse your journal stream or write new entries to see the assistant analyze them in real-time.
              </p>

              {/* CTA Buttons */}
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={onExploreChat}
                  className="w-full bg-brand-teal text-white font-bold py-3 px-5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brand-teal/20"
                >
                  <span>Experience RAG in the Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={onClose}
                  className="w-full bg-white/5 text-gray-300 py-3 px-5 rounded-xl border border-white/5 hover:bg-white/10 hover:text-white transition-all duration-300"
                >
                  Explore Journal Stream first
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
