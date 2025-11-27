import React, { useState } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';
import { TrashIcon } from './icons/TrashIcon';
import * as db from '../services/dbService';
import { Settings } from 'lucide-react';

interface HeaderProps {
  onSearchClick: () => void;
  onSettingsClick?: () => void;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick, onSettingsClick, subtitle }) => {
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
      <div>
        <h1 className="text-xl font-bold font-display text-white">Mindstream</h1>
        {subtitle && <p className="text-xs text-gray-400 font-sans -mt-1">{subtitle}</p>}
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
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-indigo focus:ring-brand-teal">
              <img src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.email}`} alt="User avatar" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-dark-surface rounded-md shadow-lg py-1 z-30 animate-fade-in ring-1 ring-black ring-opacity-5">
                <div className="px-4 py-2 text-sm text-gray-400 border-b border-white/10">
                  {profile.email}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); onSettingsClick?.(); }}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                >
                  <LogoutIcon className="w-4 h-4" />
                  Logout
                </button>
                <div className="border-t border-white/10 my-1"></div>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
