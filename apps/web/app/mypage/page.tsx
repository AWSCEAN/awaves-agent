'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoOverlay from '@/components/LogoOverlay';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedLocale, saveLocale } from '@/lib/i18n';
import { authService } from '@/lib/apiServices';
import type { SurferLevel } from '@/types';

type Language = 'ko' | 'en';

const levelConfig = {
  beginner: {
    color: 'green',
    borderColor: 'border-green-400',
    bgColor: 'bg-green-50',
    selectedBg: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '🌊',
  },
  intermediate: {
    color: 'orange',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-50',
    selectedBg: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: '🏄',
  },
  advanced: {
    color: 'red',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-50',
    selectedBg: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '🔥',
  },
};

const translations = {
  ko: {
    title: '마이페이지',
    profile: '프로필',
    username: '사용자명',
    password: '비밀번호',
    surfingLevel: '서핑 레벨',
    save: '저장',
    logout: '로그아웃',
    savedSpots: '저장된 스팟',
    map: '지도',
    levels: {
      beginner: {
        title: '초급 (Beginner)',
        description: '서핑 입문자 또는 파도 위에 서기 어려운 분',
      },
      intermediate: {
        title: '중급 (Intermediate)',
        description: '보드 위 균형 유지 및 긴 라이딩 가능한 분',
      },
      advanced: {
        title: '상급 (Advanced)',
        description: '강한 파도와 다양한 기술 구사 가능한 분',
      },
    },
  },
  en: {
    title: 'My Page',
    profile: 'Profile',
    username: 'Username',
    password: 'Password',
    surfingLevel: 'Surfing Level',
    save: 'Save',
    logout: 'Logout',
    savedSpots: 'Saved Spots',
    map: 'Map',
    levels: {
      beginner: {
        title: 'Beginner',
        description: 'New to surfing or difficulty standing on waves',
      },
      intermediate: {
        title: 'Intermediate',
        description: 'Can maintain balance and perform long rides',
      },
      advanced: {
        title: 'Advanced',
        description: 'Can ride strong waves with various maneuvers',
      },
    },
  },
};

export default function MyPage() {
  const router = useRouter();
  const { user: authUser, logout, refreshAuth } = useAuth();
  const [lang, setLangState] = useState<Language>('en');
  const [userLevel, setSurferLevel] = useState<SurferLevel>('beginner');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const t = translations[lang];

  // Hydrate from persisted locale after mount
  useEffect(() => {
    setLangState(getSavedLocale());
  }, []);

  // Initialize userLevel from authUser
  useEffect(() => {
    if (authUser?.user_level) {
      setSurferLevel(authUser.user_level as SurferLevel);
    }
  }, [authUser]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    saveLocale(newLang);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await authService.updateUserLevel(userLevel);
      if (response.success && response.data?.result === 'success') {
        setSaveMessage(lang === 'ko' ? '저장되었습니다!' : 'Saved successfully!');
        await refreshAuth();
      } else {
        setSaveMessage(lang === 'ko' ? '저장에 실패했습니다' : 'Failed to save');
      }
    } catch {
      setSaveMessage(lang === 'ko' ? '오류가 발생했습니다' : 'An error occurred');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const levelOptions: SurferLevel[] = ['beginner', 'intermediate', 'advanced'];

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-sand-gradient flex flex-col">
      {/* Header - desktop only (BottomNav handles mobile navigation) */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-40 glass">
        <div className="px-4 py-2 flex items-center justify-between">
          <LogoOverlay />
          <div className="flex items-center gap-3">
            {/* Language Toggle (icon + label) */}
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
              title={lang === 'ko' ? 'English' : '한국어'}
            >
              <svg className="w-4 h-4 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-xs font-semibold text-ocean-700">{lang === 'ko' ? 'KO' : 'EN'}</span>
            </button>
            {/* Desktop nav links - hidden on mobile (BottomNav handles mobile) */}
            <Link href="/saved" className="hidden md:inline text-sm font-medium text-ocean-700 hover:text-ocean-500">
              {t.savedSpots}
            </Link>
            <Link href="/map" className="hidden md:inline text-sm font-medium text-ocean-700 hover:text-ocean-500">
              {t.map}
            </Link>
            <Link
              href="/mypage"
              className="hidden md:inline-block p-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
              title={t.title}
            >
              <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center max-w-2xl w-full mx-auto px-4 pt-20 md:pt-16 pb-20 md:pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-ocean-700 tracking-tight text-center mb-6">{t.title}</h1>

        {/* Profile Section */}
        <section className="card mb-6">
          <h2 className="text-xl font-semibold text-ocean-800 mb-4">{t.profile}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.username}
              </label>
              <input
                type="text"
                value={authUser?.username || ''}
                disabled
                className="input-field bg-sand-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ocean-700 mb-1">
                {t.surfingLevel}
              </label>
              {/* Toggle-style level selector */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden mt-2">
                {levelOptions.map((level, index) => {
                  const config = levelConfig[level];
                  const isSelected = userLevel === level;

                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSurferLevel(level)}
                      className={`flex-1 py-3 px-2 flex flex-col items-center gap-1 transition-all ${
                        index > 0 ? 'border-l border-gray-200' : ''
                      } ${
                        isSelected
                          ? `${config.selectedBg} ${config.borderColor} border-2 -m-[1px]`
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{config.icon}</span>
                      <span className={`text-sm font-medium ${isSelected ? config.textColor : 'text-gray-600'}`}>
                        {t.levels[level].title}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Selected level description */}
              <p className="text-sm text-gray-600 mt-2">
                {t.levels[userLevel].description}
              </p>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="btn-primary disabled:opacity-50"
                >
                  {isSaving ? '...' : t.save}
                </button>
                {saveMessage && (
                  <span className="text-sm text-green-600">{saveMessage}</span>
                )}
              </div>
              <button onClick={handleLogout} className="btn-outline text-sm text-red-500 border-red-300 hover:bg-red-50">
                {t.logout}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}
