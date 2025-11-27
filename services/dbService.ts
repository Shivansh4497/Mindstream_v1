
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus, GranularSentiment, Habit, HabitLog, HabitFrequency, HabitCategory, UserContext } from '../types';
import { getDateFromWeekId, getMonthId, getWeekId, getFormattedDate } from '../utils/date';
import { calculateStreak } from '../utils/streak';

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
        await (supabase as any).from('habits').delete().eq('user_id', userId);
        await (supabase as any).from('intentions').delete().eq('user_id', userId);
        await (supabase as any).from('reflections').delete().eq('user_id', userId);
        await (supabase as any).from('entries').delete().eq('user_id', userId);
        const { error } = await (supabase as any).from('profiles').delete().eq('id', userId);

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
export const getEntries = async (userId: string, page: number = 0, pageSize: number = 20): Promise<Entry[]> => {
    if (!supabase) return [];
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching entries:', error);
        return [];
    }
    return data || [];
};

export const addEntry = async (userId: string, entryData: Omit<Entry, 'id' | 'user_id'>): Promise<Entry> => {
    if (!supabase) throw new Error("Supabase client not initialized");
    // Explicitly cast to any to avoid 'never' type errors on insert
    const client: any = supabase;
    const { data, error } = await client
        .from('entries')
        .insert({ ...entryData, user_id: userId })
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
    const { data, error } = await (supabase as any)
        .from('entries')
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
    const { error } = await (supabase as any)
        .from('entries')
        .delete()
        .eq('id', entryId);
    if (error) {
        console.error('Error deleting entry:', error);
        return false;
    }
    return true;
};

// RAG: Keyword Search with Full Text Search (FTS)
export const searchEntries = async (userId: string, keywords: string[]): Promise<Entry[]> => {
    if (!supabase) return [];
    if (!keywords || keywords.length === 0) return [];

    const searchQuery = keywords.join(' or ');

    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .textSearch('text', searchQuery, {
            type: 'websearch',
            config: 'english'
        })
        .limit(10);

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
    const { error } = await (supabase as any).from('entries').insert(welcomeData as any);
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

    const { data, error } = await (supabase as any)
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
    const { data, error } = await (supabase as any)
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
    const { data, error } = await (supabase as any)
        .from('intentions')
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
    const { error } = await (supabase as any)
        .from('intentions')
        .delete()
        .eq('id', id);
    if (error) {
        console.error('Error deleting intention:', error);
        return false;
    }
    return true;
};

// --- HABITS (2.0: Dynamic Streak Calculation) ---

export const getHabits = async (userId: string): Promise<Habit[]> => {
    if (!supabase) return [];

    // 1. Fetch Habits
    const { data: habitsData, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) return [];

    const habits = habitsData as Habit[];
    if (!habits || habits.length === 0) return [];

    // 2. Fetch logs for the last 365 days to ensure accurate streak calc
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    // FIX: Cast supabase to any to avoid strict type inference errors with 'order' on inferred 'never' type
    const { data: logsData } = await (supabase as any)
        .from('habit_logs')
        .select('habit_id, completed_at')
        .eq('user_id', userId)
        .gte('completed_at', cutoffDate.toISOString())
        .order('completed_at', { ascending: false });

    // FIX: Add default empty array if logsData is null
    const logs = (logsData || []) as { habit_id: string; completed_at: string }[];
    const habitsToUpdate: { id: string, streak: number }[] = [];

    // 3. Recalculate Streaks for every habit (Derived Strategy)
    const processedHabits = habits.map(habit => {
        const habitLogs = logs.filter(l => l.habit_id === habit.id).map(l => new Date(l.completed_at));
        const calculatedStreak = calculateStreak(habitLogs, habit.frequency);

        if (calculatedStreak !== habit.current_streak) {
            habitsToUpdate.push({ id: habit.id, streak: calculatedStreak });
            return { ...habit, current_streak: calculatedStreak };
        }
        return habit;
    });

    // 4. Sync DB if streaks have changed (Self-Healing)
    if (habitsToUpdate.length > 0) {
        // We update individually or batch if we had an upsert. 
        // For simplicity, fire-and-forget individual updates or simple map.
        Promise.all(habitsToUpdate.map(h =>
            (supabase as any).from('habits').update({ current_streak: h.streak } as any).eq('id', h.id)
        )).catch(e => console.error("Error syncing calculated streaks:", e));
    }

    return processedHabits;
}

/**
 * Fetches habit logs for the visualization window.
 * Increased to 365 days to allow full history exploration if needed.
 */
export const getCurrentPeriodHabitLogs = async (userId: string): Promise<HabitLog[]> => {
    if (!supabase) return [];

    const now = new Date();
    now.setDate(now.getDate() - 365); // Fetch last year
    now.setHours(0, 0, 0, 0);
    const startOfPeriod = now.toISOString();

    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', userId);
    if (!habits || habits.length === 0) return [];

    const habitIds = habits.map((h: any) => h.id);

    // FIX: Cast supabase to any to resolve type errors with 'in' method
    const { data, error } = await (supabase as any)
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .gte('completed_at', startOfPeriod);

    if (error) return [];
    return data || [];
}

export const addHabit = async (userId: string, name: string, emoji: string, category: HabitCategory, frequency: HabitFrequency): Promise<Habit | null> => {
    if (!supabase) return null;

    // FIX: Explicitly cast to any to resolve 'never' type errors on insert
    const client: any = supabase;
    const { data, error } = await client
        .from('habits')
        .insert({
            user_id: userId,
            name,
            emoji,
            category,
            frequency,
            current_streak: 0,
            longest_streak: 0
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding habit:', error);
        throw error;
    }
    return data;
}

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<Habit | null> => {
    if (!supabase) return null;

    // FIX: Cast supabase to any to bypass strict typing on update payload
    const { data, error } = await (supabase as any)
        .from('habits')
        .update(updates)
        .eq('id', habitId)
        .select()
        .single();

    if (error) {
        console.error('Error updating habit:', error);
        throw error;
    }
    return data as Habit;
};

export const deleteHabit = async (habitId: string): Promise<boolean> => {
    if (!supabase) return false;
    // FIX: Cast supabase to any
    const { error } = await (supabase as any).from('habits').delete().eq('id', habitId);
    if (error) return false;
    return true;
}

/**
 * IDEMPOTENT SYNC:
 * Ensures a habit is marked completed (or not) for a specific period.
 * Replaces the old toggle logic to support debounced UI.
 */
export const syncHabitCompletion = async (
    userId: string,
    habitId: string,
    frequency: HabitFrequency,
    dateString: string | undefined,
    isCompleted: boolean
): Promise<{ updatedHabit: Habit }> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const targetDate = dateString ? new Date(dateString) : new Date();
    const targetIso = targetDate.toISOString();

    // 1. Determine the "period identifier" to prevent duplicates.
    const start = new Date(targetDate);
    const end = new Date(targetDate);

    if (frequency === 'daily') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (frequency === 'weekly') {
        const day = start.getDay() || 7;
        if (day !== 1) start.setHours(-24 * (day - 1));
        else start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else if (frequency === 'monthly') {
        start.setDate(1); start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1); end.setDate(0); end.setHours(23, 59, 59, 999);
    }

    const startDateStr = start.toISOString();
    const endDateStr = end.toISOString();

    // 2. Perform DB Mutation (Upsert or Delete)
    if (isCompleted) {
        // Upsert logic: Check existence first to be safe
        const { data: existing, error: fetchError } = await (supabase as any)
            .from('habit_logs')
            .select('id')
            .eq('habit_id', habitId)
            .gte('completed_at', startDateStr)
            .lte('completed_at', endDateStr);

        if (fetchError) console.error("Error fetching existence:", fetchError);

        if (!existing || existing.length === 0) {
            const { error } = await (supabase as any).from('habit_logs').insert({
                habit_id: habitId,
                completed_at: targetIso
            } as any);

            if (error) {
                console.error("Error inserting habit log:", error);
                throw error;
            }
        }
    } else {
        // Delete logic: Remove any logs in this period
        const { error } = await (supabase as any)
            .from('habit_logs')
            .delete()
            .eq('habit_id', habitId)
            .gte('completed_at', startDateStr)
            .lte('completed_at', endDateStr);

        if (error) {
            console.error("Error deleting habit log:", error);
            throw error;
        }
    }

    // 3. Recalculate Streak (Authoritative)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);
    const { data: allLogs } = await (supabase as any)
        .from('habit_logs')
        .select('completed_at')
        .eq('habit_id', habitId)
        .gte('completed_at', cutoffDate.toISOString());

    const logDates = ((allLogs as any[]) || []).map(l => new Date(l.completed_at));
    const newStreak = calculateStreak(logDates, frequency);

    // 4. Update Habit in DB
    const { data: updatedHabit, error } = await (supabase as any)
        .from('habits')
        // @ts-ignore
        .update({ current_streak: newStreak } as any)
        .eq('id', habitId)
        .select()
        .single();

    if (error || !updatedHabit) throw new Error("Failed to update habit streak");

    return { updatedHabit };
}



// ============================================
// Insight Cards Functions
// ============================================

export const getInsightCards = async (userId: string): Promise<any[]> => {
    if (!supabase) return [];

    try {
        const { data, error } = await (supabase as any)
            .from('insight_cards')
            .select('*')
            .eq('user_id', userId)
            .eq('dismissed', false)
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('insight_cards table not found or query failed (safe to ignore if migration pending):', error.message);
            return [];
        }

        return data || [];
    } catch (e) {
        console.warn('Failed to fetch insight cards, returning empty array:', e);
        return [];
    }
};

export const createInsightCard = async (
    userId: string,
    type: string,
    title: string,
    content: string,
    metadata?: any
): Promise<any> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { data, error } = await (supabase as any)
        .from('insight_cards')
        .insert({
            user_id: userId,
            type,
            title,
            content,
            metadata
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating insight card:', error);
        throw error;
    }

    return data;
};

export const dismissInsightCard = async (insightId: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const { error } = await (supabase as any)
        .from('insight_cards')
        .update({ dismissed: true })
        .eq('id', insightId);

    if (error) {
        console.error('Error dismissing insight card:', error);
        throw error;
    }
};

export const getAutoReflections = async (userId: string, limit: number = 1): Promise<any[]> => {
    if (!supabase) return [];

    try {
        const { data, error } = await (supabase as any)
            .from('reflections')
            .select('*')
            .eq('user_id', userId)
            .eq('auto_generated', true)
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn('Auto-reflections query failed (safe to ignore if column pending):', error.message);
            return [];
        }

        return data || [];
    } catch (e) {
        console.warn('Failed to fetch auto-reflections, returning empty array:', e);
        return [];
    }
};

export const getUserPersonality = async (userId: string): Promise<string> => {
    if (!supabase) return 'stoic';
    try {
        const { data } = await supabase
            .from('user_preferences')
            .select('ai_personality')
            .eq('user_id', userId)
            .single();
        return data?.ai_personality || 'stoic';
    } catch (e) {
        return 'stoic';
    }
}

export const getUserContext = async (userId: string): Promise<UserContext> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const [entries, intentions, habits, reflections, personalityId] = await Promise.all([
        getEntries(userId, 0, 15),
        getIntentions(userId),
        getHabits(userId),
        getReflections(userId),
        getUserPersonality(userId)
    ]);

    return {
        recentEntries: entries,
        pendingIntentions: intentions.filter(i => i.status === 'pending'),
        activeHabits: habits,
        latestReflection: reflections.length > 0 ? reflections[0] : null,
        personalityId
    };
}
