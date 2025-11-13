import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import { getProfile, createProfile } from '../services/dbService';

// 1. Define the shape of the context
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

// 2. Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start as loading

  useEffect(() => {
    // This effect runs once on mount. It relies exclusively on onAuthStateChange,
    // which fires an initial event, to establish the session state. This is the
    // single source of truth for auth and prevents race conditions.
    console.log('[AuthContext] Setting up auth state change listener...');
    setLoading(true); // Ensure we are in a loading state until the first auth event fires.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthContext] Auth event received: ${event}`);

        // Set session and user based on the event
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // If there's a user, fetch their profile. Otherwise, clear it.
        if (currentUser) {
          console.log(`[AuthContext] User detected (${currentUser.id}). Fetching/creating profile...`);
          try {
            const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
            setProfile(userProfile);
            console.log('[AuthContext] Profile loaded successfully.');
          } catch (error) {
            console.error('[AuthContext] Error fetching profile:', error);
            setProfile(null); // Clear profile on error
          } finally {
            // Loading is complete once the profile fetch attempt is done.
            console.log('[AuthContext] Profile fetch complete. Releasing loading state.');
            setLoading(false);
          }
        } else {
          // If there's no session/user, clear the profile and finish loading.
          console.log('[AuthContext] No user detected. Clearing profile and releasing loading state.');
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Cleanup function to unsubscribe when the component unmounts
    return () => {
      if (subscription) {
        console.log('[AuthContext] Cleaning up auth subscription.');
        subscription.unsubscribe();
      }
    };
  }, []);

  // Functions for login and logout
  const loginWithGoogle = async () => {
    if (!supabase) {
      console.error("[AuthContext] Supabase client not available. Cannot log in.");
      return;
    }
    console.log('[AuthContext] Initiating Google login...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('[AuthContext] Error during Google login:', error.message);
  };

  const logout = async () => {
    if (!supabase) {
      console.error("[AuthContext] Supabase client not available. Cannot log out.");
      return;
    }
    console.log('[AuthContext] Initiating logout...');
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[AuthContext] Error during logout:', error);
  };

  // The value provided to consuming components
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

// 4. Custom hook for easy consumption
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
