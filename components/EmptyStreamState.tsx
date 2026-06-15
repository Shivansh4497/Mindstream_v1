import React from 'react';
import { StreamEmptyState as StreamIllustration } from './illustrations/StreamEmptyState';

export const EmptyStreamState: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="mb-6">
                <StreamIllustration />
            </div>
            <h2 className="text-[16px] font-medium text-[rgba(255,255,255,0.88)] mb-2">
                Your first thought starts here
            </h2>
            <p className="text-[13px] text-[rgba(255,255,255,0.5)] leading-[1.5] max-w-[240px] mx-auto">
                Capture what's on your mind and watch patterns emerge.
            </p>
        </div>
    );
};
