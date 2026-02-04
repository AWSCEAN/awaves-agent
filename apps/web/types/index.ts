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
