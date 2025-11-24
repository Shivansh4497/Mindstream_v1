import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SUPABASE_CREDENTIALS_AVAILABLE } from './services/supabaseClient';
import { GEMINI_API_KEY_AVAILABLE } from './services/geminiService';
import { ConfigurationError } from './components/ConfigurationError';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const isConfigured = SUPABASE_CREDENTIALS_AVAILABLE && GEMINI_API_KEY_AVAILABLE;

if (!isConfigured) {
  const missingServices: string[] = [];
  const requiredVariables: string[] = [];
  if (!SUPABASE_CREDENTIALS_AVAILABLE) {
    missingServices.push('Supabase Database');
    requiredVariables.push('VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY');
  }
  if (!GEMINI_API_KEY_AVAILABLE) {
    missingServices.push('Google Gemini AI');
    requiredVariables.push('VITE_API_KEY');
  }

  root.render(
    <React.StrictMode>
      <ConfigurationError
        missingServices={missingServices}
        requiredVariables={requiredVariables}
      />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
}
