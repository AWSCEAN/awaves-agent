'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoOverlay from '@/components/LogoOverlay';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import type { UserLevel } from '@/types';

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
        title: '고급 (Advanced)',
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
  const { user: authUser, logout } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [userLevel, setUserLevel] = useState<UserLevel>('beginner');
  const t = translations[lang];

  const handleSaveProfile = () => {
    // TODO: Implement profile save
    console.log('Save profile:', { userLevel });
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const levelOptions: UserLevel[] = ['beginner', 'intermediate', 'advanced'];

  return (
    <ProtectedRoute>
    <LogoOverlay />
    <div className="min-h-screen bg-sand-gradient">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-end">
          <div className="flex items-center gap-4">
            <Link href="/map" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
              {t.map}
            </Link>
            <Link href="/saved" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
              {t.savedSpots}
            </Link>
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="text-sm font-medium text-ocean-700 hover:text-ocean-500"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
            <button onClick={handleLogout} className="btn-outline text-sm">
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-8">
        <h1 className="text-3xl font-bold text-ocean-800 mb-8">{t.title}</h1>

        {/* Profile Section */}
        <section className="card mb-8">
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
                {t.password}
              </label>
              <input
                type="password"
                value="••••••••"
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
                      onClick={() => setUserLevel(level)}
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

            <div className="flex gap-4 pt-4">
              <button onClick={handleSaveProfile} className="btn-primary">
                {t.save}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
    </ProtectedRoute>
  );
}
