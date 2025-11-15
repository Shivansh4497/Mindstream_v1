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

const INITIAL_GREETING = "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?";
const API_ERROR_MESSAGE = "An issue occurred while communicating with the AI. This might be a temporary network problem. Please try again in a moment.";

export type AIStatus = 'initializing' | 'verifying' | 'ready' | 'error';

export const MindstreamApp: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ sender: 'ai', text: INITIAL_GREETING }]);
  
  const [view, setView] = useState<View>('stream');
  const [isProcessing, setIsProcessing] = useState(false); // For new entries
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  
  // App/Data loading state
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('initializing');
  const [aiError, setAiError] = useState<string | null>(null);

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
    // Don't show an alert if it's a persistent configuration error, the banner will handle it.
    if (aiStatus !== 'error') {
      alert(API_ERROR_MESSAGE);
    }
  };
  
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
  
  const handleSendMessage = async (text: string, initialHistory?: Message[]) => {
    if (isChatLoading || aiStatus !== 'ready') return;

    const history = initialHistory || messages;
    const newUserMessage: Message = { sender: 'user', text };
    
    // Clear starters and add the user message to the history
    setChatStarters([]);
    if (!initialHistory) {
      setMessages(prev => [...prev, newUserMessage]);
    }
    
    const newHistory = [...history, newUserMessage];
    
    setIsChatLoading(true);
    
    try {
        const { text: aiResponse } = await gemini.getChatResponse(newHistory, entries, intentions);
        const newAiMessage: Message = { sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
        handleApiError(error, 'getting chat response');
        const errorMessage: Message = { sender: 'ai', text: "Sorry, I'm having trouble connecting right now." };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  }

  const startNewChatSession = async (firstUserPrompt?: string) => {
    if (isGeneratingStarters || !isDataLoaded || aiStatus !== 'ready') return;

    setIsGeneratingStarters(true);
    setChatStarters([]);

    try {
        // Run greeting and starter generation in parallel for performance
        const [greeting, startersResult] = await Promise.all([
          gemini.generatePersonalizedGreeting(entries),
          gemini.generateChatStarters(entries, intentions)
        ]);

        const initialAiMessage: Message = { sender: 'ai', text: greeting };

        if (firstUserPrompt) {
            const userMessage: Message = { sender: 'user', text: firstUserPrompt };
            setMessages([initialAiMessage, userMessage]);
            handleSendMessage(firstUserPrompt, [initialAiMessage, userMessage]);
        } else {
            setMessages([initialAiMessage]);
            setChatStarters(startersResult.starters);
        }
    } catch (error) {
        handleApiError(error, 'initializing chat');
        setMessages([{ sender: 'ai', text: INITIAL_GREETING }]);
        setChatStarters([
            "What was my biggest challenge last week?",
            "Let's review my progress on my goals.",
            "Tell me about a recurring theme in my journal."
        ]);
    } finally {
        setIsGeneratingStarters(false);
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
    if (!user || isProcessing || aiStatus !== 'ready') return;
    setIsProcessing(true);
    try {
      const { title, tags, sentiment } = await gemini.processEntry(text);
      const newEntryData = {
        timestamp: new Date().toISOString(),
        text,
        title,
        tags,
        sentiment,
      };
      const newEntry = await db.addEntry(user.id, newEntryData);
      if (newEntry) {
        setEntries(prev => [newEntry, ...prev]);
      }
    } catch (error) {
      handleApiError(error, 'processing entry');
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
      
      <Header onSearchClick={() => setShowSearchModal(true)} />
      
      <AIStatusBanner status={aiStatus} error={aiError} />

      <main className="flex-grow overflow-y-auto">
        {!isDataLoaded && (
          <div className="h-full w-full flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-teal/50 border-t-brand-teal rounded-full animate-spin"></div>
          </div>
        )}
        {isDataLoaded && renderCurrentView()}
      </main>
      
      <div className="flex-shrink-0">
        {isDataLoaded && renderActionBar()}
        <NavBar activeView={view} onViewChange={handleViewChange} isChatDisabled={!isDataLoaded || aiStatus !== 'ready'} />
      </div>
    </div>
  );
};
