import React from 'react';

interface ConfigurationErrorProps {
  missingServices: string[];
  requiredVariables: string[];
}

export const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ missingServices, requiredVariables }) => {
  return (
    <div className="h-screen w-screen bg-brand-indigo text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold font-display text-red-400 mb-4">Application Configuration Error</h1>
        <p className="text-lg text-gray-300 mb-6">
          The application cannot start because it's missing essential configuration for the following services:
        </p>
        <div className="p-4 bg-dark-surface-light rounded-lg text-left text-sm font-mono inline-block">
          <ul className="list-disc list-inside text-yellow-400">
            {missingServices.map(service => <li key={service}>{service}</li>)}
          </ul>
        </div>
        <p className="text-gray-400 mt-6">
          To fix this, please set the required environment variables in your deployment environment (e.g., Vercel, Netlify, or a local <code>.env</code> file).
        </p>
         <p className="text-gray-500 text-xs mt-2">
          Required variables: <code>{requiredVariables.join(', ')}</code>.
        </p>
      </div>
    </div>
  );
};
