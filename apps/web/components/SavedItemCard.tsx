'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SavedItemResponse, FeedbackStatus, Language } from '@/types';

interface SavedItemCardProps {
  item: SavedItemResponse;
  lang: Language;
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
    waveHeight: 'Wave',
    wavePeriod: 'Period',
    windSpeed: 'Wind',
    waterTemp: 'Water',
    surfScore: 'Surf Score',
    surfGrade: 'Grade',
    level: 'Level',
    departureDate: 'Departure',
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
  onRemove,
  onAcknowledgeChange,
  onFeedback,
  feedbackStatus,
}: SavedItemCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);
  const t = translations[lang];

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

  const locationName = item.address || `${item.location_id.replace('#', ', ')}`;

  return (
    <div className="card relative overflow-hidden break-inside-avoid">
      {/* Card Content - Dimmed when flag_change is true */}
      <div className={item.flag_change ? 'opacity-40 pointer-events-none' : ''}>
        {/* Header with location and remove button */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-ocean-800 text-lg line-clamp-1">{locationName}</h3>
            <div className="flex items-center gap-2 text-sm text-ocean-600">
              {item.region && <span>{item.region}</span>}
              {item.region && item.country && <span>•</span>}
              {item.country && <span>{item.country}</span>}
            </div>
          </div>
          <button
            onClick={handleRemoveClick}
            className="text-sunset-500 hover:text-sunset-600 text-sm p-1"
            title={t.remove}
          >
            ✕
          </button>
        </div>

        {/* Grades and Level */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${gradeColors[item.surf_grade] || 'bg-gray-100'}`}>
            {t.surfGrade}: {item.surf_grade}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700">
            {t.level}: {item.surfer_level}
          </span>
        </div>

        {/* Surf Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-ocean-600">{t.surfScore}</span>
            <span className="font-bold text-ocean-800">{item.surf_score.toFixed(0)}/100</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ocean-400 to-ocean-600 rounded-full"
              style={{ width: `${item.surf_score}%` }}
            />
          </div>
        </div>

        {/* Conditions Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {item.wave_height !== undefined && (
            <div className="flex items-center gap-1">
              <span>🌊</span>
              <span className="text-ocean-600">{t.waveHeight}:</span>
              <span className="font-medium text-ocean-800">{item.wave_height}m</span>
            </div>
          )}
          {item.wave_period !== undefined && (
            <div className="flex items-center gap-1">
              <span>⏱️</span>
              <span className="text-ocean-600">{t.wavePeriod}:</span>
              <span className="font-medium text-ocean-800">{item.wave_period}s</span>
            </div>
          )}
          {item.wind_speed !== undefined && (
            <div className="flex items-center gap-1">
              <span>💨</span>
              <span className="text-ocean-600">{t.windSpeed}:</span>
              <span className="font-medium text-ocean-800">{item.wind_speed}km/h</span>
            </div>
          )}
          {item.water_temperature !== undefined && (
            <div className="flex items-center gap-1">
              <span>🌡️</span>
              <span className="text-ocean-600">{t.waterTemp}:</span>
              <span className="font-medium text-ocean-800">{item.water_temperature}°C</span>
            </div>
          )}
        </div>

        {/* Departure Date */}
        {item.departure_date && (
          <div className="text-xs text-ocean-500 mt-3">
            <span>{t.departureDate}: {formatDate(item.departure_date)}</span>
          </div>
        )}

        {/* Feedback Section - only show when no feedback given yet */}
        {!feedbackStatus && (
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