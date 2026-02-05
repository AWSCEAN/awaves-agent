'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { format, addDays } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import AwavesLogo from '@/components/AwavesLogo';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import SearchResultsList from '@/components/SearchResultsList';
import LocaleProvider, { useLocale as useAppLocale } from '@/components/LocaleProvider';
import type { SavedSpotMarker, SurfSpot, SurferLevel } from '@/types';
import type { OverlayMode } from '@/components/EnhancedMapboxMap';
import { searchSpotsWithFilters, availableTimeSlots, mockSpots } from '@/lib/data';
import { getSavedSpotsFromStorage, saveSpotsToStorage } from '@/lib/mockForecastData';

const EnhancedMapboxMap = dynamic(
  () => import('@/components/EnhancedMapboxMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-ocean-100 flex items-center justify-center">
        <div className="text-ocean-500">Loading map...</div>
      </div>
    ),
  }
);

interface SearchResult extends SurfSpot {
  surfScore: number;
  safetyScore: number;
  distance?: number;
}

function MapPageContent() {
  const { locale, setLocale } = useAppLocale();
  const intlLocale = useLocale();
  const dateLocale = intlLocale === 'ko' ? ko : enUS;
  const t = useTranslations('header');
  const tSearch = useTranslations('search');
  const tDate = useTranslations('date');

  // Search state
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [surferLevel, setSurferLevel] = useState<SurferLevel | ''>('');

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(false);

  // Results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Map state
  const [showWindParticles, setShowWindParticles] = useState(false);
  const [savedSpots, setSavedSpots] = useState<SavedSpotMarker[]>([]);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('none');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Load saved spots
  useEffect(() => {
    setSavedSpots(getSavedSpotsFromStorage());
  }, []);

  // Generate date options (10 days)
  const dateOptions = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i));

  const handleOverlayToggle = (mode: OverlayMode) => {
    setOverlayMode((prev) => (prev === mode ? 'none' : mode));
  };

  const handleSearch = useCallback(() => {
    // Ask for location permission on first search if not already asked
    if (!locationPermissionAsked && !userLocation) {
      setShowLocationPrompt(true);
      setLocationPermissionAsked(true);
      // Continue with search even without location
    }

    const results = searchSpotsWithFilters({
      location: locationQuery || undefined,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime || undefined,
      surferLevel: surferLevel || undefined,
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
    });

    setSearchResults(results);
    setShowResults(true);
    setHasSearched(true);
  }, [locationQuery, selectedDate, selectedTime, surferLevel, userLocation, locationPermissionAsked]);

  const handleAllowLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setShowLocationPrompt(false);
          // Re-run search with location
          const results = searchSpotsWithFilters({
            location: locationQuery || undefined,
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: selectedTime || undefined,
            surferLevel: surferLevel || undefined,
            userLat: position.coords.latitude,
            userLng: position.coords.longitude,
          });
          setSearchResults(results);
        },
        () => {
          setShowLocationPrompt(false);
        }
      );
    } else {
      setShowLocationPrompt(false);
    }
  };

  const handleSaveSpot = (spot: { name: string; latitude: number; longitude: number; id?: string }) => {
    const newSpot: SavedSpotMarker = {
      id: spot.id || `saved-${Date.now()}`,
      spotId: spot.id,
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      savedAt: new Date().toISOString(),
    };
    const updatedSpots = [...savedSpots, newSpot];
    setSavedSpots(updatedSpots);
    saveSpotsToStorage(updatedSpots);
  };

  const handleSpotClick = (spot: SearchResult) => {
    setMapCenter({ lat: spot.latitude, lng: spot.longitude });
  };

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  const savedSpotIds = new Set(savedSpots.map((s) => s.spotId).filter(Boolean) as string[]);

  // Get spots to display on map (search results if searched, otherwise all spots)
  const displaySpots = hasSearched ? searchResults : mockSpots;

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Search Bar */}
      <header className="glass z-50 px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <AwavesLogo size="sm" />
          </Link>

          {/* Search Inputs */}
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {/* Location */}
            <LocationAutocomplete
              value={locationQuery}
              onChange={setLocationQuery}
              onSelect={() => {}}
              placeholder={tSearch('locationPlaceholder')}
              className="w-48"
            />

            {/* Date */}
            <select
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const date = dateOptions.find(
                  (d) => format(d, 'yyyy-MM-dd') === e.target.value
                );
                if (date) setSelectedDate(date);
              }}
              className="px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800 w-36"
            >
              {dateOptions.map((date, index) => {
                const label =
                  index === 0
                    ? tDate('today')
                    : index === 1
                      ? tDate('tomorrow')
                      : format(date, 'MMM d', { locale: dateLocale });
                return (
                  <option key={date.toISOString()} value={format(date, 'yyyy-MM-dd')}>
                    {label}
                  </option>
                );
              })}
            </select>

            {/* Time */}
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800 w-28"
            >
              <option value="">{tSearch('allTimes')}</option>
              {availableTimeSlots.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>

            {/* Surfer Level */}
            <select
              value={surferLevel}
              onChange={(e) => setSurferLevel(e.target.value as SurferLevel | '')}
              className="px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800 w-32"
            >
              <option value="">{tSearch('allLevels')}</option>
              <option value="beginner">{tSearch('difficulty.beginner')}</option>
              <option value="intermediate">{tSearch('difficulty.intermediate')}</option>
              <option value="advanced">{tSearch('difficulty.advanced')}</option>
              <option value="expert">{tSearch('difficulty.expert')}</option>
            </select>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-ocean-500 text-white text-sm font-medium rounded-lg
                hover:bg-ocean-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {tSearch('searchButton')}
            </button>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Toggle Buttons */}
            <button
              onClick={() => setShowWindParticles(!showWindParticles)}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showWindParticles ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
              }`}
              title={t('windParticles')}
            >
              {t('windParticles')}
            </button>
            <button
              onClick={() => handleOverlayToggle('surf')}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                overlayMode === 'surf' ? 'bg-green-500 text-white' : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
              }`}
              title={t('surfScore')}
            >
              {t('surfScore')}
            </button>
            <button
              onClick={() => handleOverlayToggle('safety')}
              className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                overlayMode === 'safety' ? 'bg-orange-500 text-white' : 'bg-sand-100 text-ocean-700 hover:bg-sand-200'
              }`}
              title={t('safetyScore')}
            >
              {t('safetyScore')}
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-sand-200" />

            {/* Saved Link */}
            <Link
              href="/saved"
              className="text-ocean-700 hover:text-ocean-500 text-xs font-medium"
            >
              {t('saved')}
            </Link>

            {/* Language Toggle */}
            <button
              onClick={toggleLocale}
              className="text-xs text-ocean-600 hover:text-ocean-500 font-medium"
            >
              {locale === 'ko' ? 'EN' : '한국어'}
            </button>

            {/* Profile Icon */}
            <Link
              href="/mypage"
              className="p-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
              title={t('mypage')}
            >
              <svg className="w-5 h-5 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Location Permission Prompt */}
      {showLocationPrompt && (
        <div className="glass px-4 py-3 border-t border-sand-200 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-ocean-700">
            <svg className="w-5 h-5 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{tSearch('locationPermission')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocationPrompt(false)}
              className="px-3 py-1 text-sm text-ocean-600 hover:text-ocean-800"
            >
              {tSearch('denyLocation')}
            </button>
            <button
              onClick={handleAllowLocation}
              className="px-3 py-1 text-sm bg-ocean-500 text-white rounded-lg hover:bg-ocean-600"
            >
              {tSearch('allowLocation')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        {/* Search Results Panel */}
        <SearchResultsList
          results={searchResults}
          isOpen={showResults && hasSearched}
          onClose={() => setShowResults(false)}
          onSpotClick={handleSpotClick}
          onSaveSpot={handleSaveSpot}
          savedSpotIds={savedSpotIds}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />

        {/* Map */}
        <EnhancedMapboxMap
          spots={displaySpots}
          savedSpots={savedSpots}
          selectedDate={selectedDate}
          showWindParticles={showWindParticles}
          overlayMode={overlayMode}
          onSaveSpot={handleSaveSpot}
          locale={locale}
          center={mapCenter}
          showGeocoder={false}
          showMeasureDistance={false}
        />
      </div>
    </div>
  );
}

export default function MapPageEnhanced() {
  return (
    <LocaleProvider>
      <MapPageContent />
    </LocaleProvider>
  );
}
