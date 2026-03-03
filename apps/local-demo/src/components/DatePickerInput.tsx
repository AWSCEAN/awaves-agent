import { useRef } from 'react';
import { format } from 'date-fns';

interface DatePickerInputProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export default function DatePickerInput({ value, onChange, className = '' }: DatePickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // 'YYYY-MM-DD'
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    onChange(utcDate);
  };

  const dateStr = value.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker?.()}
        className="w-full px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm border border-sand-200 rounded-lg bg-white text-ocean-800
          focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500 text-left flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5 text-ocean-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="truncate">{dateStr}</span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={dateStr}
        min={today}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
}
