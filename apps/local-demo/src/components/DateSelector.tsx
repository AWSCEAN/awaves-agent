import { addDays, format } from 'date-fns';
import { useMemo } from 'react';

interface DateSelectorProps {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export default function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
  const dates = useMemo(() => {
    const today = utcToday();
    return Array.from({ length: 10 }, (_, i) => addDays(today, i));
  }, []);

  const selectedStr = selectedDate.toISOString().split('T')[0];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {dates.map((date, i) => {
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = dateStr === selectedStr;
        const label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : format(date, 'EEE');
        const dayNum = date.getUTCDate();

        return (
          <button
            key={dateStr}
            onClick={() => onSelect(date)}
            className={`flex-none flex flex-col items-center px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isSelected
                ? 'bg-ocean-500 text-white'
                : 'bg-ocean-700 text-ocean-300 hover:bg-ocean-600 hover:text-white'
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className={isSelected ? 'text-white' : 'text-ocean-400'}>{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}
