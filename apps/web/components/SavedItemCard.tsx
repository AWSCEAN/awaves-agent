'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SavedItemResponse, FeedbackStatus, Language } from '@/types';

interface SpotNameInfo {
  name: string;
  nameKo?: string;
  city?: string;
  region?: string;
  country?: string;
  cityKo?: string;
  regionKo?: string;
  countryKo?: string;
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
  const [showFeedback, setShowFeedback] = useState(false);
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

  // Resolve display name: spotName from surf data > address from save > coordinates fallback
  const resolvedSpotName = spotName
    ? (lang === 'ko' && spotName.nameKo ? spotName.nameKo : spotName.name)
    : null;
  const locationName = resolvedSpotName || item.address || `${item.location_id.replace('#', ', ')}`;
  const regionLabel = lang === 'ko' && spotName?.regionKo ? spotName.regionKo : (item.region || spotName?.region);

  // Compact timestamp: MM/DD HH:mm
  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const hh = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  return (
    <div className="card relative overflow-hidden break-inside-avoid">
      {/* Card Content - Dimmed when flag_change is true */}
      <div className={item.flag_change ? 'opacity-40 pointer-events-none' : ''}>

        {/* ── Row 1: name + region/timestamp + remove ── */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ocean-800 text-sm truncate leading-tight">{locationName}</h3>
            <div className="flex items-center gap-1.5 text-xs text-ocean-500 min-w-0 mt-0.5">
              {(regionLabel || spotName?.country || item.country) && (
                <span className="truncate">
                  {regionLabel}{(regionLabel && (spotName?.country || item.country)) ? ' · ' : ''}{lang === 'ko' && spotName?.countryKo ? spotName.countryKo : (item.country || spotName?.country)}
                </span>
              )}
              {item.surf_timestamp && (
                <span className="flex-shrink-0 text-ocean-400">· {formatTimestamp(item.surf_timestamp)}</span>
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

        {/* ── Row 2: score + grade + level + progress bar ── */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-baseline gap-0.5 flex-shrink-0">
            <span className="text-2xl font-bold text-ocean-800">{item.surf_score.toFixed(0)}</span>
            <span className="text-xs text-ocean-400">/100</span>
          </div>
          <span className={`text-sm font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${gradeColors[item.surf_grade] || 'bg-gray-100 text-gray-700'}`}>
            {item.surf_grade}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700 font-medium flex-shrink-0">
            {t.level}: {getLevelLabel(item.surfer_level)}
          </span>
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-ocean-400 to-ocean-600 rounded-full transition-all"
              style={{ width: `${item.surf_score}%` }}
            />
          </div>
        </div>

        {/* ── Row 3: 4-column conditions ── */}
        <div className="grid grid-cols-4 gap-1 mb-2">
          {item.wave_height !== undefined && (
            <div className="flex flex-col items-center bg-sand-50 rounded px-1 py-1.5">
              <span className="text-sm leading-none">🌊</span>
              <span className="text-[10px] text-ocean-500 mt-0.5 truncate w-full text-center">{t.waveHeight}</span>
              <span className="text-xs font-semibold text-ocean-800">{Number(item.wave_height).toFixed(1)}m</span>
            </div>
          )}
          {item.wave_period !== undefined && (
            <div className="flex flex-col items-center bg-sand-50 rounded px-1 py-1.5">
              <span className="text-sm leading-none">⏱️</span>
              <span className="text-[10px] text-ocean-500 mt-0.5 truncate w-full text-center">{t.wavePeriod}</span>
              <span className="text-xs font-semibold text-ocean-800">{Number(item.wave_period).toFixed(1)}s</span>
            </div>
          )}
          {item.wind_speed !== undefined && (
            <div className="flex flex-col items-center bg-sand-50 rounded px-1 py-1.5">
              <span className="text-sm leading-none">💨</span>
              <span className="text-[10px] text-ocean-500 mt-0.5 truncate w-full text-center">{t.windSpeed}</span>
              <span className="text-xs font-semibold text-ocean-800">{Number(item.wind_speed).toFixed(1)}m/s</span>
            </div>
          )}
          {item.water_temperature !== undefined && (
            <div className="flex flex-col items-center bg-sand-50 rounded px-1 py-1.5">
              <span className="text-sm leading-none">🌡️</span>
              <span className="text-[10px] text-ocean-500 mt-0.5 truncate w-full text-center">{t.waterTemp}</span>
              <span className="text-xs font-semibold text-ocean-800">{Number(item.water_temperature).toFixed(1)}°C</span>
            </div>
          )}
        </div>

        {/* ── Row 4: departure + feedback toggle + map link ── */}
        <div className="flex items-center gap-2">
          {item.departure_date && (
            <span className="text-[10px] text-ocean-400 flex-shrink-0">
              {t.departureDate}: {formatDate(item.departure_date)}
            </span>
          )}
          {!feedbackStatus && new Date(item.surf_timestamp) < new Date() && (
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="text-[10px] text-ocean-400 hover:text-ocean-600 flex-shrink-0 underline"
            >
              {lang === 'ko' ? '평가하기' : 'Rate'}
            </button>
          )}
          {feedbackStatus && (
            <span className="text-[10px] text-green-600 flex-shrink-0">✓ {t.feedbackThanks}</span>
          )}
          <Link
            href={`/map?lat=${item.location_id.split('#')[0]}&lng=${item.location_id.split('#')[1]}`}
            className="ml-auto text-xs font-medium text-ocean-600 hover:text-ocean-800 flex-shrink-0"
          >
            {t.viewOnMap} →
          </Link>
        </div>

        {/* ── Inline feedback (shown on toggle) ── */}
        {showFeedback && !feedbackStatus && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1.5 border-t border-sand-100">
            <span className="text-[10px] text-ocean-500">{t.feedbackQuestion}</span>
            <button
              onClick={() => {
                onFeedback('POSITIVE');
                setShowFeedbackToast(true);
                setShowFeedback(false);
                setTimeout(() => setShowFeedbackToast(false), 2000);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-50 hover:bg-green-100 text-green-700"
            >
              <span>👍</span> {t.feedbackYes}
            </button>
            <button
              onClick={() => {
                onFeedback('NEGATIVE');
                setShowFeedbackToast(true);
                setShowFeedback(false);
                setTimeout(() => setShowFeedbackToast(false), 2000);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-50 hover:bg-red-100 text-red-700"
            >
              <span>👎</span> {t.feedbackNo}
            </button>
            <button
              onClick={() => { onFeedback('DEFERRED'); setShowFeedback(false); }}
              className="px-2 py-0.5 rounded text-xs bg-gray-50 hover:bg-gray-100 text-gray-600"
            >
              {t.feedbackLater}
            </button>
          </div>
        )}
      </div>

      {/* Change Notification Overlay */}
      {item.flag_change && (
        <div className="absolute inset-0 flex items-center justify-center p-3 bg-black/30 backdrop-blur-[2px] rounded-lg z-10">
          <div className="bg-white rounded-2xl shadow-xl p-4 max-w-[92%] w-full">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-ocean-800 text-sm">{t.changeDetected}</h4>
            </div>
            {item.change_message && (
              <ChangeMessageDisplay message={item.change_message} lang={lang} />
            )}
            <button
              onClick={onAcknowledgeChange}
              className="btn-primary w-full py-1.5 text-sm mt-2"
            >
              {t.acknowledgeChange}
            </button>
          </div>
        </div>
      )}

      {/* Feedback Thank You Overlay */}
      {showFeedbackToast && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl z-10">
          <div className="bg-white rounded-xl shadow-xl px-5 py-4 text-center">
            <div className="text-3xl mb-1">🤙</div>
            <p className="text-sm font-semibold text-ocean-800">{t.feedbackThanks}</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-ocean-800 text-sm mb-4">{t.confirmRemove}</p>
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

const fieldLabels: Record<string, { ko: string; en: string; unit?: string }> = {
  surfScore: { ko: '서핑 점수', en: 'Surf Score', unit: '/100' },
  surfGrade: { ko: '등급', en: 'Grade' },
  waveHeight: { ko: '파고', en: 'Wave Height', unit: 'm' },
  wavePeriod: { ko: '파주기', en: 'Wave Period', unit: 's' },
  windSpeed: { ko: '풍속', en: 'Wind Speed', unit: 'm/s' },
  waterTemperature: { ko: '수온', en: 'Water Temp', unit: '°C' },
};

function formatValue(value: number | string, _field: string): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

function ChangeMessageDisplay({ message, lang }: { message: string; lang: Language }) {
  try {
    const data = JSON.parse(message);
    if (data.changes && Array.isArray(data.changes)) {
      return (
        <div className="space-y-1.5">
          {data.changes.map((c: { field: string; old: number | string; new: number | string }, i: number) => {
            const meta = fieldLabels[c.field];
            const label = meta?.[lang] || c.field;
            const unit = meta?.unit || '';
            const oldVal = formatValue(c.old, c.field);
            const newVal = formatValue(c.new, c.field);
            const isScoreUp = c.field === 'surfScore' && typeof c.new === 'number' && typeof c.old === 'number' && c.new > c.old;
            const isScoreDown = c.field === 'surfScore' && typeof c.new === 'number' && typeof c.old === 'number' && c.new < c.old;
            return (
              <div key={i} className="bg-sand-50 rounded-lg p-2">
                <div className="text-xs text-ocean-500 font-medium mb-1">{label}</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-sm text-ocean-400 line-through">
                    {oldVal}{unit}
                  </span>
                  <svg className={`w-4 h-4 flex-shrink-0 ${isScoreUp ? 'text-green-500' : isScoreDown ? 'text-red-500' : 'text-ocean-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className={`text-lg font-bold ${isScoreUp ? 'text-green-600' : isScoreDown ? 'text-red-600' : 'text-ocean-800'}`}>
                    {newVal}{unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  } catch {
    // Not JSON — render as plain text (backward compatible)
  }
  return <p className="text-ocean-600 text-sm">{message}</p>;
}
