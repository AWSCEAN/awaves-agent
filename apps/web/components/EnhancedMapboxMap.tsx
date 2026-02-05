'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { lineString } from '@turf/helpers';
import length from '@turf/length';
import { format } from 'date-fns';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import type {
  SurfSpot,
  SurfForecast,
  SavedSpotMarker,
  LocationForecast,
  MeasureDistancePoint
} from '@/types';
import ForecastPopup from './ForecastPopup';
import { getMockForecastForLocation, mockLocationForecasts } from '@/lib/mockForecastData';

export type OverlayMode = 'surf' | 'safety' | 'none';

interface EnhancedMapboxMapProps {
  spots: SurfSpot[];
  savedSpots: SavedSpotMarker[];
  selectedDate: Date;
  showWindParticles: boolean;
  overlayMode?: OverlayMode;
  onSaveSpot?: (spot: { name: string; latitude: number; longitude: number; id?: string }) => void;
  locale?: 'en' | 'ko';
  center?: { lat: number; lng: number } | null;
  showGeocoder?: boolean;
  showMeasureDistance?: boolean;
}

/**
 * Generate a grid of regional overlay data points across Korea
 * for visualizing surf/safety scores on the map.
 */
function generateRegionalOverlayPoints(): LocationForecast[] {
  const points: LocationForecast[] = [...mockLocationForecasts];
  const existingCoords = new Set(
    mockLocationForecasts.map(
      (f) => `${f.latitude.toFixed(1)},${f.longitude.toFixed(1)}`
    )
  );

  // Generate grid points across the world (lat -60 to 70, lng -180 to 180)
  for (let lat = -60; lat <= 70; lat += 10) {
    for (let lng = -180; lng <= 170; lng += 10) {
      const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
      if (existingCoords.has(key)) continue;

      const forecast = getMockForecastForLocation(
        lat,
        lng,
        `Region ${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lng).toFixed(0)}°${lng >= 0 ? 'E' : 'W'}`
      );
      points.push(forecast);
      existingCoords.add(key);
    }
  }

  return points;
}

function getSurfScoreColor(score: number): string {
  if (score >= 4) return '#22c55e'; // green
  if (score >= 3) return '#eab308'; // yellow
  return '#ef4444'; // red
}

function getSafetyScoreColor(score: number): string {
  if (score >= 4) return '#22c55e'; // green
  if (score >= 3) return '#f97316'; // orange
  return '#ef4444'; // red
}

export default function EnhancedMapboxMap({
  spots,
  savedSpots,
  selectedDate,
  showWindParticles,
  overlayMode = 'none',
  onSaveSpot,
  locale = 'en',
  center,
  showGeocoder = true,
  showMeasureDistance = true,
}: EnhancedMapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [forecastPopup, setForecastPopup] = useState<{
    name: string;
    forecast: SurfForecast;
    position: { x: number; y: number };
    coordinates: { latitude: number; longitude: number };
  } | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<
    MeasureDistancePoint[]
  >([]);
  const measureMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const measureLineRef = useRef<string | null>(null);

  // Bug 3: Cache for regional overlay data
  const overlayPointsRef = useRef<LocationForecast[]>([]);

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

    // Only add geocoder if showGeocoder is true
    if (showGeocoder) {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: locale === 'ko' ? '위치 검색...' : 'Search location...',
        language: locale,
      });
      geocoderRef.current = geocoder;

      // Type assertion for MapboxGeocoder compatibility with IControl
      map.current.addControl(
        geocoder as unknown as mapboxgl.IControl,
        'top-left'
      );
    }

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    // Pre-generate regional overlay data points
    overlayPointsRef.current = generateRegionalOverlayPoints();

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
        '\u{1F3C4}',
        '#0091c3',
        () => {
          showForecastAtCoords(
            spot.longitude,
            spot.latitude,
            spot.name,
            selectedDate
          );
        }
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      markersRef.current[spot.id] = marker;
    });

    savedSpots.forEach((savedSpot) => {
      const el = createMarkerElement(
        '\u2764\uFE0F',
        '#e74c3c',
        () => {
          showSavedSpotInfo(savedSpot);
        }
      );

      const marker = new mapboxgl.Marker(el)
        .setLngLat([savedSpot.longitude, savedSpot.latitude])
        .addTo(map.current!);

      markersRef.current[`saved-${savedSpot.id}`] = marker;
    });
  }, [spots, savedSpots, selectedDate]);

  // Update geocoder language when locale changes
  useEffect(() => {
    if (geocoderRef.current) {
      geocoderRef.current.setLanguage(locale);
      geocoderRef.current.setPlaceholder(
        locale === 'ko' ? '위치 검색...' : 'Search location...'
      );
    }
  }, [locale]);

  // Fly to center when it changes
  useEffect(() => {
    if (!map.current || !center) return;
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: 12,
      duration: 1500,
    });
  }, [center]);

  // Click handler that uses selectedDate and locale
  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (measuring) {
        addMeasurePoint(e.lngLat);
      } else {
        setForecastPopup(null);
        showLocationForecast(e.lngLat, selectedDate);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [measuring, selectedDate, locale]);

  // Bug 3: Update overlay when selectedDate or overlayMode changes
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    const updateOverlay = () => {
      // Remove existing overlay layer and source
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('score-overlay-layer')) {
          mapInstance.removeLayer('score-overlay-layer');
        }
        if (mapInstance.getStyle() && mapInstance.getSource('score-overlay-source')) {
          mapInstance.removeSource('score-overlay-source');
        }
      } catch {
        return; // Map may be destroyed
      }

      if (overlayMode === 'none') return;

      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
      const points = overlayPointsRef.current;

      const features = points
        .map((point) => {
          const dayForecast = point.forecasts.find(
            (f) => f.date === selectedDateStr
          );
          if (!dayForecast) return null;

          const score =
            overlayMode === 'surf'
              ? dayForecast.surfScore
              : dayForecast.safetyScore;
          const color =
            overlayMode === 'surf'
              ? getSurfScoreColor(score)
              : getSafetyScoreColor(score);

          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [point.longitude, point.latitude],
            },
            properties: {
              score,
              color,
            },
          };
        })
        .filter(
          (f): f is NonNullable<typeof f> => f !== null
        );

      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      mapInstance.addSource('score-overlay-source', {
        type: 'geojson',
        data: geojsonData,
      });

      mapInstance.addLayer({
        id: 'score-overlay-layer',
        type: 'circle',
        source: 'score-overlay-source',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, 15,
            3, 30,
            5, 50,
            8, 80,
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.35,
          'circle-blur': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.5,
        },
      });
    };

    // If style is already loaded, update immediately; otherwise wait
    if (mapInstance.isStyleLoaded()) {
      updateOverlay();
    } else {
      mapInstance.once('style.load', updateOverlay);
    }

    return () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('score-overlay-layer')) {
          mapInstance.removeLayer('score-overlay-layer');
        }
        if (mapInstance.getStyle() && mapInstance.getSource('score-overlay-source')) {
          mapInstance.removeSource('score-overlay-source');
        }
      } catch {
        // Map may already be destroyed during cleanup
      }
    };
  }, [selectedDate, overlayMode]);

  // Bug 4: Add native Mapbox raster-particle wind layer
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    const addWindLayer = () => {
      if (!mapInstance.getStyle()) return;
      if (!mapInstance.getSource('raster-array-source')) {
        mapInstance.addSource('raster-array-source', {
          type: 'raster-array' as any,
          url: 'mapbox://rasterarrayexamples.gfs-winds',
          tileSize: 512,
        } as any);
      }

      if (!mapInstance.getLayer('wind-layer')) {
        mapInstance.addLayer({
          id: 'wind-layer',
          type: 'raster-particle' as any,
          source: 'raster-array-source',
          'source-layer': '10winds',
          paint: {
            'raster-particle-speed-factor': 0.4,
            'raster-particle-fade-opacity-factor': 0.98,
            'raster-particle-reset-rate-factor': 0.15,
            'raster-particle-count': 16000,
            'raster-particle-max-speed': 60,
            'raster-particle-color': [
              'interpolate',
              ['linear'],
              ['raster-particle-speed'],
              1.5, 'rgba(134,163,171,256)',
              2.5, 'rgba(126,152,188,256)',
              4.12, 'rgba(110,143,208,256)',
              6.17, 'rgba(15,147,167,256)',
              9.26, 'rgba(57,163,57,256)',
              11.83, 'rgba(194,134,62,256)',
              14.92, 'rgba(200,66,13,256)',
              18.0, 'rgba(210,0,50,256)',
              21.6, 'rgba(175,80,136,256)',
              25.21, 'rgba(117,74,147,256)',
              29.32, 'rgba(68,105,141,256)',
              33.44, 'rgba(194,251,119,256)',
              43.72, 'rgba(241,255,109,256)',
              50.41, 'rgba(256,256,256,256)',
              59.16, 'rgba(0,256,256,256)',
              69.44, 'rgba(256,37,256,256)',
            ],
          } as any,
        } as any);
      }
    };

    const removeWindLayer = () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('wind-layer')) {
          mapInstance.removeLayer('wind-layer');
        }
        if (mapInstance.getStyle() && mapInstance.getSource('raster-array-source')) {
          mapInstance.removeSource('raster-array-source');
        }
      } catch {
        // Map may already be destroyed during cleanup
      }
    };

    const handleToggle = () => {
      if (showWindParticles) {
        addWindLayer();
      } else {
        removeWindLayer();
      }
    };

    if (mapInstance.isStyleLoaded()) {
      handleToggle();
    } else {
      mapInstance.once('style.load', handleToggle);
    }

    return () => {
      removeWindLayer();
    };
  }, [showWindParticles]);

  // Bug 2: Fixed createMarkerElement - use inner span for scale transform
  const createMarkerElement = (
    emoji: string,
    color: string,
    onClick: () => void
  ): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'surf-marker';
    el.style.cssText = `
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `;

    const inner = document.createElement('span');
    inner.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    `;
    inner.textContent = emoji;

    el.appendChild(inner);

    el.addEventListener('mouseenter', () => {
      inner.style.transform = 'scale(1.2)';
    });
    el.addEventListener('mouseleave', () => {
      inner.style.transform = 'scale(1)';
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    return el;
  };

  const showForecastAtCoords = (
    lng: number,
    lat: number,
    name: string,
    currentSelectedDate: Date
  ) => {
    if (!map.current) return;

    const forecast = getMockForecastForLocation(lat, lng, name);
    const dateStr = format(currentSelectedDate, 'yyyy-MM-dd');
    const dayForecast = forecast.forecasts.find(
      (f) => f.date === dateStr
    );
    if (!dayForecast) return;

    const point = map.current.project([lng, lat]);
    setForecastPopup({
      name,
      forecast: dayForecast,
      position: { x: point.x, y: point.y },
      coordinates: { latitude: lat, longitude: lng },
    });
  };

  const showSavedSpotInfo = (
    savedSpot: SavedSpotMarker
  ) => {
    showForecastAtCoords(
      savedSpot.longitude,
      savedSpot.latitude,
      savedSpot.name,
      selectedDate
    );
  };

  const reverseGeocode = useCallback(async (lng: number, lat: number): Promise<string> => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=locality,place,region,country&limit=1&language=${locale}`
      );

      if (!response.ok) {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        // Get place name and context (region/country)
        const placeName = feature.text || feature.place_name;
        const context = feature.context;

        if (context && context.length > 0) {
          // Find region and country from context
          const region = context.find((c: any) => c.id.startsWith('region'));
          const country = context.find((c: any) => c.id.startsWith('country'));

          if (region && country) {
            return `${placeName}, ${region.text}, ${country.text}`;
          } else if (country) {
            return `${placeName}, ${country.text}`;
          }
        }

        return feature.place_name || placeName;
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, [locale]);

  const showLocationForecast = async (
    lngLat: mapboxgl.LngLat,
    currentSelectedDate: Date
  ) => {
    const locationName = await reverseGeocode(lngLat.lng, lngLat.lat);
    showForecastAtCoords(
      lngLat.lng,
      lngLat.lat,
      locationName,
      currentSelectedDate
    );
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

      {showMeasureDistance && (
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
      )}

      {forecastPopup && (
        <ForecastPopup
          locationName={forecastPopup.name}
          forecast={forecastPopup.forecast}
          position={forecastPopup.position}
          coordinates={forecastPopup.coordinates}
          isSaved={savedSpots.some(
            (s) =>
              Math.abs(s.latitude - forecastPopup.coordinates.latitude) < 0.001 &&
              Math.abs(s.longitude - forecastPopup.coordinates.longitude) < 0.001
          )}
          onClose={() => setForecastPopup(null)}
          onSave={
            onSaveSpot
              ? () => {
                  onSaveSpot({
                    name: forecastPopup.name,
                    latitude: forecastPopup.coordinates.latitude,
                    longitude: forecastPopup.coordinates.longitude,
                  });
                  setForecastPopup(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
