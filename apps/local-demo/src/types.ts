// Extracted from packages/shared/src/index.ts — no external dependencies

export type SurfGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type SurfingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SurferLevel = 'beginner' | 'intermediate' | 'advanced';

export interface SurfInfoGeo {
  lat: number;
  lng: number;
}

export interface SurfInfoConditions {
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  waterTemperature: number;
}

export interface LevelMetrics {
  surfScore: number;
  surfGrade: SurfGrade;
  surfGradeNumeric: number;
}

export interface SurfInfoDerivedMetrics {
  BEGINNER: LevelMetrics;
  INTERMEDIATE: LevelMetrics;
  ADVANCED: LevelMetrics;
}

export interface SurfInfoMetadata {
  modelVersion: string;
  dataSource: string;
  predictionType: 'FORECAST' | 'REALTIME';
  createdAt: string;
}

export interface SurfInfo {
  locationId: string;
  surfTimestamp: string;
  geo: SurfInfoGeo;
  conditions: SurfInfoConditions;
  derivedMetrics: SurfInfoDerivedMetrics;
  metadata: SurfInfoMetadata;
  name: string;
  nameKo?: string;
  region: string;
  regionKo?: string;
  country: string;
  countryKo?: string;
  address?: string;
  city?: string;
  difficulty?: SurferLevel;
  waveType: string;
  bestSeason: string[];
  description?: string;
  descriptionKo?: string;
}

// Saved list item stored in localStorage
export interface SavedListItem {
  locationId: string;
  surfTimestamp: string;
  surfingLevel: SurfingLevel;
  surfScore: number;
  surfGrade: SurfGrade;
  surfGradeNumeric: number;
  name: string;
  nameKo?: string;
  region: string;
  regionKo?: string;
  country: string;
  countryKo?: string;
  address?: string;
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  waterTemperature: number;
  locationSurfKey: string;
  savedAt: string;
}

// --- Inference prediction response ---
export interface PredictionResult {
  locationId: string;
  surfTimestamp: string;
  geo: SurfInfoGeo;
  derivedMetrics: {
    surfScore: number;
    surfGrade: string;
    surfingLevel: string;
  };
  metadata: {
    modelVersion: string;
    dataSource: string;
    predictionType: string;
    createdAt: string;
  };
  weekNumber: number;
  weekRange: string;
  spotName: string;
  spotNameKo?: string;
}

// Spot definition used for mock data (subset of SurfInfo fields needed for generation)
export interface SpotDef {
  locationId: string;
  geo: SurfInfoGeo;
  name: string;
  nameKo: string;
  region: string;
  regionKo: string;
  country: string;
  countryKo: string;
  city?: string;
  cityKo?: string;
  difficulty: SurferLevel;
  waveType: string;
  bestSeason: string[];
  description?: string;
  descriptionKo?: string;
}
