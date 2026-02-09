import { memo } from 'react';
import type { SurfConditions } from '@/types';

interface SurfDataPopupProps {
  conditions: SurfConditions;
}

export default memo(function SurfDataPopup({ conditions }: SurfDataPopupProps) {
  const {
    waveHeight,
    waveHeightMax,
    wavePeriod,
    windSpeed,
    waterTemperature,
    airTemperature,
    tide,
    rating,
  } = conditions;

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      {/* Wave Height */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🌊</span>
        <div>
          <div className="text-ocean-800 font-medium">
            {waveHeight}
            {waveHeightMax && waveHeightMax !== waveHeight ? `-${waveHeightMax}` : ''}m
          </div>
          <div className="text-ocean-500 text-xs">Wave Height</div>
        </div>
      </div>

      {/* Wave Period */}
      <div className="flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <div>
          <div className="text-ocean-800 font-medium">{wavePeriod}s</div>
          <div className="text-ocean-500 text-xs">Period</div>
        </div>
      </div>

      {/* Wind */}
      <div className="flex items-center gap-2">
        <span className="text-lg">💨</span>
        <div>
          <div className="text-ocean-800 font-medium">{windSpeed} km/h</div>
          <div className="text-ocean-500 text-xs">Wind</div>
        </div>
      </div>

      {/* Tide */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <div>
          <div className="text-ocean-800 font-medium capitalize">{tide}</div>
          <div className="text-ocean-500 text-xs">Tide</div>
        </div>
      </div>

      {/* Water Temp */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🌡️</span>
        <div>
          <div className="text-ocean-800 font-medium">{waterTemperature}°C</div>
          <div className="text-ocean-500 text-xs">Water</div>
        </div>
      </div>

      {/* Air Temp */}
      <div className="flex items-center gap-2">
        <span className="text-lg">☀️</span>
        <div>
          <div className="text-ocean-800 font-medium">{airTemperature}°C</div>
          <div className="text-ocean-500 text-xs">Air</div>
        </div>
      </div>

      {/* Rating */}
      <div className="col-span-2 flex items-center justify-center gap-1 mt-2 pt-2 border-t border-sand-200">
        <span className="text-sm text-ocean-600 mr-2">Conditions:</span>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
});
