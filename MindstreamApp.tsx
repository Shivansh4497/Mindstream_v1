
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { NavBar, View } from './components/NavBar';
import { Stream } from './components/Stream';
import { InputBar } from './components/InputBar';
import { OnboardingWizard } from './components/OnboardingWizard';
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
import { EditHabitModal } from './components/EditHabitModal';
import { HabitsView } from './components/HabitsView';
import { HabitsInputBar } from './components/HabitsInputBar';
import { useAppLogic } from './hooks/useAppLogic';
import { useLocalStorage } from './hooks/useLocalStorage';
import * as gemini from './services/geminiService';
import * as reflections from './services/reflectionService';
import * as db from './services/dbService';
import type { Entry, IntentionTimeframe, Habit } from './types';

const ONBOARDING_COMPLETE_STEP = 5;

export const MindstreamApp: React.FC = () => {
  const { user } = useAuth();
  const { state, actions } = useAppLogic();
  
  const [view, setView] = useState<View>('stream');
  const [activeIntentionTimeframe, setActiveIntentionTimeframe] = useState<IntentionTimeframe>('daily');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [chatStarters, setChatStarters] = useState<string[]>([]);
  const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);
  
  // Modals
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [showThematicModal, setShowThematicModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [thematicReflection, setThematicReflection] = useState<string | null>(null);
  const [isGeneratingThematic, setIsGeneratingThematic] = useState(false);

  // Onboarding State
  const onboardingKey = user ? `onboardingStep_${user.id}` : 'onboardingStep';
  const [onboardingStep, setOnboardingStep] = useLocalStorage<number>(onboardingKey, 0);
  const [legacyPrivacy] = useLocalStorage('hasSeenPrivacy', false);
  useEffect(() => {
      if (legacyPrivacy && onboardingStep === 0) setOnboardingStep(ONBOARDING_COMPLETE_STEP);
  }, [legacyPrivacy, onboardingStep]);

  // Chat Starters - Using the new reflectionService
  useEffect(() => {
      if (view === 'chat' && state.messages.length === 1 && chatStarters.length === 0 && state.aiStatus === 'ready') {
          setIsGeneratingStarters(true);
          reflections.generateChatStarters(state.entries, state.intentions)
              .then(res => setChatStarters(res.starters))
              .catch(console.error)
              .finally(() => setIsGeneratingStarters(false));
      }
  }, [view, state.messages, state.aiStatus]);

  if (onboardingStep < ONBOARDING_COMPLETE_STEP && user) {
      return <OnboardingWizard userId={user.id} onComplete={(dest, context, q) => {
          setOnboardingStep(ONBOARDING_COMPLETE_STEP);
          if (dest === 'chat' && context && q) {
              setView('chat');
              actions.handleSendMessage(context); // Seeding context
              actions.setMessages(prev => [...prev, { sender: 'ai', text: q }]);
          }
      }} />;
  }

  if (!state.isDataLoaded) {
    return <div className="h-screen w-screen bg-brand-indigo flex items-center justify-center"><div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-brand-indigo overflow-hidden">
      <Header onSearchClick={() => setShowSearchModal(true)} />
      <AIStatusBanner status={state.aiStatus} error={state.aiError} />

      <main className="flex-grow overflow-hidden relative">
        {view === 'stream' && (
            <div className="absolute inset-0 flex flex-col">
                <div className="flex-grow overflow-y-auto">
                    <Stream 
                        entries={state.entries} 
                        intentions={state.intentions} 
                        onTagClick={(tag) => { setSelectedTag(tag); setShowThematicModal(true); }}
                        onEditEntry={setEntryToEdit}
                        onDeleteEntry={setEntryToDelete}
                        onAcceptSuggestion={async (id, suggestion) => {
                            const type = await actions.handleAcceptSuggestion(id, suggestion);
                            if (type === 'reflection') setView('chat');
                        }}
                        onLoadMore={actions.handleLoadMore}
                        hasMore={state.hasMore}
                        isLoadingMore={state.isLoadingMore}
                    />
                </div>
                <InputBar onAddEntry={actions.handleAddEntry} />
            </div>
        )}

        {view === 'habits' && (
            <div className="absolute inset-0 flex flex-col">
                <HabitsView 
                    habits={state.habits} 
                    todaysLogs={state.habitLogs}
                    onToggle={actions.handleToggleHabit}
                    onEdit={setHabitToEdit}
                    onDelete={actions.handleDeleteHabit}
                />
                <HabitsInputBar onAddHabit={actions.handleAddHabit} isLoading={state.isAddingHabit} />
            </div>
        )}

        {view === 'intentions' && (
            <div className="absolute inset-0 flex flex-col">
                <IntentionsView 
                    intentions={state.intentions} 
                    onToggle={actions.handleToggleIntention} 
                    onDelete={actions.handleDeleteIntention}
                    activeTimeframe={activeIntentionTimeframe}
                    onTimeframeChange={setActiveIntentionTimeframe}
                />
                <IntentionsInputBar onAddIntention={actions.handleAddIntention} activeTimeframe={activeIntentionTimeframe} />
            </div>
        )}

        {view === 'chat' && (
            <div className="absolute inset-0 flex flex-col">
                <ChatView messages={state.messages} isLoading={state.isChatLoading} onAddSuggestion={() => {}} />
                {state.messages.length === 1 && <SuggestionChips starters={chatStarters} isLoading={isGeneratingStarters} onStarterClick={actions.handleSendMessage} />}
                <ChatInputBar onSendMessage={actions.handleSendMessage} isLoading={state.isChatLoading} />
            </div>
        )}

        {view === 'reflections' && (
             <div className="absolute inset-0 flex flex-col">
                <ReflectionsView 
                    entries={state.entries}
                    intentions={state.intentions}
                    reflections={state.reflections}
                    onGenerateDaily={async (date, dayEntries) => {
                        actions.setIsGeneratingReflection(date);
                        const res = await reflections.generateReflection(dayEntries, state.intentions, state.habits, state.habitLogs);
                        await db.addReflection(user!.id, { ...res, date, type: 'daily' });
                        actions.setIsGeneratingReflection(null);
                        window.location.reload();
                    }}
                    onGenerateWeekly={async (weekId, weekEntries) => {
                        actions.setIsGeneratingReflection(weekId);
                        const res = await reflections.generateWeeklyReflection(weekEntries, state.intentions);
                        await db.addReflection(user!.id, { ...res, date: weekId, type: 'weekly' });
                        actions.setIsGeneratingReflection(null);
                        window.location.reload();
                    }}
                    onGenerateMonthly={async (monthId, monthEntries) => {
                        actions.setIsGeneratingReflection(monthId);
                        const res = await reflections.generateMonthlyReflection(monthEntries, state.intentions);
                        await db.addReflection(user!.id, { ...res, date: monthId, type: 'monthly' });
                        actions.setIsGeneratingReflection(null);
                        window.location.reload();
                    }}
                    onExploreInChat={(summary) => {
                        setView('chat');
                        actions.handleSendMessage(`I'd like to explore this reflection: "${summary}"`);
                    }}
                    isGenerating={state.isGeneratingReflection}
                    onAddSuggestion={(s) => actions.handleAddIntention(s.text, s.timeframe)}
                    aiStatus={state.aiStatus}
                    onDebug={() => reflections.getRawReflectionForDebug(state.entries, state.intentions).then(res => actions.setToast({message: "Debug check console", id: 1}))}
                    debugOutput={null}
                />
            </div>
        )}
      </main>

      <NavBar activeView={view} onViewChange={setView} />

      {/* Modals */}
      {showSearchModal && <SearchModal entries={state.entries} reflections={state.reflections} onClose={() => setShowSearchModal(false)} />}
      {state.toast && <Toast message={state.toast.message} onDismiss={() => actions.setToast(null)} />}
      {entryToDelete && <DeleteConfirmationModal onConfirm={() => { actions.handleDeleteEntry(entryToDelete); setEntryToDelete(null); }} onCancel={() => setEntryToDelete(null)} />}
      {entryToEdit && <EditEntryModal entry={entryToEdit} onSave={async (txt) => { await actions.handleEditEntry(entryToEdit, txt); setEntryToEdit(null); }} onCancel={() => setEntryToEdit(null)} />}
      {habitToEdit && <EditHabitModal habit={habitToEdit} onSave={async (name, emoji, category) => { await actions.handleEditHabit(habitToEdit.id, name, emoji, category); setHabitToEdit(null); }} onCancel={() => setHabitToEdit(null)} />}
      {showThematicModal && selectedTag && (
          <ThematicModal 
            tag={selectedTag} 
            onClose={() => setShowThematicModal(false)}
            onViewEntries={() => { setShowSearchModal(true); setShowThematicModal(false); }}
            onGenerateReflection={async () => {
                setIsGeneratingThematic(true);
                const res = await reflections.generateThematicReflection(selectedTag, state.entries);
                setThematicReflection(res);
                setIsGeneratingThematic(false);
            }}
            isGenerating={isGeneratingThematic}
            reflectionResult={thematicReflection}
          />
      )}
    </div>
  );
};
