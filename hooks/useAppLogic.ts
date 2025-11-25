
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, Habit, HabitLog, HabitFrequency, EntrySuggestion, AIStatus, UserContext, HabitCategory } from '../types';
import { isSameDay, getWeekId, getMonthId } from '../utils/date';
import { calculateStreak } from '../utils/streak';

const INITIAL_GREETING = "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?";
const PAGE_SIZE = 20;

export const useAppLogic = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ sender: 'ai', text: INITIAL_GREETING, id: 'initial' }]);
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('initializing');
  const [aiError, setAiError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Debounce timers for habit toggling to prevent network spam
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Clear any pending timers on unmount
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

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
        const [userEntries, userReflections, userIntentions, userHabits, userHabitLogs] = await Promise.all([
          db.getEntries(user.id, 0, PAGE_SIZE),
          db.getReflections(user.id),
          db.getIntentions(user.id),
          db.getHabits(user.id),
          db.getCurrentPeriodHabitLogs(user.id),
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

  const handleAddEntry = async (text: string) => {
    if (!user) return;
    const tempId = `temp-${Date.now()}`;
    const tempEntry: Entry = {
      id: tempId, user_id: user.id, text, timestamp: new Date().toISOString(),
      emoji: "⏳", title: "Analyzing...", tags: [], primary_sentiment: null
    };
    setEntries(prev => [tempEntry, ...prev]);

    try {
        let processedData: Omit<Entry, 'id' | 'user_id' | 'timestamp' | 'text'> = { title: "Entry", tags: ["Unprocessed"], emoji: "📝", primary_sentiment: null };
        if (aiStatus === 'ready') {
            try { processedData = await gemini.processEntry(text); } 
            catch (error) { console.warn("AI processing failed"); }
        }

        if (!isMounted.current) return;

        const savedEntry = await db.addEntry(user.id, { ...processedData, text, timestamp: tempEntry.timestamp });
        
        if (isMounted.current) {
            setEntries(prev => prev.map(e => e.id === tempId ? savedEntry : e));
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

  // ZERO-LATENCY DEBOUNCED HABIT TOGGLE
  const handleToggleHabit = async (habitId: string, dateString?: string) => {
    if (!user) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const targetDate = dateString ? new Date(dateString) : new Date();
    
    // 1. Determine Current Local State (Checked or Unchecked?)
    // This logic must match the server's "period" logic exactly.
    const existingLogIndex = habitLogs.findIndex(l => {
        if (l.habit_id !== habitId) return false;
        const logDate = new Date(l.completed_at);
        
        if (habit.frequency === 'daily') return isSameDay(logDate, targetDate);
        if (habit.frequency === 'weekly') return getWeekId(logDate) === getWeekId(targetDate);
        if (habit.frequency === 'monthly') return getMonthId(logDate) === getMonthId(targetDate);
        return false;
    });

    const isCurrentlyCompleted = existingLogIndex !== -1;
    const willBeCompleted = !isCurrentlyCompleted; // Toggle

    // 2. Optimistic Update (Immediate Visual Feedback)
    let newLogs = [...habitLogs];
    if (willBeCompleted) {
        // Add a temp log
        newLogs.push({ 
            id: `temp-${Date.now()}-${Math.random()}`, 
            habit_id: habitId, 
            completed_at: targetDate.toISOString() 
        });
    } else {
        // Remove the log
        newLogs.splice(existingLogIndex, 1);
    }
    setHabitLogs(newLogs);

    // 3. Client-Side Streak Calculation (Immediate Numeric Feedback)
    const habitSpecificLogs = newLogs.filter(l => l.habit_id === habitId).map(l => new Date(l.completed_at));
    const optimisticStreak = calculateStreak(habitSpecificLogs, habit.frequency);
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current_streak: optimisticStreak } : h));

    // 4. Debounce Network Sync
    // Cancel any pending sync for this specific habit
    if (debounceTimers.current[habitId]) {
        clearTimeout(debounceTimers.current[habitId]);
    }

    // Set a new timer to sync the FINAL state after 1 second of inactivity
    debounceTimers.current[habitId] = setTimeout(async () => {
        try {
            // We send "willBeCompleted" because that is the state we just set optimistically.
            // If the user clicks 5 times rapidly, this function only runs once with the final state.
            const { updatedHabit } = await db.syncHabitCompletion(
                user.id, 
                habitId, 
                habit.frequency, 
                dateString,
                willBeCompleted
            );
            
            if (isMounted.current) {
                // Reconcile Streak (Self-Healing)
                // If the server's calc differs from our optimistic math, trust the server.
                if (updatedHabit.current_streak !== optimisticStreak) {
                    setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
                }
            }
        } catch (error) {
            console.error("Error syncing habit:", error);
            if (isMounted.current) {
                // Rollback would go here, but with idempotent sync, 
                // a simple re-fetch or toast is usually sufficient.
                showToast("Failed to sync habit changes.");
            }
        } finally {
            delete debounceTimers.current[habitId];
        }
    }, 1000); // 1000ms debounce window
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
      if (!user) return;
      const newUserMsg: Message = { sender: 'user', text };
      setMessages(prev => [...prev, newUserMsg]);
      setIsChatLoading(true);

      try {
          const context = initialContext || await db.getUserContext(user.id);
          
          if (!isMounted.current) return;

          if (aiStatus === 'ready' && !initialContext) {
              try {
                  const keywords = await gemini.extractSearchKeywords(text);
                  if (keywords.length > 0) {
                      const searchResults = await db.searchEntries(user.id, keywords);
                      context.searchResults = searchResults;
                  }
              } catch (e) {
                  console.warn("[RAG] Search failed:", e);
              }
          }
          
          if (!isMounted.current) return;

          const stream = await gemini.getChatResponseStream([...messages, newUserMsg], context);
          
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
      } catch (error) {
          if (isMounted.current) {
              setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble connecting right now." }]);
          }
      } finally {
          if (isMounted.current) setIsChatLoading(false);
      }
  };

  const handleAddHabit = async (n: string, f: HabitFrequency) => { 
      if (!user) return; 
      setIsAddingHabit(true);
      try { 
          await db.addHabit(user.id, n, "⚡️", "System", f).then(h => {
             if (isMounted.current && h) setHabits(prev => [...prev, h]);
          }); 
      }
      finally { 
          if (isMounted.current) setIsAddingHabit(false); 
      }
  };

  const handleAddIntention = async (t: string, tf: IntentionTimeframe) => {
      if (!user) return;
      await db.addIntention(user.id, t, tf).then(i => {
          if (isMounted.current && i) setIntentions(prev => [i, ...prev]);
      });
  };

  const handleToggleIntention = async (id: string, s: string) => {
      const ns = s === 'pending' ? 'completed' : 'pending';
      setIntentions(prev => prev.map(i => i.id === id ? { ...i, status: ns as any } : i));
      db.updateIntentionStatus(id, ns as any);
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
      if (s.type === 'habit') await handleAddHabit(s.label, s.data.frequency || 'daily');
      if (s.type === 'intention') await handleAddIntention(s.label, s.data.timeframe || 'daily');
      return s.type;
  };

  return {
    state: { entries, reflections, intentions, habits, habitLogs, messages, isDataLoaded, aiStatus, aiError, toast, isGeneratingReflection, isAddingHabit, isChatLoading, hasMore, isLoadingMore },
    actions: { handleAddEntry, handleToggleHabit, handleEditHabit, handleAddHabit, handleAddIntention, handleSendMessage, handleToggleIntention, handleDeleteIntention, handleDeleteHabit, handleEditEntry, handleDeleteEntry, handleAcceptSuggestion, setToast, setMessages, setIsGeneratingReflection, handleLoadMore }
  };
};
