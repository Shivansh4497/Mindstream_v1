import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import * as db from './services/dbService';
import * as gemini from './services/geminiService';
import type { Entry, Reflection, Intention, Message, IntentionTimeframe, AISuggestion } from './types';
import { getFormattedDate, getWeekId, getMonthId } from './utils/date';

import { Header } from './components/Header';
import { NavBar, View } from './components/NavBar';
import { Stream } from './components/Stream';
import { InputBar } from './components/InputBar';
import { PrivacyModal } from './components/PrivacyModal';
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

const INITIAL_GREETING = "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?";
const API_ERROR_MESSAGE = "An issue occurred while communicating with the AI. This might be a temporary network problem. Please try again in a moment.";

export type AIStatus = 'initializing' | 'verifying' | 'ready' | 'error';

export const MindstreamApp: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ sender: 'ai', text: INITIAL_GREETING, id: 'initial' }]);
  
  const [view, setView] = useState<View>('stream');
  const [isProcessing, setIsProcessing] = useState(false); // For new entries
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  
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
  
  const [hasSeenPrivacy, setHasSeenPrivacy] = useLocalStorage('hasSeenPrivacy', false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(!hasSeenPrivacy);
  
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  const [activeIntentionTimeframe, setActiveIntentionTimeframe] = useState<IntentionTimeframe>('daily');

  // State for Thematic Reflections Modal
  const [showThematicModal, setShowThematicModal] = useState(false);
  const [selectedTag, setSelectedTagState] = useState<string | null>(null);
  const [thematicReflection, setThematicReflection] = useState<string | null>(null);
  const [isGeneratingThematic, setIsGeneratingThematic] = useState(false);
  
  // State for Debugging
  const [debugOutput, setDebugOutput] = useState<string | null>(null);

  const handleApiError = (error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
    let message = API_ERROR_MESSAGE;
    if (error instanceof Error && error.message) {
        if (error.message.includes('column') || error.message.includes('schema')) {
            message = "Database Error: A required column may be missing. Please check your database schema.";
        }
    }
    // Don't show a notification if it's a persistent configuration error, the banner will handle it.
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
    const interval = setInterval(updateSubtitle, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDataAndVerifyAI = async () => {
      if (!user) return;
      try {
        // Fetch user data from database
        const [userEntries, userReflections, userIntentions] = await Promise.all([
          db.getEntries(user.id),
          db.getReflections(user.id),
          db.getIntentions(user.id)
        ]);
        
        setEntries(userEntries);
        setReflections(userReflections);
        setIntentions(userIntentions);
        setIsDataLoaded(true);

        // Once data is loaded, verify the AI connection
        setAiStatus('verifying');
        await gemini.verifyApiKey();
        setAiStatus('ready');

      } catch (error: any) {
        // This catch block handles both data fetching and AI verification errors
        console.error("Error during startup:", error);
        
        // If data fetching is what failed, we might not have set it as loaded.
        if (!isDataLoaded) setIsDataLoaded(true);

        // Check if the error is from our AI verification
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
    
    // Update UI immediately for non-continuation messages
    if (!historyOverride) {
      setMessages(currentHistory);
      setChatStarters([]);
    }
    
    setIsChatLoading(true);

    const aiMessageId = `ai-${Date.now()}`;
    // Add placeholder for AI response
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

const startNewChatSession = async (firstUserPrompt?: string) => {
    if (!isDataLoaded || aiStatus !== 'ready') return;

    // Clear previous starters, but don't set loading yet.
    setChatStarters([]);

    try {
        // Step 1: Fetch and display the greeting for better perceived performance.
        const greeting = await gemini.generatePersonalizedGreeting(entries);
        const initialAiMessage: Message = { sender: 'ai', text: greeting, id: 'greeting' };

        if (firstUserPrompt) {
            // If starting with a prompt, set up history and immediately start streaming response.
            const userMessage: Message = { sender: 'user', text: firstUserPrompt, id: `user-${Date.now()}` };
            const initialHistory = [initialAiMessage, userMessage];
            setMessages(initialHistory);
            // This is a continuation call, so pass the history.
            await handleSendMessage(firstUserPrompt, initialHistory);
        } else {
            // Normal session start: display greeting, then fetch starters in the background.
            setMessages([initialAiMessage]);
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
    
    // Do not allow adding entries if AI is down, as it's a core part of the feature.
    if (aiStatus !== 'ready') {
      setToast({ message: "Cannot save entry: AI is not connected.", id: Date.now() });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Step 1: Get all AI data first. This is the robust, original logic.
      const aiData = await gemini.processEntry(text);

      // Step 2: Combine user text with AI data into a complete object.
      const newEntryData = {
        ...aiData,
        text: text,
        timestamp: new Date().toISOString(),
      };
      
      // Step 3: Save the single, complete entry to the database.
      const newEntry = await db.addEntry(user.id, newEntryData);
      
      // Step 4: Update the UI with the final, complete entry.
      setEntries(prev => [newEntry, ...prev]);

    } catch (error) {
      handleApiError(error, 'adding new entry');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateReflection = async (date: string, entriesForDay: Entry[]) => {
      if (!user || isGeneratingReflection || aiStatus !== 'ready') return;
      setIsGeneratingReflection(date);
      try {
        const intentionsForDay = intentions.filter(i => getFormattedDate(new Date(i.created_at)) === date);
        const { summary, suggestions } = await gemini.generateReflection(entriesForDay, intentionsForDay);
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

    // Show confirmation toast
    setToast({ message: 'To-do locked in!', id: Date.now() });
    setTimeout(() => setToast(null), 3000);

    // Remove suggestion from the UI
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

  const renderCurrentView = () => {
      switch(view) {
          case 'stream':
              return <Stream entries={entries} intentions={intentions} onTagClick={handleTagClick} />;
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
          default:
              return <Stream entries={entries} intentions={intentions} onTagClick={handleTagClick} />;
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
        default:
            return null;
    }
  }

  return (
    <div className="h-screen w-screen bg-brand-indigo flex flex-col font-sans text-white overflow-hidden">
      {showPrivacyModal && <PrivacyModal onClose={() => { setShowPrivacyModal(false); setHasSeenPrivacy(true); }} />}
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
