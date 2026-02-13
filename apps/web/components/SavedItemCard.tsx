'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SavedItemResponse, FeedbackStatus, Language } from '@/types';

interface SpotNameInfo {
  name: string;
  nameKo?: string;
  regionKo?: string;
  countryKo?: string;
  cityKo?: string;
}

interface SavedItemCardProps {
  item: SavedItemResponse;
  lang: Language;
  spotName?: SpotNameInfo;
  onRemove: () => void;
  onAcknowledgeChange: () => void;
  onFeedback: (status: FeedbackStatus) => void;
  feedbackStatus?: FeedbackStatus;
}

const gradeColors: Record<string, string> = {
  A: 'bg-green-100 text-green-700',
  B: 'bg-blue-100 text-blue-700',
  C: 'bg-yellow-100 text-yellow-700',
  D: 'bg-orange-100 text-orange-700',
  F: 'bg-red-100 text-red-700',
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
    departureDate: '출발 예정',
    forecastDate: '예측 일시',
    changeDetected: '조건이 변경되었습니다',
    acknowledgeChange: '확인',
    feedbackQuestion: '이 서핑 예측이 도움이 되었나요?',
    feedbackYes: '좋아요',
    feedbackNo: '아쉬워요',
    feedbackLater: '나중에',
    feedbackThanks: '피드백 감사합니다!',
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
    departureDate: 'Departure',
    forecastDate: 'Forecast Date',
    changeDetected: 'Conditions Changed',
    acknowledgeChange: 'Got it',
    feedbackQuestion: 'Was this surf prediction helpful?',
    feedbackYes: 'Good',
    feedbackNo: 'Not Good',
    feedbackLater: 'Later',
    feedbackThanks: 'Thanks for feedback!',
    confirmRemove: 'Are you sure you want to remove this?',
    cancel: 'Cancel',
  },
};

export default function SavedItemCard({
  item,
  lang,
  spotName,
  onRemove,
  onAcknowledgeChange,
  onFeedback,
  feedbackStatus,
}: SavedItemCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const t = translations[lang];

  const getLevelLabel = (level: string): string => {
    if (lang === 'ko') {
      switch (level) {
        case 'BEGINNER': return '초급';
        case 'INTERMEDIATE': return '중급';
        case 'ADVANCED': return '상급';
        default: return level;
      }
    }
    return level;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleRemoveClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmRemove = () => {
    setShowConfirmDelete(false);
    onRemove();
  };

  // Resolve display name: spotName from surf data > address from save > coordinates fallback
  const resolvedSpotName = spotName
    ? (lang === 'ko' && spotName.nameKo ? spotName.nameKo : spotName.name)
    : null;
  const locationName = resolvedSpotName || item.address || `${item.location_id.replace('#', ', ')}`;

  return (
    <div className="card relative overflow-hidden break-inside-avoid">
      {/* Card Content - Dimmed when flag_change is true */}
      <div className={item.flag_change ? 'opacity-40 pointer-events-none' : ''}>
        {/* Header with location and remove button */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-ocean-800 text-lg line-clamp-1">{locationName}</h3>
            <div className="flex items-center gap-2 text-sm text-ocean-600">
              {item.region && <span>{lang === 'ko' && spotName?.regionKo ? spotName.regionKo : item.region}</span>}
              {item.region && item.country && <span>•</span>}
              {item.country && <span>{lang === 'ko' && spotName?.countryKo ? spotName.countryKo : item.country}</span>}
            </div>
            {item.surf_timestamp && (
              <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md shadow-sm border border-ocean-200">
                <svg className="w-3.5 h-3.5 text-ocean-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-ocean-700">
                  {(() => {
                    const date = new Date(item.surf_timestamp);
                    const year = date.getFullYear();
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `${year}-${month}-${day} ${hours}:${minutes}`;
                  })()}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleRemoveClick}
            className="text-sunset-500 hover:text-sunset-600 text-sm p-1"
            title={t.remove}
          >
            ✕
          </button>
        </div>

        {/* Score and Grade - Prominent Display */}
        <div className="flex items-center gap-3 mb-4">
          {/* Surf Score */}
          <div className="flex-1 bg-gradient-to-br from-ocean-50 to-sand-50 rounded-xl p-3 border border-ocean-100">
            <div className="text-xs text-ocean-500 font-medium mb-1">{t.surfScore}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-ocean-800">{item.surf_score.toFixed(0)}</span>
              <span className="text-sm text-ocean-400">/100</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-ocean-400 to-ocean-600 rounded-full transition-all"
                style={{ width: `${item.surf_score}%` }}
              />
            </div>
          </div>
          {/* Grade Badge */}
          <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center shadow-sm ${gradeColors[item.surf_grade] || 'bg-gray-100'}`}>
            <span className="text-2xl font-bold">{item.surf_grade}</span>
            <span className="text-[10px] opacity-80">{t.surfGrade}</span>
          </div>
        </div>

        {/* Level Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm px-3 py-1 rounded-lg bg-ocean-100 text-ocean-700 font-medium">
            {t.level}: {getLevelLabel(item.surfer_level)}
          </span>
        </div>

        {/* Conditions Grid */}
        <div className="grid grid-cols-2 gap-2">
          {item.wave_height !== undefined && (
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">🌊</span>
              <div>
                <div className="text-xs text-ocean-500">{t.waveHeight}</div>
                <div className="font-semibold text-ocean-800">{Number(item.wave_height).toFixed(1)}m</div>
              </div>
            </div>
          )}
          {item.wave_period !== undefined && (
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">⏱️</span>
              <div>
                <div className="text-xs text-ocean-500">{t.wavePeriod}</div>
                <div className="font-semibold text-ocean-800">{Number(item.wave_period).toFixed(1)}s</div>
              </div>
            </div>
          )}
          {item.wind_speed !== undefined && (
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">💨</span>
              <div>
                <div className="text-xs text-ocean-500">{t.windSpeed}</div>
                <div className="font-semibold text-ocean-800">{Number(item.wind_speed).toFixed(1)}km/h</div>
              </div>
            </div>
          )}
          {item.water_temperature !== undefined && (
            <div className="flex items-center gap-2 bg-sand-50 rounded-lg px-2.5 py-1.5">
              <span className="text-lg">🌡️</span>
              <div>
                <div className="text-xs text-ocean-500">{t.waterTemp}</div>
                <div className="font-semibold text-ocean-800">{Number(item.water_temperature).toFixed(1)}°C</div>
              </div>
            </div>
          )}
        </div>

        {/* Departure Date */}
        {item.departure_date && (
          <div className="text-xs text-ocean-500 mt-3">
            <span>{t.departureDate}: {formatDate(item.departure_date)}</span>
          </div>
        )}

        {/* Feedback Section - only show when no feedback given yet and date is in the past */}
        {!feedbackStatus && new Date(item.surf_timestamp) < new Date() && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm text-ocean-600 mb-2">{t.feedbackQuestion}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onFeedback('POSITIVE');
                  setShowFeedbackToast(true);
                  setTimeout(() => setShowFeedbackToast(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium transition-colors"
              >
                <span>👍</span> {t.feedbackYes}
              </button>
              <button
                onClick={() => {
                  onFeedback('NEGATIVE');
                  setShowFeedbackToast(true);
                  setTimeout(() => setShowFeedbackToast(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium transition-colors"
              >
                <span>👎</span> {t.feedbackNo}
              </button>
              <button
                onClick={() => onFeedback('DEFERRED')}
                className="py-1.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-sm transition-colors"
              >
                {t.feedbackLater}
              </button>
            </div>
          </div>
        )}

        {/* View on Map Button */}
        <Link
          href={`/map?lat=${item.location_id.split('#')[0]}&lng=${item.location_id.split('#')[1]}`}
          className="btn-primary w-full text-center block text-sm mt-3"
        >
          {t.viewOnMap}
        </Link>
      </div>

      {/* Change Notification Overlay */}
      {item.flag_change && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/20 rounded-lg">
          <div className="bg-white rounded-xl shadow-lg p-5 max-w-[90%] text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h4 className="font-bold text-ocean-800 text-lg mb-2">{t.changeDetected}</h4>
            {item.change_message && (
              <p className="text-ocean-600 text-sm mb-4">{item.change_message}</p>
            )}
            <button
              onClick={onAcknowledgeChange}
              className="btn-primary px-6 py-2 text-sm"
            >
              {t.acknowledgeChange}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Thank You Overlay */}
      {showFeedbackToast && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl z-10">
          <div className="bg-white rounded-xl shadow-xl px-6 py-5 text-center">
            <div className="text-3xl mb-2">🤙</div>
            <p className="text-sm font-semibold text-ocean-800">{t.feedbackThanks}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-ocean-800 mb-4">{t.confirmRemove}</p>
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="btn-outline text-sm"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmRemove}
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