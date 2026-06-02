
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import * as nudgeEngine from '../services/nudgeEngine';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, Habit, HabitLog, HabitFrequency, EntrySuggestion, AIStatus, UserContext, HabitCategory, InsightCard, Nudge, Profile } from '../types';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { calculateStreak } from '../utils/streak';

const INITIAL_GREETING = "Hey! I'm here to help you reflect on what's on your mind. I can see your journal entries and help you spot patterns. What's going on today?";
const PAGE_SIZE = 20;

import { DemoLimitError, enrichLastAIMeta } from '../services/geminiClient';

export const useAppLogic = () => {
    const { user, isSeeding } = useAuth();
    const [entries, setEntries] = useState<Entry[]>([]);
    const [reflections, setReflections] = useState<Reflection[]>([]);
    const [intentions, setIntentions] = useState<Intention[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [insights, setInsights] = useState<InsightCard[]>([]);
    const [nudges, setNudges] = useState<Nudge[]>([]);
    const [autoReflections, setAutoReflections] = useState<Reflection[]>([]);
    const [messages, setMessages] = useState<Message[]>([{ sender: 'ai', text: INITIAL_GREETING, id: 'initial' }]);

    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [aiStatus, setAiStatus] = useState<AIStatus>('initializing');
    const [aiError, setAiError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
    const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Debounce timers for habit toggling to prevent network spam
    const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

    // Ref to hold the synchronous state of logs for rapid toggling
    const habitLogsRef = useRef<HabitLog[]>([]);

    const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
    const [isAddingHabit, setIsAddingHabit] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showDemoLimitModal, setShowDemoLimitModal] = useState(false);
    const [queryId, setQueryId] = useState(0);

    // Pending insight for first-entry Quick Start users
    const [pendingInsight, setPendingInsight] = useState<{
        insight: string;
        followUpQuestion: string;
        entryText: string;
        suggestedHabit?: { name: string; emoji: string };
        suggestedIntention?: string;
        confidence?: number;  // 0.0-1.0 confidence score for quality gating
    } | null>(null);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            // Clear any pending timers on unmount
            Object.values(debounceTimers.current).forEach(clearTimeout);
        };
    }, []);

    // Sync Ref with State when State updates (e.g. from DB fetch)
    useEffect(() => {
        habitLogsRef.current = habitLogs;
    }, [habitLogs]);

    const showToast = (message: string) => {
        if (isMounted.current) {
            setToast({ message, id: Date.now() });
        }
    };

    useEffect(() => {
        const fetchDataAndVerifyAI = async () => {

            if (!user) return;
            try {
                setAiStatus('verifying');
                // Load only first page of entries
                const [userEntries, userReflections, userIntentions, userHabits, userHabitLogs, userInsights, userAutoReflections, userNudges, userProfile] = await Promise.all([
                    db.getEntries(user.id, 0, PAGE_SIZE),
                    db.getReflections(user.id),
                    db.getIntentions(user.id),
                    db.getHabits(user.id),
                    db.getCurrentPeriodHabitLogs(user.id),
                    db.getInsightCards(user.id),
                    db.getAutoReflections(user.id, 1),
                    db.getPendingNudges(user.id),
                    db.getProfile(user.id)
                ]);

                if (isMounted.current) {
                    setEntries(userEntries);
                    if (userEntries.length < PAGE_SIZE) {
                        setHasMore(false);
                    }

                    setReflections(userReflections);
                    setIntentions(userIntentions);
                    setHabits(userHabits);
                    setHabitLogs(userHabitLogs);
                    setInsights(userInsights);
                    setAutoReflections(userAutoReflections);
                    setNudges(userNudges);
                    if (userProfile?.created_at) {
                        setAccountCreatedAt(userProfile.created_at);
                    }
                    // Ref will sync via effect
                }

                try {
                    await gemini.verifyApiKey();
                    if (isMounted.current) setAiStatus('ready');
                }
                catch (e: any) {
                    if (isMounted.current) {
                        setAiStatus('error');
                        setAiError(e.message);
                    }
                }

            } catch (error) {
                console.error("Error loading data:", error);
                showToast("Failed to load data. Please refresh.");
            } finally {
                if (isMounted.current) {
                    setIsDataLoaded(true);
                }
            }
        };
        fetchDataAndVerifyAI();
    }, [user]);



    // Check for Nudges
    useEffect(() => {
        if (isDataLoaded && user) {
            const timer = setTimeout(() => {
                nudgeEngine.checkForNudges(user.id, entries, habits, habitLogs, intentions)
                    .then(() => db.getPendingNudges(user.id))
                    .then(newNudges => {
                        if (isMounted.current) setNudges(newNudges);
                    })
                    .catch(console.error);
            }, 2000); // Delay to ensure data is settled
            return () => clearTimeout(timer);
        }
    }, [isDataLoaded, user, entries.length, habitLogs.length, intentions.length]);

    const handleLoadMore = async () => {
        if (!user || isLoadingMore || !hasMore) return;
        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const newEntries = await db.getEntries(user.id, nextPage, PAGE_SIZE);

            if (!isMounted.current) return;

            if (newEntries.length < PAGE_SIZE) {
                setHasMore(false);
            }

            setEntries(prev => [...prev, ...newEntries]);
            setPage(nextPage);
        } catch (error) {
            console.error("Error loading more entries:", error);
            showToast("Failed to load older entries.");
        } finally {
            if (isMounted.current) setIsLoadingMore(false);
        }
    };

    const handleAddEntry = async (text: string, viaVoice: boolean = false) => {

        if (!user) return;
        const tempId = `temp-${Date.now()}`;
        const tempEntry: Entry = {
            id: tempId, user_id: user.id, text, timestamp: new Date().toISOString(),
            emoji: "⏳", title: "Analyzing...", tags: [], primary_sentiment: null
        };
        setEntries(prev => [tempEntry, ...prev]);

        // Calculate entry index for analytics (before adding the new one)
        const entryIndex = entries.filter(e => !e.id.startsWith('temp-')).length + 1;

        try {
            let processedData: Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'> = { title: "Entry", tags: ["Unprocessed"], emoji: "📝", primary_sentiment: null };
            if (aiStatus === 'ready') {
                try { processedData = await gemini.processEntry(text); }
                catch (error) {
                    console.warn("AI processing failed");
                    // Show user-friendly fallback message
                    showToast("✨ Entry saved! AI enrichment will retry later.");
                    // Log AI error event
                    db.logEvent(user.id, 'error_event', {
                        source: 'ai_process_entry',
                        message: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            if (!isMounted.current) return;

            const savedEntry = await db.addEntry(user.id, { ...processedData, text, timestamp: tempEntry.timestamp });

            if (isMounted.current) {
                setEntries(prev => prev.map(e => e.id === tempId ? savedEntry : e));
            }

            // Enhanced analytics: track entry creation with source, entry_index, and via_voice
            db.logEvent(user.id, 'entry_created', {
                word_count: text.split(' ').length,
                char_count: text.length,
                sentiment: processedData.primary_sentiment || 'unknown',
                entry_index: entryIndex,
                via_voice: viaVoice
            });

            // Also log voice_input_used separately if voice was used
            if (viaVoice) {
                db.logEvent(user.id, 'voice_input_used', { context: 'stream_entry' });
            }

            if (aiStatus === 'ready' && text.split(' ').length > 3) {
                gemini.generateEntrySuggestions(text).then(async (suggestions) => {
                    if (!isMounted.current) return;

                    if (suggestions && suggestions.length > 0) {
                        await db.updateEntry(savedEntry.id, { suggestions });
                        if (isMounted.current) {
                            setEntries(prev => prev.map(e => e.id === savedEntry.id ? { ...e, suggestions } : e));
                        }
                    } else if (text.startsWith("TEST:")) {
                        showToast("AI Analysis: No suggestions found.");
                    }
                }).catch(console.error);
            }
        } catch (error) {
            if (isMounted.current) {
                setEntries(prev => prev.filter(e => e.id !== tempId));
                showToast("Failed to save entry.");
            }
        }
    };

    // ZERO-LATENCY DEBOUNCED HABIT TOGGLE WITH REF-BASED STATE
    const handleToggleHabit = async (habitId: string, dateString?: string) => {

        if (!user) return;

        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;

        const targetDate = dateString ? new Date(dateString) : new Date();

        // 1. Determine State using REF (Synchronous Source of Truth)
        // We must use the Ref because rapid clicks might happen before State updates,
        // causing stale closures to wipe out previous rapid clicks.
        const currentLogs = habitLogsRef.current;

        const existingLogIndex = currentLogs.findIndex(l => {
            if (l.habit_id !== habitId) return false;
            const logDate = new Date(l.completed_at);

            if (habit.frequency === 'daily') return isSameDay(logDate, targetDate);
            if (habit.frequency === 'weekly') return getWeekId(logDate) === getWeekId(targetDate);
            if (habit.frequency === 'monthly') return getMonthId(logDate) === getMonthId(targetDate);
            return false;
        });

        const isCurrentlyCompleted = existingLogIndex !== -1;
        const willBeCompleted = !isCurrentlyCompleted; // Toggle logic

        // 2. Modify Ref Immediately
        let newLogs = [...currentLogs];
        if (willBeCompleted) {
            newLogs.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                habit_id: habitId,
                completed_at: targetDate.toISOString()
            });
        } else {
            newLogs.splice(existingLogIndex, 1);
        }

        // Update Ref
        habitLogsRef.current = newLogs;
        // Update State (to trigger render)
        setHabitLogs(newLogs);

        // 3. Client-Side Streak Calculation (Derived from Ref)
        // We update the habit state immediately so the number flips instantly.
        // NOTE: HabitCard also calculates this derived state for the visual, but we keep this
        // to maintain data consistency in the app state.
        const habitSpecificLogs = newLogs.filter(l => l.habit_id === habitId).map(l => new Date(l.completed_at));
        const optimisticStreak = calculateStreak(habitSpecificLogs, habit.frequency);
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current_streak: optimisticStreak } : h));

        // 4. Debounce Network Sync
        if (debounceTimers.current[habitId]) {
            clearTimeout(debounceTimers.current[habitId]);
        }

        debounceTimers.current[habitId] = setTimeout(async () => {
            try {
                // IDEMPOTENT SYNC
                // We pass the explicit 'willBeCompleted' state.
                // Even if the user clicked 20 times, this final call enforces the final state.
                const { updatedHabit } = await db.syncHabitCompletion(
                    user.id,
                    habitId,
                    habit.frequency,
                    dateString,
                    willBeCompleted
                );

                if (isMounted.current) {
                    // Reconcile Streak (Self-Healing)
                    // If the server's authoritative calc differs from our optimistic math, trust the server.
                    if (updatedHabit.current_streak !== optimisticStreak) {
                        setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
                    }

                    // Analytics: track habit completion
                    if (willBeCompleted) {
                        db.logEvent(user.id, 'habit_completed', { habit_name: habit.name });
                    }
                }
            } catch (error) {
                console.error("Error syncing habit:", error);
                if (isMounted.current) {
                    showToast("Failed to sync habit changes.");
                }
            } finally {
                delete debounceTimers.current[habitId];
            }
        }, 500); // 500ms debounce (reduced from 1000ms for better persistence)
    };

    const handleEditHabit = async (habitId: string, name: string, emoji: string, category: HabitCategory) => {

        if (!user) return;
        try {
            const updated = await db.updateHabit(habitId, { name, emoji, category });
            if (updated && isMounted.current) {
                setHabits(prev => prev.map(h => h.id === habitId ? updated : h));
                showToast("Habit updated.");
            }
        } catch (error) {
            console.error("Error updating habit:", error);
            showToast("Failed to update habit.");
        }
    };

        const handleSendMessage = async (text: string, initialContext?: UserContext) => {
        const newUserMsg: Message = { sender: 'user', text };
        setMessages(prev => [...prev, newUserMsg]);
        setIsChatLoading(true);
        // Increment queryId so GlassBox resets its pipeline
        setQueryId(id => id + 1);

        // Analytics: track chat message
        if (user) {
            db.logEvent(user.id, 'chat_message_sent', { word_count: text.split(' ').length });
        }

        try {
            if (!isMounted.current) return;

            let isDemoUser = false;
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('is_demo').eq('id', user.id).single();
                isDemoUser = profile?.is_demo || false;
            }

            // Call AI Service
            const stream = await gemini.getChatResponseStream(user!.id, [...messages, newUserMsg], isDemoUser);

            let fullResponse = '';
            setMessages(prev => [...prev, { sender: 'ai', text: '' }]);

            for await (const chunk of stream) {
                if (!isMounted.current) break;
                const chunkText = chunk.text;
                if (chunkText) {
                    fullResponse += chunkText;
                    setMessages(prev => {
                        const newHistory = [...prev];
                        newHistory[newHistory.length - 1].text = fullResponse;
                        return newHistory;
                    });
                }
            }

            // Apply unwrapping to final text response to prevent JSON leak
            const unwrapped = gemini.unwrapResponse(fullResponse);
            if (unwrapped !== fullResponse) {
                setMessages(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1].text = unwrapped;
                    return newHistory;
                });
            }

            // Enrich parse_ms approximation after response
            enrichLastAIMeta({ parse_ms: 12 });

        } catch (error) {
            if (isMounted.current) {
                if (error instanceof DemoLimitError) {
                    setShowDemoLimitModal(true);
                    setMessages(prev => [...prev, { sender: 'ai', text: "You've used all your demo AI calls! Create a free account to keep exploring." }]);
                } else {
                    setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble connecting right now." }]);
                }
            }
        } finally {
            if (isMounted.current) setIsChatLoading(false);
        }
    };

    const handleAddHabit = async (n: string, f: HabitFrequency) => {

        if (!user) return;
        setIsAddingHabit(true);
        try {
            // Get AI-generated emoji and category
            let emoji = '✨';
            let category: HabitCategory = 'Growth';
            try {
                const analysis = await gemini.analyzeHabit(n);
                emoji = analysis.emoji;
                category = analysis.category;
            } catch (e) {
                console.warn('[handleAddHabit] AI analysis failed, using defaults');
            }

            const h = await db.addHabit(user.id, n, emoji, category, f);
            if (isMounted.current && h) setHabits(prev => [...prev, h]);
        } finally {
            if (isMounted.current) setIsAddingHabit(false);
        }
    };

    const handleAddIntention = async (text: string, dueDate: Date | null, isLifeGoal: boolean) => {

        if (!user) return;

        // Optimistic UI: Create temp intention and show immediately
        const tempId = `temp-${Date.now()}`;
        const tempIntention: Intention = {
            id: tempId,
            user_id: user.id,
            text,
            due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
            is_life_goal: isLifeGoal,
            is_starred: false,
            status: 'pending' as const,
            is_recurring: false,
            emoji: '⏳', // Loading indicator
            category: 'Growth',
            created_at: new Date().toISOString()
        };

        // Show immediately
        setIntentions(prev => [tempIntention, ...prev]);

        try {
            // Callback to update UI state when AI enrichment completes
            const onAIEnriched = (intentionId: string, emoji: string, category: string) => {
                if (isMounted.current) {
                    setIntentions(prev => prev.map(i =>
                        i.id === intentionId ? { ...i, emoji, category } : i
                    ));
                }
            };

            const savedIntention = await db.addIntention(
                user.id, text, dueDate, isLifeGoal, false, onAIEnriched
            );

            if (!isMounted.current) return;

            if (savedIntention) {
                // Replace temp with saved
                setIntentions(prev => prev.map(i =>
                    i.id === tempId ? savedIntention : i
                ));
                showToast('Goal saved ✓');
            } else {
                // Remove temp on failure
                setIntentions(prev => prev.filter(i => i.id !== tempId));
                showToast('Failed to save goal. Try again.');
            }
        } catch (error) {
            console.error('Error adding intention:', error);
            if (isMounted.current) {
                // Remove temp on error
                setIntentions(prev => prev.filter(i => i.id !== tempId));
                showToast('Failed to save goal. Try again.');
            }
        }
    };

    const handleToggleIntention = async (id: string, s: string) => {
        const ns = s === 'pending' ? 'completed' : 'pending';
        setIntentions(prev => prev.map(i => i.id === id ? { ...i, status: ns as any } : i));
        db.updateIntentionStatus(id, ns as any);
    };

    const handleToggleStar = async (id: string, isStarred: boolean) => {
        const newStarredState = !isStarred;
        setIntentions(prev => prev.map(i => i.id === id ? { ...i, is_starred: newStarredState } : i));
        try {
            await db.updateIntention(id, { is_starred: newStarredState });
        } catch (error) {
            console.error("Failed to toggle star:", error);
            // Revert on error
            setIntentions(prev => prev.map(i => i.id === id ? { ...i, is_starred: isStarred } : i));
            showToast("Failed to update priority.");
        }
    };

    const handleDeleteIntention = async (id: string) => { setIntentions(prev => prev.filter(i => i.id !== id)); db.deleteIntention(id); };
    const handleDeleteHabit = async (id: string) => { setHabits(prev => prev.filter(h => h.id !== id)); db.deleteHabit(id); };
    const handleEditEntry = async (e: Entry, t: string) => {
        const updated = await db.updateEntry(e.id, { text: t });
        if (isMounted.current) {
            setEntries(prev => prev.map(ent => ent.id === e.id ? updated : ent));
        }
    };
    const handleDeleteEntry = async (e: Entry) => { setEntries(prev => prev.filter(x => x.id !== e.id)); db.deleteEntry(e.id); };

    const handleAcceptSuggestion = async (id: string, s: EntrySuggestion) => {
        if (s.type === 'habit') await handleAddHabit(s.label, s.data?.frequency || 'daily');
        if (s.type === 'intention') {
            // Default to "this week" for AI suggestions
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            await handleAddIntention(s.label, oneWeekFromNow, false);
        }
        return s.type;
    };


    const handleDismissInsight = async (insightId: string) => {
        setInsights(prev => prev.filter(i => i.id !== insightId));
        await db.dismissInsightCard(insightId);
    };

    const handleAcceptNudge = async (nudge: Nudge) => {
        setNudges(prev => prev.filter(n => n.id !== nudge.id));
        await db.updateNudgeStatus(nudge.id, 'accepted');

        if (nudge.suggested_action === 'chat_reflection') {
            const context = await db.getUserContext(user!.id);
            handleSendMessage(`I'd like to talk about this insight: "${nudge.message}"`, context);
            showToast("Chat started. Go to Chat tab.");
        }
    };

    const handleDismissNudge = async (nudge: Nudge) => {
        setNudges(prev => prev.filter(n => n.id !== nudge.id));
        await db.updateNudgeStatus(nudge.id, 'dismissed');
    };

    /**
     * BULLETPROOF: Refresh all data from DB.
     * Called after account reset to ensure UI reflects the clean slate.
     */
    const refreshAllData = async () => {
        if (!user) return;

        console.log('[refreshAllData] Reloading all data from DB');

        // Reset all state to empty immediately
        setEntries([]);
        setReflections([]);
        setIntentions([]);
        setHabits([]);
        setHabitLogs([]);
        setInsights([]);
        setAutoReflections([]);
        setNudges([]);
        setMessages([{ sender: 'ai', text: "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?" }]);
        setHasMore(true);

        // Reload from DB
        try {
            const [userEntries, userReflections, userIntentions, userHabits, userHabitLogs, userInsights, userAutoReflections, userNudges, userProfile] = await Promise.all([
                db.getEntries(user.id, 0, PAGE_SIZE),
                db.getReflections(user.id),
                db.getIntentions(user.id),
                db.getHabits(user.id),
                db.getCurrentPeriodHabitLogs(user.id),
                db.getInsightCards(user.id),
                db.getAutoReflections(user.id, 1),
                db.getPendingNudges(user.id),
                db.getProfile(user.id)
            ]);

            if (isMounted.current) {
                setEntries(userEntries);
                if (userEntries.length < PAGE_SIZE) {
                    setHasMore(false);
                }
                setReflections(userReflections);
                setIntentions(userIntentions);
                setHabits(userHabits);
                setHabitLogs(userHabitLogs);
                setInsights(userInsights);
                setAutoReflections(userAutoReflections);
                setNudges(userNudges);
                if (userProfile?.created_at) {
                    setAccountCreatedAt(userProfile.created_at);
                }
            }
            console.log('[refreshAllData] Data reload complete');
        } catch (error) {
            console.error('[refreshAllData] Error reloading data:', error);
        }
    };

    // Refetch data when demo seeding completes
    const wasSeeding = useRef(false);
    useEffect(() => {
        if (isSeeding) {
            wasSeeding.current = true;
        } else if (!isSeeding && wasSeeding.current) {
            wasSeeding.current = false;
            console.log('[useAppLogic] Seeding complete detected, refreshing data...');
            refreshAllData();
        }
    }, [isSeeding]);

    return {
        state: { entries, reflections, intentions, habits, habitLogs, insights, nudges, autoReflections, messages, isDataLoaded, aiStatus, aiError, toast, isGeneratingReflection, isAddingHabit, isChatLoading, hasMore, isLoadingMore, pendingInsight, accountCreatedAt, showDemoLimitModal, queryId },
        actions: { handleAddEntry, handleToggleHabit, handleEditHabit, handleAddHabit, handleAddIntention, handleSendMessage, handleToggleIntention, handleToggleStar, handleDeleteIntention, handleDeleteHabit, handleEditEntry, handleDeleteEntry, handleAcceptSuggestion, handleDismissInsight, handleAcceptNudge, handleDismissNudge, setToast, setMessages, setIsGeneratingReflection, handleLoadMore, setReflections, setPendingInsight, setIntentions, refreshAllData, setIsChatLoading, setShowDemoLimitModal }
    };
};
