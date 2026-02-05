'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AwavesLogo from '@/components/AwavesLogo';
import InfoPanel from '@/components/InfoPanel';
import DateRangePicker from '@/components/DateRangePicker';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { SurfSpot, SearchFilters } from '@/types';
import { mockSpots } from '@/lib/data';

// Dynamic import for Mapbox to avoid SSR issues
const MapboxMap = dynamic(() => import('@/components/MapboxMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-ocean-100 flex items-center justify-center">
      <div className="text-ocean-500">Loading map...</div>
    </div>
  ),
});

type Language = 'ko' | 'en';

const translations = {
  ko: {
    search: '서핑 스팟 검색...',
    filters: '필터',
    saved: '저장됨',
    mypage: '마이페이지',
    difficulty: {
      beginner: '초급',
      intermediate: '중급',
      advanced: '고급',
      expert: '전문가',
    },
  },
  en: {
    search: 'Search surf spots...',
    filters: 'Filters',
    saved: 'Saved',
    mypage: 'My Page',
    difficulty: {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      expert: 'Expert',
    },
  },
};

export default function MapPage() {
  const [lang, setLang] = useState<Language>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const t = translations[lang];

  const handleSpotClick = (spot: SurfSpot) => {
    setSelectedSpot(spot);
    setIsPanelOpen(true);
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setFilters({
      ...filters,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <header className="glass z-50 px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <AwavesLogo size="sm" />
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="input-field pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ocean-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary text-sm ${showFilters ? 'bg-ocean-500 text-white' : ''}`}
          >
            {t.filters}
          </button>
          <Link href="/saved" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {t.saved}
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass px-4 py-3 border-t border-sand-200 flex items-center gap-4 flex-wrap">
          <DateRangePicker onChange={handleDateRangeChange} lang={lang} />

          <select
            value={filters.difficulty || ''}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as any || undefined })}
            className="input-field w-auto"
          >
            <option value="">All Levels</option>
            {Object.entries(t.difficulty).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-ocean-700">Wave Height:</label>
            <input
              type="number"
              placeholder="Min"
              value={filters.minWaveHeight || ''}
              onChange={(e) => setFilters({ ...filters, minWaveHeight: Number(e.target.value) || undefined })}
              className="input-field w-20"
              min={0}
              step={0.5}
            />
            <span className="text-ocean-500">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.maxWaveHeight || ''}
              onChange={(e) => setFilters({ ...filters, maxWaveHeight: Number(e.target.value) || undefined })}
              className="input-field w-20"
              min={0}
              step={0.5}
            />
            <span className="text-sm text-ocean-600">m</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        <MapboxMap
          spots={mockSpots}
          onSpotClick={handleSpotClick}
          selectedSpotId={selectedSpot?.id}
        />

        {/* Info Panel */}
        <InfoPanel
          spot={selectedSpot}
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          lang={lang}
        />
      </div>
    </div>
    </ProtectedRoute>
  );
}
