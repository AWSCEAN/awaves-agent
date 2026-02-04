'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { lineString } from '@turf/helpers';
import length from '@turf/length';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import type {
  SurfSpot,
  SavedSpotMarker,
  LocationForecast,
  MeasureDistancePoint
} from '@/types';
import SpotPopup from './SpotPopup';
import { getMockForecastForLocation } from '@/lib/mockForecastData';

interface EnhancedMapboxMapProps {
  spots: SurfSpot[];
  savedSpots: SavedSpotMarker[];
  onSpotClick: (spot: SurfSpot) => void;
  selectedSpotId?: string;
  selectedDate: Date;
  showWindParticles: boolean;
}

export default function EnhancedMapboxMap({
  spots,
  savedSpots,
  onSpotClick,
  selectedSpotId,
  selectedDate,
  showWindParticles
}: EnhancedMapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [popupSpot, setPopupSpot] = useState<SurfSpot | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<
    MeasureDistancePoint[]
  >([]);
  const measureMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const measureLineRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize Mapbox access token with proper type checking
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not configured');
      return;
    }
    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [128.5, 36.5],
      zoom: 6,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: 'Search location...',
    });

    // Type assertion for MapboxGeocoder compatibility with IControl
    map.current.addControl(
      geocoder as unknown as mapboxgl.IControl,
      'top-left'
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    Object.values(markersRef.current).forEach((marker) =>
      marker.remove()
    );
    markersRef.current = {};

    spots.forEach((spot) => {
      const el = createMarkerElement(
        '🏄',
        spot.id === selectedSpotId ? '#ff6b6b' : '#0091c3',
        () => {
          onSpotClick(spot);
          showPopup(spot);
        }
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      markersRef.current[spot.id] = marker;
    });

    savedSpots.forEach((savedSpot) => {
      const el = createMarkerElement(
        '❤️',
        '#e74c3c',
        () => {
          const forecast = getMockForecastForLocation(
            savedSpot.latitude,
            savedSpot.longitude,
            savedSpot.name
          );
          showSavedSpotInfo(savedSpot, forecast);
        }
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([savedSpot.longitude, savedSpot.latitude])
        .addTo(map.current!);

      markersRef.current[`saved-${savedSpot.id}`] = marker;
    });
  }, [spots, savedSpots, selectedSpotId, onSpotClick]);

  useEffect(() => {
    if (!map.current || !selectedSpotId) return;

    const spot = spots.find((s) => s.id === selectedSpotId);
    if (spot) {
      map.current.flyTo({
        center: [spot.longitude, spot.latitude],
        zoom: 10,
        duration: 1500,
      });
    }
  }, [selectedSpotId, spots]);

  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (measuring) {
        addMeasurePoint(e.lngLat);
      } else {
        setPopupSpot(null);
        showLocationForecast(e.lngLat);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [measuring]);

  const createMarkerElement = (
    emoji: string,
    color: string,
    onClick: () => void
  ): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'surf-marker';
    el.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `;
    // Use textContent instead of innerHTML to prevent XSS
    el.textContent = emoji;

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    return el;
  };

  const showPopup = (spot: SurfSpot) => {
    if (!map.current || !mapContainer.current) return;

    const point = map.current.project([
      spot.longitude,
      spot.latitude
    ]);
    setPopupPosition({ x: point.x, y: point.y });
    setPopupSpot(spot);
  };

  const showSavedSpotInfo = (
    savedSpot: SavedSpotMarker,
    forecast: LocationForecast
  ) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Saved spot clicked:', savedSpot, forecast);
    }
  };

  const showLocationForecast = (lngLat: mapboxgl.LngLat) => {
    const forecast = getMockForecastForLocation(
      lngLat.lat,
      lngLat.lng,
      'Custom Location'
    );
    if (process.env.NODE_ENV === 'development') {
      console.log('Location forecast:', forecast);
    }
  };

  const toggleMeasure = () => {
    if (measuring) {
      clearMeasure();
    }
    setMeasuring(!measuring);
  };

  const addMeasurePoint = (lngLat: mapboxgl.LngLat) => {
    const point: MeasureDistancePoint = {
      id: `point-${Date.now()}`,
      latitude: lngLat.lat,
      longitude: lngLat.lng,
      order: measurePoints.length,
    };

    const newPoints = [...measurePoints, point];
    setMeasurePoints(newPoints);

    const el = document.createElement('div');
    el.className = 'measure-marker';
    el.style.cssText = `
      width: 12px;
      height: 12px;
      background: #ff6b6b;
      border: 2px solid white;
      border-radius: 50%;
      cursor: pointer;
    `;

    const marker = new mapboxgl.Marker(el)
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(map.current!);

    measureMarkersRef.current.push(marker);

    if (newPoints.length >= 2) {
      drawMeasureLine(newPoints);
    }
  };

  const drawMeasureLine = (points: MeasureDistancePoint[]) => {
    if (!map.current) return;

    if (measureLineRef.current) {
      map.current.removeLayer(measureLineRef.current);
      map.current.removeSource(measureLineRef.current);
    }

    const coordinates = points.map((p) => [
      p.longitude,
      p.latitude
    ]);
    const line = lineString(coordinates);
    const distance = length(line, { units: 'kilometers' });

    const sourceId = 'measure-line';
    measureLineRef.current = sourceId;

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: line,
    });

    map.current.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': '#ff6b6b',
        'line-width': 3,
        'line-dasharray': [2, 2],
      },
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`Distance: ${distance.toFixed(2)} km`);
    }
  };

  const clearMeasure = () => {
    measureMarkersRef.current.forEach((m) => m.remove());
    measureMarkersRef.current = [];

    if (measureLineRef.current && map.current) {
      if (map.current.getLayer(measureLineRef.current)) {
        map.current.removeLayer(measureLineRef.current);
      }
      if (map.current.getSource(measureLineRef.current)) {
        map.current.removeSource(measureLineRef.current);
      }
      measureLineRef.current = null;
    }

    setMeasurePoints([]);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={toggleMeasure}
          className={`btn-secondary ${
            measuring ? 'bg-ocean-500 text-white' : ''
          }`}
        >
          {measuring ? 'Stop Measuring' : 'Measure Distance'}
        </button>

        {measuring && measurePoints.length > 0 && (
          <button
            onClick={clearMeasure}
            className="btn-outline text-sm"
          >
            Clear ({measurePoints.length} points)
          </button>
        )}
      </div>

      {popupSpot && (
        <SpotPopup
          spot={popupSpot}
          position={popupPosition}
          onClose={() => setPopupSpot(null)}
        />
      )}
    </div>
  );
}
