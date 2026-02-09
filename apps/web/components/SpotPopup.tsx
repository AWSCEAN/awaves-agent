import { memo } from 'react';
import type { SurfSpot } from '@/types';
import SurfDataPopup from './SurfDataPopup';

interface SpotPopupProps {
  spot: SurfSpot;
  position: { x: number; y: number };
  onClose: () => void;
}

export default memo(function SpotPopup({ spot, position, onClose }: SpotPopupProps) {
  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="glass rounded-xl shadow-lg min-w-[280px] max-w-[320px] overflow-hidden">
        {/* Header */}
        <div className="bg-ocean-gradient px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">{spot.name}</h3>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 text-sm text-ocean-600 mb-3">
            <span>{spot.region}</span>
            <span>•</span>
            <span className="capitalize">{spot.difficulty}</span>
          </div>

          {spot.currentConditions ? (
            <SurfDataPopup conditions={spot.currentConditions} />
          ) : (
            <p className="text-ocean-500 text-sm">No current conditions available</p>
          )}

          <div className="mt-3 pt-3 border-t border-sand-200 flex gap-2">
            <button className="btn-primary flex-1 text-sm py-1.5">
              View Details
            </button>
            <button className="btn-outline text-sm py-1.5 px-3">
              💾
            </button>
          </div>
        </div>
      </div>

      {/* Arrow */}
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
});
