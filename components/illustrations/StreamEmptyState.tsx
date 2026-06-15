import React from 'react';

export const StreamEmptyState = () => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="50" fill="url(#moonGlowStream)" />
    <path d="M20 120 Q 50 90 80 120 T 140 120 L 140 160 L 20 160 Z" fill="rgba(255,255,255,0.03)" />
    <path d="M0 130 Q 40 110 80 130 T 160 130 L 160 160 L 0 160 Z" fill="rgba(255,255,255,0.05)" />
    <rect x="60" y="55" width="40" height="50" rx="4" fill="#2DD4BF" fillOpacity="0.1" stroke="#2DD4BF" strokeWidth="1.5" />
    <line x1="68" y1="68" x2="92" y2="68" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="68" y1="78" x2="92" y2="78" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="68" y1="88" x2="84" y2="88" stroke="#2DD4BF" strokeWidth="1.5" strokeLinecap="round"/>
    <defs>
      <radialGradient id="moonGlowStream" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);
