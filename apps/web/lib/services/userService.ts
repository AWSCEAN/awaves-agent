import type { UserRDB } from '@/types';

const MOCK_USER: UserRDB = {
  id: 10000001,
  username: 'testuser',
  password_hash: '$2b$12$mockHashForTestUser',
  user_level: 'intermediate',
  privacy_consent_yn: true,
  last_login_dt: null,
  created_at: '2026-01-15T09:30:00Z',
};

const MOCK_PASSWORD = 'testuser';

export function login(username: string, password: string): { success: true; token: string; user: UserRDB } | { success: false } {
  if (username === MOCK_USER.username && password === MOCK_PASSWORD) {
    const token = btoa(JSON.stringify({ sub: MOCK_USER.id, exp: Date.now() + 30 * 60 * 1000 }));
    MOCK_USER.last_login_dt = new Date().toISOString();
    return { success: true, token, user: MOCK_USER };
  }
  return { success: false };
}

export function getCurrentUser(): UserRDB | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  return { ...MOCK_USER };
}

export function getUserId(): string {
  return String(MOCK_USER.id);
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
