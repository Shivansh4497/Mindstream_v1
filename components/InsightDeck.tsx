import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InsightDeckProps {
    children: React.ReactNode[];
}

export const InsightDeck: React.FC<InsightDeckProps> = ({ children }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextCard = () => {
        setCurrentIndex((prev) => (prev + 1) % children.length);
    };

    const prevCard = () => {
        setCurrentIndex((prev) => (prev - 1 + children.length) % children.length);
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mb-6">
                {children.map((_, idx) => (
                    <div
                        key={idx}
                        className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/20'
                            }`}
                    />
                ))}
            </div>

            {/* Card Container */}
            <div className="relative min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        {children[currentIndex]}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-12">
                <button
                    onClick={prevCard}
                    className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-12">
                <button
                    onClick={nextCard}
                    className="p-2 rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );
};
