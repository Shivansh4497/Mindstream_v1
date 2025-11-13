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
    // This effect runs once on mount to establish the initial auth state
    // and set up a listener for subsequent changes.

    const initializeSession = async () => {
      console.log('[AuthContext] Starting initial session check...');
      try {
        // First, check if a session already exists (e.g., from a page refresh)
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext] Error getting initial session:', error);
          setLoading(false);
          return;
        }

        if (currentSession) {
          console.log(`[AuthContext] Active session found for user ${currentSession.user.id}.`);
          setSession(currentSession);
          const currentUser = currentSession.user;
          setUser(currentUser);
          console.log('[AuthContext] Fetching or creating profile for existing session...');
          const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
          setProfile(userProfile);
          console.log('[AuthContext] Profile loaded for existing session.');
        } else {
          console.log('[AuthContext] No active session found on initial check.');
          // Ensure all user-related state is null if no session
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] A critical error occurred during session initialization:', err);
        // Reset state in case of failure
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        // Regardless of outcome, the initial check is done.
        console.log('[AuthContext] Initial session check complete. Releasing loading state.');
        setLoading(false);
      }
    };

    initializeSession();

    // Now, set up the listener for real-time auth events (login, logout, etc.)
    console.log('[AuthContext] Setting up auth state change listener.');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[AuthContext] Auth event received: ${event}`);
        
        // Update the session state immediately
        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        if (event === 'SIGNED_IN' && newUser) {
          console.log(`[AuthContext] User signed in. Fetching/creating profile for ${newUser.id}...`);
          // Set loading to true while we fetch the profile after a new login
          setLoading(true);
          try {
            const userProfile = await getProfile(newUser.id) ?? await createProfile(newUser);
            setProfile(userProfile);
            console.log('[AuthContext] Profile loaded after SIGNED_IN.');
          } catch(error) {
            console.error('[AuthContext] Error fetching profile after SIGNED_IN event:', error);
            setProfile(null);
          } finally {
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out. Clearing profile.');
          setProfile(null);
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
