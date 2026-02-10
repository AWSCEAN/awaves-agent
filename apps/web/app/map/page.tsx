'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import LogoOverlay from '@/components/LogoOverlay';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import SearchResultsList from '@/components/SearchResultsList';
import type { SearchResult } from '@/components/SearchResultsList';
import SpotDetailPanel from '@/components/SpotDetailPanel';
import ProtectedRoute from '@/components/ProtectedRoute';
import LocaleProvider, { useLocale as useAppLocale } from '@/components/LocaleProvider';
import type { SurfInfo, SavedListItem, SurferLevel, SurfingLevel, SurfGrade } from '@/types';
import type { OverlayMode, SpotSelectionData } from '@/components/EnhancedMapboxMap';
import { TIME_SLOTS } from '@/lib/services/surfInfoService';
import { surfService } from '@/lib/apiServices';
import { useSavedItems } from '@/hooks/useSavedItems';
import SurfLoadingScreen from '@/components/SurfLoadingScreen';

const DEMO_USER_LOCATION = { lat: 37.5665, lng: 126.9780 };

const EnhancedMapboxMap = dynamic(
  () => import('@/components/EnhancedMapboxMap'),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-[#e8e4da]" />
    ),
  }
);

function MapPageContent() {
  const { locale, setLocale } = useAppLocale();
  const intlLocale = useLocale();
  const dateLocale = intlLocale === 'ko' ? ko : enUS;
  const t = useTranslations('header');
  const tSearch = useTranslations('search');
  const searchParams = useSearchParams();

  // Search state
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [surferLevel, setSurferLevel] = useState<SurferLevel | ''>('');

  // User location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  // Results state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [visibleSpots, setVisibleSpots] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Map state
  const [showWindParticles, setShowWindParticles] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('none');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Selected spot detail panel state
  const [selectedSpotDetail, setSelectedSpotDetail] = useState<SpotSelectionData | null>(null);

  // Quick date selector state
  const [showQuickDateSelect, setShowQuickDateSelect] = useState(true);

  // Saved items from GraphQL (BE DynamoDB)
  const { items: savedItems, saveItem, deleteItem, refetch } = useSavedItems();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Transform SavedItemResponse (snake_case) → SavedListItem (camelCase) for EnhancedMapboxMap
  const savedSpots: SavedListItem[] = useMemo(() =>
    savedItems.map(item => ({
      userId: item.user_id,
      locationSurfKey: item.location_surf_key,
      locationId: item.location_id,
      surfTimestamp: item.surf_timestamp,
      savedAt: item.saved_at,
      address: item.address || '',
      region: item.region || '',
      country: item.country || '',
      departureDate: item.departure_date || '',
      waveHeight: item.wave_height || 0,
      wavePeriod: item.wave_period || 0,
      windSpeed: item.wind_speed || 0,
      waterTemperature: item.water_temperature || 0,
      surfingLevel: (item.surfer_level || 'BEGINNER') as SurfingLevel,
      surfScore: item.surf_score,
      surfGrade: (item.surf_grade || 'D') as SurfGrade,
      name: item.location_id,
      nameKo: undefined,
    })),
    [savedItems]
  );

  // Center map from query params (e.g. /map?lat=38.0765&lng=128.6234)
  // If navigating from saved list, also open the detail panel
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setMapCenter({ lat: latNum, lng: lngNum });

        // Find matching saved spot to open detail panel
        const locationId = `${lat}#${lng}`;
        const matchingSaved = savedSpots.find(s => s.locationId === locationId);
        if (matchingSaved) {
          const surfInfo: SurfInfo = {
            LocationId: matchingSaved.locationId,
            SurfTimestamp: matchingSaved.surfTimestamp,
            geo: { lat: latNum, lng: lngNum },
            conditions: {
              waveHeight: matchingSaved.waveHeight,
              wavePeriod: matchingSaved.wavePeriod,
              windSpeed: matchingSaved.windSpeed,
              waterTemperature: matchingSaved.waterTemperature,
            },
            derivedMetrics: {
              surfScore: matchingSaved.surfScore,
              surfGrade: matchingSaved.surfGrade,
              surfingLevel: (matchingSaved.surfingLevel || 'BEGINNER') as SurfingLevel,
            },
            metadata: { modelVersion: '', dataSource: '', predictionType: 'FORECAST', createdAt: '' },
            name: matchingSaved.name || matchingSaved.locationId,
            nameKo: matchingSaved.nameKo,
            region: matchingSaved.region,
            country: matchingSaved.country,
            address: matchingSaved.address,
            difficulty: 'beginner',
            waveType: '',
            bestSeason: [],
          };
          setSelectedSpotDetail({
            surfInfo,
            coordinates: { latitude: latNum, longitude: lngNum },
          });
        }
      }
    }
  }, [searchParams, savedSpots]);

  // Generate date options (10 days)
  const dateOptions = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => addDays(new Date(), i)),
    []
  );

  // Check if selected date is beyond 10 days (weekly estimate)
  const { daysFromToday, isWeeklyEstimate, weekRange } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = differenceInDays(selectedDate, today);
    const isWeekly = days > 9;
    return {
      daysFromToday: days,
      isWeeklyEstimate: isWeekly,
      weekRange: isWeekly ? { start: selectedDate, end: addDays(selectedDate, 6) } : undefined,
    };
  }, [selectedDate]);

  const handleOverlayToggle = (mode: OverlayMode) => {
    setOverlayMode((prev) => (prev === mode ? 'none' : mode));
  };

  const fetchSpots = useCallback(async (query?: string) => {
    try {
      if (query) {
        const response = await surfService.searchSpots(query);
        if (response.success && response.data) {
          setSearchResults(response.data as SearchResult[]);
        }
      } else {
        const response = await surfService.getSpots({
          minWaveHeight: undefined,
          maxWaveHeight: undefined,
        });
        if (response.success && response.data) {
          setSearchResults(response.data.items as SearchResult[]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch spots:', err);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    await fetchSpots(locationQuery || undefined);
    setShowResults(true);
    setHasSearched(true);
    setSelectedSpotDetail(null);
  }, [locationQuery, fetchSpots]);

  const handleAllowLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setShowLocationPrompt(false);
          fetchSpots(locationQuery || undefined);
        },
        () => {
          setShowLocationPrompt(false);
        }
      );
    } else {
      setShowLocationPrompt(false);
    }
  };

  const handleSaveSpot = async (surfInfo: SurfInfo) => {
    // Fly to the spot and open detail panel (same as clicking the spot)
    setMapCenter({ lat: surfInfo.geo.lat, lng: surfInfo.geo.lng });
    setSelectedSpotDetail({
      surfInfo,
      coordinates: { latitude: surfInfo.geo.lat, longitude: surfInfo.geo.lng },
    });

    await saveItem({
      locationId: surfInfo.LocationId,
      surfTimestamp: surfInfo.SurfTimestamp,
      surferLevel: surfInfo.derivedMetrics.surfingLevel,
      surfScore: surfInfo.derivedMetrics.surfScore,
      surfGrade: surfInfo.derivedMetrics.surfGrade,
      address: surfInfo.address,
      region: surfInfo.region,
      country: surfInfo.country,
      waveHeight: surfInfo.conditions.waveHeight,
      wavePeriod: surfInfo.conditions.wavePeriod,
      windSpeed: surfInfo.conditions.windSpeed,
      waterTemperature: surfInfo.conditions.waterTemperature,
    });
  };

  const handleRemoveSpot = async (locationId: string) => {
    const saved = savedSpots.find((s) => s.locationId === locationId);
    if (saved) {
      await deleteItem(saved.locationSurfKey);
    }
  };

  const handleSpotClick = (spot: SearchResult) => {
    setMapCenter({ lat: spot.geo.lat, lng: spot.geo.lng });
    setSelectedSpotDetail({
      surfInfo: spot,
      coordinates: { latitude: spot.geo.lat, longitude: spot.geo.lng },
    });
  };

  const handleMapSpotSelect = (data: SpotSelectionData) => {
    setSelectedSpotDetail(data);
  };

  // Get effective user location (real or demo)
  const effectiveUserLocation = userLocation || DEMO_USER_LOCATION;

  const handleSuggestByDistance = useCallback(async () => {
    try {
      const response = await surfService.getNearbySpots(
        effectiveUserLocation.lat,
        effectiveUserLocation.lng,
        25,
      );
      if (response.success && response.data) {
        setSearchResults(response.data as SearchResult[]);
      }
    } catch (err) {
      console.error('Failed to fetch nearby spots:', err);
    }
    setShowResults(true);
    setHasSearched(true);
    setSelectedSpotDetail(null);
  }, [effectiveUserLocation]);

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  // Memoize savedSpotIds using LocationId
  const savedSpotIds = useMemo(() =>
    new Set(savedSpots.map((s) => s.locationId)),
    [savedSpots]
  );

  // Map shows only visible page spots after search, nothing before search (saved markers handled separately)
  const displaySpots = (hasSearched && showResults) ? visibleSpots : [];

  return (
    <ProtectedRoute>
    <div className="h-screen flex flex-col">
      {/* Header with Search Bar */}
      <header className="glass z-50 px-4 py-2">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <LogoOverlay />

          {/* Search Inputs - ml-48 to avoid LogoOverlay overlap */}
          <div className="flex-1 flex items-center gap-2 flex-wrap ml-48">
            {/* Location */}
            <LocationAutocomplete
              value={locationQuery}
              onChange={setLocationQuery}
              onSelect={() => {}}
              placeholder={tSearch('locationPlaceholder')}
              className="w-48"
            />

            {/* Date */}
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(parseISO(e.target.value));
                }
              }}
              className="px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800 w-40"
            />

            {/* Time */}
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="px-3 py-2 text-sm border border-sand-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-ocean-500/50 focus:border-ocean-500
                bg-white text-ocean-800 w-28"
            >
              <option value="">{tSearch('allTimes')}</option>
              {TIME_SLOTS.map((time) => (
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

            {/* Nearby Spots Button */}
            <button
              onClick={handleSuggestByDistance}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg
                hover:bg-blue-600 transition-colors flex items-center gap-1"
              title={locale === 'ko' ? '내 주변 25개 스팟 추천' : 'Suggest 25 Nearby Spots'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locale === 'ko' ? '주변' : 'Nearby'}
            </button>

            {/* Surf Score Toggle */}
            <button
              onClick={() => handleOverlayToggle('surf')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                overlayMode === 'surf' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-sand-200 text-ocean-700 hover:bg-sand-300'
              }`}
              title={t('surfScore')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('surfScore')}
            </button>

            {/* Wind Particles Toggle */}
            <button
              onClick={() => setShowWindParticles(!showWindParticles)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                showWindParticles ? 'bg-ocean-500 text-white hover:bg-ocean-600' : 'bg-sand-200 text-ocean-700 hover:bg-sand-300'
              }`}
              title={t('windParticles')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5c1.104 0 2 .896 2 2s-.896 2-2 2H3M17 11c1.104 0 2 .896 2 2s-.896 2-2 2H3M9 17c1.104 0 2 .896 2 2s-.896 2-2 2H3" />
              </svg>
              {t('windParticles')}
            </button>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Language Toggle (icon + label) */}
            <button
              onClick={toggleLocale}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
              title={locale === 'ko' ? 'English' : '한국어'}
            >
              <svg className="w-4 h-4 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-xs font-semibold text-ocean-700">{locale === 'ko' ? 'KO' : 'EN'}</span>
            </button>

            {/* Saved Spots Link */}
            <Link
              href="/saved"
              className="text-sm font-medium text-ocean-700 hover:text-ocean-500"
            >
              {t('saved')}
            </Link>

            {/* Map Link */}
            <Link
              href="/map"
              className="text-sm font-medium text-ocean-700 hover:text-ocean-500"
            >
              {t('map')}
            </Link>

            {/* My Page Icon */}
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
        <div className="fixed top-14 left-0 right-0 z-50 px-4 py-3 border-t border-sand-200 flex items-center justify-between bg-blue-100 shadow-md">
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
      <div className="flex-1 relative min-h-0">
        {/* Search Results Panel */}
        <SearchResultsList
          results={searchResults}
          isOpen={showResults && hasSearched}
          onClose={() => {
            setShowResults(false);
            setVisibleSpots([]);
          }}
          onSpotClick={handleSpotClick}
          onSaveSpot={handleSaveSpot}
          onRemoveSpot={handleRemoveSpot}
          savedSpotIds={savedSpotIds}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSuggestByDistance={handleSuggestByDistance}
          userLocation={effectiveUserLocation}
          isWeeklyEstimate={isWeeklyEstimate}
          weekRange={weekRange}
          onVisibleItemsChange={setVisibleSpots}
          showLocationPrompt={showLocationPrompt}
        />

        {/* Map */}
        <EnhancedMapboxMap
          spots={displaySpots}
          savedSpots={savedSpots}
          selectedDate={selectedDate}
          showWindParticles={showWindParticles}
          overlayMode={overlayMode}
          onSpotSelect={handleMapSpotSelect}
          locale={locale}
          center={mapCenter}
          showGeocoder={false}
          showMeasureDistance={false}
        />

        {/* 10-Day Quick Date Selector - Bottom Center */}
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 transition-all duration-300
          ${showResults && hasSearched ? 'ml-48' : ''}
          ${selectedSpotDetail ? 'mr-40' : ''}`}
        >
          {showQuickDateSelect ? (
            <>
              {/* Expanded View - All dates */}
              <button
                onClick={() => setShowQuickDateSelect(false)}
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 bg-white rounded-full shadow-md
                  hover:bg-sand-50 transition-colors border border-sand-200 text-[10px] text-ocean-600 font-medium
                  flex items-center gap-1"
                title={locale === 'ko' ? '접기' : 'Minimize'}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15l-7-7-7 7" />
                </svg>
                {locale === 'ko' ? '접기' : 'Hide'}
              </button>

              <div className="glass rounded-full shadow-lg px-2 py-1">
                <div className="flex items-center gap-0.5">
                  {dateOptions.map((date, index) => {
                    const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    const dayLabel = index === 0
                      ? (locale === 'ko' ? '오늘' : 'Today')
                      : index === 1
                        ? (locale === 'ko' ? '내일' : 'Tmrw')
                        : format(date, 'EEE', { locale: dateLocale });
                    const dateLabel = format(date, 'd', { locale: dateLocale });

                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-full
                          transition-all duration-200 ${
                          isSelected
                            ? 'bg-ocean-500 text-white shadow-sm'
                            : 'text-ocean-700 hover:bg-white/80'
                        }`}
                        title={format(date, 'PPP', { locale: dateLocale })}
                      >
                        <span className="text-xs font-semibold whitespace-nowrap">{dayLabel} {dateLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Minimized View - Only selected date */
            <button
              onClick={() => setShowQuickDateSelect(true)}
              className="glass rounded-full shadow-lg px-3 py-1.5 flex items-center gap-2
                hover:bg-white/90 transition-colors cursor-pointer"
              title={locale === 'ko' ? '10일 예보 펼치기' : 'Expand 10-Day Forecast'}
            >
              <span className="text-xs font-semibold text-ocean-700 whitespace-nowrap">
                {daysFromToday === 0
                  ? (locale === 'ko' ? '오늘' : 'Today')
                  : daysFromToday === 1
                    ? (locale === 'ko' ? '내일' : 'Tmrw')
                    : format(selectedDate, 'EEE', { locale: dateLocale })}{' '}
                {format(selectedDate, 'd', { locale: dateLocale })}
              </span>
              <svg className="w-3 h-3 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Spot Detail Panel - Right Side */}
        {selectedSpotDetail && (
          <SpotDetailPanel
            surfInfo={selectedSpotDetail.surfInfo}
            coordinates={selectedSpotDetail.coordinates}
            isSaved={savedSpots.some(
              (s) => s.locationId === selectedSpotDetail.surfInfo.LocationId
            )}
            onClose={() => setSelectedSpotDetail(null)}
            onSave={() => {
              handleSaveSpot(selectedSpotDetail.surfInfo);
            }}
            onRemove={() => {
              handleRemoveSpot(selectedSpotDetail.surfInfo.LocationId);
            }}
            showLocationPrompt={showLocationPrompt}
          />
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}

export default function MapPageEnhanced() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setAuthState('unauthenticated');
      router.replace('/login');
    } else {
      setAuthState('authenticated');
      const timer = setTimeout(() => setShowLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [router]);

  if (authState === 'checking' || authState === 'unauthenticated') {
    return <SurfLoadingScreen />;
  }

  if (showLoading) {
    return <SurfLoadingScreen />;
  }

  return (
    <LocaleProvider>
      <MapPageContent />
    </LocaleProvider>
  );
}
