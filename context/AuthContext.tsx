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

    if (!supabase) {
      if (isMounted) setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        // If the component has been unmounted, we should not proceed.
        if (!isMounted) {
          return;
        }

        try {
          setSession(currentSession);
          const currentUser = currentSession?.user ?? null;
          setUser(currentUser);
          
          if (currentUser) {
              const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
              // Check again after the async operation in case the component unmounted during the await.
              if (isMounted) {
                setProfile(userProfile);
              }
          } else {
              if (isMounted) {
                setProfile(null);
              }
          }
        } catch (error) {
            console.error("Error in onAuthStateChange callback", error);
            if (isMounted) {
              setSession(null);
              setUser(null);
              setProfile(null);
            }
        } finally {
            // This is guaranteed to run, and will only set state if the component is still mounted.
            if (isMounted) {
              setLoading(false);
            }
        }
      }
    );

    // Cleanup function runs when the component unmounts.
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
