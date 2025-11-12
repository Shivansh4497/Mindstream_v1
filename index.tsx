import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { MissingCredentials } from './components/MissingCredentials';
import { SUPABASE_CREDENTIALS_AVAILABLE } from './services/supabaseClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {SUPABASE_CREDENTIALS_AVAILABLE ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <MissingCredentials />
    )}
  </React.StrictMode>
);
