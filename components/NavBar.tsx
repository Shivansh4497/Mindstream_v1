import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChatIcon } from './icons/ChatIcon';
import { IntentionsIcon } from './icons/IntentionsIcon';

// An icon for the "Stream" view is defined inline to avoid creating new files.
const StreamIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
    </svg>
);


export type View = 'stream' | 'reflections' | 'chat' | 'intentions';

interface NavBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export const NavBar: React.FC<NavBarProps> = ({ activeView, onViewChange }) => {
  const navItems = [
    { id: 'stream', label: 'Stream', icon: StreamIcon },
    { id: 'reflections', label: 'Reflections', icon: SparklesIcon },
    { id: 'chat', label: 'Chat', icon: ChatIcon },
    { id: 'intentions', label: 'Intentions', icon: IntentionsIcon },
  ];

  return (
    <nav className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-2 border-t border-white/10 z-20 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`flex flex-col items-center justify-center w-20 h-16 rounded-lg transition-colors ${
              isActive ? 'bg-brand-teal/20 text-brand-teal' : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="w-7 h-7 mb-1" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};