'use client';

import { useState } from 'react';
import Link from 'next/link';
import AwavesLogo from '@/components/AwavesLogo';
import SpotCard from '@/components/SpotCard';
import type { SurfSpot } from '@/types';
import { mockSpots } from '@/lib/data';

type Language = 'ko' | 'en';

const translations = {
  ko: {
    title: '저장된 스팟',
    empty: '저장된 서핑 스팟이 없습니다',
    explore: '스팟 탐색하기',
    map: '지도',
    mypage: '마이페이지',
    remove: '삭제',
  },
  en: {
    title: 'Saved Spots',
    empty: 'No saved surf spots yet',
    explore: 'Explore Spots',
    map: 'Map',
    mypage: 'My Page',
    remove: 'Remove',
  },
};

export default function SavedPage() {
  const [lang, setLang] = useState<Language>('en');
  // Mock saved spots - using first 3 spots for demo
  const [savedSpots, setSavedSpots] = useState<SurfSpot[]>(mockSpots.slice(0, 3));
  const t = translations[lang];

  const handleRemove = (spotId: string) => {
    setSavedSpots(savedSpots.filter((spot) => spot.id !== spotId));
  };

  return (
    <div className="min-h-screen bg-sand-gradient">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <AwavesLogo size="sm" />
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/map" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {t.map}
          </Link>
          <Link href="/mypage" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {t.mypage}
          </Link>
          <button
            onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-sm text-ocean-600 hover:text-ocean-500"
          >
            {lang === 'ko' ? 'EN' : '한국어'}
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-ocean-800 mb-8">{t.title}</h1>

        {savedSpots.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌊</div>
            <p className="text-ocean-600 mb-6">{t.empty}</p>
            <Link href="/map" className="btn-primary">
              {t.explore}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSpots.map((spot) => (
              <SpotCard
                key={spot.id}
                spot={spot}
                lang={lang}
                onRemove={() => handleRemove(spot.id)}
                showRemove
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
