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

  // DEFINITIVE FIX: Add a key based on the user's ID.
  // This prevents the component from unmounting and remounting during session refreshes
  // on page load, which was the root cause of the freezing race condition.
  return <MindstreamApp key={session.user.id} />;
};

export default App;
