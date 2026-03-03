import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useLocale } from '../contexts/LocaleContext';
import type { SurfInfo, SavedListItem } from '../types';
import { useSwipeDown } from '../hooks/useSwipeDown';
import {
  getGradeBgColor,
  getGradeTextColor,
  getGradeBorderColor,
  getMetricsForLevel,
  surferLevelToKey,
  parseUTCTimestamp,
  isCoordString,
  getSurfScoreColors,
} from '../services/surfInfoService';

interface SpotDetailPanelProps {
  surfInfo: SurfInfo;
  coordinates: { latitude: number; longitude: number };
  isSaved?: boolean;
  onClose: () => void;
  onSave?: () => void;
  onRemove?: () => void;
  showLocationPrompt?: boolean;
  savedTimeslots?: SavedListItem[];
  currentConditions?: SurfInfo | null;
  onTimeslotSelect?: (save: SavedListItem) => void;
  onCurrentSelect?: (surfInfo: SurfInfo) => void;
  surferLevel?: string;
  llmFetchKey?: number;
}

function getShortLevelLabel(level: string, locale: 'en' | 'ko'): string {
  const upper = level.toUpperCase();
  if (locale === 'ko') {
    if (upper === 'BEGINNER') return '초급';
    if (upper === 'INTERMEDIATE') return '중급';
    if (upper === 'ADVANCED') return '고급';
  }
  return upper.charAt(0);
}

// Generate a deterministic surf advice text based on conditions
function generateAdvice(surfInfo: SurfInfo, level: string, locale: 'en' | 'ko'): { ko: string; en: string } {
  const { waveHeight, wavePeriod, windSpeed, waterTemperature } = surfInfo.conditions;
  const effLevel = level.toUpperCase();
  const score = surfInfo.derivedMetrics[effLevel as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED']?.surfScore
    ?? surfInfo.derivedMetrics.INTERMEDIATE.surfScore;

  let en: string;
  let ko: string;

  if (score >= 75) {
    en = `Excellent conditions! Wave height of ${waveHeight.toFixed(1)}m with ${wavePeriod.toFixed(0)}s period offers great rides. Wind at ${windSpeed.toFixed(0)} km/h is manageable. Water temp ${waterTemperature.toFixed(0)}°C — a wetsuit is recommended.`;
    ko = `최상의 서핑 조건! 파고 ${waveHeight.toFixed(1)}m, 주기 ${wavePeriod.toFixed(0)}초로 훌륭한 파도를 즐길 수 있습니다. 풍속 ${windSpeed.toFixed(0)} km/h는 적절합니다. 수온 ${waterTemperature.toFixed(0)}°C — 웻슈트 착용을 권장합니다.`;
  } else if (score >= 55) {
    en = `Good conditions for ${effLevel === 'BEGINNER' ? 'beginners' : effLevel === 'INTERMEDIATE' ? 'intermediate surfers' : 'advanced surfers'}. Waves at ${waveHeight.toFixed(1)}m with ${wavePeriod.toFixed(0)}s period. Keep an eye on the ${windSpeed.toFixed(0)} km/h wind.`;
    ko = `${effLevel === 'BEGINNER' ? '초보자' : effLevel === 'INTERMEDIATE' ? '중급 서퍼' : '고급 서퍼'}에게 좋은 조건입니다. 파고 ${waveHeight.toFixed(1)}m, 주기 ${wavePeriod.toFixed(0)}초. ${windSpeed.toFixed(0)} km/h 풍속에 주의하세요.`;
  } else if (score >= 35) {
    en = `Average conditions. Waves of ${waveHeight.toFixed(1)}m may be challenging with ${windSpeed.toFixed(0)} km/h winds. Best for practice sessions rather than peak performance.`;
    ko = `보통 조건입니다. ${waveHeight.toFixed(1)}m 파도는 ${windSpeed.toFixed(0)} km/h 바람과 함께 도전적일 수 있습니다. 고성능 서핑보다는 연습 세션에 적합합니다.`;
  } else {
    en = `Difficult conditions today. Strong winds at ${windSpeed.toFixed(0)} km/h and irregular wave period of ${wavePeriod.toFixed(0)}s make surfing challenging. Consider waiting for better conditions.`;
    ko = `오늘 조건이 어렵습니다. ${windSpeed.toFixed(0)} km/h 강풍과 ${wavePeriod.toFixed(0)}초의 불규칙한 파도 주기로 서핑이 힘들 수 있습니다. 더 나은 조건을 기다리는 것을 권장합니다.`;
  }

  return { en, ko };
}

export default function SpotDetailPanel({
  surfInfo,
  coordinates,
  isSaved = false,
  onClose,
  onSave,
  onRemove,
  showLocationPrompt = false,
  savedTimeslots,
  currentConditions,
  onTimeslotSelect,
  onCurrentSelect,
  surferLevel = '',
  llmFetchKey,
}: SpotDetailPanelProps) {
  const { locale } = useLocale();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [forecastView, setForecastView] = useState<'table' | 'chart'>('chart');
  const [llmStatus, setLlmStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [llmAdvice, setLlmAdvice] = useState<{ ko: string; en: string } | null>(null);
  const swipe = useSwipeDown(onClose);

  // Simulate LLM loading then show deterministic advice
  useEffect(() => {
    setLlmStatus('loading');
    setLlmAdvice(null);
    const effectiveLvl = ((surfInfo as unknown as { displayLevel?: string }).displayLevel) || surferLevel || 'INTERMEDIATE';
    const timer = setTimeout(() => {
      setLlmAdvice(generateAdvice(surfInfo, effectiveLvl, locale as 'en' | 'ko'));
      setLlmStatus('success');
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfInfo.locationId, surfInfo.surfTimestamp, surferLevel, (surfInfo as unknown as { displayLevel?: string }).displayLevel, llmFetchKey]);

  const [panelHeight, setPanelHeight] = useState(40);
  const [isSmallScreen, setIsSmallScreen] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false
  );
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(40);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsSmallScreen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [panelHeight]);

  const handleResizeMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return;
    const delta = dragStartY.current - e.clientY;
    const deltaVh = (delta / window.innerHeight) * 100;
    const newHeight = Math.min(85, Math.max(30, dragStartHeight.current + deltaVh));
    setPanelHeight(newHeight);
  }, []);

  const handleResizeEnd = useCallback(() => {
    dragStartY.current = null;
  }, []);

  const rawDisplayName = (locale === 'ko' && surfInfo.nameKo) ? surfInfo.nameKo : surfInfo.name;
  const [_dpLat, _dpLng] = surfInfo.locationId.split('#');
  const displayName = isCoordString(rawDisplayName)
    ? `${parseFloat(_dpLat).toFixed(4)}°, ${parseFloat(_dpLng).toFixed(4)}°`
    : rawDisplayName;

  const effectiveLevel = ((surfInfo as unknown as { displayLevel?: string }).displayLevel) || surferLevel;
  const { surfScore, surfGrade } = getMetricsForLevel(surfInfo.derivedMetrics, effectiveLevel);
  const { waveHeight, wavePeriod, windSpeed, waterTemperature } = surfInfo.conditions;

  const hours = [0, 3, 6, 9, 12, 15, 18, 21];

  const selectedLocalHour = useMemo(() => {
    const date = parseUTCTimestamp(surfInfo.surfTimestamp);
    if (!date) return 12;
    return Math.floor(date.getUTCHours() / 3) * 3;
  }, [surfInfo.surfTimestamp]);

  const buildMultipliers = useCallback((baseMultipliers: number[]) => {
    const selectedIdx = hours.indexOf(selectedLocalHour);
    return hours.map((_, i) => {
      const dist = Math.min(
        Math.abs(i - selectedIdx),
        hours.length - Math.abs(i - selectedIdx),
      );
      return baseMultipliers[Math.min(dist, baseMultipliers.length - 1)];
    });
  }, [selectedLocalHour]);

  const forecastData = useMemo(() => {
    const waveMult   = buildMultipliers([1.0, 0.98, 0.95, 0.90, 0.85]);
    const periodMult = buildMultipliers([1.0, 0.98, 0.95, 0.90, 0.85]);
    const windMult   = buildMultipliers([1.0, 1.02, 1.05, 1.08, 1.10]);
    const scoreMult  = buildMultipliers([1.0, 0.95, 0.92, 0.88, 0.85]);
    const airMult    = buildMultipliers([1.05, 1.0, 0.95, 0.92, 0.90]);
    return {
      waveHeights: waveMult.map(v => +(waveHeight * v).toFixed(1)),
      wavePeriods: periodMult.map(v => +(wavePeriod * v).toFixed(1)),
      windSpeeds:  windMult.map(v => +(windSpeed * v).toFixed(1)),
      waterTemps:  hours.map(() => +waterTemperature.toFixed(1)),
      airTemps:    airMult.map(v => +((waterTemperature + 5) * v).toFixed(1)),
      scores:      scoreMult.map(v => Math.round(surfScore * v)),
    };
  }, [waveHeight, wavePeriod, windSpeed, waterTemperature, surfScore, buildMultipliers]);

  const getLevelLabel = (level: string): string => {
    switch (level) {
      case 'BEGINNER': return locale === 'ko' ? '초급' : 'Beg';
      case 'INTERMEDIATE': return locale === 'ko' ? '중급' : 'Int';
      case 'ADVANCED': return locale === 'ko' ? '상급' : 'Adv';
      default: return level;
    }
  };

  return (
    <div
      className={`
        mobile-sheet-bottom fixed left-0 right-0 z-40 flex flex-col bg-white shadow-xl overflow-hidden
        animate-slide-up rounded-t-2xl
        md:bottom-0 md:animate-none md:animate-slide-in-right md:rounded-none md:left-auto md:right-0 md:max-h-none md:w-[420px]
        transition-[left,right,bottom,width] duration-300
        ${showLocationPrompt ? 'md:top-[100px]' : 'md:top-14'}
      `}
      style={isSmallScreen ? { maxHeight: `${panelHeight}vh` } : undefined}
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Mobile drag handle */}
      <div
        className="md:hidden bottom-sheet-handle"
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      />

      {/* Header */}
      <div className="bg-ocean-gradient px-4 py-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-lg truncate">{displayName}</h3>
              {(onSave || (isSaved && onRemove)) && (
                <button
                  onClick={() => {
                    if (isSaved && onRemove) setShowConfirmDelete(true);
                    else if (onSave) onSave();
                  }}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${
                    isSaved ? 'text-red-400 hover:text-red-300' : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-sm text-white/80 truncate">
              {locale === 'ko' && surfInfo.regionKo ? surfInfo.regionKo : surfInfo.region},{' '}
              {locale === 'ko' && (surfInfo as any).countryKo ? (surfInfo as any).countryKo : surfInfo.country}
            </p>
            <p className="text-xs text-white/60">
              {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </p>
            <div className="mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-block">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-white">
                  {(() => {
                    const date = parseUTCTimestamp(surfInfo.surfTimestamp);
                    if (!date) return '';
                    const y = date.getUTCFullYear();
                    const mo = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                    const d = date.getUTCDate().toString().padStart(2, '0');
                    const h = date.getUTCHours().toString().padStart(2, '0');
                    const mi = date.getUTCMinutes().toString().padStart(2, '0');
                    return `${y}-${mo}-${d} ${h}:${mi} UTC`;
                  })()}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Saved Time Slot Selector */}
      {savedTimeslots && savedTimeslots.length >= 1 && (onTimeslotSelect || (currentConditions && onCurrentSelect)) && (
        <div className="px-3 pt-2 pb-1 border-b border-sand-200">
          <div className="text-xs text-ocean-500 font-medium mb-1.5">
            {locale === 'ko'
              ? `${savedTimeslots.length}개 저장된 시간대${currentConditions ? ' + 현재' : ''}`
              : `${savedTimeslots.length} saved slot${savedTimeslots.length !== 1 ? 's' : ''}${currentConditions ? ' + Current' : ''}`}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {currentConditions && onCurrentSelect && (
              <button
                onClick={() => onCurrentSelect(currentConditions)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  currentConditions.surfTimestamp === surfInfo.surfTimestamp
                    ? 'bg-ocean-500 text-white'
                    : 'bg-ocean-100 text-ocean-700 hover:bg-ocean-200 border border-ocean-300'
                }`}
              >
                {locale === 'ko' ? '현재' : 'Current'}
              </button>
            )}
            {onTimeslotSelect && [...savedTimeslots]
              .sort((a, b) => (parseUTCTimestamp(a.surfTimestamp)?.getTime() ?? 0) - (parseUTCTimestamp(b.surfTimestamp)?.getTime() ?? 0))
              .map((save) => {
                const d = parseUTCTimestamp(save.surfTimestamp);
                if (!d) return null;
                const saveKey = `${save.locationId}#${save.surfTimestamp}#${save.surfingLevel.toUpperCase()}`;
                const currKey = `${surfInfo.locationId}#${surfInfo.surfTimestamp}#${(effectiveLevel || surferLevel || '').toUpperCase()}`;
                const isActive = saveKey === currKey;
                const timeLabel = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
                const dateLabel = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
                const levelLabel = getShortLevelLabel(save.surfingLevel, locale as 'en' | 'ko');
                return (
                  <button
                    key={save.locationSurfKey}
                    onClick={() => onTimeslotSelect(save)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      isActive ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
                    }`}
                  >
                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-red-300' : 'text-red-400'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-bold">{levelLabel}</span>
                    <span>{dateLabel}</span>
                    <span>{timeLabel}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {/* Score + Grade + Level */}
        <div className="flex gap-2">
          <div className={`flex-1 p-2 rounded-xl border ${getSurfScoreColors(surfScore).bg} text-center`}>
            <div className="text-xs text-ocean-600 font-medium mb-0.5">{locale === 'ko' ? '점수' : 'Score'}</div>
            <div className={`text-2xl font-bold ${getSurfScoreColors(surfScore).text}`}>{Math.round(surfScore)}</div>
          </div>
          <div className={`flex-1 p-2 rounded-xl border ${getGradeBgColor(surfGrade)} ${getGradeBorderColor(surfGrade)} text-center`}>
            <div className={`text-xs font-medium mb-0.5 ${getGradeTextColor(surfGrade)} opacity-80`}>{locale === 'ko' ? '등급' : 'Grade'}</div>
            <div className={`text-2xl font-bold ${getGradeTextColor(surfGrade)}`}>{surfGrade}</div>
          </div>
          <div className="flex-1 p-2 rounded-xl bg-ocean-100 border border-ocean-200 text-center">
            <div className="text-xs text-ocean-600 font-medium mb-0.5">{locale === 'ko' ? '레벨' : 'Level'}</div>
            <div className="text-2xl font-bold text-ocean-800">
              {getLevelLabel(effectiveLevel ? surferLevelToKey(effectiveLevel) : (surfInfo.difficulty || 'intermediate').toUpperCase())}
            </div>
          </div>
        </div>

        {/* Current Conditions */}
        <div className="bg-sand-50 rounded-xl p-2.5">
          <h4 className="text-sm font-semibold text-ocean-800 mb-1 flex items-center gap-2">
            <span className="text-base">🌊</span>
            {locale === 'ko' ? '현재 조건' : 'Current Conditions'}
          </h4>
          <div className="grid grid-cols-4 gap-3 text-center text-xs">
            <div>
              <div className="text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파고' : 'Wave Height'}</div>
              <div className="font-bold text-ocean-800">{waveHeight.toFixed(1)}m</div>
            </div>
            <div>
              <div className="text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파주기' : 'Wave Period'}</div>
              <div className="font-bold text-ocean-800">{wavePeriod.toFixed(1)}s</div>
            </div>
            <div>
              <div className="text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '풍속' : 'Wind Speed'}</div>
              <div className="font-bold text-ocean-800">{windSpeed.toFixed(1)}m/s</div>
            </div>
            <div>
              <div className="text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '수온' : 'Water Temp'}</div>
              <div className="font-bold text-ocean-800">{waterTemperature.toFixed(1)}°C</div>
            </div>
          </div>
        </div>

        {/* AI Surf Advice */}
        <div className="bg-sand-50 rounded-xl p-2.5">
          <h4 className="text-sm font-semibold text-ocean-800 mb-1 flex items-center gap-2">
            <span className="text-base">🤖</span>
            {locale === 'ko' ? 'AI 서핑 조언' : 'AI Surf Advice'}
          </h4>
          {llmStatus === 'loading' && (
            <div className="animate-pulse text-xs text-ocean-500 py-2">
              {locale === 'ko' ? '조건 분석 중...' : 'Analyzing conditions...'}
            </div>
          )}
          {llmStatus === 'success' && llmAdvice && (
            <p className="text-xs text-ocean-700 leading-relaxed py-1">
              {locale === 'ko' ? llmAdvice.ko : llmAdvice.en}
            </p>
          )}
        </div>

        {/* Hourly Forecast */}
        <div className="bg-sand-50 rounded-xl p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-sm font-semibold text-ocean-800 flex items-center gap-2">
              <span className="text-base">📊</span>
              {locale === 'ko' ? '시간대별 예보' : 'Hourly Forecast'}
            </h4>
            <div className="flex bg-sand-200 rounded-lg p-0.5">
              <button
                onClick={() => setForecastView('table')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                  forecastView === 'table' ? 'bg-white text-ocean-800 shadow-sm' : 'text-ocean-500 hover:text-ocean-700'
                }`}
              >
                <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                onClick={() => setForecastView('chart')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                  forecastView === 'chart' ? 'bg-white text-ocean-800 shadow-sm' : 'text-ocean-500 hover:text-ocean-700'
                }`}
              >
                <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
                </svg>
              </button>
            </div>
          </div>

          {forecastView === 'table' && (
            <table className="w-full table-fixed text-[10px]">
              <thead>
                <tr className="text-ocean-600 border-b border-ocean-200">
                  <th className="py-0.5 px-0.5 text-left font-medium" style={{ width: '13%' }}></th>
                  {hours.map((hour, i) => (
                    <th key={i} className={`py-0.5 px-0.5 text-center font-medium ${hour === selectedLocalHour ? 'text-ocean-800 bg-ocean-50' : ''}`}>
                      {hour.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ocean-800">
                <tr className="border-b border-ocean-100">
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '파고' : 'Wave'}<span className="text-ocean-400 font-normal text-[8px]"> m</span></td>
                  {forecastData.waveHeights.map((v, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>{v}</td>
                  ))}
                </tr>
                <tr className="border-b border-ocean-100">
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '주기' : 'Period'}<span className="text-ocean-400 font-normal text-[8px]"> s</span></td>
                  {forecastData.wavePeriods.map((v, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>{v}</td>
                  ))}
                </tr>
                <tr className="border-b border-ocean-100">
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '풍속' : 'Wind'}<span className="text-ocean-400 font-normal text-[8px]"> m/s</span></td>
                  {forecastData.windSpeeds.map((v, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>{v}</td>
                  ))}
                </tr>
                <tr className="border-b border-ocean-100">
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '수온' : 'Water'}<span className="text-ocean-400 font-normal text-[8px]"> °C</span></td>
                  {forecastData.waterTemps.map((v, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>{v}</td>
                  ))}
                </tr>
                <tr className="border-b border-ocean-100">
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '기온' : 'Air'}<span className="text-ocean-400 font-normal text-[8px]"> °C</span></td>
                  {forecastData.airTemps.map((v, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>{v}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-0.5 px-0.5 font-medium text-ocean-600">{locale === 'ko' ? '점수' : 'Score'}</td>
                  {forecastData.scores.map((score, idx) => (
                    <td key={idx} className={`py-0.5 px-0.5 text-center font-bold ${getSurfScoreColors(score).text} ${hours[idx] === selectedLocalHour ? 'bg-ocean-50' : ''}`}>
                      {score}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}

          {forecastView === 'chart' && (
            <ForecastChart hours={hours} data={forecastData} locale={locale} />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 m-4 max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-ocean-800 mb-2">
              {locale === 'ko' ? '저장 취소' : 'Remove from Saved'}
            </h3>
            <p className="text-sm text-ocean-600 mb-4">
              {locale === 'ko'
                ? `"${displayName}"을(를) 저장 목록에서 삭제하시겠습니까?`
                : `Remove "${displayName}" from your saved spots?`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-sand-100 text-ocean-700 hover:bg-sand-200 transition-colors"
              >
                {locale === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={() => { if (onRemove) onRemove(); setShowConfirmDelete(false); }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {locale === 'ko' ? '삭제' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Inline SVG Forecast Chart ----
interface ForecastChartProps {
  hours: number[];
  data: {
    waveHeights: number[];
    wavePeriods: number[];
    windSpeeds: number[];
    waterTemps: number[];
    airTemps: number[];
    scores: number[];
  };
  locale: string;
}

type ChartMetric = 'overview' | 'score' | 'wave' | 'period' | 'wind' | 'waterTemp' | 'airTemp';
interface MetricDef { label: string; values: number[]; color: string; unit: string; }
const metricKeys = ['score', 'wave', 'period', 'wind', 'waterTemp', 'airTemp'] as const;
type SingleMetric = typeof metricKeys[number];

function ForecastChart({ hours, data, locale }: ForecastChartProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('overview');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleTouchOnChart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const ratio = touchX / rect.width;
    const idx = Math.max(0, Math.min(hours.length - 1, Math.round(ratio * (hours.length - 1))));
    setHoveredIdx(idx);
  }, [hours.length]);

  const handleTouchEnd = useCallback(() => setHoveredIdx(null), []);

  const metrics: Record<SingleMetric, MetricDef> = {
    score:     { label: locale === 'ko' ? '점수' : 'Score',  values: data.scores,      color: '#22c55e', unit: ''    },
    wave:      { label: locale === 'ko' ? '파고' : 'Wave',   values: data.waveHeights, color: '#3b82f6', unit: 'm'   },
    period:    { label: locale === 'ko' ? '파주기' : 'Period', values: data.wavePeriods, color: '#8b5cf6', unit: 's'  },
    wind:      { label: locale === 'ko' ? '풍속' : 'Wind',   values: data.windSpeeds,  color: '#f59e0b', unit: 'm/s' },
    waterTemp: { label: locale === 'ko' ? '수온' : 'Water',  values: data.waterTemps,  color: '#06b6d4', unit: '°C'  },
    airTemp:   { label: locale === 'ko' ? '기온' : 'Air',    values: data.airTemps,    color: '#ef4444', unit: '°C'  },
  };

  const W = 360;
  const H = activeMetric === 'overview' ? 160 : 120;
  const padL = 8; const padR = 8; const padT = 16; const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const toX = (i: number) => padL + (i / (hours.length - 1)) * chartW;
  const colWidth = chartW / (hours.length - 1);

  const buildLine = (values: number[], min: number, rng: number) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${(padT + chartH - ((v - min) / rng) * chartH).toFixed(1)}`).join(' ');
  const buildArea = (lp: string, len: number) =>
    `${lp} L${toX(len - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  const renderHoverCols = () => hours.map((_, i) => (
    <rect key={i} x={toX(i) - colWidth / 2} y={padT} width={colWidth} height={chartH} fill="transparent"
      onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: 'crosshair' }} />
  ));

  const renderToggle = () => (
    <div className="flex flex-wrap gap-1 mb-2">
      <button onClick={() => { setActiveMetric('overview'); setHoveredIdx(null); }}
        className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${activeMetric === 'overview' ? 'text-white bg-ocean-600' : 'bg-sand-100 text-ocean-600 hover:bg-sand-200'}`}>
        {locale === 'ko' ? '전체' : 'All'}
      </button>
      {metricKeys.map((key) => (
        <button key={key} onClick={() => { setActiveMetric(key); setHoveredIdx(null); }}
          className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${activeMetric === key ? 'text-white' : 'bg-sand-100 text-ocean-600 hover:bg-sand-200'}`}
          style={activeMetric === key ? { backgroundColor: metrics[key].color } : undefined}>
          {metrics[key].label}
        </button>
      ))}
    </div>
  );

  if (activeMetric === 'overview') {
    const allSeries = metricKeys.map((key) => {
      const m = metrics[key];
      const min = Math.min(...m.values); const max = Math.max(...m.values); const rng = max - min || 1;
      const normalized = m.values.map(v => (v - min) / rng);
      return { ...m, key, normalized };
    });
    const normToY = (n: number) => padT + chartH - n * chartH;
    const tx = hoveredIdx !== null ? toX(hoveredIdx) : 0;
    const onRight = hoveredIdx !== null && hoveredIdx < hours.length / 2;
    return (
      <div>
        {renderToggle()}
        <div className="relative">
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" style={{ height: H }}
            onTouchStart={handleTouchOnChart} onTouchMove={handleTouchOnChart} onTouchEnd={handleTouchEnd}>
            {[0, 0.25, 0.5, 0.75, 1].map((n, i) => (
              <line key={i} x1={padL} y1={normToY(n)} x2={W - padR} y2={normToY(n)} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3" />
            ))}
            {allSeries.map((series) => {
              const path = series.normalized.map((n, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${normToY(n).toFixed(1)}`).join(' ');
              const area = `${path} L${toX(series.normalized.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;
              return (
                <g key={series.key}>
                  <path d={area} fill={series.color} opacity={0.05} />
                  <path d={path} fill="none" stroke={series.color} strokeWidth={hoveredIdx !== null ? 1 : 1.5}
                    strokeLinecap="round" strokeLinejoin="round" opacity={hoveredIdx !== null ? 0.4 : 1} />
                  {series.values.map((_, i) => (
                    <circle key={i} cx={toX(i)} cy={normToY(series.normalized[i])}
                      r={hoveredIdx === i ? 3.5 : 2} fill="white" stroke={series.color}
                      strokeWidth={hoveredIdx === i ? 2 : 1.5} opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1} />
                  ))}
                </g>
              );
            })}
            {hoveredIdx !== null && <line x1={tx} y1={padT} x2={tx} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />}
            {hours.map((h, i) => (
              <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9}
                fill={hoveredIdx === i ? '#0f172a' : '#64748b'} fontWeight={hoveredIdx === i ? 'bold' : 'normal'}>
                {h.toString().padStart(2, '0')}:00
              </text>
            ))}
            {renderHoverCols()}
          </svg>
          {hoveredIdx !== null && (
            <div className="absolute bg-white rounded-lg shadow-lg border border-sand-200 px-2.5 py-2 pointer-events-none z-10"
              style={{ top: 4, ...(onRight ? { left: `${(tx / W) * 100 + 3}%` } : { right: `${100 - (tx / W) * 100 + 3}%` }) }}>
              <div className="text-[10px] font-semibold text-ocean-700 mb-1 border-b border-sand-100 pb-1">
                {hours[hoveredIdx].toString().padStart(2, '0')}:00
              </div>
              {allSeries.map((series) => (
                <div key={series.key} className="flex items-center justify-between gap-3 text-[10px] leading-relaxed">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: series.color }} />
                    <span className="text-ocean-500">{series.label}</span>
                  </span>
                  <span className="font-semibold text-ocean-800">
                    {series.key === 'score' ? series.values[hoveredIdx] : series.values[hoveredIdx].toFixed(1)}{series.unit}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1">
          {allSeries.map((series) => (
            <button key={series.key} onClick={() => setActiveMetric(series.key as ChartMetric)}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: series.color }} />
              <span className="text-[10px] text-ocean-600">{series.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const m = metrics[activeMetric as SingleMetric];
  const values = m.values;
  const minVal = Math.min(...values); const maxVal = Math.max(...values); const range = maxVal - minVal || 1;
  const toY = (v: number) => padT + chartH - ((v - minVal) / range) * chartH;
  const linePath = buildLine(values, minVal, range);
  const areaPath = buildArea(linePath, values.length);
  const yTicks = [minVal, minVal + range / 2, maxVal];

  return (
    <div>
      {renderToggle()}
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" style={{ height: H }}
          onTouchStart={handleTouchOnChart} onTouchMove={handleTouchOnChart} onTouchEnd={handleTouchEnd}>
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line x1={padL} y1={toY(tick)} x2={W - padR} y2={toY(tick)} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3" />
              <text x={padL + 2} y={toY(tick) - 3} textAnchor="start" fontSize={8} fill="#94a3b8">
                {activeMetric === 'score' ? Math.round(tick) : tick.toFixed(1)}
              </text>
            </g>
          ))}
          <path d={areaPath} fill={m.color} opacity={0.1} />
          <path d={linePath} fill="none" stroke={m.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {values.map((v, i) => (
            <g key={i} opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1}>
              <circle cx={toX(i)} cy={toY(v)} r={hoveredIdx === i ? 5 : 3.5} fill="white" stroke={m.color} strokeWidth={2} />
              <text x={toX(i)} y={toY(v) - 7} textAnchor="middle" fontSize={9} fontWeight="bold" fill={m.color}>
                {activeMetric === 'score' ? v : v.toFixed(1)}{m.unit}
              </text>
            </g>
          ))}
          {hoveredIdx !== null && (
            <line x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3" />
          )}
          {hours.map((h, i) => (
            <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9}
              fill={hoveredIdx === i ? '#0f172a' : '#64748b'} fontWeight={hoveredIdx === i ? 'bold' : 'normal'}>
              {h.toString().padStart(2, '0')}:00
            </text>
          ))}
          {renderHoverCols()}
        </svg>
        {hoveredIdx !== null && (
          <div className="absolute bg-white rounded-lg shadow-lg border border-sand-200 px-2.5 py-1.5 pointer-events-none z-10"
            style={{ top: 4, ...(hoveredIdx < hours.length / 2 ? { left: `${(toX(hoveredIdx) / W) * 100 + 3}%` } : { right: `${100 - (toX(hoveredIdx) / W) * 100 + 3}%` }) }}>
            <div className="text-[10px] font-semibold text-ocean-700">{hours[hoveredIdx].toString().padStart(2, '0')}:00</div>
            <div className="text-sm font-bold" style={{ color: m.color }}>
              {activeMetric === 'score' ? values[hoveredIdx] : values[hoveredIdx].toFixed(1)}{m.unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
