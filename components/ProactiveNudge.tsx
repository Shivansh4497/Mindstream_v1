import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from './icons/SparklesIcon';
import { XIcon } from 'lucide-react';
import { Nudge } from '../types';

interface ProactiveNudgeProps {
    nudge: Nudge;
    onAccept: (nudge: Nudge) => void;
    onDismiss: (nudge: Nudge) => void;
}

export const ProactiveNudge: React.FC<ProactiveNudgeProps> = ({ nudge, onAccept, onDismiss }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="bg-gradient-to-r from-brand-teal/10 to-brand-indigo/20 border border-brand-teal/30 rounded-xl p-4 mb-6 relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal" />

            <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-teal/20 rounded-full">
                    <SparklesIcon className="w-5 h-5 text-brand-teal animate-pulse" />
                </div>

                <div className="flex-grow">
                    <h3 className="text-sm font-bold text-brand-teal uppercase tracking-wider mb-1">Mindstream Insight</h3>
                    <p className="text-white text-sm md:text-base leading-relaxed mb-3">
                        {nudge.message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onAccept(nudge)}
                            className="px-4 py-2 bg-brand-teal text-white text-sm font-bold rounded-lg hover:bg-teal-300 transition-colors shadow-lg shadow-brand-teal/20"
                        >
                            Let's Chat
                        </button>
                        <button
                            onClick={() => onDismiss(nudge)}
                            className="px-4 py-2 bg-white/5 text-gray-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => onDismiss(nudge)}
                    className="text-gray-500 hover:text-white transition-colors"
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
};
