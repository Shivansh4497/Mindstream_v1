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

    setLoading(true);

    // Get the initial session from Supabase. This might be from localStorage,
    // making it faster than waiting for the onAuthStateChange event.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const userProfile = await db.getProfile(currentUser.id);
        setProfile(userProfile);
      }
      setLoading(false);
    });

    // Set up a listener for auth events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only clear the user session on an explicit SIGNED_OUT event.
        // This prevents the user state from flickering to null during background
        // token refreshes when the user returns to the tab.
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
        } else if (session) {
          setSession(session);
          const currentUser = session.user;
          setUser(currentUser);
          // Re-fetch profile in case it was updated (e.g., avatar).
          // This also handles the case where the profile was created just now.
          if (currentUser) {
            let userProfile = await db.getProfile(currentUser.id);
            if (!userProfile) {
                userProfile = await db.createProfile(currentUser);
            }
            setProfile(userProfile);
          }
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
