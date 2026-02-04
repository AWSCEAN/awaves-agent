'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { SurfSpot } from '@/types';
import SpotPopup from './SpotPopup';

interface MapboxMapProps {
  spots: SurfSpot[];
  onSpotClick: (spot: SurfSpot) => void;
  selectedSpotId?: string;
}

// Initialize Mapbox token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export default function MapboxMap({ spots, onSpotClick, selectedSpotId }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [popupSpot, setPopupSpot] = useState<SurfSpot | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [128.5, 36.5], // Center on Korea
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add markers for spots
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    spots.forEach((spot) => {
      // Create marker element
      const el = document.createElement('div');
      el.className = 'surf-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${spot.id === selectedSpotId ? '#ff6b6b' : '#0091c3'};
        border: 3px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: transform 0.2s, background 0.2s;
      `;
      el.innerHTML = '🏄';

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSpotClick(spot);

        // Show popup
        const rect = mapContainer.current?.getBoundingClientRect();
        if (rect) {
          const point = map.current?.project([spot.longitude, spot.latitude]);
          if (point) {
            setPopupPosition({ x: point.x, y: point.y });
            setPopupSpot(spot);
          }
        }
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      markersRef.current[spot.id] = marker;
    });
  }, [spots, selectedSpotId, onSpotClick]);

  // Fly to selected spot
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

  // Close popup when clicking on map
  useEffect(() => {
    if (!map.current) return;

    const handleClick = () => {
      setPopupSpot(null);
    };

    map.current.on('click', handleClick);

    return () => {
      map.current?.off('click', handleClick);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

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
