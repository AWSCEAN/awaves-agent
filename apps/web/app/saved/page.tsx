'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LogoOverlay from '@/components/LogoOverlay';
import SavedItemCard from '@/components/SavedItemCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { savedService, feedbackService } from '@/lib/apiServices';
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
  const [savedItems, setSavedItems] = useState<SavedItemResponse[]>([]);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const fetchSavedItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await savedService.getSavedItems();

    if (response.success && response.data?.result === 'success' && response.data.data) {
      setSavedItems(response.data.data.items);
    } else {
      setError(response.error || t.error);
    }

    setIsLoading(false);
  }, [t.error]);

  useEffect(() => {
    fetchSavedItems();
  }, [fetchSavedItems]);

  const handleRemove = async (item: SavedItemResponse) => {
    const response = await savedService.removeSavedItem({
      location_surf_key: item.location_surf_key,
    });

    if (response.success && response.data?.result === 'success') {
      setSavedItems((prev) =>
        prev.filter((i) => i.location_surf_key !== item.location_surf_key)
      );
    }
  };

  const handleAcknowledgeChange = async (item: SavedItemResponse) => {
    const response = await savedService.acknowledgeChange({
      location_surf_key: item.location_surf_key,
    });

    if (response.success && response.data?.result === 'success') {
      setSavedItems((prev) =>
        prev.map((i) =>
          i.location_surf_key === item.location_surf_key
            ? { ...i, flag_change: false, change_message: undefined }
            : i
        )
      );
    }
  };

  const handleFeedback = async (
    item: SavedItemResponse,
    status: FeedbackStatus
  ) => {
    const feedbackKey = item.location_surf_key;

    const response = await feedbackService.submitSavedItemFeedback({
      location_id: item.location_id,
      surf_timestamp: item.surf_timestamp,
      feedback_status: status,
    });

    if (response.success && response.data?.result === 'success') {
      setFeedbackMap((prev) => ({
        ...prev,
        [feedbackKey]: status,
      }));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

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
              <button onClick={fetchSavedItems} className="btn-primary">
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
