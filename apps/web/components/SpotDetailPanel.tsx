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
  onRemove
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
      case 'BEGINNER': return locale === 'ko' ? '초급' : 'Beginner';
      case 'INTERMEDIATE': return locale === 'ko' ? '중급' : 'Intermediate';
      case 'ADVANCED': return locale === 'ko' ? '상급' : 'Advanced';
      default: return level;
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl z-40 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="bg-ocean-gradient px-4 py-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-white text-lg truncate">
              {displayName}
            </h3>
            <p className="text-sm text-white/80 mt-1">
              {surfInfo.region}, {surfInfo.country}
            </p>
            <p className="text-xs text-white/60 mt-1">
              {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
            </p>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Score + Grade */}
        <div className="flex justify-center gap-3">
          <div className={`text-center p-4 rounded-xl border ${getScoreBgColor(surfScore)} flex-1`}>
            <div className="text-xs text-ocean-600 mb-1 font-medium">
              {locale === 'ko' ? '서핑 점수' : 'Surf Score'}
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(surfScore)}`}>
              {Math.round(surfScore)}
            </div>
            <div className="text-xs text-ocean-600 mt-1">
              {getScoreLabel(surfScore)}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className={`w-12 h-12 rounded-xl ${getGradeBgColor(surfGrade)} text-white flex items-center justify-center text-xl font-bold`}>
              {surfGrade}
            </div>
            <div className="text-xs text-ocean-600 font-medium">
              {getLevelLabel(surfingLevel)}
            </div>
          </div>
        </div>

        {/* Wave Conditions */}
        <div className="bg-sand-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🌊</span>
            {locale === 'ko' ? '파도 조건' : 'Wave Conditions'}
          </h4>
          <div className="space-y-2">
            <DataRow
              label={locale === 'ko' ? '파고' : 'Wave Height'}
              value={`${waveHeight.toFixed(1)}m`}
            />
            <DataRow
              label={locale === 'ko' ? '파주기' : 'Wave Period'}
              value={`${wavePeriod.toFixed(1)}s`}
            />
          </div>
        </div>

        {/* Wind Conditions */}
        <div className="bg-sand-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
            <span className="text-lg">💨</span>
            {locale === 'ko' ? '바람 조건' : 'Wind Conditions'}
          </h4>
          <div className="space-y-2">
            <DataRow
              label={locale === 'ko' ? '풍속' : 'Wind Speed'}
              value={`${windSpeed.toFixed(0)} km/h`}
            />
          </div>
        </div>

        {/* Temperature */}
        <div className="bg-sand-50 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🌡️</span>
            {locale === 'ko' ? '온도' : 'Temperature'}
          </h4>
          <div className="space-y-2">
            <DataRow
              label={locale === 'ko' ? '수온' : 'Water Temp'}
              value={`${waterTemperature.toFixed(0)}°C`}
            />
          </div>
        </div>
      </div>

      {/* Footer - Save/Remove Button */}
      {(onSave || (isSaved && onRemove)) && (
        <div className="p-4 border-t border-sand-200">
          <button
            onClick={() => {
              if (isSaved && onRemove) {
                setShowConfirmDelete(true);
              } else if (onSave) {
                onSave();
              }
            }}
            className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isSaved
                ? 'bg-coral-500 text-white hover:bg-coral-600'
                : 'bg-ocean-500 text-white hover:bg-ocean-600'
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
            {isSaved ? (locale === 'ko' ? '저장 취소' : 'Remove from Saved') : (locale === 'ko' ? '저장' : 'Save Spot')}
          </button>
        </div>
      )}

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
