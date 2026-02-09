// ============================================================
// NEW SCHEMA TYPES (Backend-aligned)
// ============================================================

// --- Enums / Literals ---
export type SurfGrade = 'A' | 'B' | 'C' | 'D';
export type SurfingLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type SurferLevel = 'beginner' | 'intermediate' | 'advanced';

// --- surf_info DynamoDB table ---
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

export interface SurfInfoDerivedMetrics {
  surfScore: number;          // 0-100
  surfGrade: SurfGrade;       // A/B/C/D
  surfingLevel: SurfingLevel; // BEGINNER/INTERMEDIATE/ADVANCED
}

export interface SurfInfoMetadata {
  modelVersion: string;
  dataSource: string;
  predictionType: 'FORECAST' | 'REALTIME';
  createdAt: string;
}

export interface SurfInfo {
  // DynamoDB Keys
  LocationId: string;           // PK: "{lat}#{lng}"
  SurfTimestamp: string;        // SK: ISO 8601

  // DynamoDB Data
  geo: SurfInfoGeo;
  conditions: SurfInfoConditions;
  derivedMetrics: SurfInfoDerivedMetrics;
  metadata: SurfInfoMetadata;

  // Spot metadata (frontend convenience, not in DynamoDB)
  name: string;
  nameKo?: string;
  region: string;
  country: string;
  address?: string;
  difficulty: SurferLevel;
  waveType: string;
  bestSeason: string[];
  description?: string;
  descriptionKo?: string;
}

// --- saved_list DynamoDB table (flattened) ---
export interface SavedListItem {
  userId: string;
  locationSurfKey: string;      // "{lat}#{lng}#{timestamp}"
  locationId: string;           // "{lat}#{lng}"
  surfTimestamp: string;
  savedAt: string;
  address: string;
  region: string;
  country: string;
  departureDate: string;
  waveHeight: number;
  wavePeriod: number;
  windSpeed: number;
  waterTemperature: number;
  surfingLevel: SurfingLevel;
  surfScore: number;
  surfGrade: SurfGrade;
  // Spot display metadata
  name: string;
  nameKo?: string;
}

// --- user RDB table ---
export interface UserRDB {
  id: number;
  username: string;
  password_hash: string;
  user_level: SurferLevel;
  privacy_consent_yn: boolean;
  last_login_dt: string | null;
  created_at: string;
}

// --- feedback RDB table ---
export type FeedbackStatus = 'POSITIVE' | 'NEGATIVE' | 'DEFERRED';

export interface FeedbackRDB {
  id: number;
  user_id: number;
  location_id: string;          // "{lat}#{lng}"
  surf_timestamp: string;
  feedback_result: boolean;
  feedback_status: FeedbackStatus;
  created_at: string;
}

// --- Saved item API response (snake_case, used by frontend) ---
export interface SavedItemResponse {
  user_id: string;
  location_surf_key: string;
  location_id: string;
  surf_timestamp: string;
  saved_at: string;
  departure_date?: string;
  address?: string;
  region?: string;
  country?: string;
  wave_height?: number;
  wave_period?: number;
  wind_speed?: number;
  water_temperature?: number;
  surfer_level: string;
  surf_score: number;
  surf_grade: string;
  flag_change: boolean;
  change_message?: string;
  feedback_status?: FeedbackStatus;
}

// ============================================================
// API & AUTH TYPES (kept for API layer)
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface CommonApiResponse<T> {
  result: 'success' | 'error';
  error?: ErrorDetail;
  data?: T;
}

export interface ErrorDetail {
  code?: string;
  message?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LoginV2Response {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserV2;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  preferredLanguage?: 'ko' | 'en';
}

export interface RegisterV2Request {
  username: string;
  password: string;
  confirm_password: string;
  user_level: SurferLevel;
  privacy_consent_yn: boolean;
}

export interface UserV2 {
  user_id: number;
  username: string;
  user_level: SurferLevel;
  privacy_consent_yn: boolean;
  last_login_dt?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  preferredLanguage: 'ko' | 'en';
  createdAt: string;
}

export interface SearchFilters {
  region?: string;
  difficulty?: SurferLevel;
  minWaveHeight?: number;
  maxWaveHeight?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  windSpeedMax?: number;
  waterTempMin?: number;
}

export interface Feedback {
  id: string;
  userId: string;
  spotId?: string;
  type: 'bug' | 'feature' | 'data_correction' | 'general';
  message: string;
  createdAt: string;
}
