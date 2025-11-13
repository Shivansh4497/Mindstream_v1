import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { getProfile, createProfile } from '../services/dbService';


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
    let isMounted = true;

    // This function centralizes the logic for updating session and profile state.
    const updateUserState = async (currentSession: Session | null) => {
      if (!isMounted) return;
      
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch the user's profile, or create one if it doesn't exist.
          const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
          if (isMounted) setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching or creating profile:", error);
          if (isMounted) setProfile(null);
        }
      } else {
        if (isMounted) setProfile(null);
      }
    };

    // On initial mount, get the current session to prevent a loading-state lock on page refresh.
    const initializeSession = async () => {
      if (!supabase) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await updateUserState(session);
      } catch (error) {
        console.error("Error initializing session:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    if (!supabase) return;

    // Listen for auth state changes (login, logout, etc.).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await updateUserState(session);
      }
    );

    // Cleanup subscription on component unmount.
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
