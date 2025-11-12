import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
// FIX: Corrected the import path to be relative.
import * as db from '../services/dbService';
// FIX: Corrected the import path to be relative.
import type { Profile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // DEFINITIVE FIX: Use the robust getSession + onAuthStateChange pattern.
    // This eliminates race conditions and session "flickering" on page load/refresh.
    const initializeSession = async () => {
      // 1. Get the session immediately from local storage.
      const { data: { session: initialSession } } = await supabase.auth.getSession();

      // Guard against setting state if the component unmounts quickly.
      if (!isMounted) return;

      if (initialSession) {
        setSession(initialSession);
        const currentUser = initialSession.user;
        setUser(currentUser);
        const userProfile = await db.getProfile(currentUser.id);
        if (isMounted) setProfile(userProfile);
      }
      
      // We've established the initial state, so we can stop loading.
      setLoading(false);
    };

    initializeSession();

    // 2. Listen for subsequent auth changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        // On SIGNED_OUT, clear the session and profile.
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } 
        // On any other event (SIGNED_IN, TOKEN_REFRESHED, etc.), update the session.
        // This prevents the state from flickering to null during a token refresh.
        else if (currentSession) {
          setSession(currentSession);
          const currentUser = currentSession.user;
          setUser(currentUser);
          // Re-fetch profile in case of changes (e.g., updated avatar).
          const userProfile = await db.getProfile(currentUser.id);
          if (isMounted) setProfile(userProfile);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    if (!supabase) {
      console.error("Supabase client not initialized. Cannot log in.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('Error logging in with Google:', error.message);
  };

  const logout = async () => {
    if (!supabase) {
      console.error("Supabase client not initialized. Cannot log out.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error);
  };

  const value = {
    session,
    user,
    profile,
    loading,
    loginWithGoogle,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
