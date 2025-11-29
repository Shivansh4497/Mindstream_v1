import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { ETA_PRESETS, ETAPreset, calculateDueDate, getPresetDisplayDate } from '../utils/etaCalculator';

interface ETASelectorProps {
    selectedPreset: ETAPreset;
    onSelectPreset: (preset: ETAPreset, dueDate: Date | null) => void;
    customDate?: Date;
    onCustomDateChange?: (date: Date) => void;
}

/**
 * ETA Selector Component
 * Allows user to select deadline preset or custom date
 */
export const ETASelector: React.FC<ETASelectorProps> = ({
    selectedPreset,
    onSelectPreset,
    customDate,
    onCustomDateChange
}) => {
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const handlePresetClick = (preset: ETAPreset) => {
        const dueDate = calculateDueDate(preset);
        onSelectPreset(preset, dueDate);

        if (preset === 'custom') {
            setShowCustomPicker(true);
        } else {
            setShowCustomPicker(false);
        }
    };

    const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        onCustomDateChange?.(date);
        const dueDate = calculateDueDate('custom', date);
        onSelectPreset('custom', dueDate);
    };

    return (
        <div className="space-y-3">
            <label className="text-sm text-gray-400">When by?</label>

            {/* Preset Grid */}
            <div className="grid grid-cols-2 gap-2">
                {ETA_PRESETS.map((preset) => {
                    const isSelected = selectedPreset === preset.id;
                    const displayDate = preset.id !== 'life' && preset.id !== 'custom'
                        ? getPresetDisplayDate(preset.id)
                        : '';

                    return (
                        <button
                            key={preset.id}
                            onClick={() => handlePresetClick(preset.id)}
                            className={`
                relative px-4 py-3 rounded-lg border transition-all text-left
                ${isSelected
                                    ? 'border-brand-teal bg-brand-teal/10 text-white'
                                    : 'border-white/10 bg-dark-surface-light text-gray-300 hover:border-white/20'
                                }
              `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{preset.label}</div>
                                    {displayDate && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                            {displayDate}
                                        </div>
                                    )}
                                </div>

                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-5 h-5 rounded-full bg-brand-teal flex items-center justify-center"
                                    >
                                        <svg className="w-3 h-3 text-brand-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </motion.div>
                                )}
                            </div>

                            {preset.id === 'custom' && isSelected && preset.description && (
                                <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Custom Date Picker */}
            {showCustomPicker && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 p-3 bg-dark-surface-light rounded-lg border border-white/10"
                >
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <input
                        type="date"
                        value={customDate ? customDate.toISOString().split('T')[0] : ''}
                        onChange={handleCustomDateChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                    />
                </motion.div>
            )}
        </div>
    );
};
