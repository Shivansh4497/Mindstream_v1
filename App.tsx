import React from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
// FIX: Corrected the import path to be relative.
import { MindstreamApp } from './MindstreamApp';

const App: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!session) {
    return <Login />;
  }

  // The 'key' prop is removed as the flicker is fixed in AuthContext.
  return <MindstreamApp />;
};

export default App;
