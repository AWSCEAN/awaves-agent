'use client';

import type { SurfSpot, Language } from '@/types';
import SurfDataPopup from './SurfDataPopup';

interface InfoPanelProps {
  spot: SurfSpot | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

const translations = {
  ko: {
    close: '닫기',
    details: '상세 정보',
    conditions: '현재 컨디션',
    bestSeason: '최적 시즌',
    waveType: '파도 유형',
    difficulty: '난이도',
    description: '설명',
    save: '저장하기',
    saved: '저장됨',
    noConditions: '현재 컨디션 정보가 없습니다',
    difficulties: {
      beginner: '초급',
      intermediate: '중급',
      advanced: '고급',
      expert: '전문가',
    },
  },
  en: {
    close: 'Close',
    details: 'Details',
    conditions: 'Current Conditions',
    bestSeason: 'Best Season',
    waveType: 'Wave Type',
    difficulty: 'Difficulty',
    description: 'Description',
    save: 'Save Spot',
    saved: 'Saved',
    noConditions: 'No current conditions available',
    difficulties: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    },
  },
};

const seasonLabels = {
  ko: {
    spring: '봄',
    summer: '여름',
    fall: '가을',
    winter: '겨울',
  },
  en: {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
  },
};

export default function InfoPanel({ spot, isOpen, onClose, lang }: InfoPanelProps) {
  const t = translations[lang];

  if (!isOpen || !spot) return null;

  const name = lang === 'ko' && spot.nameKo ? spot.nameKo : spot.name;
  const description = lang === 'ko' && spot.descriptionKo ? spot.descriptionKo : spot.description;

  return (
    <div
      className={`absolute top-0 right-0 h-full w-full max-w-md glass-dark shadow-2xl z-40 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Location */}
          <div className="text-white/70">
            {spot.region}, {spot.country}
          </div>

          {/* Current Conditions */}
          <section>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              {t.conditions}
            </h3>
            {spot.currentConditions ? (
              <div className="bg-white/10 rounded-lg p-4">
                <SurfDataPopup conditions={spot.currentConditions} />
              </div>
            ) : (
              <p className="text-white/50 text-sm">{t.noConditions}</p>
            )}
          </section>

          {/* Details */}
          <section>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              {t.details}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">{t.difficulty}</span>
                <span className="text-white font-medium">
                  {t.difficulties[spot.difficulty]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">{t.waveType}</span>
                <span className="text-white font-medium">{spot.waveType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">{t.bestSeason}</span>
                <span className="text-white font-medium">
                  {spot.bestSeason
                    .map((s) => seasonLabels[lang][s as keyof typeof seasonLabels.en] || s)
                    .join(', ')}
                </span>
              </div>
            </div>
          </section>

          {/* Description */}
          {description && (
            <section>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                {t.description}
              </h3>
              <p className="text-white/80 leading-relaxed">{description}</p>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10">
          <button className="btn-primary w-full">💾 {t.save}</button>
        </div>
      </div>
    </div>
  );
}
