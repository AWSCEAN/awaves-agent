'use client';

import type { SavedListItem } from '@/types';
import { getGradeBgColor, getGradeTextColor, getGradeBorderColor } from '@/lib/services/surfInfoService';

interface TimeSlotPickerPanelProps {
  locationId: string;
  coordinates: { lat: number; lng: number };
  saves: SavedListItem[];
  onClose: () => void;
  onSelectTimeSlot: (save: SavedListItem) => void;
  showLocationPrompt?: boolean;
  locale?: 'en' | 'ko';
}

function formatTimestamp(ts: string, locale: string): { date: string; time: string } {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');

  if (locale === 'ko') {
    return {
      date: `${year}년 ${month}월 ${day}일`,
      time: `${hours}:${minutes}`,
    };
  }
  return {
    date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    time: `${hours}:${minutes}`,
  };
}

export default function TimeSlotPickerPanel({
  locationId,
  coordinates,
  saves,
  onClose,
  onSelectTimeSlot,
  showLocationPrompt = false,
  locale = 'en',
}: TimeSlotPickerPanelProps) {
  const sorted = [...saves].sort(
    (a, b) => new Date(a.surfTimestamp).getTime() - new Date(b.surfTimestamp).getTime()
  );

  const displayName = sorted[0]?.name || locationId;

  return (
    <div className={`fixed right-0 bottom-0 w-[420px] bg-white shadow-xl z-40 flex flex-col animate-slide-in-right transition-all duration-300 ${showLocationPrompt ? 'top-[100px]' : 'top-14'}`}>
      {/* Header */}
      <div className="bg-ocean-gradient px-4 py-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-white text-lg truncate">
              {displayName}
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
            </p>
            <p className="text-white/80 text-sm mt-1">
              {locale === 'ko'
                ? `${saves.length}개 저장된 예보`
                : `${saves.length} saved forecasts`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Time Slot List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.map((save) => {
          const { date, time } = formatTimestamp(save.surfTimestamp, locale);
          const grade = save.surfGrade || 'D';

          return (
            <button
              key={save.locationSurfKey}
              onClick={() => onSelectTimeSlot(save)}
              className="w-full text-left p-3 rounded-xl border border-sand-200 hover:border-ocean-300
                hover:bg-ocean-50/50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ocean-800">{date}</span>
                    <span className="text-sm text-ocean-500">{time}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-ocean-500">
                      {locale === 'ko' ? '파고' : 'Wave'}: {save.waveHeight.toFixed(1)}m
                    </span>
                    <span className="text-xs text-ocean-500">
                      {locale === 'ko' ? '점수' : 'Score'}: {Math.round(save.surfScore)}
                    </span>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border text-sm font-bold ${getGradeBgColor(grade)} ${getGradeTextColor(grade)} ${getGradeBorderColor(grade)}`}>
                  {grade}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-sand-200 text-center">
        <span className="text-xs text-ocean-400">
          {locale === 'ko' ? '시간대를 선택하세요' : 'Select a time slot'}
        </span>
      </div>
    </div>
  );
}
