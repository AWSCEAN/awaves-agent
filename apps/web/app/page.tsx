'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LogoOverlay from '@/components/LogoOverlay';
import SurfLoadingScreen from '@/components/SurfLoadingScreen';
import { useLocale } from '@/components/LocaleProvider';

const translations = {
  ko: {
    tagline: '당신의 완벽한 파도를 찾아보세요',
    subtitle: 'AI 기반 서핑 스팟 탐색 플랫폼',
    cta: '지금 시작하기',
    login: '로그인',
    logout: '로그아웃',
    features: {
      title: '주요 기능',
      realtime: '실시간 파도 데이터',
      realtimeDesc: '전 세계 서핑 스팟의 실시간 파도 높이, 바람, 조류 정보',
      ai: 'AI 추천',
      aiDesc: '당신의 실력과 선호도에 맞는 최적의 서핑 스팟 추천',
      save: '스팟 저장',
      saveDesc: '마음에 드는 서핑 스팟을 저장하고 알림 받기',
    },
  },
  en: {
    tagline: 'Find Your Perfect Wave',
    subtitle: 'AI-powered surf spot discovery platform',
    cta: 'Get Started',
    login: 'Login',
    logout: 'Logout',
    features: {
      title: 'Key Features',
      realtime: 'Real-time Wave Data',
      realtimeDesc: 'Live wave height, wind, and tide info for surf spots worldwide',
      ai: 'AI Recommendations',
      aiDesc: 'Personalized surf spot recommendations based on your skill and preferences',
      save: 'Save Spots',
      saveDesc: 'Save your favorite surf spots and get notifications',
    },
  },
};

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { locale: lang, setLocale: setLang } = useLocale();
  const [navigating, setNavigating] = useState(false);
  const t = translations[lang];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setNavigating(true);
      router.push('/map');
    } else {
      router.push('/login');
    }
  };

  if (navigating) {
    return <SurfLoadingScreen />;
  }

  return (
    <>
      <main className="h-screen flex flex-col overflow-hidden bg-sand-gradient">
        {/* Header - desktop only (BottomNav handles mobile navigation) */}
        <header className="flex-shrink-0 glass z-40 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <LogoOverlay />
            <div className="flex items-center gap-2">
              {/* Language Toggle - always visible */}
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
              {/* Nav links - desktop only (BottomNav handles mobile navigation) */}
              {!isLoading && (
                isAuthenticated ? (
                  <div className="hidden md:flex items-center gap-3">
                    <Link href="/saved" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
                      {lang === 'ko' ? '저장된 스팟' : 'Saved Spots'}
                    </Link>
                    <Link href="/map" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
                      {lang === 'ko' ? '지도' : 'Map'}
                    </Link>
                    <Link
                      href="/mypage"
                      className="p-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
                      title={lang === 'ko' ? '마이페이지' : 'My Page'}
                    >
                      <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </Link>
                  </div>
                ) : (
                  <Link href="/login" className="btn-outline text-sm">
                    {t.login}
                  </Link>
                )
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="flex-1 overflow-y-auto hide-scrollbar">
          {/* Inner wrapper fills at least the full section height and centers content.
              Using min-h-full + flex justify-center (not on the outer section) is the
              correct pattern for "centered content that scrolls without clipping" */}
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-6 pb-20 md:pb-6">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-4">
                <Image
                  src="/awaves_main.svg"
                  alt="awaves"
                  width={200}
                  height={200}
                  className="animate-ripple"
                  style={{ width: 'auto', height: 'auto', maxWidth: '140px' }}
                />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-ocean-800 mb-3">
                {t.tagline}
              </h1>
              <p className="text-base md:text-lg text-ocean-600 mb-6">
                {t.subtitle}
              </p>
              <button onClick={handleGetStarted} className="btn-primary text-base md:text-lg px-6 md:px-8 py-3">
                {t.cta}
              </button>
            </div>

            {/* Features Row */}
            <div className="max-w-5xl mx-auto mt-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <FeatureCard
                  icon="🌊"
                  title={t.features.realtime}
                  description={t.features.realtimeDesc}
                />
                <FeatureCard
                  icon="🤖"
                  title={t.features.ai}
                  description={t.features.aiDesc}
                />
                <FeatureCard
                  icon="💾"
                  title={t.features.save}
                  description={t.features.saveDesc}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer - desktop only (BottomNav covers this area on mobile) */}
        <footer className="flex-shrink-0 py-3 px-4 bg-ocean-900 text-white/70 hidden md:block">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-xs">
              © 2024 awaves. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card text-center py-4 px-3">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="text-sm font-semibold text-ocean-800 mb-1">{title}</h3>
      <p className="text-xs text-ocean-600">{description}</p>
    </div>
  );
}
