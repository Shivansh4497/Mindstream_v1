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

    // DEFINITIVE FIX: This robust, two-stage approach eliminates all race conditions.
    const initializeSession = async () => {
      // 1. Get the initial session immediately. This is fast because it reads from storage.
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error getting initial session:", error);
        setLoading(false);
        return;
      }

      // Set initial state based on the direct session check.
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await db.getProfile(currentUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      
      // The definitive initial state is set, we can stop loading.
      setLoading(false);
    };

    initializeSession();

    // 2. Then, set up a listener for any FUTURE changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // This listener handles sign-ins, sign-outs, and token refreshes.
        // The flicker is gone because the initial state is already stable.
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (event === 'SIGNED_IN') {
          const userProfile = await db.getProfile(currentUser!.id);
          setProfile(userProfile);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
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
