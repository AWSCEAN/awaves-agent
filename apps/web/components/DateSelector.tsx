'use client';

import { format, addDays } from 'date-fns';

interface DateSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

function getDayLabel(dayIndex: number): string {
  if (dayIndex === 0) return 'Today';
  if (dayIndex === 1) return 'Tomorrow';
  return '';
}

export default function DateSelector({
  selectedDate,
  onDateChange
}: DateSelectorProps) {
  const today = new Date();
  const dates = Array.from({ length: 10 }, (_, i) => addDays(today, i));

  return (
    <div className="glass px-4 py-3 overflow-x-auto">
      <div className="flex gap-2 min-w-max">
        {dates.map((date, index) => {
          const isSelected = format(date, 'yyyy-MM-dd') ===
            format(selectedDate, 'yyyy-MM-dd');

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={`flex flex-col items-center px-4 py-2 rounded-lg
                transition-all min-w-[80px] ${
                isSelected
                  ? 'bg-ocean-500 text-white shadow-lg'
                  : 'bg-white/50 text-ocean-700 hover:bg-white/80'
              }`}
            >
              <span className="text-xs font-medium mb-1">
                {getDayLabel(index) || format(date, 'EEE')}
              </span>
              <span className="text-lg font-bold">
                {format(date, 'd')}
              </span>
              <span className="text-xs">
                {format(date, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
