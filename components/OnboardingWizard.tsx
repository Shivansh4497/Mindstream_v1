
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

type Step = 'sanctuary' | 'spark' | 'elaboration' | 'processing' | 'awe';
type Sentiment = 'Anxious' | 'Excited' | 'Overwhelmed' | 'Calm' | 'Tired' | 'Inspired' | 'Frustrated' | 'Grateful';

const sentiments: Sentiment[] = [
  'Anxious', 'Excited', 'Overwhelmed', 'Calm',
  'Tired', 'Inspired', 'Frustrated', 'Grateful'
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<Step>('sanctuary');
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const [elaboration, setElaboration] = useState('');
  const [insight, setInsight] = useState<InstantInsight | null>(null);

  const handleEnterSanctuary = () => setStep('spark');
  
  const handleSentimentSelect = (sentiment: Sentiment) => {
    setSelectedSentiment(sentiment);
    setStep('elaboration');
  };

  const handleAnalyze = async () => {
    if (!selectedSentiment || !elaboration.trim()) return;
    
    setStep('processing');
    
    try {
      // 1. Generate Insight
      const insightData = await gemini.generateInstantInsight(elaboration, selectedSentiment);
      setInsight(insightData);

      // 2. Save the entry to DB
      const aiEntryData = await gemini.processEntry(elaboration);
      await db.addEntry(userId, {
        ...aiEntryData,
        text: elaboration,
        timestamp: new Date().toISOString(),
        primary_sentiment: selectedSentiment as any, // Ensure type compatibility or valid casting
      });

      setStep('awe');
    } catch (error) {
      console.error("Onboarding error:", error);
      // Fallback if AI fails
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

  // Step 3: The Elaboration (Context)
  if (step === 'elaboration') {
    return (
      <div className={`h-screen w-screen flex flex-col items-center justify-center p-6 transition-colors duration-1000 ${selectedSentiment === 'Anxious' ? 'bg-slate-900' : 'bg-brand-indigo'}`}>
        <div className="max-w-xl w-full animate-fade-in-up">
            <h2 className="text-2xl font-bold font-display text-white mb-2">
                You're feeling <span className="text-brand-teal">{selectedSentiment}</span>.
            </h2>
            <p className="text-gray-400 mb-6 text-lg">What is the main thing on your mind contributing to that?</p>
            
            <textarea
                value={elaboration}
                onChange={(e) => setElaboration(e.target.value)}
                placeholder="I'm thinking about..."
                className="w-full h-40 bg-dark-surface/50 border border-white/10 rounded-2xl p-6 text-white text-lg placeholder-gray-500 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none transition-all"
                autoFocus
            />
            
            <div className="mt-4 flex justify-between items-center">
                <span className={`text-sm ${elaboration.length < 15 ? 'text-gray-500' : 'text-brand-teal'}`}>
                    {elaboration.length < 15 ? 'Dig a little deeper... (min 15 chars)' : 'Ready to analyze'}
                </span>
                <button
                    onClick={handleAnalyze}
                    disabled={elaboration.length < 15}
                    className="bg-white text-brand-indigo font-bold py-3 px-8 rounded-full hover:bg-brand-teal transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                    Analyze
                </button>
            </div>
        </div>
      </div>
    );
  }

  // Step 4: Processing
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

  // Step 5: Awe (The Reveal)
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
