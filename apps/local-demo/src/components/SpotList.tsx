import type { SurfInfo, SurferLevel } from '../types';
import { getMetricsForLevel, getSurfScoreColors, getGradeBgColor, getGradeTextColor } from '../services/surfInfoService';

interface SpotListProps {
  spots: SurfInfo[];
  surferLevel: SurferLevel;
  savedIds: Set<string>;
  onSpotClick: (spot: SurfInfo) => void;
}

export default function SpotList({ spots, surferLevel, savedIds, onSpotClick }: SpotListProps) {
  const sorted = [...spots].sort((a, b) => {
    const aM = getMetricsForLevel(a.derivedMetrics, surferLevel);
    const bM = getMetricsForLevel(b.derivedMetrics, surferLevel);
    return bM.surfScore - aM.surfScore;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-ocean-400 gap-2">
        <svg className="w-12 h-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">No spots found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-sand-100">
        {sorted.map((spot) => {
          const metrics = getMetricsForLevel(spot.derivedMetrics, surferLevel);
          const colors = getSurfScoreColors(metrics.surfScore);
          const isSaved = savedIds.has(spot.locationId);

          return (
            <button
              key={`${spot.locationId}-${spot.surfTimestamp}`}
              onClick={() => onSpotClick(spot)}
              className="w-full px-4 py-3 text-left hover:bg-sand-50 active:bg-sand-100 transition-colors flex items-center gap-3"
            >
              {/* Score badge */}
              <div className={`flex-none w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${colors.bg}`}>
                <span className={`text-lg font-bold leading-none ${colors.text}`}>
                  {metrics.surfGrade}
                </span>
                <span className={`text-xs leading-none mt-0.5 ${colors.text} opacity-80`}>
                  {Math.round(metrics.surfScore)}
                </span>
              </div>

              {/* Spot info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ocean-800 truncate">{spot.nameKo || spot.name}</span>
                  {isSaved && (
                    <svg className="w-3.5 h-3.5 text-sunset-500 flex-none" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
                </div>
                <div className="text-xs text-ocean-500 truncate">{spot.name}</div>
                <div className="text-xs text-ocean-400">{spot.regionKo || spot.region}</div>
              </div>

              {/* Conditions */}
              <div className="flex-none text-right space-y-0.5">
                <div className="text-xs text-ocean-600">
                  <span className="font-medium">{spot.conditions.waveHeight.toFixed(1)}m</span>
                  <span className="text-ocean-400"> · {spot.conditions.wavePeriod.toFixed(0)}s</span>
                </div>
                <div className="text-xs text-ocean-400">
                  💨 {spot.conditions.windSpeed.toFixed(0)}kn
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
