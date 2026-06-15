import React, { useState, useEffect, useRef } from 'react';
import { LockIcon } from './icons/LockIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import { MicIcon } from './icons/MicIcon';
import { FloatingBubbles } from './FloatingBubbles';
import * as gemini from '../services/geminiService';
import * as db from '../services/dbService';
import type { InstantInsight } from '../types';
import { PersonalitySelector } from './PersonalitySelector';
import { generateOnboardingSuggestions, OnboardingSuggestion } from '../services/onboardingSuggestions';
import { OnboardingSuggestionCard } from './OnboardingSuggestionCard';

interface OnboardingWizardProps {
  userId: string;
  onComplete: (destination: 'stream' | 'chat', initialContext?: string, aiQuestion?: string) => void;
}

type Step = 'splash' | 'sanctuary' | 'personality' | 'spark' | 'container' | 'friction' | 'elaboration' | 'processing' | 'awe';
type Sentiment = 'Anxious' | 'Excited' | 'Overwhelmed' | 'Calm' | 'Tired' | 'Inspired' | 'Frustrated' | 'Grateful';
type LifeArea = 'Work' | 'Relationships' | 'Health' | 'Self' | 'Finance';

const sentiments: Sentiment[] = [
  'Anxious', 'Excited', 'Overwhelmed', 'Calm',
  'Tired', 'Inspired', 'Frustrated', 'Grateful'
];

// Soft background glows to complement the dark-glassy theme
const sentimentGlows: Record<Sentiment, string> = {
  Anxious: 'bg-slate-500',
  Excited: 'bg-teal-500',
  Overwhelmed: 'bg-gray-500',
  Calm: 'bg-blue-500',
  Tired: 'bg-zinc-500',
  Inspired: 'bg-violet-500',
  Frustrated: 'bg-red-500',
  Grateful: 'bg-amber-500',
};

const lifeAreas: { id: LifeArea; label: string; icon: string }[] = [
  { id: 'Work', label: 'Work / Career', icon: '💼' },
  { id: 'Relationships', label: 'Relationships', icon: '❤️' },
  { id: 'Health', label: 'Health & Body', icon: '🌱' },
  { id: 'Self', label: 'Self & Identity', icon: '🧘' },
  { id: 'Finance', label: 'Money', icon: '💰' },
];

// Full 8x5 trigger matrix - each sentiment × life area has curated triggers
const triggers: Record<Sentiment, Record<LifeArea, string[]>> = {
  Anxious: {
    Work: ['Deadlines', 'Performance Review', 'Job Security', 'Overwhelming Tasks', 'Imposter Syndrome'],
    Relationships: ['Conflict', 'Miscommunication', 'Fear of Rejection', 'Trust Issues', 'Growing Apart'],
    Health: ['Health Worries', 'Sleep Problems', 'Panic Symptoms', 'Medical Concerns', 'Energy Drain'],
    Self: ['Self-Doubt', 'Future Uncertainty', 'Overthinking', 'Fear of Failure', 'Feeling Stuck'],
    Finance: ['Bills', 'Debt Stress', 'Income Uncertainty', 'Unexpected Expenses', 'Financial Security']
  },
  Excited: {
    Work: ['New Opportunity', 'Promotion', 'Creative Project', 'Recognition', 'Career Growth'],
    Relationships: ['New Connection', 'Deepening Bond', 'Quality Time', 'Shared Adventure', 'Love'],
    Health: ['Fitness Goals', 'New Routine', 'Energy Boost', 'Healthy Changes', 'Personal Best'],
    Self: ['New Beginning', 'Personal Growth', 'Creative Expression', 'Learning Journey', 'Self-Discovery'],
    Finance: ['Raise', 'Investment Win', 'Financial Goal', 'New Income', 'Big Purchase']
  },
  Overwhelmed: {
    Work: ['Too Many Tasks', 'Competing Priorities', 'No Boundaries', 'Constant Demands', 'Burnout Risk'],
    Relationships: ['Too Many Obligations', 'Emotional Drain', 'People Pleasing', 'No Me-Time', 'Feeling Spread Thin'],
    Health: ['No Time for Self-Care', 'Exhaustion', 'Stress Symptoms', 'Skipping Basics', 'Running on Empty'],
    Self: ['Lost Sense of Self', 'No Direction', 'Information Overload', 'Decision Fatigue', 'Scattered Focus'],
    Finance: ['Bills Piling Up', 'Budget Chaos', 'Multiple Debts', 'Financial Juggling', 'Money Stress']
  },
  Calm: {
    Work: ['Productive Flow', 'Clear Priorities', 'Work-Life Balance', 'Meaningful Progress', 'Team Harmony'],
    Relationships: ['Deep Connection', 'Peaceful Moments', 'Understanding', 'Gratitude for Others', 'Stable Ground'],
    Health: ['Mindfulness', 'Rest & Recovery', 'Body Awareness', 'Balanced Routine', 'Inner Peace'],
    Self: ['Clarity', 'Self-Acceptance', 'Present Moment', 'Content Reflection', 'Grounded Feeling'],
    Finance: ['Financial Stability', 'Savings Progress', 'Budget on Track', 'Peace of Mind', 'Secure Feeling']
  },
  Tired: {
    Work: ['Long Hours', 'Burnout', 'No Recovery Time', 'Monotonous Tasks', 'Pushing Through'],
    Relationships: ['No Energy for Others', 'Withdrawing', 'Feeling Distant', 'Neglecting Connections', 'Too Drained to Engage'],
    Health: ['Sleep Deficit', 'Physical Fatigue', 'Low Motivation', 'Body Signals', 'Running on Fumes'],
    Self: ['Mental Exhaustion', 'Loss of Interest', 'Going Through Motions', 'Need for Rest', 'Empty Tank'],
    Finance: ['Too Tired to Budget', 'Stress Spending', 'Financial Neglect', 'Autopilot Purchases', 'Money Worries Adding Up']
  },
  Inspired: {
    Work: ['Creative Vision', 'New Ideas', 'Purpose-Driven Work', 'Mentorship', 'Impact'],
    Relationships: ['Meaningful Conversations', 'Shared Dreams', 'Inspiring People', 'Collective Vision', 'Growing Together'],
    Health: ['Wellness Journey', 'Mind-Body Connection', 'Transformation', 'Peak Performance', 'Vibrant Energy'],
    Self: ['Life Purpose', 'Creative Flow', 'Spiritual Growth', 'Personal Mission', 'Limitless Potential'],
    Finance: ['Building Wealth', 'Financial Freedom', 'Entrepreneurial Spirit', 'Smart Investments', 'Abundance Mindset']
  },
  Frustrated: {
    Work: ['Blocked Progress', 'Unfair Treatment', 'Micromanagement', 'Lack of Recognition', 'Office Politics'],
    Relationships: ['Repeated Patterns', 'Feeling Unheard', 'Broken Promises', 'Unmet Expectations', 'Communication Walls'],
    Health: ['Slow Progress', 'Setbacks', 'Stubborn Symptoms', 'Discipline Struggles', 'Body Not Cooperating'],
    Self: ['Self-Sabotage', 'Stuck Patterns', 'Wasted Potential', 'Inner Critic', 'Lack of Progress'],
    Finance: ['Living Paycheck to Paycheck', 'Unexpected Setbacks', 'Goals Out of Reach', 'Unfair System', 'Falling Behind']
  },
  Grateful: {
    Work: ['Supportive Team', 'Meaningful Work', 'Growth Opportunities', 'Work Wins', 'Good Leadership'],
    Relationships: ['Loved Ones', 'Deep Friendships', 'Family Bonds', 'Acts of Kindness', 'Feeling Supported'],
    Health: ['Good Health', 'Capable Body', 'Energy', 'Recovery', 'Wellness Progress'],
    Self: ['Personal Growth', 'Lessons Learned', 'Inner Strength', 'Life Journey', 'Present Blessings'],
    Finance: ['Financial Progress', 'Having Enough', 'Opportunities', 'Security', 'Abundance']
  }
};

// Voice Recognition Setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

// Splash Step Component - The Clarity Loop Introduction (Circular Layout)
const SplashStep: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = React.useState<'logo' | 'loop' | 'tagline' | 'fade'>('logo');

  React.useEffect(() => {
    // Phase timing: logo (0.8s) → loop (1.5s) → tagline (1s) → fade (0.5s)
    const timers = [
      setTimeout(() => setPhase('loop'), 800),
      setTimeout(() => setPhase('tagline'), 2300),
      setTimeout(() => setPhase('fade'), 3300),
      setTimeout(() => onComplete(), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  // Pentagon positions (5 points evenly spaced around a circle)
  // Starting from top and going clockwise
  const radius = 110; // Distance from center
  const gapAngle = 20; // Gap in degrees where pills are (don't draw arc here)

  const loopSteps = [
    { label: 'Write', color: 'bg-brand-teal/30 text-brand-teal border-brand-teal/50', angle: -90, arcColor: '#2dd4bf' },
    { label: 'Notice', color: 'bg-violet-500/30 text-violet-400 border-violet-500/50', angle: -18, arcColor: '#a78bfa' },
    { label: 'Act', color: 'bg-amber-500/30 text-amber-400 border-amber-500/50', angle: 54, arcColor: '#fbbf24' },
    { label: 'Reflect', color: 'bg-blue-500/30 text-blue-400 border-blue-500/50', angle: 126, arcColor: '#60a5fa' },
    { label: 'Adjust', color: 'bg-emerald-500/30 text-emerald-400 border-emerald-500/50', angle: 198, arcColor: '#34d399' },
  ];

  // Calculate position from angle
  const getPosition = (angle: number, r: number = radius) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radians) * r,
      y: Math.sin(radians) * r,
    };
  };

  // Create arc path between two angles (avoiding the pill areas)
  const createArcPath = (startAngle: number, endAngle: number) => {
    // Add gap offset to avoid pills
    const adjustedStart = startAngle + gapAngle;
    let adjustedEnd = endAngle - gapAngle;

    // Handle wrap-around (from Adjust back to Write)
    if (adjustedEnd < adjustedStart) {
      adjustedEnd += 360;
    }

    const startRad = (adjustedStart * Math.PI) / 180;
    const endRad = (adjustedEnd * Math.PI) / 180;

    const x1 = Math.cos(startRad) * radius;
    const y1 = Math.sin(startRad) * radius;
    const x2 = Math.cos(endRad) * radius;
    const y2 = Math.sin(endRad) * radius;

    // Determine if arc should be large (> 180 degrees)
    const largeArc = (adjustedEnd - adjustedStart) > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  return (
    <div className={`flex flex-col items-center justify-center relative z-10 transition-opacity duration-500 ${phase === 'fade' ? 'opacity-0' : 'opacity-100'}`}>

      {/* Circular Container */}
      <div className="relative" style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}>

        {/* SVG for curved connecting arcs and arrows */}
        <svg
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ${phase === 'logo' ? 'opacity-0' : 'opacity-100'}`}
          viewBox={`${-radius - 40} ${-radius - 40} ${(radius + 40) * 2} ${(radius + 40) * 2}`}
        >
          {/* Arc segments between each pill */}
          {loopSteps.map((step, index) => {
            const nextStep = loopSteps[(index + 1) % loopSteps.length];
            const arcPath = createArcPath(step.angle, nextStep.angle);

            // Arrow position at midpoint of arc
            // Calculate the actual midpoint angle between the two pills
            let angleDiff = nextStep.angle - step.angle;
            if (angleDiff < 0) angleDiff += 360; // Handle wrap-around
            const midAngle = step.angle + angleDiff / 2;
            const arrowPos = getPosition(midAngle);

            // Arrow should point in the clockwise direction (tangent to circle)
            // The polygon "points" upward (0,-5), so to point clockwise we rotate by midAngle + 180
            // This makes the arrow tip point in the direction of travel
            const arrowRotation = midAngle + 180;

            return (
              <React.Fragment key={`arc-${index}`}>
                {/* Arc path */}
                <path
                  d={arcPath}
                  fill="none"
                  stroke={step.arcColor}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  className="opacity-40"
                  style={{
                    transitionDelay: `${index * 100}ms`,
                  }}
                />
                {/* Arrow head - pointing clockwise */}
                <polygon
                  points="0,-6 5,4 -5,4"
                  fill={step.arcColor}
                  transform={`translate(${arrowPos.x}, ${arrowPos.y}) rotate(${arrowRotation})`}
                  className="opacity-60"
                  style={{
                    transitionDelay: `${index * 100 + 200}ms`,
                  }}
                />
              </React.Fragment>
            );
          })}
        </svg>

        {/* Center: Mindstream Logo with pulse animation */}
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-700 ${phase === 'logo' ? 'scale-110' : 'scale-100'}`}
        >
          <div className={`relative ${phase !== 'logo' ? 'animate-pulse-slow' : ''}`}>
            {/* Glow effect */}
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-brand-teal/20 blur-xl animate-pulse" />
            <img
              src="/mindstream-logo.svg"
              alt="Mindstream"
              className="relative w-16 h-16 drop-shadow-[0_0_25px_rgba(45,212,191,0.6)]"
            />
          </div>
        </div>

        {/* Loop Steps positioned around the circle */}
        {loopSteps.map((step, index) => {
          const pos = getPosition(step.angle);
          return (
            <div
              key={step.label}
              className={`absolute left-1/2 top-1/2 transition-all duration-500`}
              style={{
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                transitionDelay: `${index * 100}ms`,
                opacity: phase !== 'logo' ? 1 : 0,
                scale: phase !== 'logo' ? '1' : '0.5',
              }}
            >
              <span
                className={`${step.color} px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap shadow-lg backdrop-blur-sm`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Tagline below the circle */}
      <p className={`text-center text-gray-400 text-sm mt-4 transition-all duration-500 ${phase === 'tagline' || phase === 'fade' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        Your Second Brain for Clarity
      </p>

      {/* Privacy note */}
      <div className={`mt-8 transition-all duration-500 ${phase === 'tagline' || phase === 'fade' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <span>🔒</span>
          <span>Private by design</span>
        </div>
      </div>
    </div>
  );
};


export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<Step>('splash');
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [elaboration, setElaboration] = useState('');
  const [insight, setInsight] = useState<InstantInsight | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);

  // Enhancements
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<{ habits: OnboardingSuggestion[], intentions: OnboardingSuggestion[] } | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<OnboardingSuggestion[]>([]);
  const [processingText, setProcessingText] = useState("Connecting patterns...");
  const [displayedInsight, setDisplayedInsight] = useState('');
  const [showMicPulse, setShowMicPulse] = useState(false);

  const recognitionRef = useRef(recognition);

  // Idle timer for Mic Pulse
  useEffect(() => {
    if (step === 'elaboration' && elaboration.length === 0 && !isListening) {
      const timer = setTimeout(() => setShowMicPulse(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowMicPulse(false);
    }
  }, [step, elaboration, isListening]);

  // Voice Logic
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setElaboration(prev => prev + (prev.length > 0 ? ' ' : '') + finalTranscript);
        setIsListening(false);
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Sorry, your browser doesn't support voice recognition.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Typewriter Effect Logic
  useEffect(() => {
    if (step === 'awe' && insight) {
      let i = 0;
      const text = insight.insight;
      setDisplayedInsight('');

      const interval = setInterval(() => {
        setDisplayedInsight(text.slice(0, i + 1));
        i++;
        if (i > text.length) clearInterval(interval);
      }, 30);

      return () => clearInterval(interval);
    }
  }, [step, insight]);

  // Processing Steps Logic
  useEffect(() => {
    if (step === 'processing') {
      const approvedMessages = [
        "Looking for patterns...",
        "Connecting relevant moments...",
        "Reflecting on what you've shared...",
        "Building your context...",
        "Finding meaningful connections...",
        "Understanding what matters most..."
      ];
      const steps = [...approvedMessages].sort(() => 0.5 - Math.random()).slice(0, 4);
      let i = 0;
      setProcessingText(steps[0]);

      const interval = setInterval(() => {
        i++;
        if (i < steps.length) {
          setProcessingText(steps[i]);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [step, selectedArea, selectedTrigger]);

  const handleEnterSanctuary = () => setStep('spark');

  const handleSentimentSelect = (sentiment: Sentiment) => {
    setSelectedSentiment(sentiment);
    setStep('container');
  };

  const handleAreaSelect = (area: LifeArea) => {
    setSelectedArea(area);
    setStep('friction');
  };

  const handleTriggerSelect = (trigger: string) => {
    setSelectedTrigger(trigger);
    setStep('elaboration');
  };

  // Fixed Logic Gap: Comprehensive Prompt Matrix
  const getPromptPlaceholder = () => {
    if (!selectedTrigger || !selectedSentiment) return "I'm thinking about...";

    const isPositive = ['Excited', 'Calm', 'Inspired', 'Grateful', 'Joyful', 'Hopeful', 'Proud', 'Content'].includes(selectedSentiment);

    const negativePrompts: Record<string, string> = {
      // Work
      'Deadlines': "Which deliverable is weighing on you the most?",
      'Conflict': "What happened that caused this tension?",
      'Burnout': "What specifically is draining your energy right now?",
      'Imposter Syndrome': "What is one specific task making you doubt yourself?",
      'Boredom': "What's missing that would make your work more engaging?",
      // Relationships
      'Misunderstanding': "What do you wish they understood?",
      'Distance': "Who are you missing right now, and why?",
      'Boundaries': "Where do you feel your limits were crossed?",
      'Loneliness': "What kind of connection are you craving?",
      'Trust': "What happened to shake your trust?",
      // Health
      'Fatigue': "What is stopping you from resting?",
      'Sleep': "What thoughts are keeping you awake?",
      'Diet': "What eating choices are troubling you lately?",
      'Body Image': "What negative thought is cycling in your mind?",
      'Pain': "Tell me about the discomfort you're experiencing.",
      // Self
      'Purpose': "What feels meaningless right now?",
      'Motivation': "What block is standing in your way?",
      'Self-Worth': "What is making you question your value?",
      'Regret': "What past action are you holding onto?",
      'Growth': "Where do you feel stuck in your journey?",
      // Finance
      'Debt': "What specific financial worry is on your mind?",
      'Budgeting': "Where is the stress coming from in your finances?",
      'Spending': "What purchase are you feeling unsure about?",
      'Future Security': "What 'what if' scenario is worrying you?",
      'Income': "How is your current income affecting your peace of mind?"
    };

    const positivePrompts: Record<string, string> = {
      // Work
      'Deadlines': "What progress are you celebrating?",
      'Conflict': "How did you handle that situation well?",
      'Burnout': "What's helping you recover and recharge?",
      'Imposter Syndrome': "How did you overcome that doubt today?",
      'Boredom': "What new interest is sparking your curiosity?",
      // Relationships
      'Misunderstanding': "How did you find clarity?",
      'Distance': "How are you bridging the gap today?",
      'Boundaries': "How did protecting your energy help you?",
      'Loneliness': "Who made you feel seen today?",
      'Trust': "What strengthened your trust today?",
      // Health
      'Fatigue': "What's helping you feel more energized?",
      'Sleep': "How is your energy feeling after resting?",
      'Diet': "How are you nourishing yourself today?",
      'Body Image': "What do you appreciate about your body right now?",
      'Pain': "What's bringing you comfort or relief?",
      // Self
      'Purpose': "What reinforced your sense of purpose today?",
      'Motivation': "What is fueling your drive right now?",
      'Self-Worth': "What reinforced your value today?",
      'Regret': "What lesson have you made peace with?",
      'Growth': "What small step forward did you take?",
      // Finance
      'Debt': "What progress are you making toward financial freedom?",
      'Budgeting': "How did you stay on track today?",
      'Spending': "What purchase brought you genuine value?",
      'Future Security': "What is making you feel secure right now?",
      'Income': "What are you grateful for regarding your resources?"
    };

    const map = isPositive ? positivePrompts : negativePrompts;

    if (map[selectedTrigger]) return map[selectedTrigger];

    // Fallback dynamic generation (Linguistically safe)
    return `Tell me more about your ${selectedSentiment} feelings regarding ${selectedTrigger}.`;
  };

  const handleAnalyze = async () => {
    if (!selectedSentiment || !selectedArea || !selectedTrigger || !elaboration.trim()) return;

    setStep('processing');

    try {
      const insightData = await gemini.generateInstantInsight(
        elaboration,
        selectedSentiment,
        selectedArea,
        selectedTrigger
      );
      setInsight(insightData);

      const aiEntryData = await gemini.processEntry(elaboration);
      const enhancedTags = [
        ...(aiEntryData.tags || []),
        selectedArea,
        selectedTrigger
      ];

      const entryText = elaboration; // Store elaboration for suggestions

      await db.addEntry(userId, {
        ...aiEntryData,
        tags: enhancedTags,
        text: elaboration,
        timestamp: new Date().toISOString(),
        primary_sentiment: selectedSentiment as any,
      });

      // Save onboarding context
      await db.saveOnboardingContext(userId, {
        sentiment: selectedSentiment,
        life_area: selectedArea,
        trigger: selectedTrigger,
        elaboration_summary: elaboration.substring(0, 300),
        personality_id: selectedPersonality ?? 'stoic',
      });

      // Skip straight to the insight moment (no suggestions step)
      setStep('awe');
    } catch (error) {
      console.error('Error saving entry:', error);
      setIsProcessing(false);
      setInsight({
        insight: "Your feelings are valid. Taking the time to write them down is the first step towards clarity.",
        followUpQuestion: "What is one small step you can take today?"
      });
      setStep('awe');
    }
  };

  const handleAcceptSuggestion = (suggestion: OnboardingSuggestion) => {
    setAcceptedSuggestions(prev => [...prev, suggestion]);
  };

  const handleRejectSuggestion = (suggestion: OnboardingSuggestion) => {
    // Just remove from UI if needed, or track rejections
  };

  const handleCompleteSuggestions = async () => {
    setIsProcessing(true);
    try {
      // Save accepted suggestions
      for (const s of acceptedSuggestions) {
        if (s.type === 'habit') {
          await db.addHabit(userId, s.name, s.emoji, s.category as any || 'System', s.frequency || 'daily');
        } else if (s.type === 'intention') {
          await db.addIntention(userId, s.name, s.timeframe || 'weekly');
        }
      }
      setStep('awe');
    } catch (error) {
      console.error('Error saving suggestions:', error);
      setStep('awe');
    } finally {
      setIsProcessing(false);
    }
  };

  const glowColor = selectedSentiment
    ? sentimentGlows[selectedSentiment]
    : 'bg-brand-teal';

  return (
    <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6 overflow-hidden relative">
      {/* Subtle background glow based on sentiment */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] opacity-10 transition-colors duration-1000 pointer-events-none ${glowColor}`} />

      {/* Persistent Logo Header */}
      <div className="absolute top-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-sm">
          <img src="/mindstream-logo.svg" alt="Mindstream" className="w-8 h-8" />
          <span className="text-white font-display font-bold text-lg">Mindstream</span>
        </div>
      </div>

      {/* Step 0: Splash - The Clarity Loop Introduction */}
      {step === 'splash' && (
        <SplashStep onComplete={() => setStep('sanctuary')} />
      )}

      {/* Step 1: Sanctuary */}
      {step === 'sanctuary' && (
        <div className="text-center animate-fade-in flex flex-col items-center relative z-10">
          <div className="bg-white/5 border border-white/10 p-4 rounded-full mb-6 animate-pulse-ring backdrop-blur-sm">
            <LockIcon className="w-12 h-12 text-brand-teal" />
          </div>
          <h1 className="text-3xl font-bold font-display text-white mb-4">Your Private Sanctuary</h1>
          <p className="text-gray-300 max-w-md mb-6 text-lg leading-relaxed">
            Mindstream is an encrypted space for your unfiltered mind.
            What you write here is seen only by you.
          </p>
          <p className="text-gray-500 text-sm max-w-sm mb-8">
            ✨ Mindstream helps organize your thoughts and generate insights.
            Your data never leaves our secure servers.
          </p>
          <button
            onClick={handleEnterSanctuary}
            className="group relative inline-flex items-center gap-3 bg-white/10 text-white font-bold py-4 px-8 rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg backdrop-blur-md hover:-translate-y-1"
          >
            <span>Enter Sanctuary</span>
            <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}

      {/* Step 1.5: Personality */}
      {step === 'personality' && (
        <div className="w-full max-w-6xl px-6 animate-fade-in relative z-10 h-full overflow-y-auto py-10 flex items-center justify-center">
          <PersonalitySelector onSelect={(id) => { setSelectedPersonality(id); setStep('spark'); }} />
        </div>
      )}

      {/* Step 2: Spark */}
      {step === 'spark' && (
        <div className="flex flex-col items-center w-full animate-fade-in relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
            Let's calibrate. How are you feeling right now?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full">
            {sentiments.map((sentiment) => (
              <button
                key={sentiment}
                onClick={() => handleSentimentSelect(sentiment)}
                className="py-4 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-medium transition-all duration-200 hover:-translate-y-1 backdrop-blur-sm shadow-sm"
              >
                {sentiment}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Container */}
      {step === 'container' && (
        <div className="flex flex-col items-center w-full animate-fade-in relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center animate-fade-in-up">
            What area of life is this affecting most?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
            {lifeAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => handleAreaSelect(area.id)}
                className="flex items-center gap-4 py-6 px-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-medium transition-all duration-200 hover:-translate-y-1 text-left backdrop-blur-sm shadow-sm"
              >
                <span className="text-3xl">{area.icon}</span>
                <span className="text-lg">{area.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Friction */}
      {step === 'friction' && selectedArea && selectedSentiment && (
        <div className="flex flex-col items-center w-full animate-fade-in relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
            {['Excited', 'Calm', 'Inspired', 'Grateful'].includes(selectedSentiment)
              ? "What's bringing you this feeling?"
              : "What's on your mind?"}
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
            {triggers[selectedSentiment][selectedArea].map((trigger) => (
              <button
                key={trigger}
                onClick={() => handleTriggerSelect(trigger)}
                className="py-3 px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white text-lg transition-all duration-200 hover:-translate-y-1 backdrop-blur-sm shadow-sm"
              >
                {trigger}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Elaboration (With Voice & Bubbles) */}
      {step === 'elaboration' && selectedSentiment && (
        <>
          <FloatingBubbles sentiment={selectedSentiment} visible={elaboration.length === 0 && !isListening} />

          <div className="max-w-xl w-full animate-fade-in-up flex flex-col items-center relative z-10">
            <div className="flex items-center gap-2 mb-6 text-sm text-white/70 font-mono uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md shadow-sm">
              <span>{selectedSentiment}</span>
              <span>•</span>
              <span>{selectedArea}</span>
              <span>•</span>
              <span>{selectedTrigger}</span>
            </div>

            <h2 className="text-2xl font-bold font-display text-white mb-6 text-center">
              {getPromptPlaceholder()}
            </h2>

            <div className="w-full relative">
              <textarea
                value={elaboration}
                onChange={(e) => setElaboration(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type here or tap the mic..."}
                className="w-full h-40 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none transition-all shadow-lg"
                autoFocus
              />
              <button
                onClick={toggleListening}
                className={`absolute bottom-4 right-4 p-3 rounded-full transition-all duration-500 ${isListening
                  ? 'bg-brand-teal text-brand-indigo shadow-[0_0_15px_rgba(44,229,195,0.5)] scale-110'
                  : showMicPulse
                    ? 'bg-white/20 text-white animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.3)]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                title="Use Voice Input"
              >
                <MicIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-8 flex flex-col w-full gap-6">
              <span className={`text-sm font-medium transition-colors text-center ${elaboration.length < 10 ? 'text-white/50' : 'text-brand-teal'}`}>
                {elaboration.length < 10 ? 'Just one sentence is enough...' : 'Ready to analyze'}
              </span>
              <div className="flex flex-col items-center w-full">
                <button
                  onClick={handleAnalyze}
                  disabled={elaboration.length < 10}
                  className="bg-white/10 text-white border border-white/20 font-bold py-3 px-8 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg backdrop-blur-md w-full max-w-[200px]"
                >
                  Find Patterns
                </button>
                <p className="text-gray-400 text-sm mt-3 text-center">
                  Share something that's been on your mind lately.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step 6: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center relative z-10">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-brand-teal/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-brand-teal animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white animate-pulse text-center min-h-[2rem] transition-all duration-300">
            {processingText}
          </h2>
        </div>
      )}

      {/* Step 7: Suggestions */}

      {/* Step 8: Awe (Typewriter Reveal) */}
      {step === 'awe' && insight && (
        <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-white/20 p-6 rounded-2xl shadow-2xl animate-fade-in-up relative z-10 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <SparklesIcon className="w-6 h-6 text-white/70 animate-pulse" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">Instant Insight</h3>
          </div>

          <p className="text-lg md:text-xl text-white font-display leading-relaxed mb-4">
            "{displayedInsight}"<span className="animate-pulse text-white/50">|</span>
          </p>

          {/* Why This Insight - Evidence for trust */}
          <p className="text-xs text-gray-500 italic mb-4 flex items-center gap-1">
            <span>💡</span>
            <span>Based on what you just shared</span>
          </p>

          {/* Follow-up Question */}
          {insight.followUpQuestion && displayedInsight.length === insight.insight.length && (
            <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/10 backdrop-blur-sm">
              <p className="text-sm text-gray-400 mb-1">Something to reflect on:</p>
              <p className="text-white/90 font-medium text-sm">{insight.followUpQuestion}</p>
            </div>
          )}

          {displayedInsight.length === insight.insight.length && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <button
                onClick={() => onComplete('chat', elaboration, insight.followUpQuestion)}
                className="group relative w-full flex items-center justify-center gap-3 bg-white/10 text-white font-bold py-4 rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg backdrop-blur-md"
              >
                <ChatBubbleIcon className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                Unpack this with Mindstream
              </button>
              <button
                onClick={() => onComplete('stream')}
                className="w-full text-gray-400 hover:text-white py-3 text-sm font-medium transition-colors"
              >
                Go to my Stream
              </button>
              
              <p className="mt-2 text-xs text-center text-gray-500 leading-relaxed px-2">
                The more you reflect, the better Mindstream understands what matters to you.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
