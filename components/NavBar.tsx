
import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatIcon } from './icons/ChatIcon';
import { IntentionsIcon } from './icons/IntentionsIcon';
import { RepeatIcon } from './icons/RepeatIcon';

// An icon for the "Stream" view is defined inline to avoid creating new files.
const StreamIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
  </svg>
);


export type View = 'stream' | 'reflections' | 'chat' | 'intentions' | 'habits' | 'settings';

interface NavBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isChatDisabled?: boolean; // New prop to control chat tab state
}

export const NavBar: React.FC<NavBarProps> = ({ activeView, onViewChange, isChatDisabled }) => {
  const navItems = [
    { id: 'stream', label: 'Stream', icon: StreamIcon },
    { id: 'reflections', label: 'Reflect', icon: SparklesIcon },
    { id: 'chat', label: 'Chat', icon: ChatIcon },
    { id: 'intentions', label: 'Goals', icon: IntentionsIcon },
    { id: 'habits', label: 'Habits', icon: RepeatIcon },
  ];

  return (
    <nav className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-2 border-t border-white/10 z-20 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        const isDisabled = item.id === 'chat' && isChatDisabled;
        const Icon = item.icon;

        let buttonClasses = `flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors `;
        if (isDisabled) {
          buttonClasses += 'text-gray-600 cursor-not-allowed';
        } else if (isActive) {
          buttonClasses += 'bg-brand-teal/20 text-brand-teal';
        } else {
          buttonClasses += 'text-gray-400 hover:bg-white/10 hover:text-white';
        }

        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={buttonClasses}
            aria-current={isActive ? 'page' : undefined}
            disabled={isDisabled}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
