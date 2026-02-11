'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LogoOverlay from '@/components/LogoOverlay';
import SavedItemCard from '@/components/SavedItemCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import SurfLoadingScreen from '@/components/SurfLoadingScreen';
import { useSavedItems } from '@/hooks/useSavedItems';
import { getSavedLocale, saveLocale } from '@/lib/i18n';
import type { SavedItemResponse, FeedbackStatus, Language } from '@/types';

const translations = {
  ko: {
    title: '저장된 스팟',
    empty: '저장된 서핑 스팟이 없습니다',
    explore: '스팟 탐색하기',
    map: '지도',
    mypage: '마이페이지',
    logout: '로그아웃',
    loading: '불러오는 중...',
    error: '목록을 불러오는데 실패했습니다',
    retry: '다시 시도',
    total: '총 {count}개의 저장된 스팟',
  },
  en: {
    title: 'Saved Spots',
    empty: 'No saved surf spots yet',
    explore: 'Explore Spots',
    map: 'Map',
    mypage: 'My Page',
    logout: 'Logout',
    loading: 'Loading...',
    error: 'Failed to load saved spots',
    retry: 'Retry',
    total: '{count} saved spots',
  },
};

export default function SavedPage() {
  const [lang, setLangState] = useState<Language>('en');
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackStatus>>({});

  const t = translations[lang];

  // Hydrate from persisted locale after mount
  useEffect(() => {
    setLangState(getSavedLocale());
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    saveLocale(newLang);
  };

  // Use GraphQL hook
  const {
    items: savedItems,
    loading: isLoading,
    error: queryError,
    refetch,
    deleteItem,
    acknowledgeChange,
    submitFeedback,
  } = useSavedItems();

  const error = queryError?.message || null;

  // Initialize feedbackMap from GraphQL response
  useEffect(() => {
    const initialFeedbackMap: Record<string, FeedbackStatus> = {};
    for (const item of savedItems) {
      if (item.feedback_status) {
        initialFeedbackMap[item.location_surf_key] = item.feedback_status;
      }
    }
    setFeedbackMap(initialFeedbackMap);
  }, [savedItems]);

  const handleRemove = async (item: SavedItemResponse) => {
    const success = await deleteItem(item.location_surf_key);
    if (!success) {
      console.error('Failed to delete item');
    }
  };

  const handleAcknowledgeChange = async (item: SavedItemResponse) => {
    const success = await acknowledgeChange(item.location_surf_key);
    if (!success) {
      console.error('Failed to acknowledge change');
    }
  };

  const handleFeedback = async (
    item: SavedItemResponse,
    status: FeedbackStatus
  ) => {
    const feedbackKey = item.location_surf_key;

    const result = await submitFeedback(
      item.location_id,
      item.surf_timestamp,
      status
    );

    if (result?.success) {
      setFeedbackMap((prev) => ({
        ...prev,
        [feedbackKey]: status,
      }));
    }
  };

  // Show full-page loading when data is loading and no cached items available
  if (isLoading && savedItems.length === 0) {
    return (
      <ProtectedRoute>
        <SurfLoadingScreen />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <LogoOverlay />
      <div className="min-h-screen bg-sand-gradient">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-40 glass">
          <div className="px-4 py-2 flex items-center justify-end">
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
              {/* Saved Spots Link */}
              <Link href="/saved" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
                {t.title}
              </Link>
              {/* Map Link */}
              <Link href="/map" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
                {t.map}
              </Link>
              {/* My Page Icon */}
              <Link
                href="/mypage"
                className="p-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
                title={t.mypage}
              >
                <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 py-8 pt-16">
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-3xl font-bold text-ocean-700 tracking-tight">
              {t.title}
            </h1>
            {savedItems.length > 0 && (
              <span className="text-sm text-ocean-500 mt-2">
                {t.total.replace('{count}', String(savedItems.length))}
              </span>
            )}
          </div>

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">😕</div>
              <p className="text-ocean-600 mb-6">{error}</p>
              <button onClick={() => refetch()} className="btn-primary">
                {t.retry}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && savedItems.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌊</div>
              <p className="text-ocean-600 mb-6">{t.empty}</p>
              <Link href="/map" className="btn-primary">
                {t.explore}
              </Link>
            </div>
          )}

          {/* Saved Items Grid */}
          {!isLoading && !error && savedItems.length > 0 && (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {savedItems.map((item) => {
                const feedbackKey = item.location_surf_key;
                return (
                  <SavedItemCard
                    key={item.location_surf_key}
                    item={item}
                    lang={lang}
                    onRemove={() => handleRemove(item)}
                    onAcknowledgeChange={() => handleAcknowledgeChange(item)}
                    onFeedback={(status) => handleFeedback(item, status)}
                    feedbackStatus={feedbackMap[feedbackKey]}
                  />
                );
              })}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
