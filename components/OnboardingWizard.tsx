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

interface OnboardingWizardProps {
  userId: string;
  onComplete: (destination: 'stream' | 'chat', initialContext?: string, aiQuestion?: string) => void;
}

type Step = 'sanctuary' | 'spark' | 'container' | 'friction' | 'elaboration' | 'processing' | 'awe';
type Sentiment = 'Anxious' | 'Excited' | 'Overwhelmed' | 'Calm' | 'Tired' | 'Inspired' | 'Frustrated' | 'Grateful';
type LifeArea = 'Work' | 'Relationships' | 'Health' | 'Self' | 'Finance';

const sentiments: Sentiment[] = [
  'Anxious', 'Excited', 'Overwhelmed', 'Calm',
  'Tired', 'Inspired', 'Frustrated', 'Grateful'
];

// Updated to Radial Gradients for Spotlight Effect
const sentimentGradients: Record<Sentiment, string> = {
  Anxious: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-orange-950',
  Excited: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900 via-teal-950 to-yellow-900',
  Overwhelmed: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-purple-950',
  Calm: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-blue-950 to-emerald-950',
  Tired: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-800 to-gray-950',
  Inspired: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-800 via-violet-900 to-fuchsia-950',
  Frustrated: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-red-950 to-zinc-950',
  Grateful: 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900 via-amber-950 to-yellow-950',
};

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

// Voice Recognition Setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = false; 
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState<Step>('sanctuary');
  const [selectedSentiment, setSelectedSentiment] = useState<Sentiment | null>(null);
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [elaboration, setElaboration] = useState('');
  const [insight, setInsight] = useState<InstantInsight | null>(null);
  
  // Enhancements
  const [isListening, setIsListening] = useState(false);
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
      const steps = [
        `Connecting '${selectedArea}' context...`,
        `Analyzing '${selectedTrigger}' patterns...`,
        "Formulating perspective shift...",
        "Almost there..."
      ];
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

  // Fixed Logic Gap: Checks sentiment valence
  const getPromptPlaceholder = () => {
      if (!selectedTrigger || !selectedSentiment) return "I'm thinking about...";
      
      const isPositive = ['Excited', 'Calm', 'Inspired', 'Grateful', 'Joyful', 'Hopeful', 'Proud', 'Content'].includes(selectedSentiment);
      
      // Base Prompts map
      const negativePrompts: Record<string, string> = {
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

      const positivePrompts: Record<string, string> = {
        'Imposter Syndrome': "How did you overcome that doubt today?",
        'Burnout': "How are you finding balance today?",
        'Deadlines': "What progress are you celebrating?",
        'Conflict': "How did you handle that situation well?",
        'Misunderstanding': "How did you find clarity?",
        'Boundaries': "How did protecting your energy help you?",
        'Fatigue': "How are you prioritizing your rest?",
        'Purpose': "What reinforced your sense of purpose today?",
        'Debt': "What positive step did you take for your finances?",
        'Self-Worth': "What reinforced your value today?"
      };

      const map = isPositive ? positivePrompts : negativePrompts;
      
      if (map[selectedTrigger]) return map[selectedTrigger];

      // Fallback dynamic generation
      return isPositive 
        ? `How is ${selectedTrigger} supporting your ${selectedSentiment} feeling?`
        : `How is ${selectedTrigger} causing you to feel ${selectedSentiment}?`;
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

      await db.addEntry(userId, {
        ...aiEntryData,
        tags: enhancedTags,
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

  const bgClass = selectedSentiment 
    ? sentimentGradients[selectedSentiment] 
    : 'bg-brand-indigo';

  return (
    <div className={`h-screen w-screen transition-colors duration-1000 ease-in-out ${bgClass} flex flex-col items-center justify-center p-6 overflow-hidden relative`}>
      
      {/* Step 1: Sanctuary */}
      {step === 'sanctuary' && (
        <div className="text-center animate-fade-in flex flex-col items-center relative z-10">
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
                className="py-4 px-6 rounded-xl bg-dark-surface/50 hover:bg-white/10 border border-white/5 hover:border-brand-teal/50 text-white font-medium transition-all duration-200 hover:-translate-y-1 backdrop-blur-sm"
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
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
            Where is this feeling living right now?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl w-full">
            {lifeAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => handleAreaSelect(area.id)}
                className="flex items-center gap-4 py-6 px-8 rounded-xl bg-dark-surface/50 hover:bg-white/10 border border-white/5 hover:border-brand-teal/50 text-white font-medium transition-all duration-200 hover:-translate-y-1 text-left backdrop-blur-sm"
              >
                <span className="text-3xl">{area.icon}</span>
                <span className="text-lg">{area.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Friction */}
      {step === 'friction' && selectedArea && (
        <div className="flex flex-col items-center w-full animate-fade-in relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold font-display text-white mb-8 text-center">
             What specific theme is weighing on you?
          </h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl w-full">
            {triggers[selectedArea].map((trigger) => (
              <button
                key={trigger}
                onClick={() => handleTriggerSelect(trigger)}
                className="py-3 px-6 rounded-full bg-dark-surface/50 hover:bg-brand-teal/20 border border-white/5 hover:border-brand-teal text-white text-lg transition-all duration-200 hover:-translate-y-1 backdrop-blur-sm"
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
              <div className="flex items-center gap-2 mb-6 text-sm text-brand-teal/80 font-mono uppercase tracking-widest bg-dark-surface/30 px-3 py-1 rounded-full backdrop-blur-sm">
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
                      className="w-full h-40 bg-dark-surface/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-white text-lg placeholder-gray-400 focus:ring-2 focus:ring-brand-teal focus:outline-none resize-none transition-all"
                      autoFocus
                  />
                  <button 
                      onClick={toggleListening}
                      className={`absolute bottom-4 right-4 p-3 rounded-full transition-all duration-500 ${
                        isListening 
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
              
              <div className="mt-8 flex justify-between items-center w-full">
                  <span className={`text-sm font-medium transition-colors ${elaboration.length < 10 ? 'text-white/50' : 'text-brand-teal'}`}>
                      {elaboration.length < 10 ? 'Just one sentence is enough...' : 'Ready to analyze'}
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

      {/* Step 7: Awe (Typewriter Reveal) */}
      {step === 'awe' && insight && (
        <div className="max-w-md w-full bg-dark-surface/30 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl animate-fade-in-up relative z-10">
            <div className="flex items-center gap-3 mb-6">
                <SparklesIcon className="w-6 h-6 text-brand-teal animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-brand-teal">Instant Insight</h3>
            </div>
            
            <p className="text-xl md:text-2xl text-white font-display leading-relaxed mb-8 min-h-[100px]">
                "{displayedInsight}"<span className="animate-pulse text-brand-teal">|</span>
            </p>
            
            {displayedInsight.length === insight.insight.length && (
                <div className="flex flex-col gap-3 animate-fade-in">
                    <button
                        onClick={() => onComplete('chat', elaboration, insight.followUpQuestion)}
                        className="w-full flex items-center justify-center gap-2 bg-brand-teal text-brand-indigo font-bold py-4 rounded-xl hover:bg-teal-300 transition-all shadow-lg"
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
            )}
        </div>
      )}

    </div>
  );
};
