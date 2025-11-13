import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import * as db from './services/dbService';
import * as gemini from './services/geminiService';
// FIX: The Profile type is no longer needed here as it's not managed in this component's state.
import type { Entry, Reflection, Intention, Message, IntentionTimeframe } from './types';
import { getFormattedDate } from './utils/date';

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

export const MindstreamApp: React.FC = () => {
  const { user } = useAuth();
  // FIX: Profile state is no longer managed here; it's now in AuthContext.
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [intentions, setIntentions] = useState<Intention[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hello! I'm Mindstream. You can ask me anything about your thoughts, feelings, or goals. How can I help you today?" }
  ]);
  
  const [view, setView] = useState<View>('stream');
  const [isProcessing, setIsProcessing] = useState(false); // For new entries
  const [isGeneratingReflection, setIsGeneratingReflection] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [hasSeenPrivacy, setHasSeenPrivacy] = useLocalStorage('hasSeenPrivacy', false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(!hasSeenPrivacy);
  
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeIntentionTimeframe, setActiveIntentionTimeframe] = useState<IntentionTimeframe>('daily');
  
  const allReflections = reflections;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // FIX: Removed profile fetching logic, as it's now handled in AuthContext.
        const [userEntries, userReflections, userIntentions] = await Promise.all([
          db.getEntries(user.id),
          db.getReflections(user.id),
          db.getIntentions(user.id)
        ]);
        
        setEntries(userEntries);
        setReflections(userReflections);
        setIntentions(userIntentions);

      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [user]);

  const handleAddEntry = async (text: string) => {
    if (!user || isProcessing) return;
    setIsProcessing(true);
    try {
      const { title, tags } = await gemini.processEntry(text);
      const newEntryData = {
        timestamp: new Date().toISOString(),
        text,
        title,
        tags
      };
      const newEntry = await db.addEntry(user.id, newEntryData);
      if (newEntry) {
        setEntries(prev => [newEntry, ...prev]);
      }
    } catch (error) {
      console.error("Error adding entry:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleGenerateReflection = async (date: string, entriesForDay: Entry[]) => {
    if (!user || isGeneratingReflection) return;
    setIsGeneratingReflection(date);
    try {
      const intentionsForDay = intentions.filter(i => getFormattedDate(new Date(i.created_at)) === date);
      const summary = await gemini.generateReflection(entriesForDay, intentionsForDay);

      const reflectionData = {
        date: date,
        summary: summary,
        entry_ids: entriesForDay.map(e => e.id),
        type: 'daily' as const,
      };
      const newReflection = await db.addReflection(user.id, reflectionData);
      if (newReflection) {
        const userReflections = await db.getReflections(user.id);
        setReflections(userReflections);
      } else {
        throw new Error("Failed to save the reflection to the database.");
      }
    } catch (error) {
      console.error("Error generating reflection:", error);
      alert(error instanceof Error ? error.message : "An unknown error occurred while generating reflection.");
    } finally {
      setIsGeneratingReflection(null);
    }
  };

  const handleGenerateWeeklyReflection = async (weekId: string, dailyReflections: Reflection[]) => {
    if (!user || isGeneratingReflection) return;
    setIsGeneratingReflection(weekId);
    try {
      const summary = await gemini.generateWeeklyReflection(dailyReflections);

      const reflectionData = {
        date: weekId,
        summary: summary,
        entry_ids: dailyReflections.flatMap(r => r.entry_ids),
        type: 'weekly' as const,
      };
      const newReflection = await db.addReflection(user.id, reflectionData);
      if (newReflection) {
        const userReflections = await db.getReflections(user.id);
        setReflections(userReflections);
      } else {
        throw new Error("Failed to save the weekly reflection to the database.");
      }
    } catch (error) {
      console.error("Error generating weekly reflection:", error);
      alert(error instanceof Error ? error.message : "An unknown error occurred while generating weekly reflection.");
    } finally {
      setIsGeneratingReflection(null);
    }
  };
  
  const handleGenerateMonthlyReflection = async (monthId: string, dailyReflections: Reflection[]) => {
    if (!user || isGeneratingReflection) return;
    setIsGeneratingReflection(monthId);
    try {
      const summary = await gemini.generateMonthlyReflection(dailyReflections);
      
      const reflectionData = {
        date: monthId,
        summary: summary,
        entry_ids: dailyReflections.flatMap(r => r.entry_ids),
        type: 'monthly' as const,
      };
      const newReflection = await db.addReflection(user.id, reflectionData);
      if (newReflection) {
        const userReflections = await db.getReflections(user.id);
        setReflections(userReflections);
      } else {
          throw new Error("Failed to save the monthly reflection to the database.");
      }
    } catch (error) {
      console.error("Error generating monthly reflection:", error);
      alert(error instanceof Error ? error.message : "An unknown error occurred while generating monthly reflection.");
    } finally {
      setIsGeneratingReflection(null);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (isChatLoading) return;

    const newUserMessage: Message = { sender: 'user', text };
    const newHistory = [...messages, newUserMessage];
    setMessages(newHistory);
    setIsChatLoading(true);

    try {
        const aiResponse = await gemini.getChatResponse(newHistory, entries, intentions);
        const newAiMessage: Message = { sender: 'ai', text: aiResponse };
        setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
        console.error("Error getting chat response:", error);
        const errorMessage: Message = { 
            sender: 'ai', 
            text: error instanceof Error ? error.message : "Sorry, I'm having trouble connecting right now." 
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsChatLoading(false);
    }
  }

  const handleAddIntention = async (text: string) => {
    if (!user) return;
    try {
        const newIntention = await db.addIntention(user.id, text, activeIntentionTimeframe);
        if (newIntention) {
            setIntentions(prev => [newIntention, ...prev]);
        }
    } catch (error) {
        console.error("Error adding intention:", error);
    }
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

  const renderCurrentView = () => {
      switch(view) {
          case 'stream':
              return <Stream entries={entries} />;
          case 'reflections':
              return <ReflectionsView 
                        entries={entries}
                        intentions={intentions}
                        reflections={reflections}
                        onGenerateDaily={handleGenerateReflection}
                        onGenerateWeekly={handleGenerateWeeklyReflection}
                        onGenerateMonthly={handleGenerateMonthlyReflection}
                        isGenerating={isGeneratingReflection}
                     />;
          case 'chat':
              return <ChatView messages={messages} isLoading={isChatLoading} />;
          case 'intentions':
              return <IntentionsView intentions={intentions} onToggle={handleToggleIntention} onDelete={handleDeleteIntention} activeTimeframe={activeIntentionTimeframe} onTimeframeChange={setActiveIntentionTimeframe} />;
          default:
              return <Stream entries={entries} />;
      }
  };

  const renderActionBar = () => {
    switch(view) {
        case 'stream':
            return <InputBar onAddEntry={handleAddEntry} />;
        case 'chat':
            return <ChatInputBar onSendMessage={handleSendMessage} isLoading={isChatLoading} />;
        case 'intentions':
            return <IntentionsInputBar onAddIntention={handleAddIntention} activeTimeframe={activeIntentionTimeframe} />;
        default:
            return null; // No action bar for reflections
    }
  }

  return (
    <div className="h-screen w-screen bg-brand-indigo flex flex-col font-sans text-white overflow-hidden">
      {showPrivacyModal && <PrivacyModal onClose={() => { setShowPrivacyModal(false); setHasSeenPrivacy(true); }} />}
      {showSearchModal && <SearchModal entries={entries} reflections={allReflections} onClose={() => setShowSearchModal(false)} />}
      
      <Header onSearchClick={() => setShowSearchModal(true)} />

      <main className="flex-grow overflow-y-auto">
        {renderCurrentView()}
      </main>
      
      {/* DEFINITIVE FOOTER SOLUTION */}
      <div className="flex-shrink-0">
        {renderActionBar()}
        <NavBar activeView={view} onViewChange={setView} />
      </div>
    </div>
  );
};
