import React from 'react';
import { Sparkles, Mic, PenLine } from 'lucide-react';

interface EmptyStreamStateProps {
    onQuickEntry?: () => void;
    onVoiceNote?: () => void;
}

export const EmptyStreamState: React.FC<EmptyStreamStateProps> = ({
    onQuickEntry,
    onVoiceNote
}) => {
    const guidedPrompts = [
        "What went well today?",
        "What's on your mind right now?",
        "What are you grateful for?",
        "What's one thing you learned today?"
    ];

    const [selectedPrompt, setSelectedPrompt] = React.useState(
        guidedPrompts[Math.floor(Math.random() * guidedPrompts.length)]
    );

    return (
        <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <Sparkles className="w-16 h-16 text-brand-teal" />
                        <div className="absolute inset-0 bg-brand-teal/20 blur-2xl rounded-full" />
                    </div>
                </div>

                {/* Heading */}
                <div>
                    <h2 className="text-2xl font-display font-bold text-white mb-2">
                        Your mind is a blank canvas
                    </h2>
                    <p className="text-gray-400">
                        Start capturing your thoughts and watch patterns emerge
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                    <p className="text-sm text-gray-500 uppercase tracking-wide font-semibold">
                        Start by:
                    </p>

                    <div className="grid gap-3">
                        {onVoiceNote && (
                            <button
                                onClick={onVoiceNote}
                                className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-brand-teal/10 to-purple-500/10 border border-brand-teal/20 hover:border-brand-teal/40 transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-brand-teal/20 group-hover:bg-brand-teal/30 transition-colors">
                                    <Mic className="w-5 h-5 text-brand-teal" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold text-white">Voice Note</div>
                                    <div className="text-xs text-gray-400">Speak your thoughts</div>
                                </div>
                            </button>
                        )}

                        {onQuickEntry && (
                            <button
                                onClick={onQuickEntry}
                                className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-brand-teal/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                            >
                                <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                                    <PenLine className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold text-white">Quick Entry</div>
                                    <div className="text-xs text-gray-400">Write what's on your mind</div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>

                {/* Guided Prompt */}
                <div className="pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-500 mb-2">Or answer this:</p>
                    <button
                        onClick={() => {
                            const newPrompt = guidedPrompts[Math.floor(Math.random() * guidedPrompts.length)];
                            setSelectedPrompt(newPrompt);
                        }}
                        className="text-brand-teal hover:text-brand-teal/80 transition-colors font-medium"
                    >
                        "{selectedPrompt}"
                    </button>
                </div>
            </div>
        </div>
    );
};
