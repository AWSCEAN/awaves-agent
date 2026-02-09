import type { ApiResponse, AuthTokens, User } from '@/types';

const MOCK_USER_CREDENTIALS = {
  username: 'testuser',
  password: 'testuser',
};

const MOCK_USER: User = {
  id: 'test-user-001',
  email: 'testuser@awaves.com',
  nickname: 'Test User',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString(),
};

export const mockAuthService = {
  login(
    username: string,
    password: string
  ): ApiResponse<AuthTokens> {
    // Production safety check
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error('Mock authentication cannot be used in production');
    }

    if (
      username === MOCK_USER_CREDENTIALS.username &&
      password === MOCK_USER_CREDENTIALS.password
    ) {
      const mockToken = btoa(
        JSON.stringify({
          userId: MOCK_USER.id,
          timestamp: Date.now(),
        })
      );

      return {
        success: true,
        data: {
          accessToken: mockToken,
          refreshToken: `refresh_${mockToken}`,
          expiresIn: 3600,
        },
      };
    }

    return {
      success: false,
      error: 'Invalid username or password',
    };
  },

  getCurrentUser(): ApiResponse<User> {
    // Production safety check
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      throw new Error('Mock authentication cannot be used in production');
    }

    const token = localStorage.getItem('accessToken');

    if (!token) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    return {
      success: true,
      data: MOCK_USER,
    };
  },

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },
};
