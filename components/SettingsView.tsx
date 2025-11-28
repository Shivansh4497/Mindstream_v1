import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { PersonalitySelector } from './PersonalitySelector';
import { supabase } from '../services/supabaseClient';
import { fetchAllUserData, downloadData } from '../services/dataExportService';
import { useToast } from './Toast';
import { useMindfulMode } from '../hooks/useMindfulMode';
import { useAuth } from '../context/AuthContext';

interface SettingsViewProps {
    onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
    const { user } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const { showToast } = useToast();
    const { mindfulModeEnabled, toggleMindfulMode } = useMindfulMode(user?.id);

    const handleExport = async (type: 'json' | 'markdown') => {
        setIsExporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const data = await fetchAllUserData(user.id);
            const filename = `mindstream_export_${new Date().toISOString().split('T')[0]}.${type === 'json' ? 'json' : 'md'}`;

            downloadData(data, filename, type);
            showToast('Export started successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            showToast('Failed to export data', 'error');
        } finally {
            setIsExporting(false);
        }
    };

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

                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-brand-teal mb-2">Mindful Experience</h2>
                            <p className="text-gray-400">Customize how you interact with your journal.</p>
                        </div>

                        <div className="bg-dark-surface border border-white/10 rounded-xl p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-white mb-2">Mindful Pause</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Take a 3-second breathing pause before writing. This moment of presence
                                        helps you ground yourself and reflect with more intention.
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        toggleMindfulMode();
                                        showToast(
                                            mindfulModeEnabled ? 'Mindful pause disabled' : 'Mindful pause enabled',
                                            'success'
                                        );
                                    }}
                                    className={`ml-6 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2 focus:ring-offset-dark-bg ${mindfulModeEnabled ? 'bg-brand-teal' : 'bg-gray-600'
                                        }`}
                                    role="switch"
                                    aria-checked={mindfulModeEnabled}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mindfulModeEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-brand-teal mb-2">Data & Privacy</h2>
                            <p className="text-gray-400">Manage your data ownership and privacy settings.</p>
                        </div>

                        <div className="bg-dark-surface border border-white/10 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Download className="w-5 h-5 text-brand-teal" />
                                Export Your Data
                            </h3>
                            <p className="text-gray-400 text-sm mb-6">
                                Download a complete copy of your journal entries, habits, intentions, and reflections.
                                You own your data.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => handleExport('json')}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4 text-yellow-400" />}
                                    <span>Export as JSON</span>
                                </button>

                                <button
                                    onClick={() => handleExport('markdown')}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-blue-400" />}
                                    <span>Export as Markdown</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
