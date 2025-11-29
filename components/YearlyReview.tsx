import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Share2, Calendar, Trophy, Heart } from 'lucide-react';
import { YearlyReviewData } from '../services/yearlyReviewService';

interface YearlyReviewProps {
    data: YearlyReviewData;
    onClose: () => void;
}

export const YearlyReview: React.FC<YearlyReviewProps> = ({ data, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        // Intro Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
            >
                <h1 className="text-6xl font-bold font-display mb-4 bg-gradient-to-r from-brand-teal to-brand-indigo bg-clip-text text-transparent">
                    {data.year}
                </h1>
                <p className="text-2xl text-white font-light">Your Year in Mindstream</p>
            </motion.div>
        </div>,

        // Stats Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-3xl font-bold mb-12">By The Numbers</h2>
            <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="text-4xl font-bold text-brand-teal mb-2">{data.stats.totalEntries}</div>
                    <div className="text-gray-400">Journal Entries</div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="text-4xl font-bold text-pink-400 mb-2">{data.stats.totalWords.toLocaleString()}</div>
                    <div className="text-gray-400">Words Written</div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="text-4xl font-bold text-yellow-400 mb-2">{data.stats.longestStreak}</div>
                    <div className="text-gray-400">Day Streak</div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                    <div className="text-4xl font-bold text-blue-400 mb-2">{data.stats.totalHabitsCompleted}</div>
                    <div className="text-gray-400">Habits Completed</div>
                </div>
            </div>
        </div>,

        // Top Moods Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-3xl font-bold mb-12">Your Emotional Landscape</h2>
            <div className="space-y-6 w-full max-w-md">
                {data.stats.topMoods.map((mood, index) => (
                    <motion.div
                        key={mood.mood}
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.2 }}
                        className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10"
                    >
                        <span className="text-xl font-medium">{mood.mood}</span>
                        <span className="text-2xl font-bold text-brand-teal">{mood.count}x</span>
                    </motion.div>
                ))}
            </div>
        </div>,

        // Themes Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-3xl font-bold mb-12">Themes of {data.year}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {data.themes.map((theme, index) => (
                    <motion.div
                        key={index}
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.3 }}
                        className="bg-gradient-to-br from-white/10 to-white/5 p-6 rounded-2xl border border-white/10"
                    >
                        <div className="text-4xl mb-4">{theme.emoji}</div>
                        <h3 className="text-xl font-bold mb-2">{theme.title}</h3>
                        <p className="text-sm text-gray-300">{theme.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>,

        // Core Memories Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-3xl font-bold mb-8">Core Memories</h2>
            <div className="w-full max-w-3xl h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {data.coreMemories.map((memory, index) => (
                    <div key={index} className="mb-6 text-left bg-dark-surface p-6 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(memory.timestamp).toLocaleDateString()}
                        </div>
                        <p className="text-lg italic text-gray-200">"{memory.text.substring(0, 150)}..."</p>
                    </div>
                ))}
            </div>
        </div>,

        // Outro Slide
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h1 className="text-4xl font-bold mb-6">Here's to {data.year + 1}! 🥂</h1>
            <p className="text-xl text-gray-400 mb-12">Keep growing, keep reflecting.</p>
            <button
                onClick={onClose}
                className="px-8 py-3 bg-white text-dark-bg rounded-full font-bold hover:bg-gray-200 transition-colors"
            >
                Back to Mindstream
            </button>
        </div>
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1);
    };

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
    };

    return (
        <div className="fixed inset-0 z-50 bg-mindstream-bg-primary text-white flex flex-col">
            {/* Controls */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                <div className="flex gap-1">
                    {slides.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 w-8 rounded-full transition-colors ${idx === currentSlide ? 'bg-white' : 'bg-white/20'}`}
                        />
                    ))}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Slide Content */}
            <div className="flex-grow relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        {slides[currentSlide]}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
                <button
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className={`p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all pointer-events-auto ${currentSlide === 0 ? 'opacity-0' : 'opacity-100'}`}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className={`p-4 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all pointer-events-auto ${currentSlide === slides.length - 1 ? 'opacity-0' : 'opacity-100'}`}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};
