import React, { useState } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { TrashIcon } from './icons/TrashIcon';
// MindstreamLogo is now a static SVG file in public/
import * as db from '../services/dbService';
import { Settings, Info, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onSearchClick?: () => void;
  onSettingsClick?: () => void;
  onInfoClick?: () => void;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onSearchClick,
  onSettingsClick,
  onInfoClick,
  subtitle
}) => {
  const { profile, logout, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to delete your account? This is irreversible.")) {
      // 1. Delete data from DB
      await db.deleteAccount(user.id);

      // 2. Clear local storage flags so the Onboarding Wizard triggers again
      // We remove the user-specific key
      window.localStorage.removeItem(`onboardingStep_${user.id}`);
      // And the generic one just in case (cleaner slate)
      window.localStorage.removeItem('hasSeenPrivacy');

      // 3. Logout
      await logout();
    }
  };

  return (
    <header className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-white/10 z-20">
      <div className="flex items-center gap-2">
        <img src="/mindstream-logo.svg" alt="Mindstream" className="w-8 h-8" />
        <div>
          <h1 className="text-xl font-bold font-display text-white">Mindstream</h1>
          {subtitle && <p className="text-xs text-gray-400 font-sans -mt-1">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onSearchClick}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Search thoughts"
        >
          <SearchIcon className="w-6 h-6 text-white" />
        </button>
        {profile && (
          <>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-6 h-6 text-white" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1 group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-indigo focus:ring-brand-teal rounded-lg p-0.5"
                aria-label="User menu"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                  <img src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.email}`} alt="User avatar" className="w-full h-full object-cover" />
                </div>
                <ChevronDown className="w-3 h-3 text-gray-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-dark-surface rounded-md shadow-lg py-1 z-30 animate-fade-in ring-1 ring-black ring-opacity-5"
                  role="menu"
                >
                  <div className="px-4 py-2 text-sm text-gray-400 border-b border-white/10">
                    {profile.email}
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); onInfoClick?.(); }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                    role="menuitem"
                  >
                    <Info className="w-4 h-4" />
                    How It Works
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onSettingsClick?.(); }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                    role="menuitem"
                  >
                    <LogoutIcon className="w-4 h-4" />
                    Logout
                  </button>
                  <div className="border-t border-white/10 my-1"></div>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    role="menuitem"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header >
  );
};
