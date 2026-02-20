'use client';

import { useLocale } from 'next-intl';
import type { PredictionResult } from '@/types';
import { getGradeBgColor, getGradeTextColor, getGradeBorderColor } from '@/lib/services/surfInfoService';
import { useSwipeDown } from '@/hooks/useSwipeDown';

interface PredictionResultPanelProps {
  result: PredictionResult;
  surferLevel: string;
  isOpen: boolean;
  onClose: () => void;
  showLocationPrompt?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-red-600';
}

function getLevelLabel(level: string, locale: string): string {
  switch (level) {
    case 'BEGINNER': return locale === 'ko' ? '초급' : 'Beginner';
    case 'INTERMEDIATE': return locale === 'ko' ? '중급' : 'Intermediate';
    case 'ADVANCED': return locale === 'ko' ? '상급' : 'Advanced';
    case 'beginner': return locale === 'ko' ? '초급' : 'Beginner';
    case 'intermediate': return locale === 'ko' ? '중급' : 'Intermediate';
    case 'advanced': return locale === 'ko' ? '상급' : 'Advanced';
    default: return level;
  }
}

export default function PredictionResultPanel({
  result,
  surferLevel,
  isOpen,
  onClose,
  showLocationPrompt = false,
}: PredictionResultPanelProps) {
  const locale = useLocale();
  const swipe = useSwipeDown(onClose);

  if (!isOpen) return null;

  const displayName = locale === 'ko' && result.spotNameKo ? result.spotNameKo : result.spotName;
  const { surfScore, surfGrade, surfingLevel } = result.derivedMetrics;
  const dateStr = result.surfTimestamp.split('T')[0];

  return (
    <div
      className={`
        mobile-sheet-bottom fixed left-0 right-0 z-40 flex flex-col bg-white shadow-xl overflow-hidden
        animate-slide-up rounded-t-2xl max-h-[70vh]
        md:bottom-0 md:animate-none md:animate-slide-in-left md:rounded-none md:right-auto md:left-0 md:max-h-none md:w-96
        transition-all duration-300
        ${showLocationPrompt ? 'md:top-[100px]' : 'md:top-14'}
      `}
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
    >
      {/* Mobile drag handle */}
      <div className="md:hidden bottom-sheet-handle" />

      {/* Header - Indigo/Purple gradient for prediction branding */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
              {locale === 'ko' ? 'AI 예측' : 'AI Prediction'}
            </span>
            <h2 className="text-white font-bold text-2xl mt-1">
              {result.weekRange}
            </h2>
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

      {/* Content */}
      <div className="flex-1 p-6 space-y-8 overflow-y-auto">
        {/* Location */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-ocean-800">{displayName}</h3>
          <p className="text-sm text-ocean-500 mt-1">
            {result.geo.lat.toFixed(4)}, {result.geo.lng.toFixed(4)}
          </p>
          <p className="text-sm text-ocean-400 mt-0.5">{dateStr}</p>
        </div>

        {/* Score + Grade - Large centered display */}
        <div className="flex items-center justify-center gap-10">
          {/* Score */}
          <div className="text-center">
            <div className={`text-6xl font-bold ${getScoreColor(surfScore)}`}>
              {Math.round(surfScore)}
            </div>
            <div className="text-sm text-ocean-400 mt-1">/100</div>
          </div>

          {/* Divider */}
          <div className="w-px h-20 bg-sand-200" />

          {/* Grade */}
          <div className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 ${getGradeBgColor(surfGrade)} ${getGradeTextColor(surfGrade)} ${getGradeBorderColor(surfGrade)}`}>
            <span className="text-4xl font-bold">{surfGrade}</span>
            <span className="text-xs opacity-70">{locale === 'ko' ? '등급' : 'Grade'}</span>
          </div>
        </div>

        {/* Surfer Level Badge */}
        <div className="flex justify-center">
          <span className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200">
            {locale === 'ko' ? '서퍼 레벨' : 'Surfer Level'}: {getLevelLabel(surferLevel, locale)}
          </span>
        </div>

        {/* Recommended Level */}
        <div className="bg-sand-50 rounded-xl p-5 text-center">
          <div className="text-xs text-ocean-500 mb-2">
            {locale === 'ko' ? '추천 서핑 레벨' : 'Recommended Surfing Level'}
          </div>
          <div className="text-xl font-bold text-ocean-800">
            {getLevelLabel(surfingLevel, locale)}
          </div>
        </div>
      </div>
    </div>
  );
}
