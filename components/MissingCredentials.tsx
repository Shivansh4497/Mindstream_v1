import React from 'react';

/**
 * A component to display when essential credentials for backend services are missing.
 */
export const MissingCredentials = () => {
  return (
    <div className="h-screen w-screen bg-brand-indigo text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-lg">
        <h1 className="text-3xl font-bold font-display mb-4">Configuration Error</h1>
        <p className="text-lg text-gray-300 mb-6">
          The application is unable to connect to its backend services. This is usually caused by missing or incorrect environment variables.
        </p>
        <div className="p-4 bg-dark-surface-light rounded-lg text-left text-sm font-mono">
          <p className="text-gray-300">
            If you are the developer, please check the following in your hosting platform's settings (e.g., Vercel):
          </p>
          <ul className="list-disc list-inside my-2 text-red-400">
            <li><code>SUPABASE_URL</code></li>
            <li><code>SUPABASE_ANON_KEY</code></li>
            <li><code>API_KEY</code> (for Gemini AI)</li>
          </ul>
          <p className="text-gray-400 mt-3">
            Ensure these variables are set with the correct values and that the project has been redeployed.
          </p>
        </div>
      </div>
    </div>
  );
};
