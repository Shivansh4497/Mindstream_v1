import React from 'react';
import { Notebook, Heart, MessageCircle } from 'lucide-react';

export type View = 'stream' | 'life' | 'chat' | 'settings';

interface NavBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  isChatDisabled?: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({
  activeView,
  onViewChange,
  isChatDisabled,
}) => {
  const navItems = [
    { id: 'stream', label: 'Stream', icon: Notebook },
    { id: 'life', label: 'Life', icon: Heart },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
  ];

  return (
    <nav className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-2 border-t border-white/10 z-20 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = activeView === item.id;
        const isDisabled = item.id === 'chat' && isChatDisabled;
        const Icon = item.icon;

        let buttonClasses = `relative flex flex-col items-center justify-center w-16 h-14 transition-colors `;
        if (isDisabled) {
          buttonClasses += 'text-[rgba(255,255,255,0.05)] cursor-not-allowed';
        } else if (isActive) {
          buttonClasses += 'text-[rgba(255,255,255,0.88)]';
        } else {
          buttonClasses += 'text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.4)]';
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
