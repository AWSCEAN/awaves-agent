'use client';

import { useRef, useState, useLayoutEffect } from 'react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import type { SurfForecast } from '@/types';

interface ForecastPopupProps {
  locationName: string;
  forecast: SurfForecast;
  position: { x: number; y: number };
  coordinates: { latitude: number; longitude: number };
  isSaved?: boolean;
  onClose: () => void;
  onSave?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

export default function ForecastPopup({
  locationName,
  forecast,
  position,
  coordinates,
  isSaved = false,
  onClose,
  onSave
}: ForecastPopupProps) {
  const t = useTranslations('forecast');
  const locale = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  const popupRef = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [nudgeX, setNudgeX] = useState(0);

  useLayoutEffect(() => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    const parent = popupRef.current.offsetParent as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();

    // Flip below if popup would clip above the container
    setFlipped(position.y - rect.height - 10 < 0);

    // Nudge horizontally if popup clips left or right
    const halfW = rect.width / 2;
    if (position.x - halfW < 0) {
      setNudgeX(halfW - position.x + 8);
    } else if (position.x + halfW > parentRect.width) {
      setNudgeX(parentRect.width - position.x - halfW - 8);
    } else {
      setNudgeX(0);
    }
  }, [position]);

  const getScoreLabel = (score: number): string => {
    if (score >= 4) return t('scoreLabels.good');
    if (score >= 3) return t('scoreLabels.fair');
    return t('scoreLabels.poor');
  };

  const getSafetyLabel = (score: number): string => {
    if (score >= 4) return t('safetyLabels.safe');
    if (score >= 3) return t('safetyLabels.moderate');
    return t('safetyLabels.caution');
  };

  const transform = flipped
    ? `translate(calc(-50% + ${nudgeX}px), 10px)`
    : `translate(calc(-50% + ${nudgeX}px), calc(-100% - 10px))`;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform,
      }}
    >
      <div className="glass rounded-xl shadow-lg min-w-[300px] max-w-[350px]">
        <div className="bg-ocean-gradient px-4 py-3 flex justify-between">
          <div>
            <h3 className="font-semibold text-white">
              {locationName}
            </h3>
            <p className="text-xs text-white/80">
              {format(new Date(forecast.date), 'PPP', { locale: dateLocale })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-white/50 rounded-lg">
              <div className="text-xs text-ocean-600 mb-1">
                {t('surfScore')}
              </div>
              <div className={`text-2xl font-bold ${
                getScoreColor(forecast.surfScore)
              }`}>
                {forecast.surfScore}/5
              </div>
              <div className="text-xs text-ocean-600">
                {getScoreLabel(forecast.surfScore)}
              </div>
            </div>

            <div className="text-center p-2 bg-white/50 rounded-lg">
              <div className="text-xs text-ocean-600 mb-1">
                {t('safety')}
              </div>
              <div className={`text-2xl font-bold ${
                getScoreColor(forecast.safetyScore)
              }`}>
                {forecast.safetyScore}/5
              </div>
              <div className="text-xs text-ocean-600">
                {getSafetyLabel(forecast.safetyScore)}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <DataRow
              label={t('dataLabels.waveHeight')}
              value={`${forecast.waveHeight}m - ${
                forecast.waveHeightMax
              }m`}
            />
            <DataRow
              label={t('dataLabels.wavePeriod')}
              value={`${forecast.wavePeriod}s`}
            />
            <DataRow
              label={t('dataLabels.windSpeed')}
              value={`${forecast.windSpeed} km/h`}
            />
            {forecast.swellHeight && (
              <DataRow
                label={t('dataLabels.swellHeight')}
                value={`${forecast.swellHeight}m`}
              />
            )}
            <DataRow
              label={t('dataLabels.waterTemp')}
              value={`${forecast.waterTemperature.toFixed(1)}°C`}
            />
            <DataRow
              label={t('dataLabels.airTemp')}
              value={`${forecast.airTemperature.toFixed(1)}°C`}
            />
          </div>

          {onSave && (
            <div className="mt-3 pt-3 border-t border-sand-200">
              <button
                onClick={onSave}
                disabled={isSaved}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  isSaved
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-ocean-500 text-white hover:bg-ocean-600'
                }`}
              >
                {isSaved ? t('saved') : t('saveSpot')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Arrow - flips direction based on placement */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 ${
          flipped
            ? 'top-0 -translate-y-full'
            : 'bottom-0 translate-y-full'
        }`}
        style={{
          left: `calc(50% - ${nudgeX}px)`,
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          ...(flipped
            ? { borderBottom: '8px solid rgba(255, 255, 255, 0.7)' }
            : { borderTop: '8px solid rgba(255, 255, 255, 0.7)' }),
        }}
      />
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
    <div className="flex justify-between">
      <span className="text-ocean-600">{label}:</span>
      <span className="font-medium text-ocean-800">{value}</span>
    </div>
  );
}
