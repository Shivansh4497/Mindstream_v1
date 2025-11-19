
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus, GranularSentiment, Habit, HabitLog } from '../types';
import { getDateFromWeekId, getMonthId, getWeekId, getFormattedDate } from '../utils/date';

// Profile Functions
export const getProfile = async (userId: string): Promise<Profile | null> => {
  if (!supabase) return null;
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
  if (!supabase) throw new Error("Supabase client not initialized");
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
    throw error;
  }
  return data;
};

// Entry Functions
export const getEntries = async (userId: string): Promise<Entry[]> => {
  if (!supabase) return [];
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

// This function saves a complete, AI-enriched entry. This is the original, working logic.
export const addEntry = async (userId: string, entryData: Omit<Entry, 'id' | 'user_id'>): Promise<Entry> => {
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...entryData, user_id: userId } as any)
    .select()
    .single();
  if (error) {
    console.error('Error adding entry:', error);
    throw error;
  }
  return data;
};

export const updateEntry = async (entryId: string, updatedData: Partial<Entry>): Promise<Entry> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
        .from('entries')
        // FIX: Use @ts-ignore to bypass a Supabase client type inference issue with the update method.
        // @ts-ignore
        .update(updatedData)
        .eq('id', entryId)
        .select()
        .single();
    if (error) {
        console.error('Error updating entry:', error);
        throw error;
    }
    return data;
};

export const deleteEntry = async (entryId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId);
    if (error) {
        console.error('Error deleting entry:', error);
        return false;
    }
    return true;
};


// Onboarding Functions
export const addWelcomeEntry = async (userId: string): Promise<void> => {
  if (!supabase) return;
  const welcomeData = {
    timestamp: new Date().toISOString(),
    text: "Welcome to your new Mindstream! ✨\n\nThis is your private space to think, reflect, and grow. Capture any thought, big or small, using the input bar below. Mindstream will automatically organize it for you.\n\nLet's get started!",
    title: "Your First Step to Clarity",
    tags: ["welcome", "getting-started"],
    primary_sentiment: "Hopeful" as const,
    emoji: "👋",
    user_id: userId,
  };
   // FIX: Cast to 'any' to bypass Supabase client type error due to missing generated types.
   const { error } = await supabase.from('entries').insert(welcomeData as any);
   if (error) {
     console.error("Failed to add welcome entry:", error);
     throw error;
   }
};

export const addFirstIntention = async (userId: string): Promise<Intention | null> => {
  return addIntention(userId, "Explore all four tabs of Mindstream", "daily");
};


// Reflection Functions
export const getReflections = async (userId: string): Promise<Reflection[]> => {
  if (!supabase) return [];
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

export const addReflection = async (userId: string, reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'>): Promise<Reflection> => {
    if (!supabase) throw new Error("Supabase client not initialized");
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
        throw error;
    }
    
    // The returned data should have suggestions as an object, not a string.
    return data as Reflection;
};

// Intention Functions
export const getIntentions = async (userId: string): Promise<Intention[]> => {
    if (!supabase) return [];
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
    if (!supabase) return null;
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
    if (!supabase) return null;
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
    if (!supabase) return false;
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

// Habit Functions

export const getHabits = async (userId: string): Promise<Habit[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error('Error fetching habits:', error);
        return [];
    }
    return data || [];
}

export const getTodaysHabitLogs = async (userId: string): Promise<HabitLog[]> => {
    if (!supabase) return [];
    
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    
    // Workaround: We first get the user's habit IDs, then find logs for those IDs.
    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', userId);
    if (!habits || habits.length === 0) return [];
    
    // FIX: Explicitly type 'h' as any to avoid TypeScript "Property 'id' does not exist on type 'never'" error
    const habitIds = habits.map((h: any) => h.id);
    
    const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .gte('completed_at', todayStart.toISOString());
        
    if (error) {
        console.error('Error fetching habit logs:', error);
        return [];
    }
    return data || [];
}

export const addHabit = async (userId: string, name: string, emoji: string): Promise<Habit | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('habits')
        .insert({
            user_id: userId,
            name,
            emoji,
            frequency: 'daily',
            current_streak: 0,
            longest_streak: 0
        } as any)
        .select()
        .single();
        
    if (error) {
        console.error('Error adding habit:', error);
        throw error;
    }
    return data;
}

export const deleteHabit = async (habitId: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('habits').delete().eq('id', habitId);
    if (error) {
        console.error('Error deleting habit:', error);
        return false;
    }
    return true;
}

export const checkHabit = async (habitId: string, currentStreak: number): Promise<{log: HabitLog, updatedHabit: Habit}> => {
    if (!supabase) throw new Error("Supabase not initialized");
    // 1. Insert Log
    const { data: log, error: logError } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, completed_at: new Date().toISOString() } as any)
        .select()
        .single();
        
    if (logError) throw logError;
    
    // 2. Update Streak (Optimistic increment for 'daily' habits)
    const newStreak = currentStreak + 1;
    
    const { data: habit, error: habitError } = await supabase
        .from('habits')
        // @ts-ignore
        .update({ current_streak: newStreak })
        .eq('id', habitId)
        .select()
        .single();
        
    if (habitError) throw habitError;
    
    return { log, updatedHabit: habit };
}

export const uncheckHabit = async (logId: string, habitId: string, currentStreak: number): Promise<{ updatedHabit: Habit }> => {
    if (!supabase) throw new Error("Supabase not initialized");
    // 1. Delete Log
    const { error: logError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', logId);
        
    if (logError) throw logError;
    
    // 2. Decrement Streak (Safeguard against negative)
    const newStreak = Math.max(0, currentStreak - 1);
    
    const { data: habit, error: habitError } = await supabase
        .from('habits')
        // @ts-ignore
        .update({ current_streak: newStreak })
        .eq('id', habitId)
        .select()
        .single();
        
    if (habitError) throw habitError;
    
    return { updatedHabit: habit };
}
