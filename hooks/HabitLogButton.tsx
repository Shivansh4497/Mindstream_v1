import React from 'react';
import { getFormattedDate, getWeekDisplay, getMonthDisplay } from '../utils/date';

interface HabitLogButtonProps {
    date: Date;
    isLogged: boolean;
    isToday: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    onToggle: () => void;
}

export const HabitLogButton: React.FC<HabitLogButtonProps> = ({ date, isLogged, isToday, frequency, onToggle }) => {
    
    // Title for tooltip
    let title = "";
    if (frequency === 'daily') title = getFormattedDate(date);
    else if (frequency === 'weekly') title = getWeekDisplay(`${date.getFullYear()}-W${date.getUTCDate()}`); // simplified
    else if (frequency === 'monthly') title = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Styles based on frequency
    if (frequency === 'daily') {
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'narrow' });
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                title={title}
                className={`
                    flex flex-col items-center justify-center w-8 h-10 rounded-md transition-all duration-300
                    ${isLogged 
                        ? 'bg-brand-teal text-brand-indigo shadow-[0_0_10px_rgba(44,229,195,0.4)]' 
                        : isToday 
                            ? 'bg-white/5 ring-1 ring-brand-teal/50 text-white' 
                            : 'bg-white/5 text-gray-500 hover:bg-white/10'
                    }
                `}
            >
                 <span className="text-[8px] opacity-70 uppercase">{dayLabel}</span>
                 <span className="text-xs font-bold leading-none">{date.getDate()}</span>
            </button>
        );
    }
    
    // Weekly & Monthly use larger squares
    return (
         <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            title={title}
            className={`
                flex items-center justify-center rounded-md transition-all duration-300 border
                ${frequency === 'weekly' ? 'w-10 h-10' : 'w-12 h-10'}
                ${isLogged 
                    ? 'bg-brand-teal border-brand-teal text-brand-indigo shadow-[0_0_8px_rgba(44,229,195,0.3)]' 
                    : 'bg-transparent border-gray-700 hover:border-gray-500 text-gray-500'
                }
            `}
        >
            {isLogged ? (
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
                 </svg>
            ) : (
                <span className="text-[10px] font-medium opacity-50">
                    {frequency === 'weekly' ? 'W' : date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                </span>
            )}
        </button>
    );
};
