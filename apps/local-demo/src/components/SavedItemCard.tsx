import { useState } from 'react';
import type { SavedListItem } from '../types';
import { parseUTCTimestamp, isCoordString } from '../services/surfInfoService';

interface SavedItemCardProps {
  item: SavedListItem;
  lang: 'en' | 'ko';
  onRemove: () => void;
  onViewOnMap: () => void;
}

const gradeColors: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-red-100 text-red-700',
};

const translations = {
  ko: {
    remove: '삭제',
    viewOnMap: '지도에서 보기',
    waveHeight: '파고',
    wavePeriod: '주기',
    windSpeed: '풍속',
    waterTemp: '수온',
    surfScore: '서핑 점수',
    surfGrade: '등급',
    level: '레벨',
    forecastDate: '예측 일시',
    confirmRemove: '정말 삭제하시겠습니까?',
    cancel: '취소',
  },
  en: {
    remove: 'Remove',
    viewOnMap: 'View on Map',
    waveHeight: 'Wave Height',
    wavePeriod: 'Wave Period',
    windSpeed: 'Wind Speed',
    waterTemp: 'Water Temp',
    surfScore: 'Surf Score',
    surfGrade: 'Grade',
    level: 'Level',
    forecastDate: 'Forecast Date',
    confirmRemove: 'Are you sure you want to remove this?',
    cancel: 'Cancel',
  },
};

export default function SavedItemCard({ item, lang, onRemove, onViewOnMap }: SavedItemCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const t = translations[lang];

  const getLevelLabel = (level: string): string => {
    if (lang === 'ko') {
      switch (level.toUpperCase()) {
        case 'BEGINNER': return '초급';
        case 'INTERMEDIATE': return '중급';
        case 'ADVANCED': return '상급';
      }
    }
    return level;
  };

  // Name resolution
  const rawName = lang === 'ko' && item.nameKo ? item.nameKo : item.name;
  const resolvedName = rawName && !isCoordString(rawName) ? rawName : null;
  const resolvedAddress = item.address && !isCoordString(item.address) ? item.address : null;
  const [_lat, _lng] = item.locationId.split('#');
  const coordFallback = `${parseFloat(_lat).toFixed(4)}°, ${parseFloat(_lng).toFixed(4)}°`;
  const locationName = resolvedName || resolvedAddress || coordFallback;

  const regionLabel = lang === 'ko' && item.regionKo ? item.regionKo : item.region;
  const countryLabel = lang === 'ko' && item.countryKo ? item.countryKo : item.country;

  const gradeLabel = item.surfGrade || 'E';

  // Full timestamp (UTC)
  const formatFullTimestamp = (ts: string) => {
    const date = parseUTCTimestamp(ts);
    if (!date) return '';
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
  };

  // Compact timestamp for mobile (UTC)
  const formatCompactTimestamp = (ts: string) => {
    const d = parseUTCTimestamp(ts);
    if (!d) return '';
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = d.getUTCDate().toString().padStart(2, '0');
    const hh = d.getUTCHours().toString().padStart(2, '0');
    const min = d.getUTCMinutes().toString().padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min} UTC`;
  };

  return (
    <div className="card relative overflow-hidden break-inside-avoid">
      <div>
        {/* ═══════════════════════════════════════════════════ */}
        {/* MOBILE LAYOUT                                       */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="md:hidden pt-2.5 px-2.5 pb-1.5">
          {/* Row 1: name + region/timestamp + remove */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ocean-800 text-sm truncate leading-tight">{locationName}</h3>
              <div className="flex items-center gap-1.5 text-xs text-ocean-500 min-w-0 mt-0.5">
                {(regionLabel || countryLabel) && (
                  <span className="truncate">
                    {regionLabel}{(regionLabel && countryLabel) ? ' · ' : ''}{countryLabel}
                  </span>
                )}
                {item.surfTimestamp && (
                  <span className="flex-shrink-0 text-ocean-400">· {formatCompactTimestamp(item.surfTimestamp)}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-sunset-500 hover:text-sunset-600 text-sm p-0.5 flex-shrink-0"
              title={t.remove}
            >
              ✕
            </button>
          </div>

          {/* Row 2: score + grade + level + progress bar */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="flex items-baseline gap-0.5 flex-shrink-0">
              <span className="text-xl font-bold text-ocean-800">{item.surfScore.toFixed(0)}</span>
              <span className="text-[10px] text-ocean-400">/100</span>
            </div>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${gradeColors[gradeLabel] || 'bg-gray-100 text-gray-700'}`}>
              {gradeLabel}
            </span>
            <span className="text-[10px] px-1 py-0.5 rounded bg-ocean-100 text-ocean-700 font-medium flex-shrink-0">
              {getLevelLabel(item.surfingLevel)}
            </span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-ocean-400 to-ocean-600 rounded-full"
                style={{ width: `${item.surfScore}%` }}
              />
            </div>
          </div>

          {/* Row 3: 4-column conditions */}
          <div className="grid grid-cols-4 gap-1 mb-3">
            <div className="flex flex-col items-center bg-sand-50 rounded px-0.5 py-1">
              <span className="text-xs leading-none">🌊</span>
              <span className="text-[9px] text-ocean-500 mt-0.5">{t.waveHeight}</span>
              <span className="text-[11px] font-semibold text-ocean-800">{item.waveHeight.toFixed(1)}m</span>
            </div>
            <div className="flex flex-col items-center bg-sand-50 rounded px-0.5 py-1">
              <span className="text-xs leading-none">⏱️</span>
              <span className="text-[9px] text-ocean-500 mt-0.5">{t.wavePeriod}</span>
              <span className="text-[11px] font-semibold text-ocean-800">{item.wavePeriod.toFixed(1)}s</span>
            </div>
            <div className="flex flex-col items-center bg-sand-50 rounded px-0.5 py-1">
              <span className="text-xs leading-none">💨</span>
              <span className="text-[9px] text-ocean-500 mt-0.5">{t.windSpeed}</span>
              <span className="text-[11px] font-semibold text-ocean-800">{item.windSpeed.toFixed(1)}m/s</span>
            </div>
            <div className="flex flex-col items-center bg-sand-50 rounded px-0.5 py-1">
              <span className="text-xs leading-none">🌡️</span>
              <span className="text-[9px] text-ocean-500 mt-0.5">{t.waterTemp}</span>
              <span className="text-[11px] font-semibold text-ocean-800">{item.waterTemperature.toFixed(1)}°C</span>
            </div>
          </div>

          {/* Row 4: map link */}
          <div className="flex items-center gap-2">
            <button
              onClick={onViewOnMap}
              className="ml-auto px-2.5 py-1 rounded-md bg-ocean-600 text-white text-xs font-medium hover:bg-ocean-700 flex-shrink-0"
            >
              {t.viewOnMap} →
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* DESKTOP LAYOUT                                      */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="hidden md:block p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-ocean-800 text-lg line-clamp-1">{locationName}</h3>
              <div className="flex items-center gap-2 text-sm text-ocean-600">
                {regionLabel && <span>{regionLabel}</span>}
                {regionLabel && countryLabel && <span>•</span>}
                {countryLabel && <span>{countryLabel}</span>}
              </div>
              {item.surfTimestamp && (
                <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md shadow-sm border border-ocean-200">
                  <svg className="w-3.5 h-3.5 text-ocean-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-ocean-700">
                    {formatFullTimestamp(item.surfTimestamp)}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-sunset-500 hover:text-sunset-600 text-sm p-1"
              title={t.remove}
            >
              ✕
            </button>
          </div>

          {/* Score and Grade */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-gradient-to-br from-ocean-50 to-sand-50 rounded-xl p-3 border border-ocean-100">
              <div className="text-xs text-ocean-500 font-medium mb-1">{t.surfScore}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-ocean-800">{item.surfScore.toFixed(0)}</span>
                <span className="text-sm text-ocean-400">/100</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-ocean-400 to-ocean-600 rounded-full transition-all"
                  style={{ width: `${item.surfScore}%` }}
                />
              </div>
            </div>
            <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-sm ${gradeColors[gradeLabel] || 'bg-gray-100'}`}>
              <span className="text-2xl font-bold">{gradeLabel}</span>
              <span className="text-[10px] opacity-80">{t.surfGrade}</span>
            </div>
          </div>

          {/* Level Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm px-3 py-1 rounded-lg bg-ocean-100 text-ocean-700 font-medium">
              {t.level}: {getLevelLabel(item.surfingLevel)}
            </span>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">🌊</span>
              <div>
                <div className="text-xs text-ocean-500">{t.waveHeight}</div>
                <div className="font-semibold text-ocean-800">{item.waveHeight.toFixed(1)}m</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">⏱️</span>
              <div>
                <div className="text-xs text-ocean-500">{t.wavePeriod}</div>
                <div className="font-semibold text-ocean-800">{item.wavePeriod.toFixed(1)}s</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">💨</span>
              <div>
                <div className="text-xs text-ocean-500">{t.windSpeed}</div>
                <div className="font-semibold text-ocean-800">{item.windSpeed.toFixed(1)}m/s</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">🌡️</span>
              <div>
                <div className="text-xs text-ocean-500">{t.waterTemp}</div>
                <div className="font-semibold text-ocean-800">{item.waterTemperature.toFixed(1)}°C</div>
              </div>
            </div>
          </div>

          {/* View on Map Button */}
          <button
            onClick={onViewOnMap}
            className="btn-primary w-full text-center block text-sm mt-4"
          >
            {t.viewOnMap}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center p-3 md:p-4">
          <div className="text-center">
            <p className="text-ocean-800 text-sm mb-3 md:mb-4">{t.confirmRemove}</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="btn-outline text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => { setShowConfirmDelete(false); onRemove(); }}
                className="bg-sunset-500 hover:bg-sunset-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {t.remove}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
