'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import 'react-day-picker/style.css';

interface DatePickerInputProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export default function DatePickerInput({ value, onChange, className = '' }: DatePickerInputProps) {
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Prediction range: all dates 10+ days from today (no end limit)
  const predictionRange = useMemo(() => ({
    from: addDays(today, 10),
    to: addDays(today, 365 * 5),
  }), [today]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day: Date) => {
    onChange(day);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm border border-sand-200 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
          bg-white text-ocean-800 text-left"
      >
        {format(value, 'yyyy-MM-dd')}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-sand-200 z-50 p-2">
          <style>{`
            .rdp-root {
              --rdp-accent-color: #0369a1;
              --rdp-accent-background-color: #e0f2fe;
              font-size: 0.85rem;
            }
            .rdp-day.prediction-range {
              background-color: rgba(129, 140, 248, 0.15);
            }
            .rdp-day_button.rdp-day_button {
              border-radius: 0.375rem;
            }
            .rdp-selected .rdp-day_button {
              background-color: #0369a1;
              color: white;
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(day) => day && handleDayClick(day)}
            locale={dateLocale}
            disabled={{ before: today }}
            defaultMonth={value}
            modifiers={{
              predictionRange: predictionRange,
            }}
            modifiersClassNames={{
              predictionRange: 'prediction-range',
            }}
          />
          <div className="flex items-center gap-2 px-2 pb-2 text-xs text-ocean-500">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(129, 140, 248, 0.25)' }} />
            <span>{locale === 'ko' ? 'AI 예측 범위' : 'AI Prediction Range'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
