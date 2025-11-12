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

    // onAuthStateChange is the single source of truth for the session.
    // It handles the initial session, logins, logouts, and token refreshes.
    // This avoids race conditions with a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // If there's a user, fetch their profile. A profile might have just been
          // created on signup, so we fetch it fresh.
          const userProfile = await db.getProfile(currentUser.id);
          setProfile(userProfile);
        } else {
          // If there's no user (e.g., after logout), clear the profile.
          setProfile(null);
        }

        // The first auth event has been handled, so we can stop loading.
        setLoading(false);
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
