'use client';

import { useState, useRef, useEffect } from 'react';
import { TIME_HOURS } from '@/lib/services/surfInfoService';

interface TimeRangeSelectorProps {
  fromTime: string;
  toTime: string;
  onFromChange: (time: string) => void;
  onToChange: (time: string) => void;
  className?: string;
}

type ActiveField = 'from' | 'to' | null;

export default function TimeRangeSelector({
  fromTime,
  toTime,
  onFromChange,
  onToChange,
  className = '',
}: TimeRangeSelectorProps) {
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fromButtonRef = useRef<HTMLButtonElement>(null);
  const toButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    if (activeField) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeField]);

  // Auto-scroll to selected time when dropdown opens
  useEffect(() => {
    if (activeField && dropdownRef.current) {
      const selectedTime = activeField === 'from' ? fromTime : toTime;
      const selectedIndex = TIME_HOURS.indexOf(selectedTime);
      if (selectedIndex !== -1) {
        // Each item is ~36px tall, scroll to center the selected item in the 5-item view
        const itemHeight = 36;
        const visibleItems = 5;
        const scrollTop = Math.max(0, (selectedIndex - Math.floor(visibleItems / 2)) * itemHeight);
        dropdownRef.current.scrollTop = scrollTop;
      }
    }
  }, [activeField, fromTime, toTime]);

  const handleTimeSelect = (time: string) => {
    if (activeField === 'from') {
      onFromChange(time);
    } else if (activeField === 'to') {
      onToChange(time);
    }
    setActiveField(null);
  };

  const getItemStyle = (time: string): string => {
    const fromIndex = TIME_HOURS.indexOf(fromTime);
    const toIndex = TIME_HOURS.indexOf(toTime);
    const currentIndex = TIME_HOURS.indexOf(time);

    const isFrom = time === fromTime;
    const isTo = time === toTime;
    const isInRange = currentIndex >= fromIndex && currentIndex <= toIndex;

    let bgColor = 'bg-white hover:bg-ocean-50';
    let textColor = 'text-ocean-800';
    let fontWeight = '';

    if (isFrom) {
      // Primary highlight for From time
      bgColor = 'bg-ocean-500 hover:bg-ocean-600';
      textColor = 'text-white';
      fontWeight = 'font-bold';
    } else if (isTo) {
      // Secondary highlight for To time
      bgColor = 'bg-ocean-400 hover:bg-ocean-500';
      textColor = 'text-white';
      fontWeight = 'font-bold';
    } else if (isInRange) {
      // Range highlight
      bgColor = 'bg-ocean-100 hover:bg-ocean-200';
      textColor = 'text-ocean-800';
    }

    return `px-3 py-2 cursor-pointer transition-colors ${bgColor} ${textColor} ${fontWeight}`;
  };

  return (
    <div ref={containerRef} className={`flex items-center gap-1 md:gap-2 ${className}`}>
      {/* From Time Button */}
      <div className="relative flex-1 min-w-0">
        <button
          ref={fromButtonRef}
          type="button"
          onClick={() => setActiveField(activeField === 'from' ? null : 'from')}
          className="w-full px-1.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-sand-200 rounded-lg bg-white text-ocean-800
            focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 text-left"
          title="From"
        >
          {fromTime}
        </button>

        {/* From Dropdown */}
        {activeField === 'from' && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-sand-200 z-50
              w-20 md:w-24 overflow-y-auto text-xs md:text-sm"
            style={{ maxHeight: '180px' }} // 5 items × 36px
          >
            {TIME_HOURS.map((time) => (
              <div
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={getItemStyle(time)}
              >
                {time}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <span className="flex items-center text-ocean-600 text-xs md:text-sm font-medium flex-shrink-0">~</span>

      {/* To Time Button */}
      <div className="relative flex-1 min-w-0">
        <button
          ref={toButtonRef}
          type="button"
          onClick={() => setActiveField(activeField === 'to' ? null : 'to')}
          className="w-full px-1.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-sand-200 rounded-lg bg-white text-ocean-800
            focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 text-left"
          title="To"
        >
          {toTime}
        </button>

        {/* To Dropdown */}
        {activeField === 'to' && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-sand-200 z-50
              w-20 md:w-24 overflow-y-auto text-xs md:text-sm"
            style={{ maxHeight: '180px' }} // 5 items × 36px
          >
            {TIME_HOURS.map((time) => (
              <div
                key={time}
                onClick={() => handleTimeSelect(time)}
                className={getItemStyle(time)}
              >
                {time}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
