import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import * as db from '../services/dbService';
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
  // Initialize loading to true to show the global spinner initially.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // This variable helps us ensure setLoading(false) is only called once.
    let initialLoadComplete = false;

    // The onAuthStateChange listener is the single source of truth.
    // It fires immediately with the cached session, and then for any changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          // Fetch profile only if the user has actually changed.
          // This prevents re-fetching on background token refreshes.
          if (profile?.id !== currentUser.id) {
            const userProfile = await db.getProfile(currentUser.id);
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
        
        // The first time this callback runs, the session state is definitive.
        // We can now mark the auth process as no longer loading.
        if (!initialLoadComplete) {
          setLoading(false);
          initialLoadComplete = true;
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  // The dependency array MUST be empty. This effect should run exactly ONCE
  // to set up the listener, and the listener should only be torn down when
  // the provider unmounts. This is the root cause fix.
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
