'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AwavesLogo from '@/components/AwavesLogo';
import SavedItemCard from '@/components/SavedItemCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import LocaleProvider, { useLocale } from '@/components/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useSavedItems } from '@/hooks/useSavedItems';
import type { SavedItemResponse, FeedbackStatus } from '@/types';

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

function SavedPageContent() {
  const { locale, setLocale } = useLocale();
  const router = useRouter();
  const { logout } = useAuth();
  const [feedbackOverrides, setFeedbackOverrides] = useState<Record<string, FeedbackStatus>>({});

  const t = translations[locale];

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

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  return (
    <ProtectedRoute>
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
            onClick={toggleLocale}
            className="text-sm text-ocean-600 hover:text-ocean-500 font-medium"
          >
            {locale === 'ko' ? 'EN' : '한국어'}
          </button>
          <button onClick={handleLogout} className="btn-outline text-sm">
            {t.logout}
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
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
                  lang={locale}
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

export default function SavedPage() {
  return (
    <LocaleProvider>
      <SavedPageContent />
    </LocaleProvider>
  );
}
