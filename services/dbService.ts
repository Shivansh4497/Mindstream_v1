import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus } from '../types';

// Profile Functions
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
    console.error('Error getting profile:', error);
  }
  return data;
};

export const createProfile = async (user: User): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    // FIX: Cast argument to 'any' to fix 'never' type inference issue on insert.
    .insert({
      id: user.id,
      email: user.email,
      avatar_url: user.user_metadata.avatar_url,
    } as any)
    .select()
    .single();
  if (error) {
    console.error('Error creating profile:', error);
  }
  return data;
};

// Entry Functions
export const getEntries = async (userId: string): Promise<Entry[]> => {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  if (error) {
    console.error('Error fetching entries:', error);
    return [];
  }
  return data || [];
};

export const addEntry = async (userId: string, entryData: Omit<Entry, 'id' | 'user_id'>): Promise<Entry | null> => {
  const { data, error } = await supabase
    .from('entries')
    // FIX: Cast argument to 'any' to fix 'never' type inference issue on insert.
    .insert({ ...entryData, user_id: userId } as any)
    .select()
    .single();
  if (error) {
    console.error('Error adding entry:', error);
    return null;
  }
  return data;
};

// Reflection Functions
export const getReflections = async (userId: string): Promise<Reflection[]> => {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching reflections:', error);
    return [];
  }
  if (!data) return [];

  // This logic ensures we only get the absolute latest reflection for any given period (day, week, or month).
  const latestReflections = new Map<string, Reflection>();
  // Supabase returns array columns (like text[] or uuid[]) as native JavaScript arrays, so no parsing is needed.
  for (const reflection of data) {
    // FIX: Cast reflection to the 'Reflection' type to address Supabase client's type inference issue, which can incorrectly infer 'never'.
    const typedReflection = reflection as Reflection;
    // The key is the unique period identifier (e.g., '2024-07-29-daily' or '2024-W31-weekly')
    const key = `${typedReflection.date}-${typedReflection.type}`;
    if (!latestReflections.has(key)) {
      latestReflections.set(key, typedReflection);
    }
  }

  return Array.from(latestReflections.values());
};

export const addReflection = async (userId: string, reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'>): Promise<Reflection | null> => {
    // This function assumes the database schema is correct:
    // - `entry_ids` is an array type (e.g., text[] or uuid[])
    // - `date` is a text type to accommodate 'YYYY-MM-DD', 'YYYY-Www', and 'YYYY-MM' formats.
    // The Supabase client will correctly handle the JavaScript array for `entry_ids`.
    const { data, error } = await supabase
        .from('reflections')
        .insert({ 
            ...reflectionData,
            user_id: userId,
            timestamp: new Date().toISOString()
        } as any)
        .select()
        .single();

    if (error) {
        console.error('Error adding reflection:', error);
        return null;
    }

    return data as Reflection | null;
};

// Intention Functions
export const getIntentions = async (userId: string): Promise<Intention[]> => {
    const { data, error } = await supabase
        .from('intentions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching intentions:', error);
        return [];
    }
    return data || [];
};

export const addIntention = async (userId: string, text: string, timeframe: IntentionTimeframe): Promise<Intention | null> => {
    const { data, error } = await supabase
        .from('intentions')
        // FIX: Cast argument to 'any' to fix 'never' type inference issue on insert.
        .insert({ 
            user_id: userId, 
            text, 
            timeframe,
            status: 'pending',
            is_recurring: false, // Default value
        } as any)
        .select()
        .single();
    if (error) {
        console.error('Error adding intention:', error);
        throw error;
    }
    return data;
};

export const updateIntentionStatus = async (id: string, status: IntentionStatus): Promise<Intention | null> => {
    const updatePayload = {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
    };
    const { data, error } = await supabase
        .from('intentions')
        // FIX: Supabase client without generated types infers `never` for update.
        // @ts-ignore is used to bypass this typing issue.
        // @ts-ignore
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
    if (error) {
        console.error('Error updating intention status:', error);
        throw error;
    }
    return data;
};

export const deleteIntention = async (id: string): Promise<boolean> => {
    const { error } = await supabase
        .from('intentions')
        .delete()
        .eq('id', id);
    if (error) {
        console.error('Error deleting intention:', error);
        return false;
    }
    return true;
};
