import { useState, useRef, useEffect } from 'react';
import { TIME_HOURS } from '../services/surfInfoService';

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

  useEffect(() => {
    if (activeField && dropdownRef.current) {
      const selectedTime = activeField === 'from' ? fromTime : toTime;
      const selectedIndex = TIME_HOURS.indexOf(selectedTime);
      if (selectedIndex !== -1) {
        const itemHeight = 36;
        const visibleItems = 5;
        const scrollTop = Math.max(0, (selectedIndex - Math.floor(visibleItems / 2)) * itemHeight);
        dropdownRef.current.scrollTop = scrollTop;
      }
    }
  }, [activeField, fromTime, toTime]);

  const handleTimeSelect = (time: string) => {
    if (activeField === 'from') onFromChange(time);
    else if (activeField === 'to') onToChange(time);
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
    if (isFrom) { bgColor = 'bg-ocean-500 hover:bg-ocean-600'; textColor = 'text-white'; fontWeight = 'font-bold'; }
    else if (isTo) { bgColor = 'bg-ocean-400 hover:bg-ocean-500'; textColor = 'text-white'; fontWeight = 'font-bold'; }
    else if (isInRange) { bgColor = 'bg-ocean-100 hover:bg-ocean-200'; textColor = 'text-ocean-800'; }

    return `px-3 py-2 cursor-pointer transition-colors ${bgColor} ${textColor} ${fontWeight}`;
  };

  return (
    <div ref={containerRef} className={`flex items-center gap-1 md:gap-2 ${className}`}>
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setActiveField(activeField === 'from' ? null : 'from')}
          className="w-full px-1.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-sand-200 rounded-lg bg-white text-ocean-800
            focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 text-left"
          title="From (UTC)"
        >
          {fromTime}
        </button>
        {activeField === 'from' && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-sand-200 z-50
              w-20 md:w-24 overflow-y-auto text-xs md:text-sm"
            style={{ maxHeight: '180px' }}
          >
            {TIME_HOURS.map((time) => (
              <div key={time} onClick={() => handleTimeSelect(time)} className={getItemStyle(time)}>{time}</div>
            ))}
          </div>
        )}
      </div>

      <span className="flex items-center text-ocean-600 text-xs md:text-sm font-medium flex-shrink-0">~</span>

      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setActiveField(activeField === 'to' ? null : 'to')}
          className="w-full px-1.5 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-sand-200 rounded-lg bg-white text-ocean-800
            focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 text-left"
          title="To (UTC)"
        >
          {toTime}
        </button>
        {activeField === 'to' && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-sand-200 z-50
              w-20 md:w-24 overflow-y-auto text-xs md:text-sm"
            style={{ maxHeight: '180px' }}
          >
            {TIME_HOURS.map((time) => (
              <div key={time} onClick={() => handleTimeSelect(time)} className={getItemStyle(time)}>{time}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
