
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { differenceInDays, isSameDay, parseISO } from 'date-fns';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { NavBar, View } from './components/NavBar';
import { Stream } from './components/Stream';
import { InputBar } from './components/InputBar';
import { LandingScreen } from './components/LandingScreen';
import { DemoWelcomeModal } from './components/DemoWelcomeModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import { SearchModal } from './components/SearchModal';
import { ChatView } from './components/ChatView';
import { ChatInputBar } from './components/ChatInputBar';
import { IntentionsView } from './components/IntentionsView';

// reflections view unused?
import { ThematicModal } from './components/ThematicModal';
import { AIStatusBanner } from './components/AIStatusBanner';
import { SuggestionChips } from './components/SuggestionChips';
import { Toast } from './components/Toast';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { EditEntryModal } from './components/EditEntryModal';
import { EditHabitModal } from './components/EditHabitModal';
import { EditIntentionModal } from './components/EditIntentionModal';
import { HabitsView } from './components/HabitsView';
import { HabitsInputBar } from './components/HabitsInputBar';
import { IntentionsInputBar } from './components/IntentionsInputBar';
import { SettingsView } from './components/SettingsView';
// LifeAreaDashboard unused?
import { InsightsView } from './components/InsightsView';
import { YearlyReview } from './components/YearlyReview';
import { InsightModal } from './components/InsightModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ReflectionUnlockModal } from './components/ReflectionUnlockModal';
import { InfoModal } from './components/InfoModal';
import { generateYearlyReview, YearlyReviewData } from './services/yearlyReviewService';

import { useAppLogic } from './hooks/useAppLogic';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFTUE, isFTUECompletedLocally } from './hooks/useFTUE';
import { FTUETour } from './components/FTUETour';
import * as reflections from './services/reflectionService';
import * as db from './services/dbService';
import type { Entry, Habit, HabitFrequency, Intention, Reflection } from './types';
import { DemoLimitModal } from './components/DemoLimitModal';
import { GlassBox, GlassBoxMeta, MobilePipelineButton } from './components/GlassBox';
import { getLastAIMeta } from './services/geminiClient';
import { useDemoMode } from './hooks/useDemoMode';
import { Brain } from 'lucide-react';

// Onboarding states
const ONBOARDING_NOT_STARTED = 0;
const ONBOARDING_QUICK_START = 1;
const ONBOARDING_GUIDED_COMPLETE = 5;

const LOADING_TIMEOUT_MS = 15000; // 15 seconds

export const MindstreamApp: React.FC = () => {
    const { user, isSeeding, isDemo } = useAuth();
    const isDemoUser = isDemo || user?.is_anonymous === true;

    // Demo Mode — GlassBox toggle only visible for demo users
    const { isDemoMode, isEngineerViewOpen, toggleEngineerView } = useDemoMode();

    // App Logic — same pipeline for regular and demo users
    const { state, actions } = useAppLogic();

    // Track current user query message text for GlassBox loading states
    const [currentUserMessage, setCurrentUserMessage] = useState('');

    const handleSendMessageWithTracking = useCallback((text: string, initialContext?: any) => {
        setCurrentUserMessage(text);
        actions.handleSendMessage(text, initialContext);
    }, [actions.handleSendMessage]);

    // Glass Box metadata state
    const [glassBoxMeta, setGlassBoxMeta] = useState<GlassBoxMeta | null>(null);

    // Reactive viewport width for responsive panel
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handler = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    const isDesktopViewport = windowWidth >= 768;


    const [view, setView] = useState<View>('stream');
    const [activeHabitFrequency, setActiveHabitFrequency] = useState<HabitFrequency>('daily');
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [chatStarters, setChatStarters] = useState<string[]>([]);
    const [isGeneratingStarters, setIsGeneratingStarters] = useState(false);

    // Modals
    const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
    const [entryToEdit, setEntryToEdit] = useState<Entry | null>(null);
    const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
    const [intentionToEdit, setIntentionToEdit] = useState<Intention | null>(null);
    const [showThematicModal, setShowThematicModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [thematicReflection, setThematicReflection] = useState<string | null>(null);
    const [isGeneratingThematic, setIsGeneratingThematic] = useState(false);
    const [yearlyReviewData, setYearlyReviewData] = useState<YearlyReviewData | null>(null);
    const [isGeneratingYearly, setIsGeneratingYearly] = useState(false);


    // Loading timeout state
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);

    // Onboarding State
    const onboardingKey = user ? `onboardingStep_${user.id}` : 'onboardingStep';
    const [onboardingStep, setOnboardingStep] = useLocalStorage<number>(onboardingKey, ONBOARDING_NOT_STARTED);
    const [legacyPrivacy] = useLocalStorage('hasSeenPrivacy', false);

    // Track if Quick Start user has seen their first insight
    const hasSeenInsightKey = user ? `hasSeenFirstInsight_${user.id}` : 'hasSeenFirstInsight';
    const [hasSeenFirstInsight, setHasSeenFirstInsight] = useLocalStorage<boolean>(hasSeenInsightKey, false);

    // Progressive disclosure: track if user has visited Insights tab after unlock
    const hasVisitedInsightsKey = user ? `hasVisitedInsights_${user.id}` : 'hasVisitedInsights';
    const [hasVisitedInsights, setHasVisitedInsights] = useLocalStorage<boolean>(hasVisitedInsightsKey, false);

    // Demo Mode welcome modal tracking
    const [showDemoWelcome, setShowDemoWelcome] = useState(false);
    const [hasSeenDemoWelcome, setHasSeenDemoWelcome] = useLocalStorage<boolean>(user ? `seen_demo_welcome_${user.id}` : 'seen_demo_welcome', false);

    // Count real entries (exclude temp entries)
    const realEntryCount = state.entries.filter(e => !e.id.startsWith('temp-')).length;
    const insightsUnlocked = realEntryCount >= 5;



    // Update Glass Box when chat finishes loading
    useEffect(() => {
        if (!state.isChatLoading) {
            const meta = getLastAIMeta();
            if (meta) {
                setGlassBoxMeta({
                    ...meta,
                    action: 'chat',
                    userMessage: meta.userMessage ?? state.messages.filter(m => m.sender === 'user').pop()?.text,
                    fallback_chain: meta.attempted,
                });
            }
        }
    }, [state.isChatLoading]);

    // FTUE Tour
    const shouldShowFTUE = realEntryCount === 1 && !isFTUECompletedLocally();
    const ftue = useFTUE(shouldShowFTUE, async () => {
        if (user) {
            await db.updateProfile(user.id, { ftue_completed: true });
        }
    });

    // Progressive unlock thresholds
    const WEEKLY_UNLOCK = { days: 3, entries: 5 };
    const MONTHLY_UNLOCK = { days: 14, entries: 10 };

    // Track which reflection unlocks user has seen
    const seenDailyUnlockKey = user ? `seenDailyUnlock_${user.id}` : 'seenDailyUnlock';
    const seenWeeklyUnlockKey = user ? `seenWeeklyUnlock_${user.id}` : 'seenWeeklyUnlock';
    const seenMonthlyUnlockKey = user ? `seenMonthlyUnlock_${user.id}` : 'seenMonthlyUnlock';
    const [seenDailyUnlock, setSeenDailyUnlock] = useLocalStorage<boolean>(seenDailyUnlockKey, false);
    const [seenWeeklyUnlock, setSeenWeeklyUnlock] = useLocalStorage<boolean>(seenWeeklyUnlockKey, false);
    const [seenMonthlyUnlock, setSeenMonthlyUnlock] = useLocalStorage<boolean>(seenMonthlyUnlockKey, false);

    // Modal state for reflection unlock
    const [pendingUnlockType, setPendingUnlockType] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

    // Calculate unlock status
    const unlockStatus = useMemo(() => {
        const now = new Date();
        const createdAt = state.accountCreatedAt ? new Date(state.accountCreatedAt) : now;
        const daysSinceInstall = differenceInDays(now, createdAt);

        const dailyUnlocked = realEntryCount >= 5;
        const weeklyUnlocked = daysSinceInstall >= WEEKLY_UNLOCK.days && realEntryCount >= WEEKLY_UNLOCK.entries;
        const monthlyUnlocked = daysSinceInstall >= MONTHLY_UNLOCK.days && realEntryCount >= MONTHLY_UNLOCK.entries;

        return { dailyUnlocked, weeklyUnlocked, monthlyUnlocked, daysSinceInstall };
    }, [state.accountCreatedAt, realEntryCount]);

    // Legacy migration
    useEffect(() => {
        if (legacyPrivacy && onboardingStep === ONBOARDING_NOT_STARTED) {
            setOnboardingStep(ONBOARDING_GUIDED_COMPLETE);
        }
    }, [legacyPrivacy, onboardingStep]);

    // Demo Mode welcome modal and onboarding skip
    useEffect(() => {
        if (user && isDemo && !isSeeding) {
            if (onboardingStep === ONBOARDING_NOT_STARTED) {
                setOnboardingStep(ONBOARDING_QUICK_START);
                setView('stream');
            }
            if (!hasSeenDemoWelcome) {
                setShowDemoWelcome(true);
            }
        }
    }, [user, isDemo, isSeeding, onboardingStep, hasSeenDemoWelcome]);

    // Loading timeout
    useEffect(() => {
        if (!state.isDataLoaded) {
            const timeout = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
            return () => clearTimeout(timeout);
        }
    }, [state.isDataLoaded]);

    // Progressive disclosure toast
    useEffect(() => {
        if (insightsUnlocked && !hasVisitedInsights && user) {
            actions.setToast({ message: '🎉 Insights tab unlocked!', id: Date.now() });
            db.logEvent(user.id, 'insights_unlocked', {});
        }
    }, [insightsUnlocked]);

    // Chat Starters
    useEffect(() => {
        if (view === 'chat' && state.messages.length === 1 && chatStarters.length === 0 && state.aiStatus === 'ready') {
            setIsGeneratingStarters(true);
            reflections.generateChatStarters(state.entries)
                .then(res => setChatStarters(res.starters))
                .catch(console.error)
                .finally(() => setIsGeneratingStarters(false));
        }
    }, [view, state.messages, state.aiStatus]);

    // For demo users, suppress and mark all unlock keys as seen on session init
    useEffect(() => {
        if (isDemoUser && state.isDataLoaded) {
            if (!seenDailyUnlock) setSeenDailyUnlock(true);
            if (!seenWeeklyUnlock) setSeenWeeklyUnlock(true);
            if (!seenMonthlyUnlock) setSeenMonthlyUnlock(true);
        }
    }, [isDemoUser, state.isDataLoaded, seenDailyUnlock, seenWeeklyUnlock, seenMonthlyUnlock, setSeenDailyUnlock, setSeenWeeklyUnlock, setSeenMonthlyUnlock]);

    // Reflection unlock notifications
    useEffect(() => {
        if (!user || !state.isDataLoaded || isDemoUser) return;
        if (pendingUnlockType !== null) return;

        if (unlockStatus.dailyUnlocked && !seenDailyUnlock) {
            setPendingUnlockType('daily');
            return;
        }
        if (unlockStatus.weeklyUnlocked && !seenWeeklyUnlock) {
            setPendingUnlockType('weekly');
            return;
        }
        if (unlockStatus.monthlyUnlocked && !seenMonthlyUnlock) {
            setPendingUnlockType('monthly');
            return;
        }
    }, [unlockStatus, seenDailyUnlock, seenWeeklyUnlock, seenMonthlyUnlock, state.isDataLoaded, user, pendingUnlockType, isDemoUser]);

    // Handle reflection unlock actions
    const handleReflectionUnlockNavigate = () => {
        if (!pendingUnlockType) return;
        if (pendingUnlockType === 'daily') setSeenDailyUnlock(true);
        if (pendingUnlockType === 'weekly') setSeenWeeklyUnlock(true);
        if (pendingUnlockType === 'monthly') setSeenMonthlyUnlock(true);
        setView('insights');
        if (user) {
            db.logEvent(user.id, 'reflection_generated', { type: pendingUnlockType, action: 'navigated_from_unlock' });
        }
        setPendingUnlockType(null);
    };

    const handleReflectionUnlockDismiss = () => {
        if (!pendingUnlockType) return;
        if (pendingUnlockType === 'daily') setSeenDailyUnlock(true);
        if (pendingUnlockType === 'weekly') setSeenWeeklyUnlock(true);
        if (pendingUnlockType === 'monthly') setSeenMonthlyUnlock(true);
        setPendingUnlockType(null);
    };

    // Show Landing Screen
    if (onboardingStep === ONBOARDING_NOT_STARTED && user) {
        if (isDemoUser) {
            return (
                <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-center mt-4 animate-pulse">
                        <p className="text-brand-teal font-medium mb-1">Loading up your Demo Environment</p>
                    </div>
                </div>
            );
        }
        return (
            <LandingScreen
                onQuickStart={() => {
                    setOnboardingStep(ONBOARDING_QUICK_START);
                    db.logEvent(user.id, 'onboarding_completed', { path: 'quick_start' });
                }}
                onGuidedSetup={async () => {
                    await db.resetAccountData(user.id);
                    await actions.refreshAllData();
                    setOnboardingStep(2);
                }}
            />
        );
    }

    // Show Guided Onboarding Wizard
    if (onboardingStep >= 2 && onboardingStep < ONBOARDING_GUIDED_COMPLETE && user) {
        return <OnboardingWizard userId={user.id} onComplete={(dest, context, q) => {
            setOnboardingStep(ONBOARDING_GUIDED_COMPLETE);
            db.logEvent(user.id, 'onboarding_completed', { path: 'guided' });
            if (dest === 'chat' && context) {
                setView('chat');
                handleSendMessageWithTracking(context);
            } else {
                setView('stream');
            }
        }} />;
    }

    if (!state.isDataLoaded || user && isSeeding) {
        return (
            <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
                {isSeeding && (
                    <div className="text-center mt-4 animate-pulse">
                        <p className="text-brand-teal font-medium mb-1">Loading up your Demo Environment</p>
                    </div>
                )}
                {loadingTimedOut && !isSeeding && (
                    <div className="text-center mt-4">
                        <p className="text-gray-400 mb-3">Taking longer than expected...</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-teal/20 text-brand-teal rounded-lg hover:bg-brand-teal/30 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }


    // Responsive Docking Logic — use reactive windowWidth
    // Demo sidebar is permanent for desktops when in chat view
    const showDocked = (isDemoUser && isDesktopViewport && view === 'chat') || (isEngineerViewOpen && isDesktopViewport);
    const showModal = isEngineerViewOpen && !isDesktopViewport;

    // Derive last AI response for quality evaluation
    const lastAIMessage = [...state.messages].reverse().find(m => m.sender === 'ai');
    const lastAIResponse = lastAIMessage?.text ?? '';

    return (
        <ErrorBoundary>
            <div className="flex flex-col h-[100dvh] bg-brand-indigo overflow-hidden transition-all duration-500 ease-in-out w-full">
                {/* Header with Demo Toggle */}
                <Header
                    onSearchClick={() => setShowSearchModal(true)}
                    onSettingsClick={() => setView('settings')}
                    onInfoClick={() => setShowInfoModal(true)}
                />

                <AIStatusBanner status={state.aiStatus} error={state.aiError} />

                {/* Main Content Area (Flex container for split view) */}
                <div className="flex-grow flex overflow-hidden relative">

                    {/* App Views */}
                    <main className="flex-1 min-w-0 overflow-hidden relative transition-all duration-300">
                        <AnimatePresence mode="wait">
                            {/* Stream View */}
                            {view === 'stream' && (
                                <motion.div
                                    key="stream"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5, ease: 'easeInOut' }}
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
                                            isLoading={!state.isDataLoaded}
                                        />
                                    </div>
                                    <InputBar onAddEntry={actions.handleAddEntry} />
                                </motion.div>
                            )}

                            {/* Chat View */}
                            {view === 'chat' && (
                                <motion.div
                                    key="chat"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <ChatView
                                        messages={state.messages}
                                        isLoading={state.isChatLoading}
                                        onAddSuggestion={() => { }}
                                        userId={user?.id}
                                        entryPoint={onboardingStep === ONBOARDING_QUICK_START ? 'quick_start' : onboardingStep === ONBOARDING_GUIDED_COMPLETE ? 'guided' : 'organic'}
                                        isDemo={isDemo}
                                        isResumed={state.isResumed}
                                        onConfirmExtraction={actions.handleConfirmExtraction}
                                        onUndoExtraction={actions.handleUndoExtraction}
                                    />
                                    <div className="p-4 bg-brand-indigo border-t border-white/5">
                                        {/* GlassBox toggle for demo users */}
                                        {isDemoMode && !isDesktopViewport && (
                                            <div className="flex justify-end mb-2">
                                                <button
                                                    onClick={() => {
                                                        // Merge real AI metadata with chat context
                                                        const realMeta = getLastAIMeta();
                                                        setGlassBoxMeta({
                                                            ...realMeta,
                                                            action: 'chat',
                                                            userMessage: state.messages.filter(m => m.sender === 'user').pop()?.text,
                                                            provider: realMeta?.provider || 'Groq 70B',
                                                            fallback_chain: realMeta?.attempted,
                                                        });
                                                        toggleEngineerView();
                                                    }}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 border ${isEngineerViewOpen
                                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                                        : 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 text-emerald-100 border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:-translate-y-0.5'
                                                        }`}
                                                >
                                                    <Brain className={`w-4 h-4 ${!isEngineerViewOpen && 'animate-pulse text-emerald-300'}`} />
                                                    <span>{isEngineerViewOpen ? 'Close Glass Box' : 'Open Glass Box'}</span>
                                                    <span className="text-[10px] font-normal opacity-70 ml-1 bg-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Demo
                                                    </span>
                                                </button>
                                            </div>
                                        )}
                                        <ChatInputBar
                                            onSendMessage={handleSendMessageWithTracking}
                                            isLoading={state.isChatLoading}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Habits View */}
                            {view === 'habits' && (
                                <motion.div
                                    key="habits"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <HabitsView
                                        habits={state.habits}
                                        todaysLogs={state.habitLogs}
                                        onToggle={actions.handleToggleHabit}
                                        onEdit={(habit) => setHabitToEdit(habit)}
                                        onDelete={(habitId) => actions.handleDeleteHabit(habitId)}
                                        activeFrequency={activeHabitFrequency}
                                        onFrequencyChange={setActiveHabitFrequency}
                                        onAddHabit={actions.handleAddHabit}
                                    />
                                    <HabitsInputBar
                                        onAddHabit={actions.handleAddHabit}
                                        activeFrequency={activeHabitFrequency}
                                        isLoading={state.isAddingHabit}
                                    />
                                </motion.div>
                            )}

                            {/* Intentions View */}
                            {view === 'goals' && (
                                <motion.div
                                    key="intentions"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <IntentionsView
                                        intentions={state.intentions}
                                        onToggleIntention={actions.handleToggleIntention}
                                        onDeleteIntention={(id) => actions.handleDeleteIntention(id)}
                                        onEditIntention={(intention) => setIntentionToEdit(intention)}
                                        isLoading={!state.isDataLoaded}
                                    />
                                    <IntentionsInputBar onAddIntention={actions.handleAddIntention} />
                                </motion.div>
                            )}

                            {/* Insights View */}
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
                                        entries={state.entries}
                                        intentions={state.intentions}
                                        reflections={state.reflections}
                                        habits={state.habits}
                                        habitLogs={state.habitLogs}
                                        onGenerateDaily={async (date, dayEntries) => {
                                            actions.setIsGeneratingReflection(date);
                                            const targetDate = parseISO(date);
                                            const dayIntentions = state.intentions.filter(i =>
                                                i.status === 'pending' ||
                                                (i.completed_at && isSameDay(parseISO(i.completed_at), targetDate))
                                            );
                                            const dayHabitLogs = state.habitLogs.filter(l =>
                                                isSameDay(parseISO(l.completed_at), targetDate)
                                            );

                                            const res = await reflections.generateReflection(dayEntries, dayIntentions, state.habits, dayHabitLogs, date);

                                            if (res) {
                                                const newReflection: Reflection = {
                                                    ...res,
                                                    id: `reflection-${Date.now()}`,
                                                    user_id: user!.id,
                                                    type: 'daily',
                                                    date: date,
                                                    timestamp: new Date().toISOString(),
                                                    auto_generated: true
                                                };

                                                const saved = await db.addReflection(user!.id, newReflection);
                                                if (saved) {
                                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === date && r.type === 'daily')), saved]);
                                                }
                                            }
                                            actions.setIsGeneratingReflection(null);
                                        }}
                                        onGenerateWeekly={async (weekId, weekEntries) => {
                                            actions.setIsGeneratingReflection(weekId);
                                            const { getWeekDateRange, isWithinRange } = await import('./utils/date');
                                            const weekRange = getWeekDateRange(weekId);
                                            const weekIntentions = state.intentions.filter(i => {
                                                const createdAt = new Date(i.created_at);
                                                const completedAt = i.completed_at ? new Date(i.completed_at) : null;
                                                return i.status === 'pending' || isWithinRange(createdAt, weekRange) || (completedAt && isWithinRange(completedAt, weekRange));
                                            });
                                            const weekHabitLogs = state.habitLogs.filter(l => isWithinRange(new Date(l.completed_at), weekRange));

                                            const res = await reflections.generateWeeklyReflection(weekEntries, weekIntentions, state.habits, weekHabitLogs, 7);

                                            if (res) {
                                                const newReflection: Reflection = {
                                                    ...res,
                                                    id: `reflection-${Date.now()}`,
                                                    user_id: user!.id,
                                                    type: 'weekly',
                                                    date: weekId,
                                                    timestamp: new Date().toISOString(),
                                                    auto_generated: true
                                                };

                                                const saved = await db.addReflection(user!.id, newReflection);
                                                if (saved) {
                                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === weekId && r.type === 'weekly')), saved]);
                                                }
                                            }
                                            actions.setIsGeneratingReflection(null);
                                        }}
                                        onGenerateMonthly={async (monthId, monthEntries) => {
                                            actions.setIsGeneratingReflection(monthId);
                                            const { getMonthDateRange, isWithinRange } = await import('./utils/date');
                                            const monthRange = getMonthDateRange(monthId);
                                            const daysInMonth = Math.ceil((monthRange.end.getTime() - monthRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                                            const monthIntentions = state.intentions.filter(i => {
                                                const createdAt = new Date(i.created_at);
                                                const completedAt = i.completed_at ? new Date(i.completed_at) : null;
                                                return i.status === 'pending' || isWithinRange(createdAt, monthRange) || (completedAt && isWithinRange(completedAt, monthRange));
                                            });
                                            const monthHabitLogs = state.habitLogs.filter(l => isWithinRange(new Date(l.completed_at), monthRange));

                                            const res = await reflections.generateMonthlyReflection(monthEntries, monthIntentions, state.habits, monthHabitLogs, daysInMonth);

                                            if (res) {
                                                const newReflection: Reflection = {
                                                    ...res,
                                                    id: `reflection-${Date.now()}`,
                                                    user_id: user!.id,
                                                    type: 'monthly',
                                                    date: monthId,
                                                    timestamp: new Date().toISOString(),
                                                    auto_generated: true
                                                };

                                                const saved = await db.addReflection(user!.id, newReflection);
                                                if (saved) {
                                                    actions.setReflections(prev => [...prev.filter(r => !(r.date === monthId && r.type === 'monthly')), saved]);
                                                }
                                            }
                                            actions.setIsGeneratingReflection(null);
                                        }}

                                        onExploreInChat={(summary) => {
                                            setView('chat');
                                            handleSendMessageWithTracking(`I'd like to explore this reflection: "${summary}"`);
                                        }}
                                        isGenerating={state.isGeneratingReflection}
                                        onAddSuggestion={(s) => actions.handleAddIntention(s.text, null, false)}
                                        aiStatus={state.aiStatus}
                                        onDebug={() => { }}
                                        debugOutput={null}
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
                                        accountCreatedAt={state.accountCreatedAt}
                                        correlationInsight={state.correlationInsight}
                                        onDismissCorrelation={actions.handleDismissCorrelation}
                                    />
                                </motion.div>
                            )}

                            {/* Settings View */}
                            {view === 'settings' && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="absolute inset-0 overflow-y-auto z-30 bg-brand-indigo"
                                >
                                    <SettingsView onBack={() => setView('stream')} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>

                    {/* DOCKED GLASS BOX (Desktop Only — 540px animated panel) */}
                    <AnimatePresence>
                        {showDocked && (
                            <motion.div
                                key="glassbox-docked"
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 540, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="flex-shrink-0 h-full overflow-hidden relative z-20"
                                style={{ minWidth: 0 }}
                            >
                                <GlassBox
                                    isOpen={true}
                                    onClose={toggleEngineerView}
                                    meta={glassBoxMeta}
                                    isProcessing={state.isChatLoading}
                                    entries={state.entries}
                                    mode="docked"
                                    queryId={state.queryId}
                                    lastAIResponse={lastAIResponse}
                                    currentUserMessage={currentUserMessage}
                                    messages={state.messages}
                                    onSelectSuggestion={handleSendMessageWithTracking}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* NavBar */}
                {view !== 'settings' && (
                    <NavBar
                        activeView={view}
                        onViewChange={(newView) => {
                            if (newView === 'insights' && !hasVisitedInsights) setHasVisitedInsights(true);
                            setView(newView);
                        }}
                        entryCount={realEntryCount}
                        showInsightsBadge={insightsUnlocked && !hasVisitedInsights}
                    />
                )}

                {/* Modals */}
                {showSearchModal && <SearchModal entries={state.entries} reflections={state.reflections} onClose={() => setShowSearchModal(false)} />}
                {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} />}
                {state.toast && <Toast message={state.toast.message} onDismiss={() => actions.setToast(null)} />}
                {entryToDelete && <DeleteConfirmationModal onConfirm={() => { actions.handleDeleteEntry(entryToDelete); setEntryToDelete(null); }} onCancel={() => setEntryToDelete(null)} />}
                {entryToEdit && <EditEntryModal entry={entryToEdit} onSave={async (txt) => { await actions.handleEditEntry(entryToEdit, txt); setEntryToEdit(null); }} onCancel={() => setEntryToEdit(null)} />}
                {habitToEdit && <EditHabitModal habit={habitToEdit} onSave={async (name, emoji, category) => { await actions.handleEditHabit(habitToEdit.id, name, emoji, category); setHabitToEdit(null); }} onCancel={() => setHabitToEdit(null)} />}
                {intentionToEdit && <EditIntentionModal intention={intentionToEdit} onSave={async (updates) => { await db.updateIntention(intentionToEdit.id, updates); actions.setIntentions(state.intentions.map(i => i.id === intentionToEdit.id ? { ...i, ...updates } : i)); setIntentionToEdit(null); }} onCancel={() => setIntentionToEdit(null)} />}
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

                {/* Insight Modal for Quick Start users */}
                <InsightModal
                    isOpen={!!state.pendingInsight}
                    insight={state.pendingInsight?.insight || ''}
                    followUpQuestion={state.pendingInsight?.followUpQuestion || ''}
                    suggestedHabit={state.pendingInsight?.suggestedHabit}
                    suggestedIntention={state.pendingInsight?.suggestedIntention}
                    onTrackHabit={() => {
                        const isFirstAction = !hasSeenFirstInsight;
                        setHasSeenFirstInsight(true);
                        actions.setPendingInsight(null);
                        setView('habits');
                        if (user) {
                            db.logEvent(user.id, 'insight_modal_action', { action: 'habit' });
                            if (isFirstAction) db.logEvent(user.id, 'first_action_taken', { type: 'habit' });
                        }
                        if (state.pendingInsight?.suggestedHabit) {
                            actions.handleAddHabit(state.pendingInsight.suggestedHabit.name, 'daily');
                            actions.setToast({ message: `Added habit: ${state.pendingInsight.suggestedHabit.emoji} ${state.pendingInsight.suggestedHabit.name}`, id: Date.now() });
                        }
                    }}
                    onSetGoal={() => {
                        const isFirstAction = !hasSeenFirstInsight;
                        setHasSeenFirstInsight(true);
                        actions.setPendingInsight(null);
                        setView('goals');
                        if (user) {
                            db.logEvent(user.id, 'insight_modal_action', { action: 'goal' });
                            if (isFirstAction) db.logEvent(user.id, 'first_action_taken', { type: 'goal' });
                        }
                        if (state.pendingInsight?.suggestedIntention) {
                            actions.handleAddIntention(state.pendingInsight.suggestedIntention, null, false);
                            actions.setToast({ message: 'Goal added!', id: Date.now() });
                        }
                    }}
                    onExploreChat={() => {
                        const isFirstAction = !hasSeenFirstInsight;
                        setHasSeenFirstInsight(true);
                        const insight = state.pendingInsight?.insight || '';
                        const followUp = state.pendingInsight?.followUpQuestion || '';
                        actions.setPendingInsight(null);
                        setView('chat');
                        if (user) {
                            db.logEvent(user.id, 'insight_modal_action', { action: 'chat' });
                            if (isFirstAction) db.logEvent(user.id, 'first_action_taken', { type: 'chat' });
                        }
                        if (insight && followUp) {
                            actions.setMessages(prev => [
                                ...prev,
                                { sender: 'ai', text: `"${insight}"\n\n${followUp}` }
                            ]);
                        }
                    }}
                    onDismiss={() => {
                        setHasSeenFirstInsight(true);
                        actions.setPendingInsight(null);
                        if (user) db.logEvent(user.id, 'insight_modal_action', { action: 'dismiss' });
                    }}
                />

                {/* Reflection Unlock Celebration Modal */}
                <AnimatePresence>
                    {pendingUnlockType && (
                        <ReflectionUnlockModal
                            type={pendingUnlockType}
                            onNavigate={handleReflectionUnlockNavigate}
                            onDismiss={handleReflectionUnlockDismiss}
                        />
                    )}
                </AnimatePresence>

                {/* FTUE Guided Tour */}
                <FTUETour
                    isActive={ftue.isActive}
                    currentStep={ftue.currentStep}
                    onNext={ftue.nextStep}
                    onBack={ftue.prevStep}
                    onSkip={ftue.skipTour}
                    onComplete={ftue.completeTour}
                    onNavigate={(tab) => setView(tab)}
                />

                {/* DEMO LIMIT MODAL */}
                <DemoLimitModal
                    isOpen={state.showDemoLimitModal}
                    onClose={() => actions.setShowDemoLimitModal(false)}
                />

                {/* DEMO WELCOME MODAL */}
                <DemoWelcomeModal
                    isOpen={showDemoWelcome}
                    onClose={() => {
                        setHasSeenDemoWelcome(true);
                        setShowDemoWelcome(false);
                    }}
                    onExploreChat={() => {
                        setHasSeenDemoWelcome(true);
                        setShowDemoWelcome(false);
                        setView('chat');
                    }}
                />

                {/* MOBILE GLASS BOX — floating pill + bottom sheet */}
                {isDemoMode && !isDesktopViewport && isEngineerViewOpen && (
                    <MobilePipelineButton
                        meta={glassBoxMeta}
                        isProcessing={state.isChatLoading}
                        evalScores={null}
                        onOpen={toggleEngineerView}
                        isOpen={showModal}
                        onClose={toggleEngineerView}
                        queryId={state.queryId}
                        lastAIResponse={lastAIResponse}
                        currentUserMessage={currentUserMessage}
                    />
                )}

                {/* MOBILE/TABLET GLASS BOX MODAL (Overlay) */}
                {showModal && (
                    <GlassBox
                        isOpen={true}
                        onClose={toggleEngineerView}
                        meta={glassBoxMeta}
                        isProcessing={state.isChatLoading}
                        entries={state.entries}
                        mode="modal"
                        queryId={state.queryId}
                        lastAIResponse={lastAIResponse}
                        currentUserMessage={currentUserMessage}
                        messages={state.messages}
                        onSelectSuggestion={handleSendMessageWithTracking}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
};
