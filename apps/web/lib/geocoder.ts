import type { GeocoderResult } from '@/types';

const NAVINFO_API_KEY = process.env.NAVINFO_API_KEY || '';
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface NavInfoResponse {
  status: string;
  results: Array<{
    id: string;
    name: string;
    location: {
      lat: number;
      lng: number;
    };
    address?: string;
  }>;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  properties: {
    address?: string;
  };
}

interface MapboxResponse {
  features: MapboxFeature[];
}

// NavInfo Geocoder (Primary - for Korean locations)
async function searchNavInfo(query: string): Promise<GeocoderResult[]> {
  if (!NAVINFO_API_KEY) {
    console.warn('NavInfo API key not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.navinfo.com/geocode?query=${encodeURIComponent(query)}&key=${NAVINFO_API_KEY}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`NavInfo API error: ${response.status}`);
    }

    const data: NavInfoResponse = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    return data.results.map((result) => ({
      id: result.id,
      name: result.name,
      latitude: result.location.lat,
      longitude: result.location.lng,
      address: result.address,
      source: 'navinfo' as const,
    }));
  } catch (error) {
    console.error('NavInfo geocoding error:', error);
    return [];
  }
}

// Mapbox Geocoder (Fallback - for international locations)
async function searchMapbox(query: string): Promise<GeocoderResult[]> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured');
    return [];
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,address&limit=5`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxResponse = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature) => ({
      id: feature.id,
      name: feature.place_name,
      latitude: feature.center[1],
      longitude: feature.center[0],
      address: feature.properties.address,
      source: 'mapbox' as const,
    }));
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return [];
  }
}

// Combined geocoder with fallback
export async function geocode(query: string): Promise<GeocoderResult[]> {
  // Detect if query is likely Korean
  const isKorean = /[\uAC00-\uD7AF]/.test(query);

  if (isKorean) {
    // Try NavInfo first for Korean queries
    const navInfoResults = await searchNavInfo(query);
    if (navInfoResults.length > 0) {
      return navInfoResults;
    }
  }

  // Fallback to Mapbox
  return searchMapbox(query);
}

// Reverse geocode (coordinates to address)
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocoderResult | null> {
  if (!MAPBOX_TOKEN) {
    console.warn('Mapbox token not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=place,locality&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`);
    }

    const data: MapboxResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    return {
      id: feature.id,
      name: feature.place_name,
      latitude: feature.center[1],
      longitude: feature.center[0],
      source: 'mapbox',
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export default {
  geocode,
  reverseGeocode,
  searchNavInfo,
  searchMapbox,
};
