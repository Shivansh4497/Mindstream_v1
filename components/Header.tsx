import React, { useState } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { useAuth } from '../context/AuthContext';
import { LogoutIcon } from './icons/LogoutIcon';

interface HeaderProps {
  onSearchClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchClick }) => {
  const { profile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex-shrink-0 bg-brand-indigo/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-white/10 z-20">
      <h1 className="text-xl font-bold font-display text-white">Mindstream</h1>
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
              <div className="absolute right-0 mt-2 w-48 bg-dark-surface rounded-md shadow-lg py-1 z-30 animate-fade-in">
                <div className="px-4 py-2 text-sm text-gray-400 border-b border-white/10">
                  {profile.email}
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-white/10"
                >
                  <LogoutIcon className="w-5 h-5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};