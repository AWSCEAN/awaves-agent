import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import type { SurfInfo, SurferLevel } from '../types';
import { getMetricsForLevel, getSurfScoreColors } from '../services/surfInfoService';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

interface MapViewProps {
  spots: SurfInfo[];
  surferLevel: SurferLevel;
  savedIds: Set<string>;
  onSpotClick: (spot: SurfInfo) => void;
}

// Korea center
const DEFAULT_CENTER: [number, number] = [128.0, 36.5];
const DEFAULT_ZOOM = 6.5;

function makeMarkerEl(grade: string, score: number, isSaved: boolean): HTMLDivElement {
  const colors = getSurfScoreColors(score);
  const el = document.createElement('div');
  el.className = 'mapbox-marker';
  el.style.cssText = `
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    color: white;
    background-color: ${colors.hex};
    border: 2px solid ${isSaved ? '#f97316' : 'white'};
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    cursor: pointer;
    transition: transform 0.15s ease;
    font-family: system-ui, -apple-system, sans-serif;
    user-select: none;
  `;
  el.textContent = grade;
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
  el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
  return el;
}

export default function MapView({ spots, surferLevel, savedIds, onSpotClick }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!TOKEN) {
      console.error('[MapView] VITE_MAPBOX_TOKEN is not set');
      return;
    }

    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    mapRef.current = map;

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when spots / level / savedIds change
  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    spots.forEach(spot => {
      const metrics = getMetricsForLevel(spot.derivedMetrics, surferLevel);
      const isSaved = savedIds.has(spot.locationId);
      const el = makeMarkerEl(metrics.surfGrade, metrics.surfScore, isSaved);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSpotClick(spot);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([spot.geo.lng, spot.geo.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [spots, surferLevel, savedIds, onSpotClick]);

  // Run after map style loads and whenever data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.once('load', updateMarkers);
    }
  }, [updateMarkers]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* No token warning */}
      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center bg-sand-100">
          <div className="text-center p-6 max-w-xs">
            <p className="text-ocean-700 font-semibold mb-2">Mapbox token missing</p>
            <p className="text-sm text-ocean-500">
              Add <code className="bg-sand-200 px-1 rounded">VITE_MAPBOX_TOKEN</code> to{' '}
              <code className="bg-sand-200 px-1 rounded">apps/local-demo/.env</code>
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-2.5 shadow-lg text-xs space-y-1.5">
        {[
          { grade: 'A', color: '#22c55e', label: '≥70' },
          { grade: 'B', color: '#84cc16', label: '60–69' },
          { grade: 'C', color: '#eab308', label: '40–59' },
          { grade: 'D', color: '#f97316', label: '20–39' },
          { grade: 'E', color: '#ef4444', label: '<20' },
        ].map(({ grade, color, label }) => (
          <div key={grade} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
              style={{ backgroundColor: color }}
            >
              {grade}
            </div>
            <span className="text-ocean-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Spot count */}
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 shadow text-xs text-ocean-600">
        {spots.length} spots
      </div>
    </div>
  );
}
