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
  // Set loading to true by default to show a loading state while we check for a session.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect handles the initial session check and subscribes to auth changes.
    console.log('[AuthContext] Starting session check...');

    // 1. Fetch the initial session data. This is crucial for handling page refreshes
    // when a user is already logged in.
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log('[AuthContext] getSession() completed.', currentSession ? `Session found for user ${currentSession.user.id}` : 'No active session.');
      
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log(`[AuthContext] User detected. Fetching profile...`);
        try {
          const userProfile = await getProfile(currentUser.id) ?? await createProfile(currentUser);
          setProfile(userProfile);
          console.log('[AuthContext] Profile loaded successfully.');
        } catch (error) {
          console.error('[AuthContext] FATAL: Error fetching or creating profile on initial load:', error);
          // Fallback behavior: clear profile to avoid inconsistent state.
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      // The initial check is done, we can now show the app.
      console.log('[AuthContext] Initial session check complete. Application is ready.');
      setLoading(false);

    }).catch(error => {
        console.error('[AuthContext] FATAL: Error during initial getSession() call:', error);
        // Ensure the app doesn't hang even if the initial session check fails.
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
    });

    // 2. Set up a listener for real-time authentication events (e.g., user logs in/out in another tab).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`[AuthContext] Auth state change detected. Event: ${event}`, newSession);

        setSession(newSession);
        const newUser = newSession?.user ?? null;
        setUser(newUser);

        if (event === 'SIGNED_IN' && newUser) {
           console.log(`[AuthContext] User SIGNED_IN. Fetching profile for user ${newUser.id}...`);
           try {
             const userProfile = await getProfile(newUser.id) ?? await createProfile(newUser);
             setProfile(userProfile);
             console.log('[AuthContext] Profile loaded successfully after SIGNED_IN event.');
           } catch (error) {
             console.error('[AuthContext] FATAL: Error fetching or creating profile after SIGNED_IN event:', error);
             setProfile(null);
           }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User SIGNED_OUT. Clearing session and profile.');
          setProfile(null);
        }
      }
    );

    // 3. Cleanup: Unsubscribe from the listener when the component is unmounted.
    return () => {
      if (subscription) {
          console.log('[AuthContext] Cleaning up auth subscription.');
          subscription.unsubscribe();
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    if (!supabase) {
      console.error("[AuthContext] Supabase client not initialized. Cannot log in.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) console.error('[AuthContext] Error logging in with Google:', error.message);
  };

  const logout = async () => {
    if (!supabase) {
      console.error("[AuthContext] Supabase client not initialized. Cannot log out.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[AuthContext] Error logging out:', error);
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
