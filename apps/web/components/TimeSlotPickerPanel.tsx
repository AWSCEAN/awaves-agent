'use client';

import type { SavedListItem, SurfInfo } from '@/types';
import { getGradeBgColor, getGradeTextColor, getGradeBorderColor, getMetricsForLevel } from '@/lib/services/surfInfoService';
import { useSwipeDown } from '@/hooks/useSwipeDown';

interface TimeSlotPickerPanelProps {
  locationId: string;
  coordinates: { lat: number; lng: number };
  saves: SavedListItem[];
  currentConditions?: SurfInfo | null;
  onClose: () => void;
  onSelectTimeSlot: (save: SavedListItem) => void;
  onSelectCurrent?: (surfInfo: SurfInfo) => void;
  showLocationPrompt?: boolean;
  locale?: 'en' | 'ko';
  surferLevel?: string;
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
  currentConditions,
  onClose,
  onSelectTimeSlot,
  onSelectCurrent,
  showLocationPrompt = false,
  locale = 'en',
  surferLevel = '',
}: TimeSlotPickerPanelProps) {
  const sorted = [...saves].sort(
    (a, b) => new Date(a.surfTimestamp).getTime() - new Date(b.surfTimestamp).getTime()
  );

  const displayName = sorted[0]?.name || locationId;
  const swipe = useSwipeDown(onClose);

  return (
    <div
      className={`
        mobile-sheet-bottom fixed left-0 right-0 z-40 flex flex-col bg-white shadow-xl overflow-hidden
        animate-slide-up rounded-t-2xl max-h-[70vh]
        md:bottom-0 md:animate-none md:animate-slide-in-right md:rounded-none md:left-auto md:right-0 md:max-h-none md:w-[420px]
        transition-all duration-300
        ${showLocationPrompt ? 'md:top-[100px]' : 'md:top-14'}
      `}
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Mobile drag handle */}
      <div className="md:hidden bottom-sheet-handle" />

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
                ? `${saves.length}개 저장된 예보${currentConditions ? ' + 현재 조건' : ''}`
                : `${saves.length} saved forecast${saves.length !== 1 ? 's' : ''}${currentConditions ? ' + Current' : ''}`}
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
        {/* Current Conditions Entry */}
        {currentConditions && onSelectCurrent && (
          <button
            onClick={() => onSelectCurrent(currentConditions)}
            className="w-full text-left p-3 rounded-xl border-2 border-ocean-400 bg-ocean-50
              hover:bg-ocean-100 transition-colors group relative"
          >
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-ocean-500 text-white text-[10px] font-bold rounded-full">
              {locale === 'ko' ? '현재' : 'CURRENT'}
            </div>
            <div className="flex items-center justify-between pr-16">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ocean-800">
                    {formatTimestamp(currentConditions.surfTimestamp, locale).date}
                  </span>
                  <span className="text-sm text-ocean-500">
                    {formatTimestamp(currentConditions.surfTimestamp, locale).time}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-ocean-500">
                    {locale === 'ko' ? '파고' : 'Wave'}: {currentConditions.conditions.waveHeight.toFixed(1)}m
                  </span>
                  <span className="text-xs text-ocean-500">
                    {locale === 'ko' ? '점수' : 'Score'}: {Math.round(getMetricsForLevel(currentConditions.derivedMetrics, surferLevel).surfScore)}
                  </span>
                </div>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border text-sm font-bold ${getGradeBgColor(getMetricsForLevel(currentConditions.derivedMetrics, surferLevel).surfGrade)} ${getGradeTextColor(getMetricsForLevel(currentConditions.derivedMetrics, surferLevel).surfGrade)} ${getGradeBorderColor(getMetricsForLevel(currentConditions.derivedMetrics, surferLevel).surfGrade)}`}>
                {getMetricsForLevel(currentConditions.derivedMetrics, surferLevel).surfGrade}
              </div>
            </div>
          </button>
        )}

        {/* Saved Time Slots */}
        {sorted.map((save) => {
          const { date, time } = formatTimestamp(save.surfTimestamp, locale);
          const grade = save.surfGrade || 'D';

          return (
            <button
              key={save.locationSurfKey}
              onClick={() => onSelectTimeSlot(save)}
              className="w-full text-left p-3 rounded-xl border border-sand-200 hover:border-ocean-300
                hover:bg-ocean-50/50 transition-colors group relative"
            >
              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-50 text-red-400 text-[10px] font-medium rounded-full flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {locale === 'ko' ? '저장됨' : 'Saved'}
              </div>
              <div className="flex items-center justify-between pr-16">
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
