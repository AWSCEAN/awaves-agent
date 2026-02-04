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

// Feedback Types
export interface Feedback {
  id: string;
  userId: string;
  spotId?: string;
  type: 'bug' | 'feature' | 'data_correction' | 'general';
  message: string;
  createdAt: string;
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
  email: string;
  password: string;
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
