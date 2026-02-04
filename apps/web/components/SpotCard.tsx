import Link from 'next/link';
import type { SurfSpot, Language } from '@/types';

interface SpotCardProps {
  spot: SurfSpot;
  lang: Language;
  onRemove?: () => void;
  showRemove?: boolean;
}

const difficultyLabels = {
  ko: {
    beginner: '초급',
    intermediate: '중급',
    advanced: '고급',
    expert: '전문가',
  },
  en: {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  },
};

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-orange-100 text-orange-700',
  expert: 'bg-red-100 text-red-700',
};

export default function SpotCard({ spot, lang, onRemove, showRemove }: SpotCardProps) {
  const name = lang === 'ko' && spot.nameKo ? spot.nameKo : spot.name;
  const conditions = spot.currentConditions;

  return (
    <div className="card relative">
      {/* Image placeholder */}
      <div className="aspect-video bg-ocean-gradient rounded-lg mb-3 flex items-center justify-center text-4xl">
        🏄‍♂️
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-ocean-800 text-lg">{name}</h3>
          {showRemove && onRemove && (
            <button
              onClick={onRemove}
              className="text-coral-500 hover:text-coral-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-ocean-600">
          <span>{spot.region}</span>
          <span>•</span>
          <span>{spot.country}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[spot.difficulty]}`}
          >
            {difficultyLabels[lang][spot.difficulty]}
          </span>
          <span className="text-xs text-ocean-500">{spot.waveType}</span>
        </div>

        {conditions && (
          <div className="flex items-center gap-4 pt-2 text-sm">
            <div className="flex items-center gap-1">
              <span>🌊</span>
              <span className="text-ocean-700 font-medium">
                {conditions.waveHeight}
                {conditions.waveHeightMax ? `-${conditions.waveHeightMax}` : ''}m
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span>💨</span>
              <span className="text-ocean-700">{conditions.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-xs ${star <= conditions.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/map?spot=${spot.id}`}
          className="btn-primary w-full text-center block mt-3 text-sm"
        >
          {lang === 'ko' ? '지도에서 보기' : 'View on Map'}
        </Link>
      </div>
    </div>
  );
}
