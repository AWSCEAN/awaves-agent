'use client';

import { useState } from 'react';
import { format, addDays } from 'date-fns';
import type { Language } from '@/types';

interface DateRangePickerProps {
  onChange: (start: Date, end: Date) => void;
  lang: Language;
}

const translations = {
  ko: {
    from: '시작일',
    to: '종료일',
    today: '오늘',
    week: '1주',
    month: '1개월',
  },
  en: {
    from: 'From',
    to: 'To',
    today: 'Today',
    week: '1 Week',
    month: '1 Month',
  },
};

export default function DateRangePicker({ onChange, lang }: DateRangePickerProps) {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 7));
  const t = translations[lang];

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setStartDate(date);
    if (date > endDate) {
      setEndDate(date);
      onChange(date, date);
    } else {
      onChange(date, endDate);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    setEndDate(date);
    onChange(startDate, date);
  };

  const setPreset = (days: number) => {
    const start = new Date();
    const end = addDays(start, days);
    setStartDate(start);
    setEndDate(end);
    onChange(start, end);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Quick presets */}
      <div className="flex gap-1">
        <button
          onClick={() => setPreset(0)}
          className="px-2 py-1 text-xs rounded bg-sand-200 hover:bg-sand-300 text-ocean-700"
        >
          {t.today}
        </button>
        <button
          onClick={() => setPreset(7)}
          className="px-2 py-1 text-xs rounded bg-sand-200 hover:bg-sand-300 text-ocean-700"
        >
          {t.week}
        </button>
        <button
          onClick={() => setPreset(30)}
          className="px-2 py-1 text-xs rounded bg-sand-200 hover:bg-sand-300 text-ocean-700"
        >
          {t.month}
        </button>
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-ocean-700">{t.from}</label>
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartChange}
          className="input-field py-1 text-sm w-auto"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-ocean-700">{t.to}</label>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndChange}
          min={format(startDate, 'yyyy-MM-dd')}
          className="input-field py-1 text-sm w-auto"
        />
      </div>
    </div>
  );
}
