'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { lineString } from '@turf/helpers';
import length from '@turf/length';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import type { SurfInfo, SavedListItem } from '@/types';
import { getMetricsForLevel } from '@/lib/services/surfInfoService';

export interface SpotSelectionData {
  surfInfo: SurfInfo;
  coordinates: { latitude: number; longitude: number };
}

export type OverlayMode = 'surf' | 'none';

interface MeasureDistancePoint {
  id: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface EnhancedMapboxMapProps {
  spots: SurfInfo[];
  allSpots?: SurfInfo[];
  savedSpots: SavedListItem[];
  selectedDate: Date;
  showWindParticles: boolean;
  overlayMode?: OverlayMode;
  onSpotSelect?: (data: SpotSelectionData) => void;
  onUserLocationChange?: (location: { lat: number; lng: number }) => void;
  locale?: 'en' | 'ko';
  center?: { lat: number; lng: number } | null;
  showGeocoder?: boolean;
  showMeasureDistance?: boolean;
  saveCountByLocation?: Map<string, number>;
  onMultiSaveMarkerClick?: (locationId: string, coordinates: { lat: number; lng: number }) => void;
  /** Pixel offset [x, y] applied to flyTo so the center point appears offset on screen.
   *  Use [0, negative] to visually raise the marker above a bottom panel (negative Y = above center).
   *  Use [negative, 0] to shift marker left of a right sidebar. */
  centerOffset?: [number, number];
  surferLevel?: string;
}

function getSurfScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'; // green
  if (score >= 40) return '#eab308'; // yellow
  return '#ef4444'; // red
}

export default function EnhancedMapboxMap({
  spots,
  allSpots,
  savedSpots,
  selectedDate,
  showWindParticles,
  overlayMode = 'none',
  onSpotSelect,
  onUserLocationChange,
  locale = 'en',
  center,
  showGeocoder = true,
  showMeasureDistance = true,
  saveCountByLocation,
  onMultiSaveMarkerClick,
  centerOffset,
  surferLevel = '',
}: EnhancedMapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geocoderRef = useRef<MapboxGeocoder | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasureDistancePoint[]>([]);
  const measureMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const measureLineRef = useRef<string | null>(null);
  const selectedDateRef = useRef<Date>(selectedDate);
  const spotsRef = useRef<SurfInfo[]>(spots);
  const allSpotsRef = useRef<SurfInfo[]>(allSpots || []);
  const noInfoPopupRef = useRef<mapboxgl.Popup | null>(null);
  const nearbyMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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

    if (showGeocoder) {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl as any,
        marker: false,
        placeholder: locale === 'ko' ? '위치 검색...' : 'Search location...',
        language: locale,
      });
      geocoderRef.current = geocoder;
      map.current.addControl(
        geocoder as unknown as mapboxgl.IControl,
        'top-left'
      );
    }

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    geolocateControl.on('geolocate', (e: any) => {
      if (onUserLocationChange && e.coords) {
        onUserLocationChange({
          lat: e.coords.latitude,
          lng: e.coords.longitude,
        });
      }
    });
    map.current.addControl(geolocateControl, 'top-right');

    map.current.on('load', () => {
      setIsMapLoaded(true);
      map.current?.resize();
    });

    const resizeTimers = [
      setTimeout(() => map.current?.resize(), 0),
      setTimeout(() => map.current?.resize(), 100),
      setTimeout(() => map.current?.resize(), 500),
      setTimeout(() => map.current?.resize(), 1000),
      setTimeout(() => map.current?.resize(), 1500),
    ];

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeTimers.forEach(clearTimeout);
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Keep refs in sync
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);
  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);
  useEffect(() => {
    allSpotsRef.current = allSpots || [];
  }, [allSpots]);

  // Force resize after map is fully loaded to ensure controls are properly positioned
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Additional resize calls after map is loaded
    const timers = [
      setTimeout(() => map.current?.resize(), 100),
      setTimeout(() => map.current?.resize(), 300),
      setTimeout(() => map.current?.resize(), 600),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isMapLoaded]);

  // Sync markers to viewport — only show markers within the visible map bounds
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const updateVisibleMarkers = () => {
      if (!map.current) return;

      const bounds = map.current.getBounds();
      if (!bounds) return;
      const savedLocationIds = new Set(savedSpots.map((s) => s.locationId));

      // Build the set of marker keys that should be visible in the current viewport
      const desiredKeys = new Set<string>();

      spots.forEach((spot) => {
        if (savedLocationIds.has(spot.locationId)) return;
        if (bounds.contains([spot.geo.lng, spot.geo.lat])) {
          desiredKeys.add(spot.locationId);
        }
      });

      savedSpots.forEach((savedSpot) => {
        if (!savedSpot.locationId || !savedSpot.locationId.includes('#')) return;
        const [latStr, lngStr] = savedSpot.locationId.split('#');
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (!isNaN(lat) && !isNaN(lng) && bounds.contains([lng, lat])) {
          desiredKeys.add(`saved-${savedSpot.locationId}`);
        }
      });

      // Remove markers that are no longer in the viewport or are saved markers
      // (saved markers are always recreated to ensure badge counts stay in sync)
      Object.keys(markersRef.current).forEach((key) => {
        if (!desiredKeys.has(key) || key.startsWith('saved-')) {
          markersRef.current[key].remove();
          delete markersRef.current[key];
        }
      });

      // Add surfer markers for visible spots that don't have a marker yet
      spots.forEach((spot) => {
        if (savedLocationIds.has(spot.locationId)) return;
        if (!desiredKeys.has(spot.locationId)) return;
        if (markersRef.current[spot.locationId]) return;

        const markerColor = getSurfScoreColor(getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore);
        const el = createMarkerElement(
          '\u{1F3C4}',
          markerColor,
          () => {
            showSurfInfoAtCoords(
              spot.geo.lng,
              spot.geo.lat,
              spot,
              selectedDateRef.current
            );
          }
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([spot.geo.lng, spot.geo.lat])
          .addTo(map.current!);

        markersRef.current[spot.locationId] = marker;
      });

      // Add heart markers for visible saved spots
      savedSpots.forEach((savedSpot) => {
        if (!savedSpot.locationId || !savedSpot.locationId.includes('#')) return;
        const savedKey = `saved-${savedSpot.locationId}`;
        if (!desiredKeys.has(savedKey)) return;
        if (markersRef.current[savedKey]) return;

        const [latStr, lngStr] = savedSpot.locationId.split('#');
        const lat = Number(latStr);
        const lng = Number(lngStr);
        if (isNaN(lat) || isNaN(lng)) return;

        const count = saveCountByLocation?.get(savedSpot.locationId) || 1;

        const el = createMarkerElement(
          '\u2764\uFE0F',
          '#ffffff',
          () => {
            if (onMultiSaveMarkerClick) {
              onMultiSaveMarkerClick(savedSpot.locationId, { lat, lng });
            }
          },
          '#e74c3c',
          count
        );

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markersRef.current[savedKey] = marker;
      });
    };

    // Run once immediately and on every map move/zoom
    updateVisibleMarkers();
    map.current.on('moveend', updateVisibleMarkers);

    return () => {
      map.current?.off('moveend', updateVisibleMarkers);
    };
  }, [spots, savedSpots, isMapLoaded, saveCountByLocation, onMultiSaveMarkerClick]);

  useEffect(() => {
    if (geocoderRef.current) {
      geocoderRef.current.setLanguage(locale);
      geocoderRef.current.setPlaceholder(
        locale === 'ko' ? '위치 검색...' : 'Search location...'
      );
    }
  }, [locale]);

  useEffect(() => {
    if (!map.current || !isMapLoaded || !center) return;
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: 12,
      duration: 1500,
      ...(centerOffset ? { offset: centerOffset } : {}),
    });
  }, [center, isMapLoaded, centerOffset]);

  useEffect(() => {
    if (!map.current) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      if (measuring) {
        addMeasurePoint(e.lngLat);
      } else {
        showLocationForecast(e.lngLat, selectedDate);
      }
    };

    map.current.on('click', handleMapClick);

    return () => {
      map.current?.off('click', handleMapClick);
    };
  }, [measuring, selectedDate, locale]);

  // Overlay for surf scores
  useEffect(() => {
    if (!map.current) return;

    const mapInstance = map.current;

    const updateOverlay = () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('score-overlay-layer')) {
          mapInstance.removeLayer('score-overlay-layer');
        }
        if (mapInstance.getStyle() && mapInstance.getSource('score-overlay-source')) {
          mapInstance.removeSource('score-overlay-source');
        }
      } catch {
        return;
      }

      if (overlayMode === 'none') return;

      const overlaySpots = spots;
      const features = overlaySpots.map((spot) => {
        const score = getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore;
        const color = getSurfScoreColor(score);

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [spot.geo.lng, spot.geo.lat],
          },
          properties: {
            score,
            color,
          },
        };
      });

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
  }, [spots, selectedDate, overlayMode]);

  // Wind layer
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

  const createMarkerElement = (
    emoji: string,
    color: string,
    onClick: () => void,
    borderColor: string = 'white',
    badgeCount?: number
  ): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'surf-marker';
    el.style.cssText = `
      width: 32px;
      height: 32px;
      cursor: pointer;
    `;

    const inner = document.createElement('span');
    inner.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${color};
      border: 3px solid ${borderColor};
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

    if (badgeCount && badgeCount > 1) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 18px;
        height: 18px;
        background: #ef4444;
        color: white;
        border: 2px solid white;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        z-index: 1;
        padding: 0 3px;
      `;
      badge.textContent = String(badgeCount);
      el.appendChild(badge);
    }

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

  const showSurfInfoAtCoords = (
    lng: number,
    lat: number,
    spot: SurfInfo,
    _currentSelectedDate: Date
  ) => {
    if (!map.current || !onSpotSelect) return;

    // Always use the spot data directly — it already has the correct
    // date/time-specific forecast from the backend. Skipping cache avoids
    // stale data when the user changes search time conditions.
    onSpotSelect({
      surfInfo: spot,
      coordinates: { latitude: lat, longitude: lng },
    });
  };

  const showLocationForecast = (
    lngLat: mapboxgl.LngLat,
    currentSelectedDate: Date
  ) => {
    if (!onSpotSelect || !map.current) return;

    // Remove any existing temporary marker/popup before processing
    if (nearbyMarkerRef.current) {
      nearbyMarkerRef.current.remove();
      nearbyMarkerRef.current = null;
    }
    if (noInfoPopupRef.current) {
      noInfoPopupRef.current.remove();
      noInfoPopupRef.current = null;
    }

    // 1. Find the closest spot within 1km of the clicked coordinate
    // Use allSpots for detection so 100km works regardless of search state
    const currentSpots = allSpotsRef.current.length > 0 ? allSpotsRef.current : spotsRef.current;
    let closestMatch: SurfInfo | null = null;
    let closestDist = Infinity;
    for (const spot of currentSpots) {
      const R = 6371;
      const dLat = (spot.geo.lat - lngLat.lat) * Math.PI / 180;
      const dLng = (spot.geo.lng - lngLat.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lngLat.lat * Math.PI / 180) * Math.cos(spot.geo.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < closestDist) { closestDist = dist; closestMatch = spot; }
    }
    if (closestMatch && closestDist <= 1) {
      showSurfInfoAtCoords(lngLat.lng, lngLat.lat, closestMatch, currentSelectedDate);
      return;
    }

    // 2. Find the best spot within 100km (highest surfScore, alphabetical tiebreaker)
    let bestNearby: { spot: SurfInfo; distance: number } | null = null;

    for (const spot of currentSpots) {
      const R = 6371;
      const dLat = (spot.geo.lat - lngLat.lat) * Math.PI / 180;
      const dLng = (spot.geo.lng - lngLat.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lngLat.lat * Math.PI / 180) * Math.cos(spot.geo.lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distance > 100) continue;

      if (
        !bestNearby ||
        getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore > (bestNearby.spot.derivedMetrics?.INTERMEDIATE?.surfScore ?? 0) ||
        (getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore === (bestNearby.spot.derivedMetrics?.INTERMEDIATE?.surfScore ?? 0) &&
          spot.name.localeCompare(bestNearby.spot.name) < 0)
      ) {
        bestNearby = { spot, distance };
      }
    }

    if (bestNearby) {
      const { spot } = bestNearby;

      // Add a temporary marker at the nearby spot if it doesn't already have one
      // Check both regular and saved marker keys
      const hasSurfMarker = markersRef.current[spot.locationId];
      const hasSavedMarker = markersRef.current[`saved-${spot.locationId}`];
      if (!hasSurfMarker && !hasSavedMarker) {
        const nearbyMarkerColor = getSurfScoreColor(getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore);
        const el = createMarkerElement(
          '\u{1F3C4}',
          nearbyMarkerColor,
          () => {
            showSurfInfoAtCoords(spot.geo.lng, spot.geo.lat, spot, selectedDateRef.current);
          }
        );
        nearbyMarkerRef.current = new mapboxgl.Marker(el)
          .setLngLat([spot.geo.lng, spot.geo.lat])
          .addTo(map.current!);
      }

      showSurfInfoAtCoords(spot.geo.lng, spot.geo.lat, spot, currentSelectedDate);
      return;
    }

    // 3. No spot within 100km - show temporary popup
    const noInfoMessage = locale === 'ko'
      ? '주변 100km 이내에 서핑 정보가 없습니다'
      : 'No surf information available within 100km';

    noInfoPopupRef.current = new mapboxgl.Popup({
      closeOnClick: true,
      closeButton: false,
      maxWidth: '360px',
      className: 'no-info-popup',
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .setHTML(
        `<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;white-space:nowrap;">` +
        `<span style="font-size:18px;">🌊</span>` +
        `<span style="font-size:13px;font-weight:500;color:#1e3a5f;">${noInfoMessage}</span>` +
        `</div>`
      )
      .addTo(map.current);

    setTimeout(() => {
      noInfoPopupRef.current?.remove();
      noInfoPopupRef.current = null;
    }, 4000);
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
    <div className="absolute inset-0">
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

    </div>
  );
}
