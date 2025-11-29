import React from 'react';
import { getFormattedDate, getWeekDisplay, getMonthDisplay, getWeekId } from '../utils/date';

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
    else if (frequency === 'weekly') {
        title = getWeekDisplay(getWeekId(date));
    }
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
                        ? 'bg-brand-teal text-white shadow-[0_0_10px_rgba(44,229,195,0.4)]'
                        : isToday
                            ? 'bg-white/5 ring-2 ring-brand-teal text-white'
                            : 'bg-transparent border border-gray-600 text-gray-300 hover:border-gray-400 hover:bg-white/5'
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
                    ? 'bg-brand-teal border-brand-teal text-white shadow-[0_0_8px_rgba(44,229,195,0.3)]'
                    : 'bg-transparent border-2 border-gray-600 hover:border-gray-400 text-gray-300'
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
