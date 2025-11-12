// FIX: The original content of this file was invalid. It has been replaced with a functional React component.
import React from 'react';

/**
 * A component to display when essential credentials for backend services are missing.
 * This is intended for developers setting up the project.
 */
export const MissingCredentials = () => {
  return (
    <div className="h-screen w-screen bg-brand-indigo text-white flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-3xl font-bold font-display mb-4">Configuration Error</h1>
      <p className="text-lg text-gray-300 mb-6 max-w-md">
        It looks like the application is missing necessary credentials to connect to its backend services.
      </p>
      <p className="text-md text-gray-400">
        If you are the developer, please ensure your environment variables are configured correctly.
      </p>
    </div>
  );
};