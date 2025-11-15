import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus } from '../types';
import { getDateFromWeekId, getMonthId, getWeekId } from '../utils/date';

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
    .insert({ ...entryData, user_id: userId } as any)
    .select()
    .single();
  if (error) {
    console.error('Error adding entry:', error);
    return null;
  }
  return data;
};

// Onboarding Functions
export const addWelcomeEntry = async (userId: string): Promise<Entry | null> => {
  const welcomeData = {
    timestamp: new Date().toISOString(),
    text: "Welcome to your new Mindstream! ✨\n\nThis is your private space to think, reflect, and grow. Capture any thought, big or small, using the input bar below. Mindstream will automatically organize it for you.\n\nLet's get started!",
    title: "Your First Step to Clarity",
    tags: ["welcome", "getting-started"],
    sentiment: "positive" as const,
    emoji: "👋"
  };
  return addEntry(userId, welcomeData);
};

export const addFirstIntention = async (userId: string): Promise<Intention | null> => {
  return addIntention(userId, "Explore all four tabs of Mindstream", "daily");
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

  // Convert dates back to the ID format the app expects before de-duping.
  const processedData = data.map((reflection: any) => {
    const typedReflection = reflection as Reflection;
    let finalDate = typedReflection.date;
    
    if (typedReflection.type === 'weekly') {
      finalDate = getWeekId(new Date(typedReflection.date));
    } else if (typedReflection.type === 'monthly') {
      finalDate = getMonthId(new Date(typedReflection.date));
    }
    return { ...typedReflection, date: finalDate, suggestions: typedReflection.suggestions || [] };
  });

  // This logic ensures we only get the absolute latest reflection for any given period (day, week, or month).
  const latestReflections = new Map<string, Reflection>();
  for (const reflection of processedData) {
    const typedReflection = reflection as Reflection;
    const key = `${typedReflection.date}-${typedReflection.type}`;
    if (!latestReflections.has(key)) {
      latestReflections.set(key, typedReflection);
    }
  }

  return Array.from(latestReflections.values());
};

export const addReflection = async (userId: string, reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'>): Promise<Reflection | null> => {
    let dateForDb = reflectionData.date;
    if (reflectionData.type === 'weekly') {
        dateForDb = getDateFromWeekId(reflectionData.date).toISOString().split('T')[0];
    } else if (reflectionData.type === 'monthly') {
        dateForDb = `${reflectionData.date}-01`;
    }

    const dbPayload = {
        ...reflectionData,
        date: dateForDb,
        user_id: userId,
        timestamp: new Date().toISOString(),
        suggestions: reflectionData.suggestions || null, // Pass object directly to jsonb column
    };

    const { data, error } = await supabase
        .from('reflections')
        .insert(dbPayload as any)
        .select()
        .single();

    if (error) {
        console.error('Error adding reflection:', error);
        return null;
    }
    
    // The returned data should have suggestions as an object, not a string.
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
