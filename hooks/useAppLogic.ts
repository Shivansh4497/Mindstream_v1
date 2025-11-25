
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, Habit, HabitLog, HabitFrequency, EntrySuggestion, AIStatus, UserContext } from '../types';
import { isSameDay } from '../utils/date';

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
  
  const processingHabits = useRef<Set<string>>(new Set());
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
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

  // Upgraded Habit Toggle with Retroactive Logic
  const handleToggleHabit = async (habitId: string, dateString?: string) => {
    if (!user || processingHabits.current.has(habitId)) return;
    
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Optimistic UI update? 
    // Complex because recalculating streak client-side perfectly is hard without all logic.
    // We will rely on the fast server response for the streak number, 
    // but we can toggle the log checkmark immediately.
    const targetDate = dateString ? new Date(dateString) : new Date();
    const tempLogId = `temp-${Date.now()}`;
    
    // Check if we are adding or removing
    // This is a rough check for optimistic UI, the server is the source of truth
    const isAdding = !habitLogs.some(l => l.habit_id === habitId && isSameDay(new Date(l.completed_at), targetDate)); // Approximation for daily

    if (isAdding) {
        setHabitLogs(prev => [...prev, { id: tempLogId, habit_id: habitId, completed_at: targetDate.toISOString() }]);
    } else {
        // We filter out logs that match roughly. The server handles precise logic.
        // For visual feedback this is usually enough.
        setHabitLogs(prev => prev.filter(l => !(l.habit_id === habitId && isSameDay(new Date(l.completed_at), targetDate))));
    }

    processingHabits.current.add(habitId);
    
    try {
        const { updatedHabit, action } = await db.toggleHabit(user.id, habitId, habit.frequency, dateString);
        
        if (isMounted.current) {
            // Update the habit with the new streak from server
            setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
            
            // Re-fetch logs or correct the temp log? 
            // The simplest way to be perfectly consistent is to update the log ID if it was an insert.
            // But since logs are mostly for display, we can just ensure we have the authoritative list.
            // For now, let's keep the optimistic state unless we want to refetch all logs (heavy).
            // A better approach: toggleHabit returns the action performed.
            
            // If we guessed wrong on "isAdding", correct it.
            if (isAdding && action === 'unchecked') {
                // We added, but server unchecked? Means we were out of sync. Remove it.
                 setHabitLogs(prev => prev.filter(l => l.id !== tempLogId));
            } else if (!isAdding && action === 'checked') {
                // We removed, but server checked? Add it back.
                 setHabitLogs(prev => [...prev, { id: tempLogId, habit_id: habitId, completed_at: targetDate.toISOString() }]);
            }
        }
    } catch (error) {
        console.error("Error toggling habit:", error);
        if (isMounted.current) {
            // Rollback
            if (isAdding) setHabitLogs(prev => prev.filter(l => l.id !== tempLogId));
            // else... rollback removal is harder without the original obj. 
            // In a real app we'd reload logs here.
            showToast("Failed to update habit.");
        }
    } finally {
        processingHabits.current.delete(habitId);
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
    actions: { handleAddEntry, handleToggleHabit, handleAddHabit, handleAddIntention, handleSendMessage, handleToggleIntention, handleDeleteIntention, handleDeleteHabit, handleEditEntry, handleDeleteEntry, handleAcceptSuggestion, setToast, setMessages, setIsGeneratingReflection, handleLoadMore }
  };
};
