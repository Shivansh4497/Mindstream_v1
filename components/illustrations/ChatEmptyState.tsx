import React from 'react';

export const ChatEmptyState = () => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="50" fill="url(#moonGlowChat)" />
    
    <rect x="50" y="60" width="35" height="25" rx="8" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
    <path d="M60 85 L 55 95 L 68 85 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinejoin="round"/>
    <circle cx="60" cy="72.5" r="2" fill="rgba(255,255,255,0.4)" />
    <circle cx="67.5" cy="72.5" r="2" fill="rgba(255,255,255,0.4)" />
    <circle cx="75" cy="72.5" r="2" fill="rgba(255,255,255,0.4)" />

    <rect x="75" y="75" width="40" height="30" rx="8" fill="#2DD4BF" fillOpacity="0.15" stroke="#2DD4BF" strokeWidth="1.5" />
    <path d="M105 105 L 110 115 L 97 105 Z" fill="#2DD4BF" fillOpacity="0.15" stroke="#2DD4BF" strokeWidth="1.5" strokeLinejoin="round"/>
    
    <defs>
      <radialGradient id="moonGlowChat" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);
