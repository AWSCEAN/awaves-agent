'use client';

import { useState, useCallback, useMemo } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoOverlay from '@/components/LogoOverlay';
import SavedItemCard from '@/components/SavedItemCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedItems } from '@/hooks/useSavedItems';
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
  const router = useRouter();
  const { logout } = useAuth();
  const [lang, setLang] = useState<Language>('en');
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<string, FeedbackStatus>>({});

  const t = translations[lang];

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

  // Derive feedbackMap from GraphQL response + local overrides
  const feedbackMap = useMemo(() => {
    const map: Record<string, FeedbackStatus> = {};
    for (const item of savedItems) {
      if (item.feedback_status) {
        map[item.location_surf_key] = item.feedback_status;
      }
    }
    return { ...map, ...feedbackOverrides };
  }, [savedItems, feedbackOverrides]);

  const handleRemove = useCallback(async (item: SavedItemResponse) => {
    await deleteItem(item.location_surf_key);
  }, [deleteItem]);

  const handleAcknowledgeChange = useCallback(async (item: SavedItemResponse) => {
    await acknowledgeChange(item.location_surf_key);
  }, [acknowledgeChange]);

  const handleFeedback = useCallback(async (
    item: SavedItemResponse,
    status: FeedbackStatus
  ) => {
    const result = await submitFeedback(
      item.location_id,
      item.surf_timestamp,
      status
    );

    if (result?.success) {
      setFeedbackOverrides((prev) => ({
        ...prev,
        [item.location_surf_key]: status,
      }));
    }
  }, [submitFeedback]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
  }, [logout, router]);

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
              <Link href="/mypage" className="text-sm font-medium text-ocean-700 hover:text-ocean-500">
                {t.mypage}
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
        <main className="max-w-6xl mx-auto px-4 py-8 pt-16">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-ocean-800">{t.title}</h1>
            {savedItems.length > 0 && (
              <span className="text-sm text-ocean-600">
                {t.total.replace('{count}', String(savedItems.length))}
              </span>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-ocean-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-ocean-600">{t.loading}</p>
            </div>
          )}

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
