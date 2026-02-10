'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import type { SavedListItem } from '@/types';
import { getGradeBgColor } from '@/lib/services/surfInfoService';

interface SavedSpotCardProps {
  item: SavedListItem;
  onRemove: () => void;
}

export default function SavedSpotCard({ item, onRemove }: SavedSpotCardProps) {
  const t = useTranslations('saved');
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const displayName = locale === 'ko' && item.nameKo ? item.nameKo : item.name;
  const [latStr, lngStr] = item.locationId.split('#');

  return (
    <div className="card relative">
      {/* Header with grade badge */}
      <div className="aspect-video bg-gradient-to-br from-ocean-400 to-ocean-600 rounded-lg mb-3 flex items-center justify-center gap-3">
        <span className={`px-3 py-1.5 rounded-lg text-white text-2xl font-bold ${getGradeBgColor(item.surfGrade)}`}>
          {item.surfGrade}
        </span>
        <span className="text-white text-3xl font-bold">
          {Math.round(item.surfScore)}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-ocean-800 text-lg line-clamp-2">{displayName}</h3>
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
            <span>{item.region}, {item.country}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-0.5 bg-sand-100 rounded text-ocean-600">
            🌊 {item.waveHeight.toFixed(1)}m
          </span>
          <span className="px-2 py-0.5 bg-sand-100 rounded text-ocean-600">
            💨 {item.windSpeed.toFixed(1)} km/h
          </span>
          <span className="px-2 py-0.5 bg-sand-100 rounded text-ocean-600">
            🌡️ {item.waterTemperature.toFixed(1)}°C
          </span>
        </div>

        <div className="text-xs text-ocean-500">
          {t('savedOn')} {format(new Date(item.savedAt), 'PPP', { locale: dateLocale })}
        </div>

        <Link
          href={`/map?lat=${latStr}&lng=${lngStr}`}
          className="btn-primary w-full text-center block mt-3 text-sm"
        >
          {t('viewOnMap')}
        </Link>
      </div>
    </div>
  );
}
