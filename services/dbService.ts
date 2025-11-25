
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus, GranularSentiment, Habit, HabitLog, HabitFrequency, HabitCategory, UserContext } from '../types';
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

export const deleteAccount = async (userId: string): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    await supabase.from('habits').delete().eq('user_id', userId);
    await supabase.from('intentions').delete().eq('user_id', userId);
    await supabase.from('reflections').delete().eq('user_id', userId);
    await supabase.from('entries').delete().eq('user_id', userId);
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    
    if (error) {
      console.error("Error deleting profile:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Exception during account deletion:", e);
    return false;
  }
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

// RAG: Keyword Search
export const searchEntries = async (userId: string, keywords: string[]): Promise<Entry[]> => {
    if (!supabase) return [];
    if (!keywords || keywords.length === 0) return [];

    // Create a simple OR query for title or text matches
    // Syntax: column.ilike.%keyword%
    const conditions = keywords.map(k => `text.ilike.%${k}%,title.ilike.%${k}%`).join(',');

    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .or(conditions)
        .limit(10); // Limit to top 10 matches to prevent token overload

    if (error) {
        console.error("Error searching entries:", error);
        return [];
    }
    return data || [];
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
        suggestions: reflectionData.suggestions || null, 
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
            is_recurring: false, 
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

/**
 * Fetches habit logs relevant for the current period.
 * Habits 2.0: Fetches a rolling window (last 35 days) to support history visualization.
 */
export const getCurrentPeriodHabitLogs = async (userId: string): Promise<HabitLog[]> => {
    if (!supabase) return [];
    
    const now = new Date();
    now.setDate(now.getDate() - 35); // Fetch last 35 days
    const startOfPeriod = now.toISOString();
    
    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', userId);
    if (!habits || habits.length === 0) return [];
    
    const habitIds = habits.map((h: any) => h.id);
    
    const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .gte('completed_at', startOfPeriod);
        
    if (error) {
        console.error('Error fetching habit logs:', error);
        return [];
    }
    return data || [];
}

export const addHabit = async (userId: string, name: string, emoji: string, category: HabitCategory, frequency: HabitFrequency): Promise<Habit | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('habits')
        .insert({
            user_id: userId,
            name,
            emoji,
            category,
            frequency,
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

export const checkHabit = async (habitId: string, currentStreak: number, date?: string): Promise<{log: HabitLog, updatedHabit: Habit}> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const completedAt = date ? new Date(date).toISOString() : new Date().toISOString();

    const { data: log, error: logError } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, completed_at: completedAt } as any)
        .select()
        .single();
        
    if (logError) throw logError;
    
    let habit = null;
    // Only update streak number if we are toggling "Today"
    if (!date || new Date(date).toDateString() === new Date().toDateString()) {
        const newStreak = currentStreak + 1;
        const { data, error: habitError } = await supabase
            .from('habits')
            // @ts-ignore
            .update({ current_streak: newStreak })
            .eq('id', habitId)
            .select()
            .single();
        if (habitError) throw habitError;
        habit = data;
    } else {
         const { data } = await supabase.from('habits').select('*').eq('id', habitId).single();
         habit = data;
    }
    
    return { log, updatedHabit: habit };
}

export const uncheckHabit = async (logId: string, habitId: string, currentStreak: number, date?: string): Promise<{ updatedHabit: Habit }> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { error: logError } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', logId);
        
    if (logError) throw logError;
    
    let habit = null;
    if (!date || new Date(date).toDateString() === new Date().toDateString()) {
        const newStreak = Math.max(0, currentStreak - 1);
        const { data, error: habitError } = await supabase
            .from('habits')
            // @ts-ignore
            .update({ current_streak: newStreak })
            .eq('id', habitId)
            .select()
            .single();
        if (habitError) throw habitError;
        habit = data;
    } else {
         const { data } = await supabase.from('habits').select('*').eq('id', habitId).single();
         habit = data;
    }
    
    return { updatedHabit: habit };
}

export const getUserContext = async (userId: string): Promise<UserContext> => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const [entries, intentions, habits, reflections] = await Promise.all([
        getEntries(userId),
        getIntentions(userId),
        getHabits(userId),
        getReflections(userId)
    ]);
    
    // Note: searchResults is populated dynamically during chat
    return {
        recentEntries: entries.slice(0, 15),
        pendingIntentions: intentions.filter(i => i.status === 'pending'),
        activeHabits: habits,
        latestReflection: reflections.length > 0 ? reflections[0] : null
    };
}
