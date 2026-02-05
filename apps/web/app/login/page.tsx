'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authService } from '@/lib/apiServices';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    title: '로그인',
    username: '사용자명',
    password: '비밀번호',
    submit: '로그인',
    noAccount: '계정이 없으신가요?',
    register: '회원가입',
    forgotPassword: '비밀번호를 잊으셨나요?',
    errorInvalid: '사용자명 또는 비밀번호가 올바르지 않습니다',
    errorNetwork: '네트워크 오류가 발생했습니다',
  },
  en: {
    title: 'Login',
    username: 'Username',
    password: 'Password',
    submit: 'Login',
    noAccount: "Don't have an account?",
    register: 'Register',
    forgotPassword: 'Forgot password?',
    errorInvalid: 'Invalid username or password',
    errorNetwork: 'Network error occurred',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Use username as email for now (backend still expects email field)
    // TODO: Update backend to accept username for login
    const result = await authService.login({ email: username, password });

    if (result.success && result.data) {
      // Store tokens
      localStorage.setItem('accessToken', result.data.accessToken);
      if (result.data.refreshToken) {
        localStorage.setItem('refreshToken', result.data.refreshToken);
      }
      // Redirect to map
      router.push('/map');
    } else {
      setError(result.error === 'Network error' ? t.errorNetwork : t.errorInvalid);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-sand-gradient flex items-center justify-center px-4">
      <div className="flex items-center gap-24">
        <div className="flex-shrink-0">
          <Link href="/">
            <Image
              src="/awaves_main.svg"
              alt="AWAVES"
              width={180}
              height={180}
              className="animate-ripple"
              style={{ width: 'auto', height: 'auto', maxWidth: '180px' }}
            />
          </Link>
        </div>

        <div className="w-[480px] card">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-ocean-800">{t.title}</h1>
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="text-sm text-ocean-600 hover:text-ocean-500"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                required
                minLength={2}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-ocean-500 hover:text-ocean-600"
              >
                {t.forgotPassword}
              </Link>
            </div>

            {error && (
              <p className="text-sunset-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {isLoading ? '...' : t.submit}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ocean-600">
            {t.noAccount}{' '}
            <Link href="/register" className="text-ocean-500 hover:text-ocean-600 font-medium">
              {t.register}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
