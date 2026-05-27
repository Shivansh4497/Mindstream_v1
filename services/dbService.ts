
import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import type { Profile, Entry, Reflection, Intention, IntentionTimeframe, IntentionStatus, GranularSentiment, Habit, HabitLog, HabitFrequency, HabitCategory, UserContext, SearchResult } from '../types';
import { getDateFromWeekId, getMonthId, getWeekId, getFormattedDate } from '../utils/date';
import { calculateStreak } from '../utils/streak';
import { parseTemporalIntent } from './temporalParser';

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

export const updateProfile = async (userId: string, updates: Partial<Profile>): Promise<Profile | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
    if (error) {
        console.error('Error updating profile:', error);
        return null;
    }
    return data;
};

// Cache for account creation timestamps to avoid repeated DB calls
const accountCreatedAtCache: Map<string, string> = new Map();

// Get account creation timestamp (used to filter out old data from before account recreation)
export const getAccountCreatedAt = async (userId: string): Promise<string | null> => {
    // Check cache first
    if (accountCreatedAtCache.has(userId)) {
        return accountCreatedAtCache.get(userId)!;
    }

    const profile = await getProfile(userId);

    // For Demo users, we want to show ALL seeded history (backdated 30 days)
    // So we return 'null' to skip the date filtering logic in getEntries/getIntentions
    if (profile?.is_demo) {
        return null;
    }

    if (profile?.created_at) {
        accountCreatedAtCache.set(userId, profile.created_at);
        return profile.created_at;
    }
    return null;
};

// Clear cache on logout/account change
export const clearAccountCreatedAtCache = (userId: string) => {
    accountCreatedAtCache.delete(userId);
};

/**
 * BULLETPROOF: Reset all user data on onboarding.
 * This ensures a 100% clean slate - no old entries, habits, or reflections
 * can contaminate the new user experience.
 */
export const resetAccountData = async (userId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
        console.log('[resetAccountData] Starting full account reset for user:', userId);

        // Update deleted_at for all user data (Soft Delete)
        const deletedAt = new Date().toISOString();
        await (supabase as any).from('habit_logs').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('habits').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('intentions').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('reflections').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('entries').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('proactive_nudges').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('chart_insights').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('analytics_events').update({ deleted_at: deletedAt }).eq('user_id', userId);

        // Update profile.created_at to NOW - this is the key for timestamp filtering
        const now = new Date().toISOString();

        // 1. Update Auth Metadata (Source of Truth for "Fresh Start")
        const { error: authError } = await supabase.auth.updateUser({
            data: { last_reset_at: now }
        });
        if (authError) console.error('[resetAccountData] Warning: Failed to update auth metadata:', authError);

        // 2. Update Public Profile
        const { error: profileError } = await (supabase as any)
            .from('profiles')
            .update({ created_at: now })
            .eq('id', userId);

        if (profileError) {
            console.error('[resetAccountData] Error updating profile.created_at:', profileError);
            // Don't fail completely - data was still deleted
        }

        // Clear the cache so new created_at is fetched
        clearAccountCreatedAtCache(userId);

        console.log('[resetAccountData] Account reset complete. New created_at:', now);
        return true;
    } catch (e) {
        console.error('[resetAccountData] Exception during reset:', e);
        return false;
    }
};

export const createProfile = async (user: User, isDemo: boolean = false): Promise<Profile | null> => {
    if (!supabase) throw new Error("Supabase client not initialized");

    let effectiveCreatedAt = new Date().toISOString();

    if (!isDemo) {
        // 1. Check Metadata (The "Intentional Reset" Truth)
        const lastResetAt = user.user_metadata?.last_reset_at;

        // 2. Check Heritage (The "Glitch" Backup) - Find oldest entry
        let oldestEntryTimestamp: string | null = null;
        try {
            const { data: oldestEntry } = await supabase
                .from('entries')
                .select('timestamp')
                .eq('user_id', user.id)
                .order('timestamp', { ascending: true })
                .limit(1)
                .single();
            if (oldestEntry) oldestEntryTimestamp = oldestEntry.timestamp;
        } catch (e) {
            console.warn('Error checking heritage data:', e);
        }

        // 3. Decide Effective Creation Date
        if (lastResetAt) {
            console.log('[Profile] Restoring from explicit reset point:', lastResetAt);
            effectiveCreatedAt = lastResetAt;
        } else if (oldestEntryTimestamp) {
            console.log('[Profile] No reset found. Recovering heritage data from:', oldestEntryTimestamp);
            effectiveCreatedAt = oldestEntryTimestamp;
        } else {
            console.log('[Profile] New user or clean slate. Setting created_at to NOW.');
        }
    } else {
        console.log('[Profile] 🧪 Creating demo profile.');
    }

    // Build profile data
    const profileData: any = {
        id: user.id,
        email: user.email || `demo_${user.id.slice(0, 8)}@mindstream.demo`,
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: effectiveCreatedAt,
    };

    // Add demo-specific fields
    if (isDemo) {
        console.log('[dbService] createProfile: Setting is_demo=true for user', user.id);
        profileData.is_demo = true;
        profileData.demo_created_at = new Date().toISOString();
        profileData.demo_ai_calls_remaining = 15;
    }

    console.log('[dbService] Upserting profile data:', profileData);

    // Use upsert to handle account recreation with same email (prevents 409 conflict)
    const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

    if (error) {
        console.error('[dbService] Error creating/updating profile:', error);
        throw error;
    }

    console.log('[dbService] Profile created/updated result:', data);

    // Clear cache to ensure app picks up new timestamp
    clearAccountCreatedAtCache(user.id);

    return data;
};

export const deleteAccount = async (userId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
        // Soft Delete all user data
        const deletedAt = new Date().toISOString();
        await (supabase as any).from('habits').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('intentions').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('reflections').update({ deleted_at: deletedAt }).eq('user_id', userId);
        await (supabase as any).from('entries').update({ deleted_at: deletedAt }).eq('user_id', userId);

        // CRITICAL: Mark the reset time in Auth Metadata before deleting profile
        // This ensures if they sign up again, we know it was an intentional reset
        await supabase.auth.updateUser({
            data: { last_reset_at: new Date().toISOString() }
        });

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

    // Get account creation timestamp to filter out old data
    const accountCreatedAt = await getAccountCreatedAt(userId);

    let query = supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null);

    // Filter entries created after account recreation
    if (accountCreatedAt) {
        query = query.gte('timestamp', accountCreatedAt);
    }

    const { data, error } = await query
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
    
    // Non-blocking background embedding call
    supabase.functions.invoke('ai-proxy', {
        body: {
            action: 'generate-and-store-embedding',
            payload: {
                entryId: data.id,
                entryText: entryData.text
            }
        }
    }).catch(err => 
        console.error('Embedding generation failed:', err)
    );

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
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', entryId);
    if (error) {
        console.error('Error deleting entry:', error);
        return false;
    }
    return true;
};

// Chat Takeaways: Save AI-generated summary from chat as an entry
export const saveChatTakeaway = async (
    userId: string,
    title: string,
    summary: string,
    messageCount: number,
    userWordCount: number
): Promise<Entry | null> => {
    if (!supabase) throw new Error("Supabase client not initialized");

    const generationId = crypto.randomUUID();
    const sourceMeta = {
        prompt_version: 'chat-summary-v1',
        generation_id: generationId,
        message_count: messageCount,
        user_word_count: userWordCount,
        generated_at: new Date().toISOString(),
        quality_score: null // Founder fills later
    };

    const entryData = {
        user_id: userId,
        text: summary,
        title: title,
        timestamp: new Date().toISOString(),
        tags: ['chat-insight'],
        primary_sentiment: 'Reflective' as const,
        emoji: '💬',
        source: 'chat_takeaway' as const,
        source_meta: sourceMeta
    };

    const client: any = supabase;
    const { data, error } = await client
        .from('entries')
        .insert(entryData)
        .select()
        .single();

    if (error) {
        console.error('Error saving chat takeaway:', error);
        return null;
    }

    // Log analytics event
    logEvent(userId, 'takeaway_saved', { generation_id: generationId });

    return data;
};

// Chat Takeaways: Update existing takeaway entry (prevents duplicates from same session)
export const updateChatTakeaway = async (
    entryId: string,
    userId: string,
    title: string,
    summary: string,
    messageCount: number,
    userWordCount: number
): Promise<Entry | null> => {
    if (!supabase) throw new Error("Supabase client not initialized");

    const generationId = crypto.randomUUID();
    const sourceMeta = {
        prompt_version: 'chat-summary-v2',
        generation_id: generationId,
        message_count: messageCount,
        user_word_count: userWordCount,
        generated_at: new Date().toISOString(),
        quality_score: null,
        updated: true // Flag to indicate this was an update
    };

    const client: any = supabase;
    const { data, error } = await client
        .from('entries')
        .update({
            text: summary,
            title: title,
            timestamp: new Date().toISOString(), // Update timestamp to now
            source_meta: sourceMeta
        })
        .eq('id', entryId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating chat takeaway:', error);
        return null;
    }

    // Log analytics event
    logEvent(userId, 'takeaway_updated', { generation_id: generationId, entry_id: entryId });

    return data;
};

// RAG: Keyword Search with Full Text Search (FTS)
export const searchEntries = async (userId: string, keywords: string[]): Promise<Entry[]> => {
    if (!supabase) return [];
    if (!keywords || keywords.length === 0) return [];

    const searchQuery = keywords.join(' or ');

    // Get account creation date to filter out entries from before install
    const accountCreatedAt = await getAccountCreatedAt(userId);

    let query = supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .textSearch('text', searchQuery, {
            type: 'websearch',
            config: 'english'
        });

    // Filter out entries from before account creation (e.g., test data, previous accounts)
    if (accountCreatedAt) {
        query = query.gte('timestamp', accountCreatedAt);
    }

    const { data, error } = await query.limit(10);

    if (error) {
        console.error("Error searching entries:", error);
        return [];
    }
    return data || [];
};

/**
 * PHASE 13: MULTI-TABLE RAG
 * Searches Entries, Habits, and Intentions for a unified retrieval context.
 */
export const searchUniversal = async (userId: string, keywords: string[]): Promise<SearchResult[]> => {
    if (!supabase || !keywords || keywords.length === 0) return [];

    const searchQuery = keywords.join(' or ');
    const accountCreatedAt = await getAccountCreatedAt(userId);

    // 1. Search Entries (Content)
    let entryQuery = supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .textSearch('text', searchQuery, { type: 'websearch', config: 'english' });

    if (accountCreatedAt) entryQuery = entryQuery.gte('timestamp', accountCreatedAt);
    const entryPromise = entryQuery.limit(5);

    // 2. Search Habits (Name & Category)
    // Supabase doesn't support OR across columns easily with textSearch, so we'll use ILIKE for simplicity on these small tables
    // or we can use the 'or' filter string syntax: "name.ilike.%key%,category.ilike.%key%"
    // Since keywords is an array, let's just search for the first few keywords to avoid complex OR logic complexity
    // For a MVP RAG, let's just search matching Name OR Category for ANY of the keywords.
    const keywordFilter = keywords.map(k => `name.ilike.%${k}%,category.ilike.%${k}%`).join(',');
    let habitQuery = supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(keywordFilter);

    if (accountCreatedAt) habitQuery = habitQuery.gte('created_at', accountCreatedAt);
    const habitPromise = habitQuery.limit(5);

    // 3. Search Intentions (Text)
    const intentionFilter = keywords.map(k => `text.ilike.%${k}%`).join(',');
    let intentionQuery = supabase
        .from('intentions')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(intentionFilter);

    if (accountCreatedAt) intentionQuery = intentionQuery.gte('created_at', accountCreatedAt);
    const intentionPromise = intentionQuery.limit(5);

    // Execute in parallel
    const [entryRes, habitRes, intentionRes] = await Promise.all([entryPromise, habitPromise, intentionPromise]);

    const results: SearchResult[] = [];

    // Process Entries
    if (entryRes.data) {
        entryRes.data.forEach((e: Entry) => {
            results.push({
                type: 'entry',
                item: e,
                matchText: e.text,
                timestamp: e.timestamp
            });
        });
    }

    // Process Habits
    if (habitRes.data) {
        habitRes.data.forEach((h: Habit) => {
            results.push({
                type: 'habit',
                item: h,
                matchText: `${h.name} (${h.category})`,
                timestamp: h.created_at
            });
        });
    }

    // Process Intentions
    if (intentionRes.data) {
        intentionRes.data.forEach((i: Intention) => {
            results.push({
                type: 'intention',
                item: i,
                matchText: i.text,
                timestamp: i.created_at
            });
        });
    }

    // Sort by timestamp descending (most recent first) as a proxy for relevance in this simple implementation
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
};

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        action: 'generate-embedding',
        payload: { text }
      }
    });
    if (error) throw error;
    return data?.data?.embedding || data?.embedding || [];
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    return [];
  }
}

export async function semanticSearchEntries(
  userId: string,
  queryText: string,
  matchCount: number = 3,
  matchThreshold: number = 0.82,
  startDate: Date | null = null,
  endDate: Date | null = null,
  preGeneratedEmbedding?: number[]
): Promise<Array<Entry & { similarity: number }>> {
  if (!queryText || queryText.trim().length < 3) {
    console.log('[RAG] Query too short — skipping semantic search');
    return [];
  }
  if (!supabase) return [];
  
  // Parse temporal intent unless explicit bounds are provided
  let activeStartDate = startDate?.toISOString() ?? null;
  let activeEndDate = endDate?.toISOString() ?? null;
  let activeThreshold = matchThreshold;

  if (!startDate || !endDate) {
    const temporal = parseTemporalIntent(queryText);
    if (temporal.hasTemporalIntent) {
      activeThreshold = 0.3;
      activeStartDate = temporal.startDate ? temporal.startDate.toISOString() : null;
      activeEndDate = temporal.endDate ? temporal.endDate.toISOString() : null;
    }
  } else {
    activeThreshold = 0.70; // lower threshold for explicit bounds
  }
  
  const payload: any = {
    userId,
    queryText,
    matchCount,
    matchThreshold: activeThreshold,
    startDate: activeStartDate,
    endDate: activeEndDate,
  };

  if (preGeneratedEmbedding) {
    payload.embedding = preGeneratedEmbedding;
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      'ai-proxy',
      { body: { action: 'semantic-search', payload } }
    );
    if (error) throw error;
    return data?.data?.matches || data?.matches || [];
  } catch (error) {
    console.error('Semantic search failed:', error);
    return [];
  }
}

// 1. TEMPORAL_SUMMARY retrieval
// Fetches ALL entries in date window
export async function getEntriesByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  limit: number = 10
): Promise<Array<Entry & { similarity: number }>> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) return [];
  // Assign similarity 1.0 (exact date match)
  return (data || []).map(e => ({
    ...e,
    similarity: 1.0
  }));
}

// 1b. TEMPORAL_SUMMARY fallback retrieval
export async function getRecentEntries(
  userId: string,
  limit: number = 10
): Promise<Array<Entry & { similarity: number }>> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .limit(limit);
  return (data || []).map(e => ({
    ...e,
    similarity: 1.0
  }));
}

// 3. TEMPORAL_TOPIC retrieval
// Semantic search within date bounds
export async function semanticSearchWithBounds(
  userId: string,
  queryText: string,
  startDate: Date,
  endDate: Date,
  matchCount: number = 5,
  matchThreshold: number = 0.70,
  preGeneratedEmbedding?: number[]
): Promise<Array<Entry & { similarity: number }>> {
  return semanticSearchEntries(
    userId,
    queryText,
    matchCount,
    matchThreshold,
    startDate,
    endDate,
    preGeneratedEmbedding
  );
}

// 4. BEHAVIORAL retrieval
// Queries habits and goals tables directly
export async function getBehavioralContext(
  userId: string
): Promise<{
  habits: Habit[];
  goals: Intention[];
  habitLogs: any[];
}> {
  if (!supabase) return {
    habits: [], goals: [], habitLogs: []
  };

  const [habitsRes, goalsRes, logsRes] =
    await Promise.all([
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('intentions')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString())
    ]);

  return {
    habits: habitsRes.data || [],
    goals: goalsRes.data || [],
    habitLogs: logsRes.data || []
  };
}

// 5. ANALYTICAL retrieval
// Aggregates tags, sentiments across all entries
export async function getAnalyticalContext(
  userId: string,
  limit: number = 30
): Promise<{
  entries: Entry[];
  topTags: string[];
  sentimentDistribution: Record<string, number>;
}> {
  if (!supabase) return {
    entries: [], topTags: [],
    sentimentDistribution: {}
  };

  const { data } = await supabase
    .from('entries')
    .select('text, tags, primary_sentiment, timestamp')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .limit(limit);

  const entries = (data || []) as Entry[];

  // Aggregate tags
  const tagCounts: Record<string, number> = {};
  entries.forEach(e => {
    (e.tags || []).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);

  // Aggregate sentiments
  const sentimentDistribution: Record<string, number> = {};
  entries.forEach(e => {
    if (e.primary_sentiment) {
      sentimentDistribution[e.primary_sentiment] =
        (sentimentDistribution[e.primary_sentiment] || 0) + 1;
    }
  });

  return { entries, topTags, sentimentDistribution };
}

// 6. CONVERSATIONAL retrieval
// Minimal retrieval — conversation history
export async function getConversationContext(
  userId: string
): Promise<Array<Entry & { similarity: number }>> {
  if (!supabase) return [];
  // Just return 3 most recent entries
  const { data } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('timestamp', { ascending: false })
    .limit(3);
  return (data || []).map(e => ({
    ...e, similarity: 1.0
  }));
}


/**
 * PHASE 1: TEMPORAL MEMORY
 * Find emotionally similar past moments for contextual AI responses.
 * This enables "Last time you felt this way..." style AI responses.
 */
export const findSimilarMoments = async (
    userId: string,
    currentSentiment: string | null,
    currentTags: string[] | null,
    excludeHours: number = 48
): Promise<{ entry: Entry; matchType: 'sentiment' | 'tag' | 'keyword'; matchScore: number }[]> => {
    if (!supabase) return [];

    const results: { entry: Entry; matchType: 'sentiment' | 'tag' | 'keyword'; matchScore: number }[] = [];

    // Calculate cutoff time (exclude recent entries)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - excludeHours);
    const cutoffISO = cutoffTime.toISOString();

    // Get account creation date to filter out old data
    const accountCreatedAt = await getAccountCreatedAt(userId);

    try {
        // 1. Find entries with same sentiment (strongest match)
        if (currentSentiment) {
            let sentimentQuery = supabase
                .from('entries')
                .select('*')
                .eq('user_id', userId)
                .is('deleted_at', null)
                .eq('primary_sentiment', currentSentiment)
                .lt('timestamp', cutoffISO) // Exclude recent
                .order('timestamp', { ascending: false })
                .limit(5);

            if (accountCreatedAt) {
                sentimentQuery = sentimentQuery.gte('timestamp', accountCreatedAt);
            }

            const { data: sentimentMatches } = await sentimentQuery;

            if (sentimentMatches) {
                sentimentMatches.forEach((entry, index) => {
                    results.push({
                        entry: entry as Entry,
                        matchType: 'sentiment',
                        matchScore: 1 - (index * 0.1) // Decay score by recency
                    });
                });
            }
        }

        // 2. Find entries with overlapping tags
        if (currentTags && currentTags.length > 0) {
            let tagQuery = supabase
                .from('entries')
                .select('*')
                .eq('user_id', userId)
                .is('deleted_at', null)
                .lt('timestamp', cutoffISO)
                .order('timestamp', { ascending: false })
                .limit(20); // Fetch more to filter client-side

            if (accountCreatedAt) {
                tagQuery = tagQuery.gte('timestamp', accountCreatedAt);
            }

            const { data: tagCandidates } = await tagQuery;

            if (tagCandidates) {
                tagCandidates.forEach((entry: any) => {
                    const entryTags = entry.tags || [];
                    const overlap = currentTags.filter((t: string) =>
                        entryTags.map((et: string) => et.toLowerCase()).includes(t.toLowerCase())
                    );

                    if (overlap.length > 0) {
                        // Avoid duplicates from sentiment search
                        const alreadyAdded = results.some(r => r.entry.id === entry.id);
                        if (!alreadyAdded) {
                            results.push({
                                entry: entry as Entry,
                                matchType: 'tag',
                                matchScore: overlap.length / currentTags.length
                            });
                        }
                    }
                });
            }
        }

        // Sort by score and limit to top 3
        results.sort((a, b) => b.matchScore - a.matchScore);
        return results.slice(0, 3);

    } catch (error) {
        console.error('[findSimilarMoments] Error:', error);
        return [];
    }
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

    // Get account creation timestamp to filter out old data
    const accountCreatedAt = await getAccountCreatedAt(userId);

    let query = supabase
        .from('reflections')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null);

    // Filter reflections created after account recreation
    if (accountCreatedAt) {
        query = query.gte('timestamp', accountCreatedAt);
    }

    const { data, error } = await query.order('timestamp', { ascending: false });

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

    // Store the original date format before converting for DB
    const originalDate = reflectionData.date;

    let dateForDb = reflectionData.date;
    if (reflectionData.type === 'weekly') {
        dateForDb = getDateFromWeekId(reflectionData.date).toISOString().split('T')[0];
    } else if (reflectionData.type === 'monthly') {
        dateForDb = `${reflectionData.date}-01`;
    }

    // Only include columns that exist in the database schema
    // This prevents errors from extra fields returned by AI
    const dbPayload = {
        user_id: userId,
        type: reflectionData.type,
        date: dateForDb,
        summary: reflectionData.summary,
        suggestions: reflectionData.suggestions || null,
        timestamp: new Date().toISOString(),
        auto_generated: reflectionData.auto_generated || false,
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

    // Return with original date format (weekId/monthId) so state stays consistent
    return { ...data, date: originalDate } as Reflection;
};

// Intention Functions
export const getIntentions = async (userId: string): Promise<Intention[]> => {
    if (!supabase) return [];

    // Get account creation timestamp to filter out old data
    const accountCreatedAt = await getAccountCreatedAt(userId);

    let query = supabase
        .from('intentions')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null);

    // Filter intentions created after account recreation
    if (accountCreatedAt) {
        query = query.gte('created_at', accountCreatedAt);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching intentions:', error);
        return [];
    }
    return data || [];
};

export const addIntention = async (
    userId: string,
    text: string,
    dueDate: Date | null = null,
    isLifeGoal: boolean = false,
    isStarred: boolean = false,
    onAIEnriched?: (intentionId: string, emoji: string, category: string) => void
): Promise<Intention | null> => {
    if (!supabase) return null;

    // Format as local date string (YYYY-MM-DD) to avoid timezone offset issues
    const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const intentionData = {
        user_id: userId,
        text,
        due_date: dueDate ? formatLocalDate(dueDate) : null,
        is_life_goal: isLifeGoal,
        is_starred: isStarred,
        status: 'pending',
        is_recurring: false,
        emoji: '🎯', // Default emoji, will be updated by AI
        category: 'Growth' as const, // Default category, will be updated by AI
    };

    console.log('Creating intention with data:', intentionData);

    const { data, error } = await (supabase as any)
        .from('intentions')
        .insert(intentionData as any)
        .select()
        .single();

    if (error) {
        console.error('Error adding intention:', error);
        throw error;
    }

    console.log('Intention created successfully:', data);

    // Async AI tagging - don't block on this, but call back when done
    analyzeIntentionAsync(data.id, text, onAIEnriched);

    return data;
};

// Async function to analyze and update intention with AI-assigned emoji/category
const analyzeIntentionAsync = async (
    intentionId: string,
    intentionText: string,
    onAIEnriched?: (intentionId: string, emoji: string, category: string) => void
) => {
    try {
        const { callAIProxy } = await import('./geminiClient');
        const result = await callAIProxy<{ emoji: string; category: string }>('analyze-intention', {
            intentionText
        });

        const emoji = result?.emoji || '🎯';
        const category = result?.category || 'Growth';

        if (result?.emoji || result?.category) {
            await (supabase as any)
                .from('intentions')
                .update({ emoji, category })
                .eq('id', intentionId);
            console.log(`[AI Tagging] Intention updated: ${emoji} ${category}`);

            // Call back to update UI state
            onAIEnriched?.(intentionId, emoji, category);
        }
    } catch (e) {
        console.warn('[AI Tagging] Failed to analyze intention:', e);
        // Silently fail - default emoji/category already set
    }
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

export const updateIntention = async (id: string, updates: Partial<Intention>): Promise<Intention | null> => {
    if (!supabase) return null;
    const { data, error } = await (supabase as any)
        .from('intentions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) {
        console.error('Error updating intention:', error);
        throw error;
    }
    return data;
};

export const deleteIntention = async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await (supabase as any)
        .from('intentions')
        .update({ deleted_at: new Date().toISOString() })
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

    // Get account creation timestamp to filter out old data
    const accountCreatedAt = await getAccountCreatedAt(userId);

    // 1. Fetch Habits
    let query = supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null);

    // Filter habits created after account recreation
    if (accountCreatedAt) {
        query = query.gte('created_at', accountCreatedAt);
    }

    const { data: habitsData, error } = await query.order('created_at', { ascending: true });

    if (error) return [];

    const habits = habitsData as Habit[];
    if (!habits || habits.length === 0) return [];

    // 2. Fetch logs for the last 365 days to ensure accurate streak calc
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 365);

    // Get habit IDs for filtering logs
    const habitIds = habits.map(h => h.id);

    // FIX: Query by habit_id (not user_id which doesn't exist in habit_logs table)
    const { data: logsData } = await (supabase as any)
        .from('habit_logs')
        .select('habit_id, completed_at')
        .in('habit_id', habitIds)
        .is('deleted_at', null)
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

    const { data: habits } = await supabase.from('habits').select('id').eq('user_id', userId).is('deleted_at', null);
    if (!habits || habits.length === 0) return [];

    const habitIds = habits.map((h: any) => h.id);

    // FIX: Cast supabase to any to resolve type errors with 'in' method
    const { data, error } = await (supabase as any)
        .from('habit_logs')
        .select('*')
        .in('habit_id', habitIds)
        .is('deleted_at', null)
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
    // Soft Delete
    const { error } = await (supabase as any)
        .from('habits')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', habitId);
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
        .is('deleted_at', null)
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
            .is('deleted_at', null)
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
            .is('deleted_at', null)
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

// User Flags for cross-device UX state persistence
export interface UserFlags {
    onboardingStep?: number;
    hasSeenFirstInsight?: boolean;
    hasVisitedInsights?: boolean;
}

export const getUserFlags = async (userId: string): Promise<UserFlags> => {
    if (!supabase) return {};
    try {
        const { data, error } = await supabase
            .from('user_preferences')
            .select('flags')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.warn('Error fetching user flags:', error);
            return {};
        }

        return (data?.flags as UserFlags) || {};
    } catch (e) {
        console.warn('Failed to get user flags:', e);
        return {};
    }
};

export const updateUserFlags = async (userId: string, flags: Partial<UserFlags>): Promise<void> => {
    if (!supabase) return;
    try {
        // First, get existing flags to merge
        const existingFlags = await getUserFlags(userId);
        const mergedFlags = { ...existingFlags, ...flags };

        // Upsert the record
        const { error } = await (supabase as any)
            .from('user_preferences')
            .upsert({
                user_id: userId,
                flags: mergedFlags
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Error updating user flags:', error);
        }
    } catch (e) {
        console.error('Failed to update user flags:', e);
    }
};

export const getUserContext = async (userId: string): Promise<UserContext> => {
    if (!supabase) throw new Error("Supabase not initialized");

    const [entries, intentions, habits, reflections, personalityId] = await Promise.all([
        getEntries(userId, 0, 15),
        getIntentions(userId),
        getHabits(userId),
        getReflections(userId),
        getUserPersonality(userId)
    ]);

    // Filter out system/welcome entries from context (they shouldn't be used as user input)
    const userEntries = entries.filter(e => !(e.tags && e.tags.includes('welcome')));

    // PHASE 1: TEMPORAL MEMORY - Find similar past moments
    let similarMoments: { entry: Entry; matchType: 'sentiment' | 'tag' | 'keyword'; matchScore: number }[] = [];

    // Use the most recent entry to find similar moments
    if (userEntries.length > 0) {
        const mostRecent = userEntries[0];
        similarMoments = await findSimilarMoments(
            userId,
            mostRecent.primary_sentiment || null,
            mostRecent.tags || null,
            48 // Exclude entries from last 48 hours
        );
    }

    return {
        recentEntries: userEntries,
        pendingIntentions: intentions.filter(i => i.status === 'pending'),
        activeHabits: habits,
        latestReflection: reflections.length > 0 ? reflections[0] : null,
        similarMoments: similarMoments.length > 0 ? similarMoments : undefined,
        personalityId
    };
}

// Proactive Nudges
export const createNudge = async (userId: string, nudge: { pattern_type: string, message: string, suggested_action: string, status: string }): Promise<any> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('proactive_nudges')
        .insert({ ...nudge, user_id: userId })
        .select()
        .single();
    if (error) {
        console.error('Error creating nudge:', error);
        return null;
    }
    return data;
};

export const getRecentNudges = async (userId: string, patternType: string): Promise<any[]> => {
    if (!supabase) return [];
    // Check for nudges in the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
        .from('proactive_nudges')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('pattern_type', patternType)
        .gte('created_at', yesterday.toISOString());

    if (error) return [];
    return data || [];
};

export const getPendingNudges = async (userId: string): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('proactive_nudges')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
};

export const updateNudgeStatus = async (nudgeId: string, status: 'accepted' | 'dismissed'): Promise<void> => {
    if (!supabase) return;
    await supabase
        .from('proactive_nudges')
        .update({ status, acted_on_at: new Date().toISOString() })
        .eq('id', nudgeId);
};

// ============================================
// Analytics Functions
// ============================================

export type AnalyticsEvent =
    | 'onboarding_completed'
    | 'entry_created'
    | 'insight_modal_action'
    | 'insight_modal_shown'
    | 'first_insight_viewed'   // NEW: one-time event when first insight modal shown
    | 'first_action_taken'     // NEW: one-time event for first habit/goal/chat action
    | 'reflection_generated'   // NEW: when daily/weekly/monthly reflection is generated
    | 'habit_completed'
    | 'insights_unlocked'
    | 'app_opened'
    | 'chat_message_sent'
    | 'voice_input_used'
    | 'error_event'
    // Chat feedback events
    | 'chat_sharing_prompt_shown'
    | 'chat_sharing_prompt_accepted'
    | 'chat_sharing_prompt_declined'
    | 'chat_sharing_enabled'
    | 'chat_sharing_disabled'
    | 'chat_feedback_session_saved'
    | 'chat_feedback_deleted'
    // Takeaway events
    | 'takeaway_button_shown'
    | 'takeaway_button_clicked'
    | 'takeaway_saved'
    | 'takeaway_updated'
    | 'takeaway_edited'
    | 'takeaway_undone'
    | 'takeaway_generation_failed'
    | 'takeaway_undo_failed';

export const logEvent = async (
    userId: string,
    eventName: AnalyticsEvent,
    properties?: Record<string, any>,
    clientEventId?: string  // Optional: pass a client-generated UUID for idempotency
): Promise<void> => {
    if (!supabase) return;

    try {
        const eventData: Record<string, any> = {
            user_id: userId,
            event_name: eventName,
            properties: properties || {}
        };

        // If clientEventId provided, use upsert to prevent duplicates
        if (clientEventId) {
            eventData.client_event_id = clientEventId;
            await supabase.from('analytics_events').upsert(eventData, {
                onConflict: 'client_event_id',
                ignoreDuplicates: true
            });
        } else {
            // No clientEventId - regular insert (for backward compatibility)
            await supabase.from('analytics_events').insert(eventData);
        }
    } catch (error) {
        // Silent fail - analytics should never block user actions
        console.warn('Analytics event failed:', eventName, error);
    }
};

// --- CHAT FEEDBACK (Opt-In Sharing for AI Quality Improvement) ---

export interface ChatMessage {
    id?: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp?: string;
}

export type EntryPoint = 'quick_start' | 'guided' | 'organic';

/**
 * Create a new chat feedback entry (first message in session).
 * Returns the created row ID for subsequent updates.
 */
export const createChatFeedback = async (
    userId: string,
    conversation: ChatMessage[],
    personality: string,
    entryPoint: EntryPoint
): Promise<string | null> => {
    if (!supabase) return null;

    try {
        // Cap at 25 messages
        const cappedConversation = conversation.slice(-25);

        const { data, error } = await supabase.from('chat_feedback').insert({
            user_id: userId,
            conversation: cappedConversation,
            personality,
            entry_point: entryPoint,
            message_count: cappedConversation.length
        }).select('id').single();

        if (error) {
            console.error('Failed to create chat feedback:', error);
            return null;
        }

        return data?.id || null;
    } catch (error) {
        console.error('Error creating chat feedback:', error);
        return null;
    }
};

/**
 * Update an existing chat feedback entry (subsequent messages).
 * Updates conversation and message_count.
 */
export const updateChatFeedback = async (
    feedbackId: string,
    conversation: ChatMessage[]
): Promise<boolean> => {
    if (!supabase) return false;

    try {
        // Cap at 25 messages
        const cappedConversation = conversation.slice(-25);

        const { error } = await supabase.from('chat_feedback')
            .update({
                conversation: cappedConversation,
                message_count: cappedConversation.length
            })
            .eq('id', feedbackId);

        if (error) {
            console.error('Failed to update chat feedback:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating chat feedback:', error);
        return false;
    }
};

/**
 * Get count of shared conversations for a user (for Settings display).
 */
export const getChatFeedbackCount = async (userId: string): Promise<number> => {
    if (!supabase) return 0;

    try {
        const { count, error } = await supabase
            .from('chat_feedback')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to get chat feedback count:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('Error getting chat feedback count:', error);
        return 0;
    }
};

/**
 * Delete all shared chat feedback for a user.
 */
export const deleteUserChatFeedback = async (userId: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
        const { error } = await (supabase as any)
            .from('chat_feedback')
            .update({ deleted_at: new Date().toISOString() } as any)
            .eq('user_id', userId);

        if (error) {
            console.error('Failed to delete chat feedback:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting chat feedback:', error);
        return false;
    }
};
