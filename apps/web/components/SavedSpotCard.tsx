'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import type { SavedSpotMarker } from '@/types';

interface SavedSpotCardProps {
  spot: SavedSpotMarker;
  onRemove: () => void;
}

export default function SavedSpotCard({ spot, onRemove }: SavedSpotCardProps) {
  const t = useTranslations('saved');
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  return (
    <div className="card relative">
      {/* Header with heart icon */}
      <div className="aspect-video bg-gradient-to-br from-coral-400 to-coral-600 rounded-lg mb-3 flex items-center justify-center text-4xl">
        ❤️
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-ocean-800 text-lg line-clamp-2">{spot.name}</h3>
          <button
            onClick={onRemove}
            className="text-coral-500 hover:text-coral-600 text-sm ml-2 flex-shrink-0"
            title={t('remove')}
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-ocean-600">
          <div className="flex items-center gap-1">
            <span>📍</span>
            <span>{spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}</span>
          </div>
        </div>

        <div className="text-xs text-ocean-500">
          {t('savedOn')} {format(new Date(spot.savedAt), 'PPP', { locale: dateLocale })}
        </div>

        {spot.notes && (
          <p className="text-sm text-ocean-600 italic">{spot.notes}</p>
        )}

        <Link
          href={`/map?lat=${spot.latitude}&lng=${spot.longitude}`}
          className="btn-primary w-full text-center block mt-3 text-sm"
        >
          {t('viewOnMap')}
        </Link>
      </div>
    </div>
  );
}
