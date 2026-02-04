'use client';

import { format } from 'date-fns';
import type { SurfForecast } from '@/types';

interface ForecastPopupProps {
  locationName: string;
  forecast: SurfForecast;
  position: { x: number; y: number };
  onClose: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 4) return 'text-green-600';
  if (score >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreLabel(score: number): string {
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Fair';
  return 'Poor';
}

function getSafetyLabel(score: number): string {
  if (score >= 4) return 'Safe';
  if (score >= 3) return 'Moderate';
  return 'Caution';
}

export default function ForecastPopup({
  locationName,
  forecast,
  position,
  onClose
}: ForecastPopupProps) {
  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="glass rounded-xl shadow-lg min-w-[300px] max-w-[350px]">
        <div className="bg-ocean-gradient px-4 py-3 flex justify-between">
          <div>
            <h3 className="font-semibold text-white">
              {locationName}
            </h3>
            <p className="text-xs text-white/80">
              {format(new Date(forecast.date), 'MMM d, yyyy')}
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
                Surf Score
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
                Safety
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
              label="Wave Height"
              value={`${forecast.waveHeight}m - ${
                forecast.waveHeightMax
              }m`}
            />
            <DataRow
              label="Wave Period"
              value={`${forecast.wavePeriod}s`}
            />
            <DataRow
              label="Wind Speed"
              value={`${forecast.windSpeed} km/h`}
            />
            {forecast.swellHeight && (
              <DataRow
                label="Swell Height"
                value={`${forecast.swellHeight}m`}
              />
            )}
            <DataRow
              label="Water Temp"
              value={`${forecast.waterTemperature.toFixed(1)}°C`}
            />
            <DataRow
              label="Air Temp"
              value={`${forecast.airTemperature.toFixed(1)}°C`}
            />
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgba(255, 255, 255, 0.7)',
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
