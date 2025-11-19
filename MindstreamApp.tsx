import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import * as db from './services/dbService';
import * as gemini from './services/geminiService';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, AISuggestion, Habit, HabitLog, HabitFrequency } from './types';
import { getFormattedDate, getWeekId, getMonthId, isSameDay, isDateInCurrentWeek, isDateInCurrentMonth } from './utils/date';

import { Header } from './components/Header';
import { NavBar, View } from './components/NavBar';
import { Stream } from './components/Stream';
import { InputBar } from './components/InputBar';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SearchModal } from './components/SearchModal';
import { ChatView } from './components/ChatView';
import { ChatInputBar } from './components/ChatInputBar';
import { IntentionsView } from './components/IntentionsView';
import { IntentionsInputBar } from './components/IntentionsInputBar';
import { ReflectionsView } from './components/ReflectionsView';
import { ThematicModal } from './components/ThematicModal';
import { AIStatusBanner } from './components/AIStatusBanner';
import { SuggestionChips } from './components/SuggestionChips';
import { Toast } from './components/Toast';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { EditEntryModal } from './components/EditEntryModal';
import { HabitsView } from './components/HabitsView';
import { HabitsInputBar } from './components/HabitsInputBar';

const INITIAL_GREETING = "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?";
const API_ERROR_MESSAGE = "An issue occurred while communicating with the AI. This might be a temporary network problem. Please try again in a moment.";
const ONBOARDING_COMPLETE_STEP = 5;

export type AIStatus = 'initializing' | 'verifying' | 'ready' | 'error';

export const MindstreamApp: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([{ sender: 'ai', text: INITIAL_GREETING, id: 'initial' }]);
  
  const [view, setView] = useState<View>('stream');
  const [isProcessing, setIsProcessing] = useState(false); // For new entries
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  
  // App/Data loading state
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('initializing');
  const [aiError, setAiError] = useState<string | null>(null);
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  // Chat state
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatStarters, setChatStarters] = useState<string[]>([]);
  const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);
  
  // Replaces hasSeenPrivacy with a numeric step, namespaced by user ID
  const onboardingKey = user ? `onboardingStep_${user.id}` : 'onboardingStep';
  const [onboardingStep, setOnboardingStep] = useLocalStorage<number>(onboardingKey, 0);
  
  // Legacy support: If user previously saw privacy modal, mark as complete
  const [legacyPrivacy] = useLocalStorage('hasSeenPrivacy', false);
  
  useEffect(() => {
      if (legacyPrivacy && onboardingStep === 0) {
          setOnboardingStep(ONBOARDING_COMPLETE_STEP);
      }
  }, [legacyPrivacy, onboardingStep, setOnboardingStep]);

  
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  const [activeIntentionTimeframe, setActiveIntentionTimeframe] = useState<IntentionTimeframe>('daily');

  // State for Thematic Reflections Modal
  const [showThematicModal, setShowThematicModal] = useState(false);
  const [selectedTag, setSelectedTagState] = useState<string | null>(null);
  const [thematicReflection, setThematicReflection] = useState<string | null>(null);
  const [isGeneratingThematic, setIsGeneratingThematic] = useState(false);

  // State for Entry management
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  
  // State for Debugging
  const [debugOutput, setDebugOutput] = useState<string | null>(null);

  const handleApiError = (error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
    let message = API_ERROR_MESSAGE;
    if (error instanceof Error && error.message) {
        if (context === 'adding new entry' && error.message.toLowerCase().includes('column') && error.message.toLowerCase().includes('does not exist')) {
            message = "Database Error: The 'entries' table seems to be missing a required column (likely 'emoji'). Please update your database schema.";
        } else if (error.message.includes('column') || error.message.includes('schema')) {
            message = "Database Error: A required column may be missing. Please check your database schema.";
        }
    }
    if (aiStatus !== 'error') {
      setToast({ message, id: Date.now() });
    }
  };
  
  useEffect(() => {
    const updateSubtitle = () => {
      const hour = new Date().getHours();
      if (hour < 12) setHeaderSubtitle('Good morning.');
      else if (hour < 18) setHeaderSubtitle('Good afternoon.');
      else setHeaderSubtitle('Time for evening reflection.');
    };
    updateSubtitle();
    const interval = setInterval(updateSubtitle, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDataAndVerifyAI = async () => {
      if (!user) return;
      try {
        const [userEntries, userReflections, userIntentions, userHabits, userHabitLogs] = await Promise.all([
          db.getEntries(user.id),
          db.getReflections(user.id),
          db.getIntentions(user.id),
          db.getHabits(user.id),
          db.getCurrentPeriodHabitLogs(user.id)
        ]);
        
        setEntries(userEntries);
        setReflections(userReflections);
        setIntentions(userIntentions);
        setHabits(userHabits);
        setHabitLogs(userHabitLogs);
        
        setIsDataLoaded(true);

        setAiStatus('verifying');
        await gemini.verifyApiKey();
        setAiStatus('ready');

      } catch (error: any) {
        console.error("Error during startup:", error);
        
        if (!isDataLoaded) setIsDataLoaded(true);

        if (aiStatus === 'verifying') {
          setAiStatus('error');
           let message = error.message || 'An unknown error occurred.';
           if (message.includes('API key not valid')) {
               message = 'The provided Gemini API key is not valid. Please check your .env configuration.';
           } else if (message.toLowerCase().includes('billing')) {
               message = 'The project associated with the API key does not have billing enabled. Please enable it in your Google Cloud project.';
           } else if (message.includes('permission denied')) {
                message = 'The API key is missing required permissions for the Gemini API.';
           }
           setAiError(message);
        }
      }
    };

    fetchDataAndVerifyAI();
  }, [user]);
  
  const handleSendMessage = async (text: string, historyOverride?: Message[]) => {
    if (isChatLoading || aiStatus !== 'ready') return;

    const historyToUse = historyOverride || messages;
    const newUserMessage: Message = { sender: 'user', text, id: `user-${Date.now()}` };
    
    const currentHistory = historyOverride ? historyToUse : [...historyToUse, newUserMessage];
    
    if (!historyOverride) {
      setMessages(currentHistory);
      setChatStarters([]);
    }
    
    setIsChatLoading(true);

    const aiMessageId = `ai-${Date.now()}`;
    setMessages(prev => [...prev, { sender: 'ai', text: '', id: aiMessageId }]);

    try {
        const streamResult = await gemini.getChatResponseStream(currentHistory, entries, intentions);

        let fullText = '';
        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullText += chunkText;
                setMessages(prev => 
                    prev.map(msg => 
                        msg.id === aiMessageId ? { ...msg, text: fullText } : msg
                    )
                );
            }
        }
    } catch (error) {
        handleApiError(error, 'getting chat response');
        setMessages(prev => 
            prev.map(msg => 
                msg.id === aiMessageId ? { ...msg, text: "Sorry, I'm having trouble connecting right now." } : msg
            )
        );
    } finally {
        setIsChatLoading(false);
    }
}

const startNewChatSession = async (firstUserPrompt?: string, initialAiMessage?: Message) => {
    if (!isDataLoaded || aiStatus !== 'ready') return;

    setChatStarters([]);

    try {
        // If we have a specific initial AI message (from onboarding), we use that.
        // Otherwise, we generate a personalized greeting.
        let startMessage: Message;
        
        if (initialAiMessage) {
            startMessage = initialAiMessage;
        } else {
            const greeting = await gemini.generatePersonalizedGreeting(entries);
            startMessage = { sender: 'ai', text: greeting, id: 'greeting' };
        }

        if (firstUserPrompt) {
            // If starting with a user prompt (context), construct history.
            // For onboarding, we want:
            // 1. User's context (hidden or shown? Let's show it for clarity)
            // 2. AI's Follow-up question (already provided as initialAiMessage)
            // 3. Ready for user's next input.
            
            // Actually, if `firstUserPrompt` is passed, usually it means "User sent this, AI respond".
            // BUT for Onboarding handoff, `initialAiMessage` is the response to `firstUserPrompt`.
            
            if (initialAiMessage) {
                // Onboarding Handoff Case
                const userContextMsg: Message = { sender: 'user', text: firstUserPrompt, id: 'context' };
                setMessages([userContextMsg, startMessage]);
                // We don't trigger generation, just set state.
            } else {
                // Standard "Explore in Chat" Case
                const history = [startMessage];
                setMessages(history);
                await handleSendMessage(firstUserPrompt, history);
            }

        } else {
            // Standard fresh session
            setMessages([startMessage]);
            setIsGeneratingStarters(true);
            
            gemini.generateChatStarters(entries, intentions)
                .then(startersResult => {
                    setChatStarters(startersResult.starters);
                })
                .catch(error => {
                    handleApiError(error, 'fetching chat starters');
                    setChatStarters([
                        "What was my biggest challenge last week?",
                        "Let's review my progress on my goals.",
                        "Tell me about a recurring theme in my journal."
                    ]);
                })
                .finally(() => {
                    setIsGeneratingStarters(false);
                });
        }
    } catch (error) {
        handleApiError(error, 'initializing chat');
        setMessages([{ sender: 'ai', text: INITIAL_GREETING, id: 'greeting' }]);
    }
};

  const handleViewChange = (newView: View) => {
    const isChatDisabled = !isDataLoaded || aiStatus !== 'ready';
    if (newView === 'chat' && isChatDisabled) {
        return;
    }
    const isNewChatSession = messages.length <= 1;
    if (newView === 'chat' && isNewChatSession) {
        startNewChatSession();
    }
    setView(newView);
  };

  const handleAddEntry = async (text: string) => {
    if (!user || isProcessing) return;
    if (aiStatus !== 'ready') {
      setToast({ message: "Cannot save entry: AI is not connected.", id: Date.now() });
      return;
    }
    setIsProcessing(true);
    try {
      const aiData = await gemini.processEntry(text);
      const newEntryData = { ...aiData, text: text, timestamp: new Date().toISOString() };
      const newEntry = await db.addEntry(user.id, newEntryData);
      setEntries(prev => [newEntry, ...prev]);
    } catch (error) {
      handleApiError(error, 'adding new entry');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateEntry = async (entryId: string, newText: string) => {
    if (!user || aiStatus !== 'ready') {
      setToast({ message: "Cannot update entry: AI is not connected.", id: Date.now() });
      return;
    }
    try {
      const aiData = await gemini.processEntry(newText);
      const updatedData = { ...aiData, text: newText };
      const updatedEntry = await db.updateEntry(entryId, updatedData);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, ...updatedEntry } : e));
      setToast({ message: "Entry updated.", id: Date.now() });
    } catch (error) {
      handleApiError(error, 'updating entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!user) return;
    try {
      const wasDeleted = await db.deleteEntry(entryId);
      if (wasDeleted) {
        setEntries(prev => prev.filter(e => e.id !== entryId));
        setToast({ message: "Entry deleted.", id: Date.now() });
      }
    } catch (error) {
      handleApiError(error, 'deleting entry');
    }
  };
  
  const handleGenerateReflection = async (date: string, entriesForDay: Entry[]) => {
      if (!user || isGeneratingReflection || aiStatus !== 'ready') return;
      setIsGeneratingReflection(date);
      try {
        const intentionsForDay = intentions.filter(i => getFormattedDate(new Date(i.created_at)) === date);
        const { summary, suggestions } = await gemini.generateReflection(entriesForDay, intentionsForDay, habits, habitLogs);
        const reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'> = {
            date: date,
            summary: summary,
            type: 'daily' as const,
            suggestions: suggestions
        };
        const newReflection = await db.addReflection(user.id, reflectionData);
        if (newReflection) {
            const userReflections = await db.getReflections(user.id);
            setReflections(userReflections);
        }
      } catch (error) {
          handleApiError(error, 'generating daily reflection');
      } finally {
          setIsGeneratingReflection(null);
      }
  };

  const handleGenerateWeeklyReflection = async (weekId: string, entriesForWeek: Entry[]) => {
    if (!user || isGeneratingReflection || aiStatus !== 'ready') return;
    setIsGeneratingReflection(weekId);
    try {
      const intentionsForWeek = intentions.filter(i => getWeekId(new Date(i.created_at)) === weekId);
      const { summary, suggestions } = await gemini.generateWeeklyReflection(entriesForWeek, intentionsForWeek);
      const reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'> = {
        date: weekId,
        summary: summary,
        type: 'weekly' as const,
        suggestions: suggestions,
      };
      const newReflection = await db.addReflection(user.id, reflectionData);
      if (newReflection) {
        const userReflections = await db.getReflections(user.id);
        setReflections(userReflections);
      }
    } catch (error) {
      handleApiError(error, 'generating weekly reflection');
    } finally {
      setIsGeneratingReflection(null);
    }
  };
  
  const handleGenerateMonthlyReflection = async (monthId: string, entriesForMonth: Entry[]) => {
    if (!user || isGeneratingReflection || aiStatus !== 'ready') return;
    setIsGeneratingReflection(monthId);
    try {
      const intentionsForMonth = intentions.filter(i => getMonthId(new Date(i.created_at)) === monthId);
      const { summary, suggestions } = await gemini.generateMonthlyReflection(entriesForMonth, intentionsForMonth);
      const reflectionData: Omit<Reflection, 'id' | 'user_id' | 'timestamp'> = {
        date: monthId,
        summary: summary,
        type: 'monthly' as const,
        suggestions: suggestions,
      };
      const newReflection = await db.addReflection(user.id, reflectionData);
      if (newReflection) {
        const userReflections = await db.getReflections(user.id);
        setReflections(userReflections);
      }
    } catch (error) {
      handleApiError(error, 'generating monthly reflection');
    } finally {
      setIsGeneratingReflection(null);
    }
  };

  const handleExploreInChat = (summary: string) => {
    if (aiStatus !== 'ready') return;
    const prompt = `Let's talk more about this reflection: "${summary}". What patterns or deeper insights can you find in the entries that led to this summary?`;
    startNewChatSession(prompt);
    setView('chat');
  };

  const handleAddIntention = async (text: string, timeframe: IntentionTimeframe) => {
    if (!user) return;
    try {
        const newIntention = await db.addIntention(user.id, text, timeframe);
        if (newIntention) {
            setIntentions(prev => [newIntention, ...prev]);
        }
    } catch (error) {
        console.error("Error adding intention:", error);
    }
  };

  const handleAddSuggestedIntention = async (suggestion: AISuggestion) => {
    await handleAddIntention(suggestion.text, suggestion.timeframe);
    setToast({ message: 'To-do locked in!', id: Date.now() });
    setTimeout(() => setToast(null), 3000);
    setReflections(prev => prev.map(r => {
        if (r.suggestions?.some(s => s.text === suggestion.text && s.timeframe === suggestion.timeframe)) {
            return {
                ...r,
                suggestions: r.suggestions.filter(s => s.text !== suggestion.text || s.timeframe !== suggestion.timeframe)
            };
        }
        return r;
    }));
  };

  const handleToggleIntention = async (id: string, currentStatus: Intention['status']) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
        const updatedIntention = await db.updateIntentionStatus(id, newStatus);
        if (updatedIntention) {
            setIntentions(prev => prev.map(i => i.id === id ? updatedIntention : i));
        }
    } catch (error) {
        console.error(`Error updating intention status to ${newStatus}:`, error);
    }
  };

  const handleDeleteIntention = async (id: string) => {
    const wasDeleted = await db.deleteIntention(id);
    if (wasDeleted) {
        setIntentions(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleAddHabit = async (name: string, frequency: HabitFrequency) => {
    if (!user || isAddingHabit) return;
    setIsAddingHabit(true);
    try {
        const { emoji, category } = await gemini.analyzeHabit(name);
        const newHabit = await db.addHabit(user.id, name, emoji, category, frequency);
        if (newHabit) {
            setHabits(prev => [...prev, newHabit]);
        }
    } catch (error) {
        handleApiError(error, 'adding habit');
    } finally {
        setIsAddingHabit(false);
    }
  };

  const handleToggleHabit = async (habitId: string) => {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      const now = new Date();
      const existingLog = habitLogs.find(l => {
          if (l.habit_id !== habitId) return false;
          const logDate = new Date(l.completed_at);
          if (habit.frequency === 'daily') return isSameDay(logDate, now);
          if (habit.frequency === 'weekly') return isDateInCurrentWeek(logDate);
          if (habit.frequency === 'monthly') return isDateInCurrentMonth(logDate);
          return false;
      });

      try {
          if (existingLog) {
              const { updatedHabit } = await db.uncheckHabit(existingLog.id, habitId, habit.current_streak);
              setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
              setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
          } else {
              const { log, updatedHabit } = await db.checkHabit(habitId, habit.current_streak);
              setHabitLogs(prev => [...prev, log]);
              setHabits(prev => prev.map(h => h.id === habitId ? updatedHabit : h));
          }
      } catch (error) {
          console.error("Error toggling habit:", error);
          setToast({ message: "Failed to update habit status", id: Date.now() });
      }
  };
  
  const handleDeleteHabit = async (habitId: string) => {
      const success = await db.deleteHabit(habitId);
      if (success) {
          setHabits(prev => prev.filter(h => h.id !== habitId));
          setHabitLogs(prev => prev.filter(l => l.habit_id !== habitId));
      }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTagState(tag);
    setShowThematicModal(true);
  };
  
  const handleCloseThematicModal = () => {
    setShowThematicModal(false);
    setSelectedTagState(null);
    setThematicReflection(null);
    setIsGeneratingThematic(false);
  };
  
  const handleViewTagEntries = (tag: string) => {
    handleCloseThematicModal();
    setInitialSearchQuery(tag);
    setShowSearchModal(true);
  };
  
  const handleGenerateThematicReflection = async (tag: string) => {
    if (!user || isGeneratingThematic || aiStatus !== 'ready') return;
    setIsGeneratingThematic(true);
    setThematicReflection(null);
    try {
      const summary = await gemini.generateThematicReflection(tag, entries);
      setThematicReflection(summary);
    } catch (error) {
      handleApiError(error, 'generating thematic reflection');
      setThematicReflection("I'm sorry, I couldn't generate a reflection for this theme at this time.");
    } finally {
      setIsGeneratingThematic(false);
    }
  };

  const handleDebugAi = async () => {
    setDebugOutput('Running debug check...');
    const today = getFormattedDate(new Date());
    const entriesForDay = entries.filter(e => getFormattedDate(new Date(e.timestamp)) === today);
    const intentionsForDay = intentions.filter(i => getFormattedDate(new Date(i.created_at)) === today);
    const output = await gemini.getRawReflectionForDebug(entriesForDay, intentionsForDay);
    setDebugOutput(output);
  };
  
  const handleOnboardingComplete = async (destination: 'stream' | 'chat', initialContext?: string, aiQuestion?: string) => {
      setOnboardingStep(ONBOARDING_COMPLETE_STEP);
      if (user) {
          const userEntries = await db.getEntries(user.id);
          setEntries(userEntries);
      }

      if (destination === 'chat' && initialContext && aiQuestion) {
           setView('chat');
           // Handoff: Inject the User's Elaboration and the AI's follow-up question to "seed" the chat.
           // This makes it look like the conversation has already started.
           const aiFollowUpMessage: Message = { 
               sender: 'ai', 
               text: aiQuestion, 
               id: 'onboarding-followup' 
           };
           startNewChatSession(initialContext, aiFollowUpMessage);
      } else {
          setView('stream');
      }
  };

  if (onboardingStep < ONBOARDING_COMPLETE_STEP && user) {
      return <OnboardingWizard userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  const renderCurrentView = () => {
      switch(view) {
          case 'stream':
              return <Stream 
                        entries={entries} 
                        intentions={intentions} 
                        onTagClick={handleTagClick} 
                        onEditEntry={(entry) => setEntryToEdit(entry)}
                        onDeleteEntry={(entry) => setEntryToDelete(entry)}
                     />;
          case 'reflections':
              return <ReflectionsView 
                        entries={entries}
                        intentions={intentions}
                        reflections={reflections}
                        onGenerateDaily={handleGenerateReflection}
                        onGenerateWeekly={handleGenerateWeeklyReflection}
                        onGenerateMonthly={handleGenerateMonthlyReflection}
                        onExploreInChat={handleExploreInChat}
                        isGenerating={isGeneratingReflection}
                        onAddSuggestion={handleAddSuggestedIntention}
                        aiStatus={aiStatus}
                        onDebug={handleDebugAi}
                        debugOutput={debugOutput}
                     />;
          case 'chat':
              return <ChatView 
                        messages={messages} 
                        isLoading={isChatLoading}
                        onAddSuggestion={handleAddSuggestedIntention}
                     />;
          case 'intentions':
              return <IntentionsView intentions={intentions} onToggle={handleToggleIntention} onDelete={handleDeleteIntention} activeTimeframe={activeIntentionTimeframe} onTimeframeChange={setActiveIntentionTimeframe} />;
          case 'habits':
              return <HabitsView habits={habits} todaysLogs={habitLogs} onToggle={handleToggleHabit} onDelete={handleDeleteHabit} />;
          default:
              return <Stream 
                        entries={entries} 
                        intentions={intentions} 
                        onTagClick={handleTagClick} 
                        onEditEntry={(entry) => setEntryToEdit(entry)}
                        onDeleteEntry={(entry) => setEntryToDelete(entry)}
                     />;
      }
  };

  const renderActionBar = () => {
    const isAiDisabled = aiStatus !== 'ready';
    switch(view) {
        case 'stream':
            return <InputBar onAddEntry={handleAddEntry} />;
        case 'chat':
            const showStarters = chatStarters.length > 0 && !isChatLoading;
            return (
              <div className="flex flex-col">
                {showStarters && (
                  <SuggestionChips
                    starters={chatStarters}
                    onStarterClick={handleSendMessage}
                    isLoading={isGeneratingStarters}
                  />
                )}
                <ChatInputBar onSendMessage={handleSendMessage} isLoading={isChatLoading || isAiDisabled} />
              </div>
            );
        case 'intentions':
            return <IntentionsInputBar onAddIntention={(text) => handleAddIntention(text, activeIntentionTimeframe)} activeTimeframe={activeIntentionTimeframe} />;
        case 'habits':
            return <HabitsInputBar onAddHabit={handleAddHabit} isLoading={isAddingHabit} />;
        default:
            return null;
    }
  }

  return (
    <div className="h-screen w-screen bg-brand-indigo flex flex-col font-sans text-white overflow-hidden">
      {showSearchModal && <SearchModal entries={entries} reflections={reflections} initialQuery={initialSearchQuery} onClose={() => { setShowSearchModal(false); setInitialSearchQuery(''); }} />}
      {showThematicModal && selectedTag && (
        <ThematicModal 
          tag={selectedTag}
          onClose={handleCloseThematicModal}
          onViewEntries={() => handleViewTagEntries(selectedTag)}
          onGenerateReflection={() => handleGenerateThematicReflection(selectedTag)}
          isGenerating={isGeneratingThematic}
          reflectionResult={thematicReflection}
        />
      )}
      {entryToEdit && (
        <EditEntryModal
          entry={entryToEdit}
          onSave={async (newText) => {
            await handleUpdateEntry(entryToEdit.id, newText);
            setEntryToEdit(null);
          }}
          onCancel={() => setEntryToEdit(null)}
        />
      )}
      {entryToDelete && (
        <DeleteConfirmationModal
          onConfirm={async () => {
            await handleDeleteEntry(entryToDelete.id);
            setEntryToDelete(null);
          }}
          onCancel={() => setEntryToDelete(null)}
        />
      )}
      
      <Header onSearchClick={() => setShowSearchModal(true)} subtitle={headerSubtitle} />
      
      <AIStatusBanner status={aiStatus} error={aiError} />

      <main className="flex-grow overflow-y-auto">
        {!isDataLoaded && (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-teal/50 border-t-brand-teal rounded-full animate-spin"></div>
          </div>
        )}
        {isDataLoaded && renderCurrentView()}
      </main>
      
      <div className="flex-shrink-0 relative">
        {toast && <Toast key={toast.id} message={toast.message} onDismiss={() => setToast(null)} />}
        {isDataLoaded && renderActionBar()}
        <NavBar activeView={view} onViewChange={handleViewChange} isChatDisabled={!isDataLoaded || aiStatus !== 'ready'} />
      </div>
    </div>
  );
};
