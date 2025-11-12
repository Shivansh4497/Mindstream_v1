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
    })
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
    .insert({ ...entryData, user_id: userId })
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
    .order('date', { ascending: false });
  if (error) {
    console.error('Error fetching reflections:', error);
    return [];
  }
  return data || [];
};

export const addReflection = async (userId: string, reflectionData: Omit<Reflection, 'id' | 'user_id'>): Promise<Reflection | null> => {
    const { data, error } = await supabase
        .from('reflections')
        // FIX: Cast argument to 'any' to fix 'never' type inference issue on insert.
        .insert({ ...reflectionData, user_id: userId })
        .select()
        .single();
    if (error) {
        console.error('Error adding reflection:', error);
        return null;
    }
    return data;
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
        })
        .select()
        .single();
    if (error) {
        console.error('Error adding intention:', error);
        throw error;
    }
    return data;
};

export const updateIntentionStatus = async (id: string, status: IntentionStatus): Promise<Intention | null> => {
    // FIX: Allow completed_at to be null to match assignment logic.
    const updateData: { status: IntentionStatus, completed_at?: string | null } = { status };
    if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
    } else {
        updateData.completed_at = null;
    }

    const { data, error } = await supabase
        .from('intentions')
        // FIX: Cast argument to 'any' to fix 'never' type inference issue on update.
        .update(updateData)
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
