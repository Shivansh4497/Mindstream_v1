import React, { useState } from 'react';

interface InfoTooltipProps {
    text: string;
    className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ text, className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className={`relative inline-block ${className}`}>
            <button
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onClick={() => setIsVisible(!isVisible)}
                className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors cursor-help ml-2"
                aria-label="More information"
            >
                ℹ️
            </button>

            {isVisible && (
                <div className="absolute z-50 left-0 top-6 w-64 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed">
                    {text}
                    <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 border-l border-t border-white/20 transform rotate-45" />
                </div>
            )}
        </div>
    );
};
