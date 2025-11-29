import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Briefcase, Heart, DollarSign, Zap, Layers, ArrowLeft, Trophy, Loader2 } from 'lucide-react';
import { Habit, HabitCategory, Entry, Intention, HabitLog } from '../types';
import { HabitCard } from './HabitCard';
import { IntentionCard } from './IntentionCard';

interface LifeAreaDashboardProps {
    habits: Habit[];
    entries: Entry[];
    intentions: Intention[];
    habitLogs: HabitLog[];
    onBack: () => void;
    onOpenYearlyReview: () => void;
    isGeneratingYearly: boolean;
}

const AREA_CONFIG: Record<HabitCategory, { icon: React.ElementType, color: string, description: string }> = {
    Health: { icon: Activity, color: 'text-red-400', description: 'Physical and mental well-being' },
    Growth: { icon: Zap, color: 'text-yellow-400', description: 'Learning and personal development' },
    Career: { icon: Briefcase, color: 'text-blue-400', description: 'Professional goals and projects' },
    Finance: { icon: DollarSign, color: 'text-green-400', description: 'Financial health and management' },
    Connection: { icon: Heart, color: 'text-pink-400', description: 'Relationships and community' },
    System: { icon: Layers, color: 'text-gray-400', description: 'Organization and productivity' }
};

export const LifeAreaDashboard: React.FC<LifeAreaDashboardProps> = ({ habits, entries, intentions, habitLogs, onBack, onOpenYearlyReview, isGeneratingYearly }) => {
    const [selectedArea, setSelectedArea] = useState<HabitCategory>('Health');

    const filteredHabits = useMemo(() =>
        habits.filter(h => h.category === selectedArea),
        [habits, selectedArea]);

    const filteredIntentions = useMemo(() =>
        intentions.filter(i => {
            // Intentions don't strictly have a category field yet, but we can infer or show all for now
            // For this MVP, we'll show all pending intentions to keep it simple, 
            // or we could add a category to intentions later.
            return i.status === 'pending';
        }),
        [intentions]);

    // Calculate stats
    const completionRate = useMemo(() => {
        if (filteredHabits.length === 0) return 0;
        const totalStreaks = filteredHabits.reduce((acc, h) => acc + h.current_streak, 0);
        return Math.round(totalStreaks / filteredHabits.length);
    }, [filteredHabits]);

    const AreaIcon = AREA_CONFIG[selectedArea].icon;

    return (
        <div className="min-h-screen bg-dark-bg text-white p-6 md:p-12 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-3xl font-bold font-display">Life Areas</h1>
                    </div>

                    <button
                        onClick={onOpenYearlyReview}
                        disabled={isGeneratingYearly}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-teal to-brand-indigo rounded-full font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isGeneratingYearly ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                        <span>{new Date().getFullYear()} Review</span>
                    </button>
                </div>

                {/* Area Selector */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
                    {(Object.keys(AREA_CONFIG) as HabitCategory[]).map((area) => {
                        const Icon = AREA_CONFIG[area].icon;
                        const isSelected = selectedArea === area;
                        return (
                            <button
                                key={area}
                                onClick={() => setSelectedArea(area)}
                                className={`flex flex-col items-center p-4 rounded-xl border transition-all duration-300 ${isSelected
                                    ? 'bg-white/10 border-brand-teal shadow-lg shadow-brand-teal/10 scale-105'
                                    : 'bg-dark-surface border-white/5 hover:bg-white/5 hover:border-white/10'
                                    }`}
                            >
                                <Icon className={`w-8 h-8 mb-2 ${AREA_CONFIG[area].color}`} />
                                <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                    {area}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Dashboard Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Stats & Overview */}
                    <div className="lg:col-span-2 space-y-8">
                        <motion.div
                            key={selectedArea}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-dark-surface border border-white/10 rounded-2xl p-8 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-32 bg-brand-teal/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div>
                                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                                        <AreaIcon className={`w-8 h-8 ${AREA_CONFIG[selectedArea].color}`} />
                                        {selectedArea}
                                    </h2>
                                    <p className="text-gray-400 text-lg">{AREA_CONFIG[selectedArea].description}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-bold text-white">{completionRate}</div>
                                    <div className="text-sm text-gray-400 uppercase tracking-wider">Avg Streak</div>
                                </div>
                            </div>

                            {/* Habits Grid */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Active Habits</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredHabits.length > 0 ? (
                                    filteredHabits.map(habit => (
                                        <HabitCard
                                            key={habit.id}
                                            habit={habit}
                                            logs={habitLogs.filter(l => l.habit_id === habit.id)}
                                            onToggle={() => { }} // Read-only view for now
                                            onEdit={() => { }}
                                            onDelete={() => { }}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-2 p-8 text-center border border-dashed border-white/10 rounded-xl text-gray-400">
                                        No active habits in this area yet.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar / Insights */}
                    <div className="space-y-6">
                        <div className="bg-dark-surface/50 border border-white/5 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Quick Insights</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                You tend to focus on <strong>{selectedArea}</strong> mostly on weekdays.
                                Try scheduling related tasks for Saturday mornings to balance your week.
                            </p>
                            {/* Placeholder for real AI insights */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
