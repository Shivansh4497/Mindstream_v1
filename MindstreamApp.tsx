
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { SettingsView } from './components/SettingsView';
import { LifeAreaDashboard } from './components/LifeAreaDashboard';
import { FocusView } from './components/FocusView';
import { InsightsView } from './components/InsightsView';
import { YearlyReview } from './components/YearlyReview';
import { generateYearlyReview, YearlyReviewData } from './services/yearlyReviewService';

import { useAppLogic } from './hooks/useAppLogic';
import { useLocalStorage } from './hooks/useLocalStorage';
import * as gemini from './services/geminiService';
import * as reflections from './services/reflectionService';
import * as db from './services/dbService';
import type { Entry, IntentionTimeframe, Habit, HabitFrequency } from './types';

const ONBOARDING_COMPLETE_STEP = 5;

export const MindstreamApp: React.FC = () => {
    const { user } = useAuth();
    const { state, actions } = useAppLogic();

    const [view, setView] = useState<View>('stream');
    const [activeHabitFrequency, setActiveHabitFrequency] = useState<HabitFrequency>('daily');
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
    const [yearlyReviewData, setYearlyReviewData] = useState<YearlyReviewData | null>(null);
    const [isGeneratingYearly, setIsGeneratingYearly] = useState(false);

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
            <Header
                onSearchClick={() => setShowSearchModal(true)}
                onSettingsClick={() => setView('settings')}
            />
            <AIStatusBanner status={state.aiStatus} error={state.aiError} />

            <main className="flex-grow overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {view === 'stream' && (
                        <motion.div
                            key="stream"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <div className="flex-grow overflow-y-auto">
                                <Stream
                                    entries={state.entries}
                                    intentions={state.intentions}
                                    insights={state.insights}
                                    autoReflections={state.autoReflections}
                                    nudges={state.nudges}
                                    onTagClick={(tag) => { setSelectedTag(tag); setShowThematicModal(true); }}
                                    onEditEntry={setEntryToEdit}
                                    onDeleteEntry={setEntryToDelete}
                                    onAcceptSuggestion={async (id, suggestion) => {
                                        const type = await actions.handleAcceptSuggestion(id, suggestion);
                                        if (type === 'reflection') setView('chat');
                                    }}
                                    onDismissInsight={actions.handleDismissInsight}
                                    onAcceptNudge={actions.handleAcceptNudge}
                                    onDismissNudge={actions.handleDismissNudge}
                                    onLoadMore={actions.handleLoadMore}
                                    hasMore={state.hasMore}
                                    isLoadingMore={state.isLoadingMore}
                                />
                            </div>
                            <InputBar onAddEntry={actions.handleAddEntry} />
                        </motion.div>
                    )}

                    {view === 'focus' && (
                        <motion.div
                            key="focus"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <FocusView
                                // Habits Props
                                habits={state.habits}
                                todaysLogs={state.habitLogs}
                                onToggleHabit={actions.handleToggleHabit}
                                onEditHabit={setHabitToEdit}
                                onDeleteHabit={actions.handleDeleteHabit}
                                onAddHabit={actions.handleAddHabit}
                                isAddingHabit={state.isAddingHabit}
                                activeHabitFrequency={activeHabitFrequency}
                                onHabitFrequencyChange={setActiveHabitFrequency}
                                // Intentions Props
                                intentions={state.intentions}
                                onToggleIntention={actions.handleToggleIntention}
                                onDeleteIntention={actions.handleDeleteIntention}
                                onAddIntention={actions.handleAddIntention}
                            />
                        </motion.div>
                    )}

                    {view === 'insights' && (
                        <motion.div
                            key="insights"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <InsightsView
                                // Reflections Props
                                entries={state.entries}
                                intentions={state.intentions}
                                reflections={state.reflections}
                                habits={state.habits}
                                habitLogs={state.habitLogs}
                                onGenerateDaily={async (date, dayEntries) => {
                                    actions.setIsGeneratingReflection(date);
                                    const res = await reflections.generateReflection(dayEntries, state.intentions, state.habits, state.habitLogs);
                                    const saved = await db.addReflection(user!.id, { ...res, date, type: 'daily' });
                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === date && r.type === 'daily')), saved]);
                                    actions.setIsGeneratingReflection(null);
                                }}
                                onGenerateWeekly={async (weekId, weekEntries) => {
                                    actions.setIsGeneratingReflection(weekId);
                                    const res = await reflections.generateWeeklyReflection(weekEntries, state.intentions);
                                    const saved = await db.addReflection(user!.id, { ...res, date: weekId, type: 'weekly' });
                                    const reflectionForState = { ...saved, date: weekId };
                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === weekId && r.type === 'weekly')), reflectionForState]);
                                    actions.setIsGeneratingReflection(null);
                                }}
                                onGenerateMonthly={async (monthId, monthEntries) => {
                                    actions.setIsGeneratingReflection(monthId);
                                    const res = await reflections.generateMonthlyReflection(monthEntries, state.intentions);
                                    const saved = await db.addReflection(user!.id, { ...res, date: monthId, type: 'monthly' });
                                    const reflectionForState = { ...saved, date: monthId };
                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === monthId && r.type === 'monthly')), reflectionForState]);
                                    actions.setIsGeneratingReflection(null);
                                }}
                                onExploreInChat={(summary) => {
                                    setView('chat');
                                    actions.handleSendMessage(`I'd like to explore this reflection: "${summary}"`);
                                }}
                                isGenerating={state.isGeneratingReflection}
                                onAddSuggestion={(s) => actions.handleAddIntention(s.text, s.timeframe)}
                                aiStatus={state.aiStatus}
                                onDebug={() => reflections.getRawReflectionForDebug(state.entries, state.intentions).then(res => actions.setToast({ message: "Debug check console", id: 1 }))}
                                debugOutput={null}
                                // Life Dashboard Props
                                onOpenYearlyReview={async () => {
                                    if (!user) return;
                                    setIsGeneratingYearly(true);
                                    try {
                                        const data = await generateYearlyReview(user.id, new Date().getFullYear());
                                        setYearlyReviewData(data);
                                    } catch (e) {
                                        console.error(e);
                                        actions.setToast({ message: "Failed to generate yearly review", id: Date.now() });
                                    } finally {
                                        setIsGeneratingYearly(false);
                                    }
                                }}
                                isGeneratingYearly={isGeneratingYearly}
                            />
                        </motion.div>
                    )}

                    {view === 'chat' && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 flex flex-col"
                        >
                            <ChatView messages={state.messages} isLoading={state.isChatLoading} onAddSuggestion={() => { }} />
                            {state.messages.length === 1 && <SuggestionChips starters={chatStarters} isLoading={isGeneratingStarters} onStarterClick={actions.handleSendMessage} />}
                            <ChatInputBar onSendMessage={actions.handleSendMessage} isLoading={state.isChatLoading} />
                        </motion.div>
                    )}

                    {view === 'settings' && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="absolute inset-0 flex flex-col z-30 bg-brand-indigo"
                        >
                            <SettingsView onBack={() => setView('stream')} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {view !== 'settings' && <NavBar activeView={view} onViewChange={setView} />}

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
            {yearlyReviewData && (
                <YearlyReview
                    data={yearlyReviewData}
                    onClose={() => setYearlyReviewData(null)}
                />
            )}
        </div>
    );
};
