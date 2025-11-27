import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PERSONALITIES, getAllPersonalities, PersonalityId, Personality } from '../config/personalities';
import { useToast } from './Toast';

interface PersonalitySelectorProps {
    onSelect?: (personalityId: PersonalityId) => void;
    initialPersonality?: PersonalityId;
}

export const PersonalitySelector: React.FC<PersonalitySelectorProps> = ({
    onSelect,
    initialPersonality
}) => {
    const [selectedId, setSelectedId] = useState<PersonalityId>(initialPersonality || 'stoic');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    const personalities = getAllPersonalities();

    // Fetch current preference if not provided
    useEffect(() => {
        if (!initialPersonality) {
            fetchUserPreference();
        }
    }, [initialPersonality]);

    const fetchUserPreference = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_preferences')
                .select('ai_personality')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setSelectedId(data.ai_personality as PersonalityId);
            }
        } catch (error) {
            console.error('Error fetching personality preference:', error);
        }
    };

    const handleSelect = async (personality: Personality) => {
        setSelectedId(personality.id);
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Upsert preference
            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    ai_personality: personality.id,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            showToast(`Switched to ${personality.name}`, 'success');
            onSelect?.(personality.id);
        } catch (error) {
            console.error('Error updating personality:', error);
            showToast('Failed to update personality', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-display font-bold text-white mb-2">Choose Your Companion</h2>
                <p className="text-gray-400">Select the voice that resonates with you most.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalities.map((p) => (
                    <motion.button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-6 rounded-xl border text-left transition-all duration-300 ${selectedId === p.id
                                ? 'bg-brand-indigo/50 border-brand-teal shadow-lg shadow-brand-teal/10'
                                : 'bg-dark-surface border-white/10 hover:border-white/20 hover:bg-white/5'
                            }`}
                    >
                        {selectedId === p.id && (
                            <div className="absolute top-4 right-4 text-brand-teal">
                                <Check className="w-6 h-6" />
                            </div>
                        )}

                        <div className="text-4xl mb-4">{p.emoji}</div>

                        <h3 className={`text-lg font-bold mb-1 ${selectedId === p.id ? 'text-brand-teal' : 'text-white'}`}>
                            {p.name}
                        </h3>

                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
                            {p.tagline}
                        </p>

                        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                            {p.description}
                        </p>

                        {/* Sample Response Preview */}
                        <div className={`text-xs p-3 rounded-lg italic ${selectedId === p.id ? 'bg-brand-teal/10 text-brand-teal-light' : 'bg-black/20 text-gray-500'}`}>
                            "{p.sampleResponses.greeting}"
                        </div>

                        {/* Traits Visualizer */}
                        <div className="mt-4 flex gap-2">
                            {Object.entries(p.traits).map(([trait, value]) => (
                                value > 0.7 && (
                                    <span key={trait} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-gray-400 capitalize">
                                        {trait}
                                    </span>
                                )
                            ))}
                        </div>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
