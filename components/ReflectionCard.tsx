import React from 'react';
// FIX: Corrected the import path to be relative.
import type { Reflection } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';

interface ReflectionCardProps {
  reflection: Reflection;
}

export const ReflectionCard: React.FC<ReflectionCardProps> = ({ reflection }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 border border-brand-teal/30 rounded-lg p-5 mb-4 shadow-lg animate-fade-in-up">
      <div className="flex items-center mb-3">
        <SparklesIcon className="w-6 h-6 text-brand-teal mr-3" />
        <h3 className="text-lg font-bold text-white font-display">Your Daily Reflection</h3>
      </div>
      <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{reflection.summary}</p>
    </div>
  );
};