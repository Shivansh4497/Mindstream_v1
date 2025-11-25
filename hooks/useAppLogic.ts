
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as db from '../services/dbService';
import * as gemini from '../services/geminiService';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, AISuggestion, Habit, HabitLog, HabitFrequency, EntrySuggestion, AIStatus, UserContext } from '../types';
import { isSameDay } from '../utils/date';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_GREETING = "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?";

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
  
  const processingHabits = useRef<Set<string>>(new Set());
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, id: Date.now() });
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchDataAndVerifyAI = async () => {
      if (!user) return;
      try {
        setAiStatus('verifying');
        
        const [userEntries, userReflections, userIntentions, userHabits, userHabitLogs] = await Promise.all([
          db.getEntries(user.id),
          db.getReflections(user.id),
          db.getIntentions(user.id),
          db.getHabits(user.id),
          db.getCurrentPeriodHabitLogs(user.id),
        ]);

        setEntries(userEntries);
        setReflections(userReflections);
        setIntentions(userIntentions);
        setHabits(userHabits);
        setHabitLogs(userHabitLogs);
        setIsDataLoaded(true);

        try {
          await gemini.verifyApiKey();
          setAiStatus('ready');
        } catch (e: any) {
          console.error("AI Verification Failed:", e);
          setAiStatus('error');
          setAiError(e.message || "Failed to connect to Gemini API");
        }

      } catch (error) {
        console.error("Error loading data:", error);
        showToast("Failed to load data. Please refresh.");
      }
    };

    fetchDataAndVerifyAI();
  }, [user]);

  // --- HANDLERS ---

  const handleAddEntry = async (text: string) => {
    if (!user) return;
    
    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const tempEntry: Entry = {
      id: tempId,
      user_id: user.id,
      text,
      timestamp: new Date().toISOString(),
      emoji: "⏳",
      title: "Analyzing...",
      tags: [],
      primary_sentiment: null
    };
    setEntries(prev => [tempEntry, ...prev]);

    // Async Save
    try {
        let processedData;
        if (aiStatus === 'ready') {
            try {
                processedData = await gemini.processEntry(text);
            } catch (error) {
                console.warn("AI processing failed, falling back to defaults", error);
                processedData = { title: "Entry", tags: ["Unprocessed"], emoji: "📝", primary_sentiment: null };
            }
        } else {
            processedData = { title: "Entry", tags: ["Unprocessed"], emoji: "📝", primary_sentiment: null };
        }

        const savedEntry = await db.addEntry(user.id, { ...processedData, text, timestamp: tempEntry.timestamp });
        setEntries(prev => prev.map(e => e.id === tempId ? savedEntry : e));

        // Silent Observer (Async Suggestions)
        if (aiStatus === 'ready' && text.split(' ').length > 3) {
            gemini.generateEntrySuggestions(text).then(async (suggestions) => {
                if (suggestions && suggestions.length > 0) {
                    await db.updateEntry(savedEntry.id, { suggestions });
                    setEntries(prev => prev.map(e => e.id === savedEntry.id ? { ...e, suggestions } : e));
                } else if (text.startsWith("TEST:")) {
                    showToast("AI Analysis: No suggestions found.");
                }
            }).catch(err => console.error("[Silent Observer] Failed:", err));
        }

    } catch (error) {
        console.error("Failed to save entry:", error);
        setEntries(prev => prev.filter(e => e.id !== tempId));
        showToast("Failed to save entry.");
    }
  };

  const handleToggleHabit = async (habitId: string, dateString?: string) => {
    if (processingHabits.current.has(habitId)) return;
    
    const targetDate = dateString ? new Date(dateString) : new Date();
    const isToday = isSameDay(targetDate, new Date());
    
    const existingLog = habitLogs.find(l => l.habit_id === habitId && isSameDay(new Date(l.completed_at), targetDate));
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const originalHabit = { ...habit };
    const originalLogs = [...habitLogs];

    // Optimistic Update
    if (existingLog) {
        setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
        if (isToday) {
            setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current_streak: Math.max(0, h.current_streak - 1) } : h));
        }
    } else {
        const tempLog: HabitLog = { id: `temp-${Date.now()}`, habit_id: habitId, completed_at: targetDate.toISOString() };
        setHabitLogs(prev => [...prev, tempLog]);
        if (isToday) {
            setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current_streak: h.current_streak + 1 } : h));
        }
    }

    processingHabits.current.add(habitId);

    try {
        if (existingLog) {
            const { updatedHabit } = await db.uncheckHabit(existingLog.id, habitId, habit.current_streak, dateString);
            setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
        } else {
            const { log, updatedHabit } = await db.checkHabit(habitId, habit.current_streak, dateString);
            setHabitLogs(prev => prev.map(l => l.id.startsWith('temp-') && l.habit_id === habitId ? log : l));
            setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
        }
    } catch (error) {
        console.error("Error toggling habit:", error);
        setHabitLogs(originalLogs);
        setHabits(prev => prev.map(h => h.id === habitId ? originalHabit : h));
        showToast("Failed to update habit.");
    } finally {
        processingHabits.current.delete(habitId);
    }
  };

  const handleAddHabit = async (name: string, frequency: HabitFrequency) => {
      if (!user || isAddingHabit) return;
      setIsAddingHabit(true);
      const tempId = `temp-${Date.now()}`;
      const tempHabit: Habit = {
          id: tempId, user_id: user.id, name, emoji: "⚡️", category: "System", frequency, current_streak: 0, longest_streak: 0, created_at: new Date().toISOString()
      };
      setHabits(prev => [...prev, tempHabit]);

      try {
          const analysis = await gemini.analyzeHabit(name);
          const savedHabit = await db.addHabit(user.id, name, analysis.emoji, analysis.category, frequency);
          if (savedHabit) {
              setHabits(prev => prev.map(h => h.id === tempId ? savedHabit : h));
              showToast("Habit created successfully");
          }
      } catch (error) {
          setHabits(prev => prev.filter(h => h.id !== tempId));
          showToast("Failed to create habit");
      } finally {
          setIsAddingHabit(false);
      }
  };

  const handleAddIntention = async (text: string, timeframe: IntentionTimeframe) => {
      if (!user) return;
      const tempId = `temp-${Date.now()}`;
      const tempIntention: Intention = {
          id: tempId, user_id: user.id, text, timeframe, status: 'pending', is_recurring: false, created_at: new Date().toISOString()
      };
      setIntentions(prev => [tempIntention, ...prev]);
      try {
          const saved = await db.addIntention(user.id, text, timeframe);
          if (saved) setIntentions(prev => prev.map(i => i.id === tempId ? saved : i));
      } catch (e) {
          setIntentions(prev => prev.filter(i => i.id !== tempId));
          showToast("Failed to add intention");
      }
  };

  const handleSendMessage = async (text: string, initialContext?: UserContext) => {
      if (!user) return;
      const newUserMsg: Message = { sender: 'user', text };
      setMessages(prev => [...prev, newUserMsg]);
      setIsChatLoading(true);

      try {
          // Build unified context
          const context = initialContext || await db.getUserContext(user.id);
          
          const stream = await gemini.getChatResponseStream([...messages, newUserMsg], context);
          
          let fullResponse = '';
          setMessages(prev => [...prev, { sender: 'ai', text: '' }]);
          
          for await (const chunk of stream) {
              const chunkText = chunk.text(); 
              fullResponse += chunkText;
              setMessages(prev => {
                  const newHistory = [...prev];
                  newHistory[newHistory.length - 1].text = fullResponse;
                  return newHistory;
              });
          }
      } catch (error) {
          setMessages(prev => [...prev, { sender: 'ai', text: "I'm having trouble connecting right now. Please try again." }]);
      } finally {
          setIsChatLoading(false);
      }
  };

  // Handlers that don't require complex logic
  const handleToggleIntention = async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
      setIntentions(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
      try { await db.updateIntentionStatus(id, newStatus); } 
      catch (e) { setIntentions(prev => prev.map(i => i.id === id ? { ...i, status: currentStatus as any } : i)); showToast("Failed to update"); }
  };

  const handleDeleteIntention = async (id: string) => {
      const original = intentions;
      setIntentions(prev => prev.filter(i => i.id !== id));
      if (!await db.deleteIntention(id)) { setIntentions(original); showToast("Failed to delete"); }
  };

  const handleDeleteHabit = async (id: string) => {
      const original = habits;
      setHabits(prev => prev.filter(h => h.id !== id));
      if (!await db.deleteHabit(id)) { setHabits(original); showToast("Failed to delete"); }
  };

  const handleEditEntry = async (entry: Entry, newText: string) => {
      if (!user) return;
      const original = entries;
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, text: newText } : e));
      try {
          await db.updateEntry(entry.id, { text: newText });
          const reProcessed = await gemini.processEntry(newText);
          await db.updateEntry(entry.id, reProcessed);
          setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ...reProcessed } : e));
      } catch (e) {
          setEntries(original);
          showToast("Failed to edit entry");
      }
  };

  const handleDeleteEntry = async (entry: Entry) => {
      const original = entries;
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      if (!await db.deleteEntry(entry.id)) { setEntries(original); showToast("Failed to delete"); }
  };

  const handleAcceptSuggestion = async (entryId: string, suggestion: EntrySuggestion) => {
      if (suggestion.type === 'habit') {
          await handleAddHabit(suggestion.label, suggestion.data.frequency || 'daily');
      } else if (suggestion.type === 'intention') {
          await handleAddIntention(suggestion.label, suggestion.data.timeframe || 'daily');
      } 
      // Remove suggestion from UI & DB
      const entry = entries.find(e => e.id === entryId);
      if (entry && entry.suggestions) {
          const newSuggestions = entry.suggestions.filter(s => s.label !== suggestion.label);
          setEntries(prev => prev.map(e => e.id === entryId ? { ...e, suggestions: newSuggestions } : e));
          await db.updateEntry(entryId, { suggestions: newSuggestions });
      }
      return suggestion.type; // Return type to help view switch if needed
  };

  return {
    state: { entries, reflections, intentions, habits, habitLogs, messages, isDataLoaded, aiStatus, aiError, toast, isGeneratingReflection, isAddingHabit, isChatLoading },
    actions: { 
        handleAddEntry, handleToggleHabit, handleAddHabit, handleAddIntention, 
        handleSendMessage, handleToggleIntention, handleDeleteIntention, 
        handleDeleteHabit, handleEditEntry, handleDeleteEntry, handleAcceptSuggestion,
        setToast, setMessages, setIsGeneratingReflection
    }
  };
};
