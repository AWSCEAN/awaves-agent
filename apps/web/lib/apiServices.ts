import type {
  SurfInfo,
  SavedListItem,
  SearchFilters,
  User,
  Feedback,
  ApiResponse,
  PaginatedResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  RegisterV2Request,
  UserV2,
  CommonApiResponse,
  LoginV2Response,
  PredictionResult,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Token management utilities
const tokenManager = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },
  setTokens: (accessToken: string, refreshToken?: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Decode a JWT and return its expiry Unix timestamp, or null if unreadable.
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

// Returns true if the token is missing or expired (with a 30-second buffer).
export function isAccessTokenExpired(): boolean {
  const token = tokenManager.getAccessToken();
  if (!token) return true;
  const exp = getTokenExpiry(token);
  if (exp === null) return false; // can't decode — let the server decide
  return exp * 1000 < Date.now() + 30_000;
}

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Attempt to refresh access token
async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      tokenManager.clearTokens();
      return false;
    }

    const data = await response.json();

    // Handle CommonResponse format
    if (data.result === 'success' && data.data) {
      tokenManager.setTokens(data.data.access_token, data.data.refresh_token);
      return true;
    }

    tokenManager.clearTokens();
    return false;
  } catch {
    tokenManager.clearTokens();
    return false;
  }
}

// Synchronized refresh to avoid race conditions
async function synchronizedTokenRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return refreshPromise!;
  }

  isRefreshing = true;
  refreshPromise = attemptTokenRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

// Generate a trace ID for X-Ray correlation
function generateTraceId(): string {
  return crypto.randomUUID();
}

// Helper for making API requests with 401 retry
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnUnauthorized: boolean = true
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Amzn-Trace-Id': generateTraceId(),
    ...options.headers,
  };

  // Add auth token if available
  const token = tokenManager.getAccessToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - attempt refresh and retry
    if (response.status === 401 && retryOnUnauthorized) {
      const refreshed = await synchronizedTokenRefresh();
      if (refreshed) {
        // Retry the original request with new token
        return apiRequest<T>(endpoint, options, false);
      }
      // Refresh failed, return unauthorized error
      return {
        success: false,
        error: 'Session expired. Please login again.',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.message || data.error?.message || 'An error occurred',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Auth Services
export const authService = {
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthTokens & { user?: UserV2 }>> {
    const response = await apiRequest<CommonApiResponse<LoginV2Response>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, false);

    if (response.success && response.data) {
      // Handle CommonResponse format
      if (response.data.result === 'success' && response.data.data) {
        const loginData = response.data.data;
        tokenManager.setTokens(loginData.access_token, loginData.refresh_token);
        return {
          success: true,
          data: {
            accessToken: loginData.access_token,
            refreshToken: loginData.refresh_token,
            expiresIn: loginData.expires_in,
            user: loginData.user,
          },
        };
      } else if (response.data.result === 'error') {
        return {
          success: false,
          error: response.data.error?.message || 'Login failed',
        };
      }
    }

    return { success: false, error: response.error };
  },

  async register(data: RegisterRequest): Promise<ApiResponse<User>> {
    return apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        nickname: data.nickname,
        preferred_language: data.preferredLanguage || 'en',
      }),
    }, false);
  },

  async registerV2(data: RegisterV2Request): Promise<ApiResponse<CommonApiResponse<UserV2>>> {
    return apiRequest<CommonApiResponse<UserV2>>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  },

  async logout(): Promise<ApiResponse<void>> {
    const token = tokenManager.getAccessToken();
    if (token) {
      // Call server logout endpoint to invalidate refresh token
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
      }, false);
    }
    tokenManager.clearTokens();
    return { success: true };
  },

  async getCurrentUser(): Promise<ApiResponse<CommonApiResponse<UserV2>>> {
    return apiRequest<CommonApiResponse<UserV2>>('/auth/me');
  },

  async updateUserLevel(userLevel: string): Promise<ApiResponse<CommonApiResponse<UserV2>>> {
    return apiRequest<CommonApiResponse<UserV2>>('/auth/me/level', {
      method: 'PATCH',
      body: JSON.stringify({ user_level: userLevel }),
    });
  },

  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshed = await synchronizedTokenRefresh();
    if (refreshed) {
      return {
        success: true,
        data: {
          accessToken: tokenManager.getAccessToken()!,
          refreshToken: tokenManager.getRefreshToken() || undefined,
          expiresIn: 1800, // 30 minutes
        },
      };
    }
    return { success: false, error: 'Token refresh failed' };
  },

  isLoggedIn(): boolean {
    return !!tokenManager.getAccessToken();
  },

  /** Proactively refresh the access token. Returns true on success. */
  async refreshTokens(): Promise<boolean> {
    return synchronizedTokenRefresh();
  },
};

// Surf Data Services
export const surfService = {
  async getSpots(filters?: SearchFilters): Promise<ApiResponse<PaginatedResponse<SurfInfo>>> {
    const params = new URLSearchParams();

    if (filters?.region) params.set('region', filters.region);
    if (filters?.difficulty) params.set('difficulty', filters.difficulty);
    if (filters?.minWaveHeight) params.set('min_wave_height', filters.minWaveHeight.toString());
    if (filters?.maxWaveHeight) params.set('max_wave_height', filters.maxWaveHeight.toString());
    if (filters?.dateRange?.start) params.set('date_start', filters.dateRange.start);
    if (filters?.dateRange?.end) params.set('date_end', filters.dateRange.end);

    const queryString = params.toString();
    const endpoint = queryString ? `/surf/spots?${queryString}` : '/surf/spots';

    return apiRequest<PaginatedResponse<SurfInfo>>(endpoint);
  },

  async getSpotById(id: string): Promise<ApiResponse<SurfInfo>> {
    return apiRequest<SurfInfo>(`/surf/spots/${id}`);
  },

  async searchSpots(
    query: string,
    options?: { date?: string; time?: string; surferLevel?: string; language?: string }
  ): Promise<ApiResponse<SurfInfo[]>> {
    const params = new URLSearchParams({ q: query });
    if (options?.date) params.set('date', options.date);
    if (options?.time) params.set('time', options.time);
    if (options?.surferLevel) params.set('surfer_level', options.surferLevel);
    if (options?.language) params.set('language', options.language);
    return apiRequest<SurfInfo[]>(`/search?${params.toString()}`);
  },

  async getRecommendations(userId: string): Promise<ApiResponse<SurfInfo[]>> {
    return apiRequest<SurfInfo[]>(`/surf/recommendations?user_id=${userId}`);
  },

  async getNearbySpots(lat: number, lng: number, limit: number = 25, date?: string, time?: string): Promise<ApiResponse<SurfInfo[]>> {
    const params = new URLSearchParams({ lat: lat.toString(), lng: lng.toString(), limit: limit.toString() });
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    return apiRequest<SurfInfo[]>(`/surf/nearby?${params.toString()}`);
  },

  async getAllSpots(date?: string, time?: string): Promise<ApiResponse<SurfInfo[]>> {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    const qs = params.toString();
    return apiRequest<SurfInfo[]>(`/surf/spots/all${qs ? `?${qs}` : ''}`);
  },

  async predictSurf(locationId: string, surfDate: string, surferLevel: string): Promise<ApiResponse<PredictionResult>> {
    const response = await apiRequest<CommonApiResponse<PredictionResult>>('/surf/predict', {
      method: 'POST',
      body: JSON.stringify({
        location_id: locationId,
        surf_date: surfDate,
        surfer_level: surferLevel,
      }),
    });

    if (response.success && response.data?.result === 'success' && response.data.data) {
      return { success: true, data: response.data.data };
    }
    return { success: false, error: response.error || 'Prediction failed' };
  },
};

// Saved Spots Services
export const savedService = {
  async getSavedListItems(): Promise<ApiResponse<SavedListItem[]>> {
    return apiRequest<SavedListItem[]>('/saved');
  },

  async saveSpot(spotId: string, notes?: string): Promise<ApiResponse<SavedListItem>> {
    return apiRequest<SavedListItem>('/saved', {
      method: 'POST',
      body: JSON.stringify({ spotId, notes }),
    });
  },

  async removeSavedListItem(savedId: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/saved/${savedId}`, {
      method: 'DELETE',
    });
  },

  async updateSavedListItem(savedId: string, notes: string): Promise<ApiResponse<SavedListItem>> {
    return apiRequest<SavedListItem>(`/saved/${savedId}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },
};

// Feedback Services
export const feedbackService = {
  async submitFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<ApiResponse<Feedback>> {
    return apiRequest<Feedback>('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  },
};

// Export all services
export default {
  auth: authService,
  surf: surfService,
  saved: savedService,
  feedback: feedbackService,
};
