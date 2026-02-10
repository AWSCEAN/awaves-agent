'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import type { SurfInfo } from '@/types';
import { getGradeBgColor } from '@/lib/services/surfInfoService';

interface SpotDetailPanelProps {
  surfInfo: SurfInfo;
  coordinates: { latitude: number; longitude: number };
  isSaved?: boolean;
  onClose: () => void;
  onSave?: () => void;
  onRemove?: () => void;
  showLocationPrompt?: boolean;
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
  showLocationPrompt = false
}: SpotDetailPanelProps) {
  const locale = useLocale();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const displayName = locale === 'ko' && surfInfo.nameKo ? surfInfo.nameKo : surfInfo.name;
  const { surfScore, surfGrade, surfingLevel } = surfInfo.derivedMetrics;
  const { waveHeight, wavePeriod, windSpeed, waterTemperature } = surfInfo.conditions;

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
                  className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0"
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
            <p className="text-sm text-white/80">
              {surfInfo.region}, {surfInfo.country}
            </p>
            <div className="flex justify-between items-end">
              <p className="text-xs text-white/60">
                {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
              </p>
              <p className="text-xs text-white/70">
                {(() => {
                  const date = new Date(surfInfo.SurfTimestamp);
                  const year = date.getFullYear();
                  const month = date.getMonth() + 1;
                  const day = date.getDate();
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  return locale === 'ko'
                    ? `${year}년 ${month}월 ${day}일 · ${hours}:${minutes}`
                    : `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} · ${hours}:${minutes}`;
                })()}
              </p>
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
          <div className={`flex-1 p-2 rounded-xl ${getGradeBgColor(surfGrade)} text-center`}>
            <div className="text-xs text-white/80 font-medium mb-0.5">
              {locale === 'ko' ? '등급' : 'Grade'}
            </div>
            <div className="text-2xl font-bold text-white">
              {surfGrade}
            </div>
          </div>
          {/* Level Box */}
          <div className="flex-1 p-2 rounded-xl bg-ocean-100 border border-ocean-200 text-center">
            <div className="text-xs text-ocean-600 font-medium mb-0.5">
              {locale === 'ko' ? '숙련도' : 'Level'}
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
              <div className="font-bold text-ocean-800">{windSpeed.toFixed(0)}km/h</div>
            </div>
            <div>
              <div className="text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '수온' : 'Water Temp'}</div>
              <div className="font-bold text-ocean-800">{waterTemperature.toFixed(0)}°C</div>
            </div>
          </div>
        </div>

        {/* Hourly Forecast Table - Rows: metrics, Columns: time */}
        <div className="bg-sand-50 rounded-xl p-2.5">
          <h4 className="text-sm font-semibold text-ocean-800 mb-1.5 flex items-center gap-2">
            <span className="text-base">📊</span>
            {locale === 'ko' ? '시간대별 예보' : 'Hourly Forecast'}
          </h4>
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
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파고' : 'Wave Height'}</td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{(waveHeight * v).toFixed(1)}m</td>
                  ))}
                </tr>
                {/* Wave Period Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '파주기' : 'Wave Period'}</td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{(wavePeriod * v).toFixed(1)}s</td>
                  ))}
                </tr>
                {/* Wind Speed Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '풍속' : 'Wind Speed'}</td>
                  {[0.9, 0.95, 1.0, 1.05, 0.98].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{Math.round(windSpeed * v)}km/h</td>
                  ))}
                </tr>
                {/* Water Temperature Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '수온' : 'Water Temp'}</td>
                  {[0, 0, 0, 0, 0].map((_, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{Math.round(waterTemperature)}°</td>
                  ))}
                </tr>
                {/* Air Temperature Row */}
                <tr className="border-b border-ocean-100">
                  <td className="py-1 px-1.5 font-medium text-ocean-600 whitespace-nowrap">{locale === 'ko' ? '기온' : 'Air Temp'}</td>
                  {[0.95, 1.0, 1.1, 1.15, 1.05].map((v, idx) => (
                    <td key={idx} className="py-1 px-1.5 text-center">{Math.round((waterTemperature + 5) * v)}°</td>
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
