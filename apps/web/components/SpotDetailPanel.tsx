'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import type { SurfInfo, SavedListItem } from '@/types';
import { getGradeBgColor, getGradeTextColor, getGradeBorderColor } from '@/lib/services/surfInfoService';

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
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-50 border-green-200';
  if (score >= 40) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
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
}: SpotDetailPanelProps) {
  const locale = useLocale();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [forecastView, setForecastView] = useState<'table' | 'chart'>('table');

  const displayName = locale === 'ko' && surfInfo.nameKo ? surfInfo.nameKo : surfInfo.name;
  const { surfScore, surfGrade, surfingLevel } = surfInfo.derivedMetrics;
  const { waveHeight, wavePeriod, windSpeed, waterTemperature } = surfInfo.conditions;

  // Hourly forecast data (same multipliers as the table)
  const hours = [6, 9, 12, 15, 18];
  const waveMultipliers = [0.9, 0.95, 1.0, 1.05, 0.98];
  const windMultipliers = [0.9, 0.95, 1.0, 1.05, 0.98];
  const periodMultipliers = [0.9, 0.95, 1.0, 1.05, 0.98];
  const scoreMultipliers = [0.85, 0.92, 1.0, 0.95, 0.88];
  const airTempMultipliers = [0.95, 1.0, 1.1, 1.15, 1.05];

  const forecastData = useMemo(() => ({
    waveHeights: waveMultipliers.map(v => +(waveHeight * v).toFixed(1)),
    wavePeriods: periodMultipliers.map(v => +(wavePeriod * v).toFixed(1)),
    windSpeeds: windMultipliers.map(v => +(windSpeed * v).toFixed(1)),
    waterTemps: [waterTemperature, waterTemperature, waterTemperature, waterTemperature, waterTemperature].map(v => +v.toFixed(1)),
    airTemps: airTempMultipliers.map(v => +((waterTemperature + 5) * v).toFixed(1)),
    scores: scoreMultipliers.map(v => Math.round(surfScore * v)),
  }), [waveHeight, wavePeriod, windSpeed, waterTemperature, surfScore]);

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return locale === 'ko' ? '좋음' : 'Good';
    if (score >= 40) return locale === 'ko' ? '보통' : 'Fair';
    return locale === 'ko' ? '나쁨' : 'Poor';
  };

  const getLevelLabel = (level: string): string => {
    switch (level) {
      case 'BEGINNER': return locale === 'ko' ? '초급' : 'Beg';
      case 'INTERMEDIATE': return locale === 'ko' ? '중급' : 'Int';
      case 'ADVANCED': return locale === 'ko' ? '상급' : 'Adv';
      default: return level;
    }
  };

  return (
    <div className={`fixed right-0 bottom-0 w-[420px] bg-white shadow-xl z-40 flex flex-col animate-slide-in-right transition-all duration-300 ${showLocationPrompt ? 'top-[100px]' : 'top-14'}`}>
      {/* Header */}
      <div className="bg-ocean-gradient px-4 py-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-lg truncate">
                {displayName}
              </h3>
              {(onSave || (isSaved && onRemove)) && (
                <button
                  onClick={() => {
                    if (isSaved && onRemove) {
                      setShowConfirmDelete(true);
                    } else if (onSave) {
                      onSave();
                    }
                  }}
                  className={`p-1 rounded transition-colors flex-shrink-0 ${
                    isSaved
                      ? 'text-red-400 hover:text-red-300'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill={isSaved ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-white/80">
                {locale === 'ko' && surfInfo.cityKo ? surfInfo.cityKo : surfInfo.city ? surfInfo.city : null}
                {(locale === 'ko' ? surfInfo.cityKo : surfInfo.city) && ', '}
                {locale === 'ko' && surfInfo.regionKo ? surfInfo.regionKo : surfInfo.region}, {locale === 'ko' && surfInfo.countryKo ? surfInfo.countryKo : surfInfo.country}
              </p>
              <button
                onClick={() => {
                  const addr = locale === 'ko'
                    ? (surfInfo.addressKo || surfInfo.address || displayName)
                    : (surfInfo.address || displayName);
                  navigator.clipboard.writeText(addr);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-0.5 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                title={locale === 'ko' ? '주소 복사' : 'Copy address'}
              >
                {copied ? (
                  <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-white/60">
              {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </p>
            {/* Surf Forecast Date - Prominent Display */}
            <div className="mt-2 bg-white/20 rounded-lg px-3 py-1.5 inline-block">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-white">
                  {(() => {
                    const date = new Date(surfInfo.SurfTimestamp);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}`;
                  })()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
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
            {/* Current Conditions Button */}
            {currentConditions && onCurrentSelect && (
              <button
                onClick={() => onCurrentSelect(currentConditions)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  currentConditions.SurfTimestamp === surfInfo.SurfTimestamp
                    ? 'bg-ocean-500 text-white'
                    : 'bg-ocean-100 text-ocean-700 hover:bg-ocean-200 border border-ocean-300'
                }`}
              >
                {locale === 'ko' ? '현재' : 'Current'}
              </button>
            )}
            {/* Saved Timeslot Buttons */}
            {onTimeslotSelect && [...savedTimeslots]
              .sort((a, b) => new Date(a.surfTimestamp).getTime() - new Date(b.surfTimestamp).getTime())
              .map((save) => {
                const d = new Date(save.surfTimestamp);
                const isActive = save.surfTimestamp === surfInfo.SurfTimestamp;
                const timeLabel = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                const dateLabel = locale === 'ko'
                  ? `${d.getMonth() + 1}/${d.getDate()}`
                  : `${d.getMonth() + 1}/${d.getDate()}`;
                return (
                  <button
                    key={save.locationSurfKey}
                    onClick={() => onTimeslotSelect(save)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                      isActive
                        ? 'bg-ocean-500 text-white'
                        : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
                    }`}
                  >
                    <svg className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-red-300' : 'text-red-400'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{dateLabel}</span>
                    <span>{timeLabel}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Score + Grade + Level - Three boxes horizontally */}
        <div className="flex gap-2">
          {/* Score Box */}
          <div className={`flex-1 p-2 rounded-xl border ${getScoreBgColor(surfScore)} text-center`}>
            <div className="text-xs text-ocean-600 font-medium mb-0.5">
              {locale === 'ko' ? '점수' : 'Score'}
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(surfScore)}`}>
              {Math.round(surfScore)}
            </div>
          </div>
          {/* Grade Box */}
          <div className={`flex-1 p-2 rounded-xl border ${getGradeBgColor(surfGrade)} ${getGradeBorderColor(surfGrade)} text-center`}>
            <div className={`text-xs font-medium mb-0.5 ${getGradeTextColor(surfGrade)} opacity-80`}>
              {locale === 'ko' ? '등급' : 'Grade'}
            </div>
            <div className={`text-2xl font-bold ${getGradeTextColor(surfGrade)}`}>
              {surfGrade}
            </div>
          </div>
          {/* Level Box */}
          <div className="flex-1 p-2 rounded-xl bg-ocean-100 border border-ocean-200 text-center">
            <div className="text-xs text-ocean-600 font-medium mb-0.5">
              {locale === 'ko' ? '레벨' : 'Level'}
            </div>
            <div className="text-2xl font-bold text-ocean-800">
              {getLevelLabel(surfingLevel)}
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

        {/* Hourly Forecast - Table or Chart */}
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
                  forecastView === 'table'
                    ? 'bg-white text-ocean-800 shadow-sm'
                    : 'text-ocean-500 hover:text-ocean-700'
                }`}
              >
                <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                onClick={() => setForecastView('chart')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                  forecastView === 'chart'
                    ? 'bg-white text-ocean-800 shadow-sm'
                    : 'text-ocean-500 hover:text-ocean-700'
                }`}
              >
                <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Table View */}
          {forecastView === 'table' && (
          <div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ocean-600 border-b border-ocean-200">
                  <th className="py-0.5 px-1.5 text-left font-medium w-20"></th>
                  {[6, 9, 12, 15, 18].map((hour) => (
                    <th key={hour} className="py-0.5 px-1.5 text-center font-medium">
                      {hour.toString().padStart(2, '0')}:00
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-ocean-800">
                {/* Wave Height Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파고' : 'Wave Height'} <span className="text-ocean-400 font-normal">(m)</span></td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{(waveHeight * v).toFixed(1)}</td>
                  ))}
                </tr>
                {/* Wave Period Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파주기' : 'Wave Period'} <span className="text-ocean-400 font-normal">(s)</span></td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{(wavePeriod * v).toFixed(1)}</td>
                  ))}
                </tr>
                {/* Wind Speed Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '풍속' : 'Wind Speed'} <span className="text-ocean-400 font-normal">(m/s)</span></td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{(windSpeed * v).toFixed(1)}</td>
                  ))}
                </tr>
                {/* Water Temperature Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '수온' : 'Water Temp'} <span className="text-ocean-400 font-normal">(°C)</span></td>
                  {[0, 0, 0, 0, 0].map((_, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{waterTemperature.toFixed(1)}</td>
                  ))}
                </tr>
                {/* Air Temperature Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '기온' : 'Air Temp'} <span className="text-ocean-400 font-normal">(°C)</span></td>
                  {[0.95, 1.0, 1.1, 1.15, 1.05].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{((waterTemperature + 5) * v).toFixed(1)}</td>
                  ))}
                </tr>
                {/* Score Row with colored text */}
                <tr>
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '점수' : 'Score'}</td>
                  {[0.85, 0.92, 1.0, 0.95, 0.88].map((v, idx) => {
                    const score = Math.round(surfScore * v);
                    return (
                      <td key={idx} className={`py-1 px-1.5 text-center font-bold ${getScoreColor(score)}`}>
                        {score}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          )}

          {/* Chart View */}
          {forecastView === 'chart' && (
            <ForecastChart
              hours={hours}
              data={forecastData}
              locale={locale}
            />
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
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-sand-100 text-ocean-700
                  hover:bg-sand-200 transition-colors"
              >
                {locale === 'ko' ? '취소' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (onRemove) {
                    onRemove();
                  }
                  setShowConfirmDelete(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white
                  hover:bg-red-600 transition-colors"
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

function DataRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ocean-600">{label}</span>
      <span className="font-medium text-ocean-800">{value}</span>
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

interface MetricDef {
  label: string;
  values: number[];
  color: string;
  unit: string;
}

const metricKeys = ['score', 'wave', 'period', 'wind', 'waterTemp', 'airTemp'] as const;
type SingleMetric = typeof metricKeys[number];

function ForecastChart({ hours, data, locale }: ForecastChartProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('overview');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const metrics: Record<SingleMetric, MetricDef> = {
    score: {
      label: locale === 'ko' ? '점수' : 'Score',
      values: data.scores,
      color: '#22c55e',
      unit: '',
    },
    wave: {
      label: locale === 'ko' ? '파고' : 'Wave',
      values: data.waveHeights,
      color: '#3b82f6',
      unit: 'm',
    },
    period: {
      label: locale === 'ko' ? '파주기' : 'Period',
      values: data.wavePeriods,
      color: '#8b5cf6',
      unit: 's',
    },
    wind: {
      label: locale === 'ko' ? '풍속' : 'Wind',
      values: data.windSpeeds,
      color: '#f59e0b',
      unit: 'm/s',
    },
    waterTemp: {
      label: locale === 'ko' ? '수온' : 'Water',
      values: data.waterTemps,
      color: '#06b6d4',
      unit: '°C',
    },
    airTemp: {
      label: locale === 'ko' ? '기온' : 'Air',
      values: data.airTemps,
      color: '#ef4444',
      unit: '°C',
    },
  };

  const overviewLabel = locale === 'ko' ? '전체' : 'All';

  // SVG dimensions
  const W = 360;
  const H = activeMetric === 'overview' ? 160 : 120;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const toX = (i: number) => padL + (i / (hours.length - 1)) * chartW;

  const buildLine = (values: number[], min: number, rng: number) =>
    values.map((v, i) => {
      const y = padT + chartH - ((v - min) / rng) * chartH;
      return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

  const buildArea = (linePath: string, len: number) =>
    `${linePath} L${toX(len - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

  // Invisible hit-area columns for hover detection
  const colWidth = chartW / (hours.length - 1);
  const renderHoverColumns = () =>
    hours.map((_, i) => (
      <rect
        key={i}
        x={toX(i) - colWidth / 2}
        y={padT}
        width={colWidth}
        height={chartH}
        fill="transparent"
        onMouseEnter={() => setHoveredIdx(i)}
        onMouseLeave={() => setHoveredIdx(null)}
        style={{ cursor: 'crosshair' }}
      />
    ));

  // Metric toggle buttons (shared between views)
  const renderToggle = () => (
    <div className="flex flex-wrap gap-1 mb-2">
      <button
        onClick={() => { setActiveMetric('overview'); setHoveredIdx(null); }}
        className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${
          activeMetric === 'overview'
            ? 'text-white bg-ocean-600'
            : 'bg-sand-100 text-ocean-600 hover:bg-sand-200'
        }`}
      >
        {overviewLabel}
      </button>
      {metricKeys.map((key) => (
        <button
          key={key}
          onClick={() => { setActiveMetric(key); setHoveredIdx(null); }}
          className={`px-2 py-1 text-[10px] font-medium rounded-lg transition-colors ${
            activeMetric === key
              ? 'text-white'
              : 'bg-sand-100 text-ocean-600 hover:bg-sand-200'
          }`}
          style={activeMetric === key ? { backgroundColor: metrics[key].color } : undefined}
        >
          {metrics[key].label}
        </button>
      ))}
    </div>
  );

  if (activeMetric === 'overview') {
    const allSeries = metricKeys.map((key) => {
      const m = metrics[key];
      const min = Math.min(...m.values);
      const max = Math.max(...m.values);
      const rng = max - min || 1;
      const normalized = m.values.map(v => (v - min) / rng);
      return { ...m, key, normalized, min, max, rng };
    });

    const normToY = (n: number) => padT + chartH - n * chartH;

    // Tooltip position
    const tooltipX = hoveredIdx !== null ? toX(hoveredIdx) : 0;
    const tooltipOnRight = hoveredIdx !== null && hoveredIdx < hours.length / 2;

    return (
      <div>
        {renderToggle()}

        <div className="relative">
          {/* Overview SVG Chart */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((n, i) => (
              <line
                key={i}
                x1={padL} y1={normToY(n)} x2={W - padR} y2={normToY(n)}
                stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3"
              />
            ))}

            {/* Render each metric line */}
            {allSeries.map((series) => {
              const path = series.normalized.map((n, i) => {
                const y = normToY(n);
                return `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${y.toFixed(1)}`;
              }).join(' ');

              const area = `${path} L${toX(series.normalized.length - 1).toFixed(1)},${(padT + chartH).toFixed(1)} L${padL},${(padT + chartH).toFixed(1)} Z`;

              return (
                <g key={series.key}>
                  <path d={area} fill={series.color} opacity={0.05} />
                  <path
                    d={path} fill="none" stroke={series.color}
                    strokeWidth={hoveredIdx !== null ? 1 : 1.5}
                    strokeLinecap="round" strokeLinejoin="round"
                    opacity={hoveredIdx !== null ? 0.4 : 1}
                  />
                  {series.values.map((_, i) => (
                    <circle
                      key={i}
                      cx={toX(i)} cy={normToY(series.normalized[i])}
                      r={hoveredIdx === i ? 3.5 : 2}
                      fill="white" stroke={series.color}
                      strokeWidth={hoveredIdx === i ? 2 : 1.5}
                      opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1}
                    />
                  ))}
                </g>
              );
            })}

            {/* Hover vertical guide line */}
            {hoveredIdx !== null && (
              <line
                x1={tooltipX} y1={padT} x2={tooltipX} y2={padT + chartH}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3"
              />
            )}

            {/* X-axis labels */}
            {hours.map((h, i) => (
              <text
                key={i} x={toX(i)} y={H - 6}
                textAnchor="middle" fontSize={9}
                fill={hoveredIdx === i ? '#0f172a' : '#64748b'}
                fontWeight={hoveredIdx === i ? 'bold' : 'normal'}
              >
                {h.toString().padStart(2, '0')}:00
              </text>
            ))}

            {/* Hover hit areas (on top of everything) */}
            {renderHoverColumns()}
          </svg>

          {/* Floating tooltip card */}
          {hoveredIdx !== null && (
            <div
              className="absolute bg-white rounded-lg shadow-lg border border-sand-200 px-2.5 py-2 pointer-events-none z-10"
              style={{
                top: 4,
                ...(tooltipOnRight
                  ? { left: `${(tooltipX / W) * 100 + 3}%` }
                  : { right: `${100 - (tooltipX / W) * 100 + 3}%` }),
              }}
            >
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

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 mt-1">
          {allSeries.map((series) => (
            <button
              key={series.key}
              onClick={() => setActiveMetric(series.key as ChartMetric)}
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: series.color }} />
              <span className="text-[10px] text-ocean-600">{series.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Single metric view
  const m = metrics[activeMetric as SingleMetric];
  const values = m.values;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const toY = (v: number) => padT + chartH - ((v - minVal) / range) * chartH;

  const linePath = buildLine(values, minVal, range);
  const areaPath = buildArea(linePath, values.length);

  const yTicks = [minVal, minVal + range / 2, maxVal];

  return (
    <div>
      {renderToggle()}

      <div className="relative">
        {/* SVG Chart */}
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padL} y1={toY(tick)} x2={W - padR} y2={toY(tick)}
                stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3"
              />
              <text x={padL + 2} y={toY(tick) - 3} textAnchor="start" fontSize={8} fill="#94a3b8">
                {activeMetric === 'score' ? Math.round(tick) : tick.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill={m.color} opacity={0.1} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={m.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points and labels */}
          {values.map((v, i) => (
            <g key={i} opacity={hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1}>
              <circle cx={toX(i)} cy={toY(v)} r={hoveredIdx === i ? 5 : 3.5} fill="white" stroke={m.color} strokeWidth={2} />
              <text x={toX(i)} y={toY(v) - 7} textAnchor="middle" fontSize={9} fontWeight="bold" fill={m.color}>
                {activeMetric === 'score' ? v : v.toFixed(1)}{m.unit}
              </text>
            </g>
          ))}

          {/* Hover vertical guide line */}
          {hoveredIdx !== null && (
            <line
              x1={toX(hoveredIdx)} y1={padT} x2={toX(hoveredIdx)} y2={padT + chartH}
              stroke="#94a3b8" strokeWidth={1} strokeDasharray="4,3"
            />
          )}

          {/* X-axis labels */}
          {hours.map((h, i) => (
            <text
              key={i} x={toX(i)} y={H - 6}
              textAnchor="middle" fontSize={9}
              fill={hoveredIdx === i ? '#0f172a' : '#64748b'}
              fontWeight={hoveredIdx === i ? 'bold' : 'normal'}
            >
              {h.toString().padStart(2, '0')}:00
            </text>
          ))}

          {/* Hover hit areas */}
          {renderHoverColumns()}
        </svg>

        {/* Floating tooltip for single metric */}
        {hoveredIdx !== null && (
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-sand-200 px-2.5 py-1.5 pointer-events-none z-10"
            style={{
              top: 4,
              ...(hoveredIdx < hours.length / 2
                ? { left: `${(toX(hoveredIdx) / W) * 100 + 3}%` }
                : { right: `${100 - (toX(hoveredIdx) / W) * 100 + 3}%` }),
            }}
          >
            <div className="text-[10px] font-semibold text-ocean-700">
              {hours[hoveredIdx].toString().padStart(2, '0')}:00
            </div>
            <div className="text-sm font-bold" style={{ color: m.color }}>
              {activeMetric === 'score' ? values[hoveredIdx] : values[hoveredIdx].toFixed(1)}{m.unit}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
