import React, { useState } from 'react';

interface FloatingBubblesProps {
  sentiment: string;
  visible: boolean;
}

const POSITIVE_EXAMPLES = [
  "I'm proud of sticking to my boundaries.",
  "A small win: I prioritized rest today.",
  "I felt deeply connected when...",
  "Grateful for the moment of calm.",
  "I'm learning to trust myself.",
  "Today I chose to be present.",
];

const NEGATIVE_EXAMPLES = [
  "I feel drained by the constant demands.",
  "Struggling to find motivation for...",
  "I'm worried about the outcome of...",
  "It's hard to balance everything right now.",
  "I feel unheard in my relationship.",
  "My energy is low because...",
];

const POSITIVE_SENTIMENTS = ['Excited', 'Calm', 'Inspired', 'Grateful', 'Joyful', 'Hopeful', 'Proud', 'Content'];

export const FloatingBubbles: React.FC<FloatingBubblesProps> = ({ sentiment, visible }) => {
  const isPositive = POSITIVE_SENTIMENTS.includes(sentiment);
  const examples = isPositive ? POSITIVE_EXAMPLES : NEGATIVE_EXAMPLES;
  
  // Generate stable bubbles with random positions
  const [bubbles] = useState(() => 
    examples.map((text, i) => ({
      id: i,
      text,
      top: `${10 + Math.random() * 70}%`,
      left: `${5 + Math.random() * 80}%`,
      animationDelay: `${Math.random() * 5}s`,
      duration: `${15 + Math.random() * 10}s`
    }))
  );

  return (
    <div 
      className={`absolute inset-0 overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {bubbles.map((b) => (
        <div
          key={b.id}
          className="absolute bg-white/5 backdrop-blur-[1px] px-4 py-2 rounded-full text-white/20 text-sm font-medium whitespace-nowrap select-none"
          style={{
            top: b.top,
            left: b.left,
            animation: `float ${b.duration} ease-in-out infinite`,
            animationDelay: b.animationDelay,
          }}
        >
          {b.text}
        </div>
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translate(0, 0); }
          50% { transform: translate(-15px, -25px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
};
