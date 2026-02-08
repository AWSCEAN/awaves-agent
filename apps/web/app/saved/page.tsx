'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AwavesLogo from '@/components/AwavesLogo';
import SavedSpotCard from '@/components/SavedSpotCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import LocaleProvider, { useLocale } from '@/components/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { SavedListItem } from '@/types';
import { getSavedList, removeFromSavedList } from '@/lib/services/savedListService';
import { getUserId } from '@/lib/services/userService';

function SavedPageContent() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations('saved');
  const tHeader = useTranslations('header');

  const router = useRouter();
  const { logout } = useAuth();
  const [savedSpots, setSavedSpots] = useState<SavedListItem[]>([]);
  const userId = getUserId();

  useEffect(() => {
    setSavedSpots(getSavedList(userId));
  }, [userId]);

  const handleRemove = (locationId: string) => {
    removeFromSavedList(userId, locationId);
    setSavedSpots((prev) => prev.filter((item) => item.locationId !== locationId));
  };

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
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
            {tHeader('map')}
          </Link>
          <Link href="/mypage" className="text-ocean-700 hover:text-ocean-500 text-sm font-medium">
            {tHeader('mypage')}
          </Link>
          <button
            onClick={toggleLocale}
            className="text-sm text-ocean-600 hover:text-ocean-500 font-medium"
          >
            {locale === 'ko' ? 'EN' : '한국어'}
          </button>
          <button onClick={handleLogout} className="btn-outline text-sm">
            {tHeader('logout')}
          </button>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-ocean-800 mb-8">{t('title')}</h1>

        {savedSpots.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌊</div>
            <p className="text-ocean-600 mb-6">{t('empty')}</p>
            <Link href="/map" className="btn-primary">
              {t('explore')}
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSpots.map((item) => (
              <SavedSpotCard
                key={item.locationSurfKey}
                item={item}
                onRemove={() => handleRemove(item.locationId)}
              />
            ))}
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
