import React from 'react';
import type { AIStatus } from '../MindstreamApp';

interface AIStatusBannerProps {
  status: AIStatus;
  error: string | null;
}

export const AIStatusBanner: React.FC<AIStatusBannerProps> = ({ status, error }) => {
  if (status === 'initializing' || status === 'ready') {
    return null;
  }

  if (status === 'verifying') {
    return (
      <div className="flex-shrink-0 bg-blue-900/50 text-blue-200 text-sm text-center p-2 animate-pulse">
        Verifying AI connection...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-shrink-0 bg-red-900/80 text-red-200 p-3 shadow-inner">
        <div className="text-center font-bold mb-1">AI Connection Error</div>
        <p className="text-sm text-center">
          AI features are disabled. Please resolve the following issue:
        </p>
        <p className="text-sm text-center font-mono bg-blue-900/20 p-1 rounded mt-1 max-w-2xl mx-auto">
          {error || 'An unknown configuration error occurred.'}
        </p>
      </div>
    );
  }

  return null;
};
