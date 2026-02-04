'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AwavesLogo from '@/components/AwavesLogo';
import { authService } from '@/lib/apiServices';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    title: '회원가입',
    email: '이메일',
    password: '비밀번호',
    confirmPassword: '비밀번호 확인',
    nickname: '닉네임',
    submit: '가입하기',
    hasAccount: '이미 계정이 있으신가요?',
    login: '로그인',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    errorExists: '이미 존재하는 이메일입니다',
    errorNetwork: '네트워크 오류가 발생했습니다',
    success: '가입 완료! 로그인해주세요.',
  },
  en: {
    title: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    nickname: 'Nickname',
    submit: 'Register',
    hasAccount: 'Already have an account?',
    login: 'Login',
    passwordMismatch: 'Passwords do not match',
    errorExists: 'Email already exists',
    errorNetwork: 'Network error occurred',
    success: 'Registration complete! Please login.',
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Language>('en');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsLoading(true);

    const result = await authService.register({
      email,
      password,
      nickname,
      preferredLanguage: lang,
    });

    if (result.success) {
      setSuccess(t.success);
      setTimeout(() => router.push('/login'), 1500);
    } else {
      setError(
        result.error?.includes('exists') ? t.errorExists :
        result.error === 'Network error' ? t.errorNetwork :
        result.error || t.errorNetwork
      );
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-sand-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <AwavesLogo size="lg" />
          </Link>
        </div>

        <div className="card">
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
                {t.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.nickname}
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field"
                required
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
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-coral-500 text-sm text-center">{error}</p>
            )}

            {success && (
              <p className="text-green-600 text-sm text-center">{success}</p>
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
            {t.hasAccount}{' '}
            <Link href="/login" className="text-ocean-500 hover:text-ocean-600 font-medium">
              {t.login}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
