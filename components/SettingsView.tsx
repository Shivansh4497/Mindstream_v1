import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PersonalitySelector } from './PersonalitySelector';

interface SettingsViewProps {
    onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-dark-bg text-white p-6 md:p-12 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-bold font-display">Settings</h1>
                </div>

                <div className="space-y-12">
                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-brand-teal mb-2">AI Companion</h2>
                            <p className="text-gray-400">Choose the personality that best fits your thinking style.</p>
                        </div>

                        <PersonalitySelector />
                    </section>

                    {/* Future settings sections can go here */}
                    <section className="opacity-50 pointer-events-none">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-500 mb-2">Data & Privacy</h2>
                            <p className="text-gray-600">Export and deletion options coming soon.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
