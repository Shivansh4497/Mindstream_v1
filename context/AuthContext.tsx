import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types';
import * as db from '../services/dbService';

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
  const [loading, setLoading] = useState(true); // Start as loading, will be set to false after the initial session check.

  useEffect(() => {
    // Safety check: If supabase client failed to initialize (e.g. missing env vars),
    // we must stop loading immediately to prevent infinite spinner.
    if (!supabase) {
      console.warn("[AuthContext] Supabase client is not available. Stopping loading state.");
      setLoading(false);
      return;
    }

    // This effect runs once on mount to establish the initial session state and
    // then listens for subsequent changes.
    
    // 1. Perform an explicit, one-time check for the session.
    const initializeSession = async () => {
      console.log('[AuthContext] Performing initial session check...');
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('[AuthContext] getSession() complete.');
        // Only set if we haven't received an event update yet (though React batching handles this well)
        if (initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
        }
      } catch (error) {
        console.error('[AuthContext] Error in getSession():', error);
      } finally {
        // This is critical: we release the loading state *after* the initial check is complete.
        console.log('[AuthContext] Initial check finished. Releasing loading state.');
        setLoading(false);
      }
    };

    initializeSession();

    // 2. Set up the real-time listener for any subsequent auth changes.
    // This often fires *before* getSession() resolves, so we also use it to unblock loading.
    console.log('[AuthContext] Setting up auth state change listener for real-time updates...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, changedSession) => {
        console.log(`[AuthContext] Auth event received: ${_event}`);
        setSession(changedSession);
        setUser(changedSession?.user ?? null);
        // CRITICAL FIX: Ensure loading is disabled as soon as we get an authoritative event.
        // This prevents getting stuck if getSession() hangs or errors silently.
        setLoading(false);
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
  
  // 3. Separate effect to handle profile fetching whenever the user changes.
  // This keeps concerns separate and the logic clean.
  useEffect(() => {
    // If there is a user, fetch their profile.
    if (user) {
      console.log(`[AuthContext] User detected (${user.id}). Fetching/creating profile...`);
      const manageProfile = async () => {
          try {
            let userProfile = await db.getProfile(user.id);
            if (userProfile) {
                setProfile(userProfile);
                console.log('[AuthContext] Existing profile loaded.');
            } else {
                console.log('[AuthContext] No existing profile found. Creating new one...');
                const newProfile = await db.createProfile(user);
                if (newProfile) {
                    setProfile(newProfile);
                    console.log('[AuthContext] New profile created. Adding onboarding content...');
                    // This is a new user, so add onboarding content.
                    await db.addWelcomeEntry(user.id);
                    await db.addFirstIntention(user.id);
                    console.log('[AuthContext] Onboarding content added.');
                }
            }
          } catch (error) {
            console.error('[AuthContext] Error managing profile:', error);
            setProfile(null);
          }
      };
      manageProfile();
    } else {
      // If there's no user, clear the profile.
      setProfile(null);
    }
  }, [user]);


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
