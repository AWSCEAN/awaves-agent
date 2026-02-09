// Re-export shared types
export * from '@shared/types';

// Web-specific types
export type Language = 'ko' | 'en';

export interface MapViewport {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface GeocoderResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  source: 'navinfo' | 'mapbox';
}

export interface Translation {
  ko: string;
  en: string;
}

// Surf conditions for spot display components
export interface SurfConditions {
  waveHeight: number;
  waveHeightMax?: number;
  wavePeriod: number;
  windSpeed: number;
  waterTemperature: number;
  airTemperature: number;
  tide: string;
  rating: number;
}

// Surf spot for map/card components
export interface SurfSpot {
  id: string;
  name: string;
  nameKo?: string;
  latitude: number;
  longitude: number;
  region: string;
  country: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  waveType: string;
  bestSeason: string[];
  description?: string;
  descriptionKo?: string;
  currentConditions?: SurfConditions;
}

// UI State Types
export interface PopupState {
  isOpen: boolean;
  spotId?: string;
  position?: { x: number; y: number };
}

export interface PanelState {
  isOpen: boolean;
  content?: 'search' | 'filters' | 'details';
}
