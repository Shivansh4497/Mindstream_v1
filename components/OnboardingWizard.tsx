
import React, { useState } from 'react';
import { LockIcon } from './icons/LockIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';
import * as gemini from '../services/geminiService';
import * as db from '../services/dbService';
import type { InstantInsight } from '../types';

interface OnboardingWizardProps {
  userId: string;
  onComplete: (destination: 'stream' | 'chat', initialContext?: string) => void;
}

type Step = 'sanctuary' | 'spark' | 'container' | 'friction' | 'elaboration' | 'processing' | 'awe';
type Sentiment = 'Anxious' | 'Excited' | 'Overwhelmed' | 'Calm' | 'Tired' | 'Inspired' | 'Frustrated' | 'Grateful';
type LifeArea = 'Work' | 'Relationships' | 'Health' | 'Self' | 'Finance';

const sentiments: Sentiment[] = [
  'Anxious', 'Excited', 'Overwhelmed', 'Calm',
  'Tired', 'Inspired', 'Frustrated', 'Grateful'
];

const lifeAreas: { id: LifeArea; label: string; icon: string }[] = [
  { id: 'Work', label: 'Work / Career', icon: '💼' },
  { id: 'Relationships', label: 'Relationships', icon: '❤️' },
  { id: 'Health', label: 'Health & Body', icon: '🌱' },
  { id: 'Self', label: 'Self & Identity', icon: '🧘' },
  { id: 'Finance', label: 'Money', icon: '💰' },
];

const triggers: Record<LifeArea, string[]> = {
  Work: ['Deadlines', 'Conflict', 'Burnout', 'Imposter Syndrome', 'Boredom'],
  Relationships: ['Misunderstanding', 'Distance', 'Boundaries', 'Loneliness', 'Trust'],
  Health: ['Fatigue', 'Sleep', 'Diet', 'Body Image', 'Pain'],
  Self: ['Purpose', 'Motivation', 'Self-Worth', 'Regret', 'Growth'],
  Finance: ['Debt', 'Budgeting', 'Spending', 'Future Security', 'Income'],
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<Step>('sanctuary');
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [elaboration, setElaboration] = useState('');
  const [insight, setInsight] = useState<InstantInsight | null>(null);

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

  const getPromptPlaceholder = () => {
      if (!selectedTrigger) return "I'm thinking about...";
      
      const prompts: Record<string, string> = {
        'Imposter Syndrome': "What is one specific task making you doubt yourself?",
        'Burnout': "What specifically is draining your energy right now?",
        'Deadlines': "Which deliverable is weighing on you the most?",
        'Conflict': "What happened that caused this tension?",
        'Misunderstanding': "What do you wish they understood?",
        'Boundaries': "Where do you feel your limits were crossed?",
        'Fatigue': "What is stopping you from resting?",
        'Purpose': "What feels meaningless right now?",
        'Debt': "What specific financial worry is on your mind?",
      };
      
      return prompts[selectedTrigger] || `What is the specific context regarding ${selectedTrigger}?`;
  };

  const handleAnalyze = async () => {
    if (!selectedSentiment || !selectedArea || !selectedTrigger || !elaboration.trim()) return;
    
    setStep('processing');
    
    try {
      // 1. Generate Insight with HIGH RESOLUTION context
      const insightData = await gemini.generateInstantInsight(
          elaboration, 
          selectedSentiment, 
          selectedArea, 
          selectedTrigger
      );
      setInsight(insightData);

      // 2. Save the entry to DB
      // We use the same high-res context to tag the entry automatically.
      const aiEntryData = await gemini.processEntry(elaboration);
      
      // Combine AI tags with our Drill-Down context tags
      const enhancedTags = [
          ...(aiEntryData.tags || []), 
          selectedArea, 
          selectedTrigger
      ];

      await db.addEntry(userId, {
        ...aiEntryData,
        tags: enhancedTags, // Override with enhanced tags
        text: elaboration,
        timestamp: new Date().toISOString(),
        primary_sentiment: selectedSentiment as any,
      });

      setStep('awe');
    } catch (error) {
      console.error("Onboarding error:", error);
      setInsight({
        insight: "Your feelings are valid. Taking the time to write them down is the first step towards clarity.",
        followUpQuestion: "What is one small step you can take today?"
      });
      setStep('awe');
    }
  };

  // Step 1: The Sanctuary (Privacy)
  if (step === 'sanctuary') {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="bg-dark-surface p-4 rounded-full mb-6 animate-pulse-ring">
          <LockIcon className="w-12 h-12 text-brand-teal" />
        </div>
        <h1 className="text-3xl font-bold font-display text-white mb-4">Your Private Sanctuary</h1>
        <p className="text-gray-300 max-w-md mb-12 text-lg leading-relaxed">
          Mindstream is an encrypted space for your unfiltered mind. 
          What you write here is seen only by you.
        </p>
        <button
          onClick={handleEnterSanctuary}
          className="group relative inline-flex items-center gap-3 bg-brand-teal text-brand-indigo font-bold py-4 px-8 rounded-full hover:bg-teal-300 transition-all duration-300 shadow-lg hover:shadow-brand-teal/20 hover:-translate-y-1"
        >
          <span>Enter Sanctuary</span>
          <ArrowRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    );
  }

  // Step 2: The Spark (Sentiment Selection)
  if (step === 'spark') {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
          Let's calibrate. How are you feeling right now?
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl w-full">
          {sentiments.map((sentiment) => (
            <button
              key={sentiment}
              onClick={() => handleSentimentSelect(sentiment)}
              className="py-4 px-6 rounded-xl bg-dark-surface hover:bg-white/10 border border-white/5 hover:border-brand-teal/50 text-white font-medium transition-all duration-200 hover:-translate-y-1"
            >
              {sentiment}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: The Container (Life Area)
  if (step === 'container') {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
          Where is this feeling living right now?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
          {lifeAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => handleAreaSelect(area.id)}
              className="flex items-center gap-4 py-6 px-8 rounded-xl bg-dark-surface hover:bg-white/10 border border-white/5 hover:border-brand-teal/50 text-white font-medium transition-all duration-200 hover:-translate-y-1 text-left"
            >
              <span className="text-3xl">{area.icon}</span>
              <span className="text-lg">{area.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 4: The Friction (Trigger)
  if (step === 'friction' && selectedArea) {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6 animate-fade-in">
        <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
           What specific theme is weighing on you?
        </h2>
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
          {triggers[selectedArea].map((trigger) => (
            <button
              key={trigger}
              onClick={() => handleTriggerSelect(trigger)}
              className="py-3 px-6 rounded-full bg-dark-surface hover:bg-brand-teal/20 border border-white/5 hover:border-brand-teal text-white text-lg transition-all duration-200 hover:-translate-y-1"
            >
              {trigger}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 5: The Elaboration (Context)
  if (step === 'elaboration') {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 transition-colors duration-1000 ${selectedSentiment === 'Anxious' ? 'bg-slate-900' : 'bg-brand-indigo'}`}>
        <div className="max-w-xl w-full animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4 text-sm text-brand-teal/80 font-mono uppercase tracking-widest">
                 <span>{selectedSentiment}</span>
                 <span>•</span>
                 <span>{selectedArea}</span>
                 <span>•</span>
                 <span>{selectedTrigger}</span>
            </div>
            
            <h2 className="text-2xl font-bold font-display text-white mb-6">
               {getPromptPlaceholder()}
            </h2>
            
            <textarea
                value={elaboration}
                onChange={(e) => setElaboration(e.target.value)}
                placeholder="Type here..."
                className="w-full h-40 bg-dark-surface/50 border border-white/10 rounded-2xl p-6 text-white text-lg placeholder-gray-500 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none transition-all"
                autoFocus
            />
            
            <div className="mt-4 flex justify-between items-center">
                <span className={`text-sm ${elaboration.length < 10 ? 'text-gray-500' : 'text-brand-teal'}`}>
                    {elaboration.length < 10 ? 'Keep going...' : 'Ready to analyze'}
                </span>
                <button
                    onClick={handleAnalyze}
                    disabled={elaboration.length < 10}
                    className="bg-white text-brand-indigo font-bold py-3 px-8 rounded-full hover:bg-brand-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    Analyze
                </button>
            </div>
        </div>
      </div>
    );
  }

  // Step 6: Processing
  if (step === 'processing') {
    return (
      <div className="h-screen w-screen bg-brand-indigo flex flex-col items-center justify-center p-6">
         <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-brand-teal/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
            <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-brand-teal animate-pulse" />
         </div>
         <h2 className="text-xl font-bold text-white animate-pulse">Connecting patterns...</h2>
      </div>
    );
  }

  // Step 7: Awe (The Reveal)
  if (step === 'awe' && insight) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-indigo-900 to-brand-indigo flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="max-w-md w-full bg-dark-surface/40 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-6">
                <SparklesIcon className="w-6 h-6 text-brand-teal" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-teal">Instant Insight</h3>
            </div>
            
            <p className="text-xl md:text-2xl text-white font-display leading-relaxed mb-8">
                "{insight.insight}"
            </p>
            
            <div className="flex flex-col gap-3">
                <button
                    onClick={() => onComplete('chat', insight.followUpQuestion)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-teal text-brand-indigo font-bold py-4 rounded-xl hover:bg-teal-300 transition-all"
                >
                    <ChatBubbleIcon className="w-5 h-5" />
                    Unpack this with AI
                </button>
                <button
                    onClick={() => onComplete('stream')}
                    className="w-full text-gray-400 hover:text-white py-3 text-sm font-medium transition-colors"
                >
                    Go to my Stream
                </button>
            </div>
        </div>
      </div>
    );
  }

  return null;
};
