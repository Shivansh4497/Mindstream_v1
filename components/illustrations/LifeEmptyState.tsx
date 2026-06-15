import React from 'react';

export const LifeEmptyState = () => (
  <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="80" cy="80" r="50" fill="url(#moonGlowLife)" />
    
    <circle cx="80" cy="80" r="30" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
    <circle cx="80" cy="80" r="20" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="2 4" />
    <circle cx="80" cy="80" r="10" fill="#2DD4BF" fillOpacity="0.2" stroke="#2DD4BF" strokeWidth="1.5" />
    <circle cx="80" cy="80" r="4" fill="#2DD4BF" />
    
    <defs>
      <radialGradient id="moonGlowLife" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);
