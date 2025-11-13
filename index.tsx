import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SUPABASE_CREDENTIALS_AVAILABLE } from './services/supabaseClient';

import { ConfigurationError } from './components/ConfigurationError';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const isSupabaseConfigured = SUPABASE_CREDENTIALS_AVAILABLE;

if (!isSupabaseConfigured) {
  root.render(
    <React.StrictMode>
      <ConfigurationError
        missingServices={['Supabase Database']}


        requiredVariables={['SUPABASE_URL', 'SUPABASE_ANON_KEY']}
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
