import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { View } from './NavBar';

interface FTUEStep {
    id: number;
    tab: View;
    title: string;
    description: string;
    emoji: string;
    cta?: string;
}

const FTUE_STEPS: FTUEStep[] = [
    {
        id: 1,
        tab: 'stream',
        title: 'Welcome to Your Journal',
        description: "Write your thoughts here. I'll help you spot patterns over time.",
        emoji: '📓',
        cta: 'Try writing something!'
    },
    {
        id: 2,
        tab: 'habits',
        title: 'Track Daily Habits',
        description: "Add habits you want to build. I'll track your streaks and progress.",
        emoji: '🔄'
    },
    {
        id: 3,
        tab: 'goals',
        title: 'Set Your Goals',
        description: 'Life goals, weekly targets, or daily goals. Add notes to track progress.',
        emoji: '🎯'
    },
    {
        id: 4,
        tab: 'chat',
        title: 'Chat With Me',
        description: "I remember your entries and help you reflect on patterns. Not a chatbot—your thinking partner.",
        emoji: '💬',
        cta: 'Start Journaling ✓'
    }
];

interface FTUETourProps {
    isActive: boolean;
    currentStep: number;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    onComplete: () => void;
    onNavigate: (tab: View) => void;
}

export const FTUETour: React.FC<FTUETourProps> = ({
    isActive,
    currentStep,
    onNext,
    onBack,
    onSkip,
    onComplete,
    onNavigate
}) => {
    if (!isActive) return null;

    const step = FTUE_STEPS[currentStep - 1];
    const isFirstStep = currentStep === 1;
    const isLastStep = currentStep === FTUE_STEPS.length;

    const handleNext = () => {
        if (isLastStep) {
            onComplete();
        } else {
            const nextStep = FTUE_STEPS[currentStep];
            onNavigate(nextStep.tab);
            onNext();
        }
    };

    const handleBack = () => {
        if (!isFirstStep) {
            const prevStep = FTUE_STEPS[currentStep - 2];
            onNavigate(prevStep.tab);
            onBack();
        }
    };

    return (
        <AnimatePresence>
            {isActive && (
                <>
                    {/* Backdrop overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-40"
                    />

                    {/* Tooltip card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-md"
                    >
                        <div className="bg-dark-surface rounded-2xl p-5 shadow-2xl border border-white/10">
                            {/* Skip button */}
                            <button
                                onClick={onSkip}
                                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                aria-label="Skip tour"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className="text-4xl">{step.emoji}</div>
                                <div className="flex-1 pr-6">
                                    <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
                                    <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
                                </div>
                            </div>

                            {/* Progress dots */}
                            <div className="flex justify-center gap-2 mb-4">
                                {FTUE_STEPS.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-2 h-2 rounded-full transition-colors ${idx + 1 === currentStep ? 'bg-brand-teal' : 'bg-gray-600'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Navigation buttons */}
                            <div className="flex gap-3">
                                {!isFirstStep && (
                                    <button
                                        onClick={handleBack}
                                        className="flex-1 flex items-center justify-center gap-2 bg-dark-surface-light text-white font-semibold py-3 px-4 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={handleNext}
                                    className="flex-1 flex items-center justify-center gap-2 bg-brand-teal text-white font-semibold py-3 px-4 rounded-xl hover:bg-teal-400 transition-colors shadow-lg"
                                >
                                    {step.cta || 'Next'}
                                    {!isLastStep && <ChevronRight className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
