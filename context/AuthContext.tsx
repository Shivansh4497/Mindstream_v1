import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
// FIX: Add imports for Profile type and db functions to fetch profile data.
import { Profile } from '../types';
import { getProfile, createProfile } from '../services/dbService';


interface AuthContextType {
  session: Session | null;
  user: User | null;
  // FIX: Add profile to the context type to make it available to consumers.
  profile: Profile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // FIX: Add state to hold the user's profile.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // The onAuthStateChange listener is the single source of truth for the user's auth state.
    // It fires once on initial load with the cached session, and again whenever the auth state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // FIX: Make the callback async to fetch the profile when auth state changes.
      async (_event, currentSession) => {
        try {
          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
              const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
              setProfile(userProfile);
          } else {
              setProfile(null);
          }
        } catch (error) {
            console.error("Error in onAuthStateChange callback", error);
            setSession(null);
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
      }
    );

    // Cleanup the subscription when the component unmounts.
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
    // FIX: Provide the profile in the context value.
    profile,
    loading,
    loginWithGoogle,
    logout,
  };

  // The context now provides the user's session, auth state, and profile.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
