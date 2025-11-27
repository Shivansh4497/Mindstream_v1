import React from 'react';
import { Target, Calendar, Trophy } from 'lucide-react';

interface EmptyIntentionsStateProps {
    onCreateIntention?: (text: string) => void;
}

export const EmptyIntentionsState: React.FC<EmptyIntentionsStateProps> = ({
    onCreateIntention
}) => {
    const templates = [
        { text: 'Launch my side project by [date]', icon: Trophy },
        { text: 'Read 12 books this year', icon: Target },
        { text: 'Run a 5K in under 30 minutes', icon: Target },
        { text: 'Learn a new skill every month', icon: Calendar },
        { text: 'Save $10,000 by year-end', icon: Trophy },
        { text: 'Build a consistent meditation practice', icon: Target }
    ];

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-lg text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <Target className="w-16 h-16 text-purple-400" />
                        <div className="absolute inset-0 bg-purple-400/20 blur-2xl rounded-full" />
                    </div>
                </div>

                {/* Heading */}
                <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        Set your first intention
                    </h2>
                    <p className="text-gray-400">
                        Intentions are finite goals with clear outcomes
                    </p>
                </div>

                {/* Templates */}
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
                        Templates:
                    </p>

                    <div className="space-y-2">
                        {templates.map((template, index) => {
                            const Icon = template.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => onCreateIntention?.(template.text)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-dark-surface border border-white/10 hover:border-purple-400/40 hover:bg-white/5 transition-all group text-left"
                                >
                                    <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                                        <Icon className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <div className="flex-1 text-sm text-gray-300 group-hover:text-white transition-colors">
                                        {template.text}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Intention CTA */}
                <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-400 mb-3">
                        Or write your own intention below
                    </p>
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                        <span className="text-2xl">↓</span>
                        <span className="font-semibold">Use the input bar</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
