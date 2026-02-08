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
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Helper for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || data.message || 'An error occurred',
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
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthTokens>> {
    const response = await apiRequest<{
      access_token: string;
      refresh_token?: string;
      token_type: string;
      expires_in: number;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresIn: response.data.expires_in,
        },
      };
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
    });
  },

  async registerV2(data: RegisterV2Request): Promise<ApiResponse<CommonApiResponse<UserV2>>> {
    return apiRequest<CommonApiResponse<UserV2>>('/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiRequest<User>('/auth/me');
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return apiRequest<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
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

  async searchSpots(query: string): Promise<ApiResponse<SurfInfo[]>> {
    return apiRequest<SurfInfo[]>(`/surf/search?q=${encodeURIComponent(query)}`);
  },

  async getRecommendations(userId: string): Promise<ApiResponse<SurfInfo[]>> {
    return apiRequest<SurfInfo[]>(`/surf/recommendations?user_id=${userId}`);
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
