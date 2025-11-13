import React from 'react';
import { useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { MindstreamApp } from './MindstreamApp';

const App: React.FC = () => {
  // Also retrieve the user object to make the rendering condition more robust.
  const { session, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // The condition is now stricter: we need both a session and a user object
  // to consider the user logged in. This prevents rendering MindstreamApp prematurely.
  if (!session || !user) {
    return <Login />;
  }

  // By the time MindstreamApp is rendered, we can be confident that the user object is available.
  return <MindstreamApp />;
};

export default App;
