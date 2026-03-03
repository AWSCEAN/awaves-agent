import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { SurfInfo, SavedListItem } from '../types';
import { getMetricsForLevel, getSurfScoreColors } from '../services/surfInfoService';

export interface SpotSelectionData {
  surfInfo: SurfInfo;
  coordinates: { latitude: number; longitude: number };
}

export type OverlayMode = 'surf' | 'none';

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
  saveCountByLocation?: Map<string, number>;
  onMultiSaveMarkerClick?: (locationId: string, coordinates: { lat: number; lng: number }) => void;
  centerOffset?: [number, number];
  surferLevel?: string;
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
  saveCountByLocation,
  onMultiSaveMarkerClick,
  centerOffset,
  surferLevel = '',
}: EnhancedMapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const selectedDateRef = useRef<Date>(selectedDate);
  const spotsRef = useRef<SurfInfo[]>(spots);
  const allSpotsRef = useRef<SurfInfo[]>(allSpots || []);
  const noInfoPopupRef = useRef<mapboxgl.Popup | null>(null);
  const nearbyMarkerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error('VITE_MAPBOX_TOKEN is not configured');
      return;
    }
    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [128.5, 36.5],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    geolocateControl.on('geolocate', (e: any) => {
      if (onUserLocationChange && e.coords) {
        onUserLocationChange({ lat: e.coords.latitude, lng: e.coords.longitude });
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
    ];

    const resizeObserver = new ResizeObserver(() => { map.current?.resize(); });
    if (mapContainer.current) resizeObserver.observe(mapContainer.current);

    return () => {
      resizeTimers.forEach(clearTimeout);
      resizeObserver.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);
  useEffect(() => { spotsRef.current = spots; }, [spots]);
  useEffect(() => { allSpotsRef.current = allSpots || []; }, [allSpots]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;
    const timers = [
      setTimeout(() => map.current?.resize(), 100),
      setTimeout(() => map.current?.resize(), 300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isMapLoaded]);

  // Sync markers to viewport
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const updateVisibleMarkers = () => {
      if (!map.current) return;
      const bounds = map.current.getBounds();
      if (!bounds) return;
      const savedLocationIds = new Set(savedSpots.map((s) => s.locationId));
      const desiredKeys = new Set<string>();

      spots.forEach((spot) => {
        if (savedLocationIds.has(spot.locationId)) return;
        if (bounds.contains([spot.geo.lng, spot.geo.lat])) desiredKeys.add(spot.locationId);
      });

      savedSpots.forEach((savedSpot) => {
        if (!savedSpot.locationId?.includes('#')) return;
        const [latStr, lngStr] = savedSpot.locationId.split('#');
        const lat = Number(latStr); const lng = Number(lngStr);
        if (!isNaN(lat) && !isNaN(lng) && bounds.contains([lng, lat])) {
          desiredKeys.add(`saved-${savedSpot.locationId}`);
        }
      });

      Object.keys(markersRef.current).forEach((key) => {
        if (!desiredKeys.has(key) || key.startsWith('saved-')) {
          markersRef.current[key].remove();
          delete markersRef.current[key];
        }
      });

      spots.forEach((spot) => {
        if (savedLocationIds.has(spot.locationId)) return;
        if (!desiredKeys.has(spot.locationId)) return;
        if (markersRef.current[spot.locationId]) return;

        const markerColor = getSurfScoreColors(getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore).hex;
        const el = createMarkerElement('\u{1F3C4}', markerColor, () => {
          showSurfInfoAtCoords(spot.geo.lng, spot.geo.lat, spot);
        });

        const marker = new mapboxgl.Marker(el).setLngLat([spot.geo.lng, spot.geo.lat]).addTo(map.current!);
        markersRef.current[spot.locationId] = marker;
      });

      savedSpots.forEach((savedSpot) => {
        if (!savedSpot.locationId?.includes('#')) return;
        const savedKey = `saved-${savedSpot.locationId}`;
        if (!desiredKeys.has(savedKey)) return;
        if (markersRef.current[savedKey]) return;

        const [latStr, lngStr] = savedSpot.locationId.split('#');
        const lat = Number(latStr); const lng = Number(lngStr);
        if (isNaN(lat) || isNaN(lng)) return;

        const count = saveCountByLocation?.get(savedSpot.locationId) || 1;
        const el = createMarkerElement('\u2764\uFE0F', '#ffffff', () => {
          if (onMultiSaveMarkerClick) onMultiSaveMarkerClick(savedSpot.locationId, { lat, lng });
        }, '#e74c3c', count);

        const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(map.current!);
        markersRef.current[savedKey] = marker;
      });
    };

    updateVisibleMarkers();
    map.current.on('moveend', updateVisibleMarkers);
    return () => { map.current?.off('moveend', updateVisibleMarkers); };
  }, [spots, savedSpots, isMapLoaded, saveCountByLocation, onMultiSaveMarkerClick, surferLevel]);

  useEffect(() => {
    if (!map.current || !isMapLoaded || !center) return;
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: 12,
      duration: 1500,
      ...(centerOffset ? { offset: centerOffset } : {}),
    });
  }, [center, isMapLoaded]);

  // Map click handler
  useEffect(() => {
    if (!map.current) return;
    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      showLocationForecast(e.lngLat);
    };
    map.current.on('click', handleMapClick);
    return () => { map.current?.off('click', handleMapClick); };
  }, [spots, savedSpots, locale, surferLevel]);

  // Score overlay
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const updateOverlay = () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('score-overlay-layer')) mapInstance.removeLayer('score-overlay-layer');
        if (mapInstance.getStyle() && mapInstance.getSource('score-overlay-source')) mapInstance.removeSource('score-overlay-source');
      } catch { return; }

      if (overlayMode === 'none') return;

      const features = spots.map((spot) => {
        const score = getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore;
        return {
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [spot.geo.lng, spot.geo.lat] },
          properties: { score, color: getSurfScoreColors(score).hex },
        };
      });

      mapInstance.addSource('score-overlay-source', { type: 'geojson', data: { type: 'FeatureCollection', features } });
      mapInstance.addLayer({
        id: 'score-overlay-layer',
        type: 'circle',
        source: 'score-overlay-source',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 15, 3, 30, 5, 50, 8, 80],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.35,
          'circle-blur': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': ['get', 'color'],
          'circle-stroke-opacity': 0.5,
        },
      });
    };

    if (mapInstance.isStyleLoaded()) updateOverlay();
    else mapInstance.once('style.load', updateOverlay);

    return () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('score-overlay-layer')) mapInstance.removeLayer('score-overlay-layer');
        if (mapInstance.getStyle() && mapInstance.getSource('score-overlay-source')) mapInstance.removeSource('score-overlay-source');
      } catch { /* ignored */ }
    };
  }, [spots, selectedDate, overlayMode, surferLevel]);

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
              'interpolate', ['linear'], ['raster-particle-speed'],
              1.5, 'rgba(134,163,171,256)', 2.5, 'rgba(126,152,188,256)',
              4.12, 'rgba(110,143,208,256)', 6.17, 'rgba(15,147,167,256)',
              9.26, 'rgba(57,163,57,256)', 11.83, 'rgba(194,134,62,256)',
              14.92, 'rgba(200,66,13,256)', 18.0, 'rgba(210,0,50,256)',
              21.6, 'rgba(175,80,136,256)', 25.21, 'rgba(117,74,147,256)',
              29.32, 'rgba(68,105,141,256)', 33.44, 'rgba(194,251,119,256)',
              43.72, 'rgba(241,255,109,256)', 50.41, 'rgba(256,256,256,256)',
              59.16, 'rgba(0,256,256,256)', 69.44, 'rgba(256,37,256,256)',
            ],
          } as any,
        } as any);
      }
    };

    const removeWindLayer = () => {
      try {
        if (mapInstance.getStyle() && mapInstance.getLayer('wind-layer')) mapInstance.removeLayer('wind-layer');
        if (mapInstance.getStyle() && mapInstance.getSource('raster-array-source')) mapInstance.removeSource('raster-array-source');
      } catch { /* ignored */ }
    };

    const handleToggle = () => { if (showWindParticles) addWindLayer(); else removeWindLayer(); };
    if (mapInstance.isStyleLoaded()) handleToggle();
    else mapInstance.once('style.load', handleToggle);

    return () => { removeWindLayer(); };
  }, [showWindParticles]);

  function createMarkerElement(
    emoji: string,
    color: string,
    onClick: () => void,
    borderColor = 'white',
    badgeCount?: number
  ): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'surf-marker';
    el.style.cssText = 'width:32px;height:32px;cursor:pointer;position:relative;';

    const inner = document.createElement('span');
    inner.style.cssText = `
      width:32px;height:32px;background:${color};border:3px solid ${borderColor};
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);transition:transform 0.2s;
    `;
    inner.textContent = emoji;
    el.appendChild(inner);

    if (badgeCount && badgeCount > 1) {
      const badge = document.createElement('span');
      badge.style.cssText = `
        position:absolute;top:-6px;right:-6px;min-width:18px;height:18px;
        background:#ef4444;color:white;border:2px solid white;border-radius:9999px;
        display:flex;align-items:center;justify-content:center;font-size:10px;
        font-weight:bold;box-shadow:0 1px 4px rgba(0,0,0,0.3);z-index:1;padding:0 3px;
      `;
      badge.textContent = String(badgeCount);
      el.appendChild(badge);
    }

    el.addEventListener('mouseenter', () => { inner.style.transform = 'scale(1.2)'; });
    el.addEventListener('mouseleave', () => { inner.style.transform = 'scale(1)'; });
    el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return el;
  }

  function showSurfInfoAtCoords(lng: number, lat: number, spot: SurfInfo) {
    if (!map.current || !onSpotSelect) return;
    onSpotSelect({ surfInfo: spot, coordinates: { latitude: lat, longitude: lng } });
  }

  function showLocationForecast(lngLat: mapboxgl.LngLat) {
    if (!onSpotSelect || !map.current) return;

    if (nearbyMarkerRef.current) { nearbyMarkerRef.current.remove(); nearbyMarkerRef.current = null; }
    if (noInfoPopupRef.current) { noInfoPopupRef.current.remove(); noInfoPopupRef.current = null; }

    const currentSpots = allSpotsRef.current.length > 0 ? allSpotsRef.current : spotsRef.current;

    // 1. Find closest within 1km
    let closestMatch: SurfInfo | null = null;
    let closestDist = Infinity;
    for (const spot of currentSpots) {
      const dist = haversine(lngLat.lat, lngLat.lng, spot.geo.lat, spot.geo.lng);
      if (dist < closestDist) { closestDist = dist; closestMatch = spot; }
    }
    if (closestMatch && closestDist <= 1) {
      showSurfInfoAtCoords(lngLat.lng, lngLat.lat, closestMatch);
      return;
    }

    // 1b. Check saved spots within 1km
    if (onMultiSaveMarkerClick) {
      let savedClosestDist = Infinity;
      let savedClosestId: string | null = null;
      let savedClosestCoords: { lat: number; lng: number } | null = null;
      for (const savedSpot of savedSpots) {
        if (!savedSpot.locationId?.includes('#')) continue;
        const [sLatStr, sLngStr] = savedSpot.locationId.split('#');
        const sLat = parseFloat(sLatStr); const sLng = parseFloat(sLngStr);
        if (isNaN(sLat) || isNaN(sLng)) continue;
        const dist = haversine(lngLat.lat, lngLat.lng, sLat, sLng);
        if (dist < savedClosestDist) { savedClosestDist = dist; savedClosestId = savedSpot.locationId; savedClosestCoords = { lat: sLat, lng: sLng }; }
      }
      if (savedClosestId && savedClosestDist <= 1 && savedClosestCoords) {
        onMultiSaveMarkerClick(savedClosestId, savedClosestCoords);
        return;
      }
    }

    // 2. Find best within 100km
    let bestNearby: { spot: SurfInfo; distance: number } | null = null;
    for (const spot of currentSpots) {
      const distance = haversine(lngLat.lat, lngLat.lng, spot.geo.lat, spot.geo.lng);
      if (distance > 100) continue;
      if (!bestNearby ||
        getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore > getMetricsForLevel(bestNearby.spot.derivedMetrics, surferLevel).surfScore) {
        bestNearby = { spot, distance };
      }
    }

    if (bestNearby) {
      const { spot } = bestNearby;
      const hasSurfMarker = markersRef.current[spot.locationId];
      const hasSavedMarker = markersRef.current[`saved-${spot.locationId}`];
      if (!hasSurfMarker && !hasSavedMarker) {
        const nearbyMarkerColor = getSurfScoreColors(getMetricsForLevel(spot.derivedMetrics, surferLevel).surfScore).hex;
        const el = createMarkerElement('\u{1F3C4}', nearbyMarkerColor, () => {
          showSurfInfoAtCoords(spot.geo.lng, spot.geo.lat, spot);
        });
        nearbyMarkerRef.current = new mapboxgl.Marker(el).setLngLat([spot.geo.lng, spot.geo.lat]).addTo(map.current!);
      }
      showSurfInfoAtCoords(spot.geo.lng, spot.geo.lat, spot);
      return;
    }

    // 3. No spot within 100km
    const noInfoMessage = locale === 'ko'
      ? '주변 100km 이내에 서핑 정보가 없습니다'
      : 'No surf information available within 100km';
    noInfoPopupRef.current = new mapboxgl.Popup({ closeOnClick: true, closeButton: false, maxWidth: '360px', className: 'no-info-popup' })
      .setLngLat([lngLat.lng, lngLat.lat])
      .setHTML(`<div style="display:flex;align-items:center;gap:8px;padding:10px 16px;white-space:nowrap;"><span style="font-size:18px;">🌊</span><span style="font-size:13px;font-weight:500;color:#1e3a5f;">${noInfoMessage}</span></div>`)
      .addTo(map.current);
    setTimeout(() => { noInfoPopupRef.current?.remove(); noInfoPopupRef.current = null; }, 4000);
  }

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
