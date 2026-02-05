'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    tagline: '당신의 완벽한 파도를 찾아보세요',
    subtitle: 'AI 기반 서핑 스팟 탐색 플랫폼',
    cta: '지금 시작하기',
    login: '로그인',
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

function LogoOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '4px',
        left: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 16px',
        height: '48px',
        pointerEvents: 'none',
      }}
    >
      <Image
        src="/awaves_letter.svg"
        alt="AWAVES"
        width={60}
        height={20}
        style={{ height: '20px', width: 'auto', marginTop: '4px' }}
      />
      <Image
        src="/awaves_logo.svg"
        alt="AWAVES Logo"
        width={36}
        height={36}
        style={{ height: '36px', width: 'auto' }}
      />
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  return (
    <>
      <LogoOverlay />
      <main className="min-h-screen bg-sand-gradient">
        {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 glass">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-end">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="text-sm font-medium text-ocean-700 hover:text-ocean-500"
            >
              {lang === 'ko' ? 'EN' : '한국어'}
            </button>
            <Link href="/login" className="btn-outline text-sm">
              {t.login}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/awaves_main.svg"
              alt="AWAVES"
              width={280}
              height={280}
              className="animate-ripple"
              style={{ width: 'auto', height: 'auto', maxWidth: '280px' }}
            />
          </div>
          <h1 className="text-5xl font-bold text-ocean-800 mb-6">
            {t.tagline}
          </h1>
          <p className="text-xl text-ocean-600 mb-10">
            {t.subtitle}
          </p>
          <Link href="/map" className="btn-primary text-base px-10 py-3 inline-block whitespace-nowrap">
            {t.cta}
          </Link>
        </div>

        {/* Wave illustration placeholder */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="aspect-video bg-ocean-gradient rounded-2xl flex items-center justify-center text-white/50 text-lg">
            🌊 Interactive Map Preview
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-ocean-800 text-center mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
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
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-ocean-900 text-white/70">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm">
            © 2024 AWAVES. All rights reserved.
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
    <div className="card text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-ocean-800 mb-2">{title}</h3>
      <p className="text-ocean-600">{description}</p>
    </div>
  );
}
