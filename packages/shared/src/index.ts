// Surf Spot Types
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
  imageUrl?: string;
  currentConditions?: SurfConditions;
}

export interface SurfConditions {
  waveHeight: number; // meters
  waveHeightMax?: number;
  wavePeriod: number; // seconds
  waveDirection: number; // degrees
  windSpeed: number; // km/h
  windDirection: number; // degrees
  waterTemperature: number; // celsius
  airTemperature: number; // celsius
  tide: 'low' | 'mid' | 'high';
  rating: number; // 1-5
  updatedAt: string;
}

export interface SearchFilters {
  region?: string;
  difficulty?: SurfSpot['difficulty'];
  minWaveHeight?: number;
  maxWaveHeight?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  windSpeedMax?: number;
  waterTempMin?: number;
}

// User Types
export interface User {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl?: string;
  preferredLanguage: 'ko' | 'en';
  createdAt: string;
}

export interface SavedSpot {
  id: string;
  userId: string;
  spotId: string;
  savedAt: string;
  notes?: string;
}

// API Response Types
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

// Auth Types
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

// V2 Registration Types (Username-based)
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export interface RegisterV2Request {
  username: string;
  password: string;
  confirm_password: string;
  user_level: UserLevel;
  privacy_consent_yn: boolean;
}

export interface UserV2 {
  user_id: number;
  username: string;
  user_level: UserLevel;
  privacy_consent_yn: boolean;
  last_login_dt?: string;
  created_at: string;
}

export interface ErrorDetail {
  code?: string;
  message?: string;
}

export interface CommonApiResponse<T> {
  result: 'success' | 'error';
  error?: ErrorDetail;
  data?: T;
}

// Saved Item Types (DynamoDB)
export interface SavedItemRequest {
  location_id: string;
  surf_timestamp: string;
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
}

export interface SavedItemResponse {
  user_id: string;
  location_surf_key: string; // Format: {locationId}#{surfTimestamp}
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

export interface SavedListResponse {
  items: SavedItemResponse[];
  total: number;
}

export interface DeleteSavedItemRequest {
  location_surf_key?: string;
  location_id?: string;
  surf_timestamp?: string;
}

export interface AcknowledgeChangeRequest {
  location_surf_key?: string;
  location_id?: string;
  surf_timestamp?: string;
}

// Feedback Types
export type FeedbackStatus = 'POSITIVE' | 'NEGATIVE' | 'DEFERRED';

export interface FeedbackRequest {
  location_id: string;
  surf_timestamp: string;
  feedback_status: FeedbackStatus;
}

export interface FeedbackResponse {
  id: number;
  user_id: number;
  location_id: string;
  surf_timestamp: string;
  feedback_result?: boolean; // true = good, false = not good, null = deferred
  feedback_status: FeedbackStatus;
  created_at: string;
}
