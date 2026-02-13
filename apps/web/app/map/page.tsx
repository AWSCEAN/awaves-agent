'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { format, addDays, differenceInDays } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from 'next-intl';
import LogoOverlay from '@/components/LogoOverlay';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import SearchResultsList from '@/components/SearchResultsList';
import type { SearchResult } from '@/components/SearchResultsList';
import SpotDetailPanel from '@/components/SpotDetailPanel';
import TimeSlotPickerPanel from '@/components/TimeSlotPickerPanel';
import PredictionResultPanel from '@/components/PredictionResultPanel';
import DatePickerInput from '@/components/DatePickerInput';
import ProtectedRoute from '@/components/ProtectedRoute';
import LocaleProvider, { useLocale as useAppLocale } from '@/components/LocaleProvider';
import type { SurfInfo, SavedListItem, SurferLevel, SurfingLevel, SurfGrade, PredictionResult } from '@/types';
import type { OverlayMode, SpotSelectionData } from '@/components/EnhancedMapboxMap';
import { TIME_SLOTS, getCurrentTimeSlot, localToUTC } from '@/lib/services/surfInfoService';
import { surfService } from '@/lib/apiServices';
import { useSavedItems } from '@/hooks/useSavedItems';
import SurfLoadingScreen from '@/components/SurfLoadingScreen';
import { useAuth } from '@/contexts/AuthContext';


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
  const { user } = useAuth();

  // Search state - input values (what user is selecting)
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [surferLevel, setSurferLevel] = useState<SurferLevel | ''>('');

  // Initialize surferLevel from user's saved level
  useEffect(() => {
    if (user?.user_level) {
      setSurferLevel(user.user_level as SurferLevel);
    }
  }, [user?.user_level]);

  // Search state - active values (what was last searched, only update on search button click)
  const [searchDate, setSearchDate] = useState<Date>(new Date());
  const [searchTime, setSearchTime] = useState<string>('');

  // User location state - persist permission across navigations
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userLocation');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });
  const [showLocationPrompt, setShowLocationPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('locationPermissionGranted');
    }
    return true;
  });

  // Results state
  const [allSpots, setAllSpots] = useState<SurfInfo[]>([]);
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

  // Prediction state
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [predictionErrors, setPredictionErrors] = useState<{ location?: boolean; level?: boolean }>({});

  // Time slot picker for multi-save markers
  const [timeSlotSelection, setTimeSlotSelection] = useState<{
    locationId: string;
    coordinates: { lat: number; lng: number };
    saves: SavedListItem[];
  } | null>(null);

  // Quick date selector state
  const [showQuickDateSelect, setShowQuickDateSelect] = useState(true);

  // Saved items from GraphQL (BE DynamoDB)
  const { items: savedItems, saveItem, deleteItem, refetch } = useSavedItems();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Fetch all spots on mount for default map markers (today's date, current time slot)
  useEffect(() => {
    const loadAllSpots = async () => {
      try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const timeSlot = getCurrentTimeSlot();
        const utc = localToUTC(todayStr, timeSlot);
        const response = await surfService.getAllSpots(utc.date, utc.time);
        if (response.success && response.data) {
          setAllSpots(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch all spots:', err);
      }
    };
    loadAllSpots();
  }, []);

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
      name: item.address || item.location_id,
      nameKo: undefined,
    })),
    [savedItems]
  );

  // Group saves by locationId for multi-save markers
  const saveCountByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    savedSpots.forEach(s => counts.set(s.locationId, (counts.get(s.locationId) || 0) + 1));
    return counts;
  }, [savedSpots]);

  const savesByLocation = useMemo(() => {
    const grouped = new Map<string, SavedListItem[]>();
    savedSpots.forEach(s => {
      if (!grouped.has(s.locationId)) grouped.set(s.locationId, []);
      grouped.get(s.locationId)!.push(s);
    });
    return grouped;
  }, [savedSpots]);

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

        // Find matching saved spots to open detail or time slot picker
        const locationId = `${lat}#${lng}`;
        const savesAtLocation = savesByLocation.get(locationId) || [];
        if (savesAtLocation.length > 1) {
          setTimeSlotSelection({ locationId, coordinates: { lat: latNum, lng: lngNum }, saves: savesAtLocation });
        } else if (savesAtLocation.length === 1) {
          const matchingSaved = savesAtLocation[0];
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

  // Determine days from today and if we're in prediction mode (>10 days)
  const { daysFromToday, isPredictionMode } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = differenceInDays(selectedDate, today);
    return { daysFromToday: days, isPredictionMode: days > 9 };
  }, [selectedDate]);

  const handleOverlayToggle = (mode: OverlayMode) => {
    setOverlayMode((prev) => (prev === mode ? 'none' : mode));
  };

  
  const fetchSpots = useCallback(async (
    query?: string,
    options?: { date?: string; time?: string; surferLevel?: string }
  ) => {
    try {
      // Convert local date+time to UTC for DynamoDB queries
      // When "All Times" is selected (no time), use noon as reference for consistent UTC conversion
      const utc = (options?.date && options?.time)
        ? localToUTC(options.date, options.time)
        : options?.date
          ? localToUTC(options.date, '12:00')
          : { date: undefined, time: undefined };
      const utcOptions = { ...options, date: utc.date, time: utc.time };

      // Always fetch all spots for the selected date so map markers stay in sync
      const allSpotsPromise = surfService.getAllSpots(utc.date, utc.time);

      if (query) {
        const [response] = await Promise.all([
          surfService.searchSpots(query, { ...utcOptions, language: locale === 'ko' ? 'ko' : undefined }),
          allSpotsPromise.then(res => {
            if (res.success && res.data) setAllSpots(res.data);
          }),
        ]);
        if (response.success && response.data) {
          setSearchResults(response.data as SearchResult[]);
        }
      } else {
        // No query: use allSpots filtered by date/time, then apply surferLevel client-side
        const response = await allSpotsPromise;
        if (response.success && response.data) {
          setAllSpots(response.data);
          let results = response.data as SearchResult[];
          if (options?.surferLevel) {
            const level = options.surferLevel.toUpperCase();
            results = results.filter(s =>
              s.derivedMetrics?.surfingLevel?.toUpperCase() === level
            );
          }
          setSearchResults(results);
        }
      }
    } catch (err) {
      console.error('Failed to fetch spots:', err);
    }
  }, []);


  const handleSearch = useCallback(async () => {
    setVisibleSpots([]);
    setShowResults(true);
    setHasSearched(true);
    setSelectedSpotDetail(null);
    // Close prediction panel if open
    setShowPrediction(false);
    setPredictionResult(null);
    // Update active search criteria only when search button is clicked
    setSearchDate(selectedDate);
    setSearchTime(selectedTime);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await fetchSpots(locationQuery || undefined, {
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedTime || undefined,
      surferLevel: surferLevel || undefined,
    });
  }, [locationQuery, selectedDate, selectedTime, surferLevel, fetchSpots]);

  const handlePredictionSearch = useCallback(async () => {
    const errors: { location?: boolean; level?: boolean } = {};
    if (!locationQuery || !selectedLocationId) errors.location = true;
    if (!surferLevel) errors.level = true;

    if (Object.keys(errors).length > 0) {
      setPredictionErrors(errors);
      return;
    }

    setPredictionErrors({});
    setShowResults(false);
    setHasSearched(false);
    setSelectedSpotDetail(null);

    try {
      const response = await surfService.predictSurf(
        selectedLocationId!,
        format(selectedDate, 'yyyy-MM-dd'),
        surferLevel,
      );
      if (response.success && response.data) {
        setPredictionResult(response.data);
        setShowPrediction(true);
        setMapCenter({ lat: response.data.geo.lat, lng: response.data.geo.lng });
      }
    } catch (err) {
      console.error('Prediction failed:', err);
    }
  }, [locationQuery, selectedLocationId, selectedDate, surferLevel]);

  const handleAllowLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setShowLocationPrompt(false);
          localStorage.setItem('locationPermissionGranted', 'true');
          localStorage.setItem('userLocation', JSON.stringify(loc));
          fetchSpots(locationQuery || undefined, {
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: selectedTime || undefined,
            surferLevel: surferLevel || undefined,
          });
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

    // Use the display name as address so saved spots page shows the name
    const displayName = surfInfo.name || surfInfo.address || surfInfo.LocationId;

    await saveItem({
      locationId: surfInfo.LocationId,
      surfTimestamp: surfInfo.SurfTimestamp,
      surferLevel: surfInfo.derivedMetrics.surfingLevel,
      surfScore: surfInfo.derivedMetrics.surfScore,
      surfGrade: surfInfo.derivedMetrics.surfGrade,
      address: displayName,
      region: surfInfo.region,
      country: surfInfo.country,
      waveHeight: surfInfo.conditions.waveHeight,
      wavePeriod: surfInfo.conditions.wavePeriod,
      windSpeed: surfInfo.conditions.windSpeed,
      waterTemperature: surfInfo.conditions.waterTemperature,
    });
  };

  const handleRemoveSpot = async (locationId: string, surfTimestamp?: string) => {
    const saved = surfTimestamp
      ? savedSpots.find((s) => s.locationId === locationId && s.surfTimestamp === surfTimestamp)
      : savedSpots.find((s) => s.locationId === locationId);
    if (saved) {
      await deleteItem(saved.locationSurfKey);
    }
  };

  const handleSpotClick = (spot: SearchResult) => {
    setMapCenter({ lat: spot.geo.lat, lng: spot.geo.lng });
    setTimeSlotSelection(null);
    setSelectedSpotDetail({
      surfInfo: spot,
      coordinates: { latitude: spot.geo.lat, longitude: spot.geo.lng },
    });
  };

  const handleMapSpotSelect = (data: SpotSelectionData) => {
    setTimeSlotSelection(null);
    setSelectedSpotDetail(data);
  };

  const handleMultiSaveMarkerClick = useCallback((locationId: string, coordinates: { lat: number; lng: number }) => {
    const saves = savesByLocation.get(locationId) || [];
    setSelectedSpotDetail(null);
    setTimeSlotSelection({ locationId, coordinates, saves });
  }, [savesByLocation]);

  const handleTimeSlotSelect = useCallback((save: SavedListItem) => {
    const [latStr, lngStr] = save.locationId.split('#');
    const lat = Number(latStr);
    const lng = Number(lngStr);
    const surfInfo: SurfInfo = {
      LocationId: save.locationId,
      SurfTimestamp: save.surfTimestamp,
      geo: { lat, lng },
      conditions: {
        waveHeight: save.waveHeight,
        wavePeriod: save.wavePeriod,
        windSpeed: save.windSpeed,
        waterTemperature: save.waterTemperature,
      },
      derivedMetrics: {
        surfScore: save.surfScore,
        surfGrade: save.surfGrade,
        surfingLevel: (save.surfingLevel || 'BEGINNER') as SurfingLevel,
      },
      metadata: { modelVersion: '', dataSource: '', predictionType: 'FORECAST', createdAt: '' },
      name: save.name || save.locationId,
      nameKo: save.nameKo,
      region: save.region,
      country: save.country,
      address: save.address,
      waveType: '',
      bestSeason: [],
    };
    setSelectedSpotDetail({
      surfInfo,
      coordinates: { latitude: lat, longitude: lng },
    });
    setTimeSlotSelection(null);
  }, []);

  const getCurrentConditionsForLocation = useCallback((locationId: string): SurfInfo | null => {
    return allSpots.find(s => s.LocationId === locationId) || null;
  }, [allSpots]);

  const handleSuggestByDistance = useCallback(async () => {
    if (!userLocation) return;
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const utcNearby = selectedTime
        ? localToUTC(dateStr, selectedTime)
        : localToUTC(dateStr, '12:00');
      const response = await surfService.getNearbySpots(
        userLocation.lat,
        userLocation.lng,
        100,
        utcNearby.date,
        utcNearby.time,
      );
      if (response.success && response.data) {
        let nearby = (response.data as SearchResult[]).filter(
          (spot) => spot.distance !== undefined && spot.distance <= 50
        );
        if (surferLevel) {
          nearby = nearby.filter(s => s.derivedMetrics?.surfingLevel?.toUpperCase() === surferLevel.toUpperCase());
        }
        setSearchResults(nearby);
      }
    } catch (err) {
      console.error('Failed to fetch nearby spots:', err);
    }
    setVisibleSpots([]);
    setShowResults(true);
    setHasSearched(true);
    setSelectedSpotDetail(null);
    // Update active search criteria
    setSearchDate(selectedDate);
    setSearchTime(selectedTime);
  }, [userLocation, selectedDate, selectedTime, surferLevel]);

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  };

  // Memoize savedSpotIds using LocationId#SurfTimestamp composite key
  // This allows saving the same spot at different times
  const savedSpotIds = useMemo(() =>
    new Set(savedSpots.map((s) => `${s.locationId}#${s.surfTimestamp}`)),
    [savedSpots]
  );

  // Show search results when searching, otherwise show all spots
  const displaySpots = (hasSearched && showResults) ? visibleSpots : allSpots;

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
              onChange={(val) => {
                setLocationQuery(val);
                setPredictionErrors((prev) => ({ ...prev, location: false }));
              }}
              onSelect={(option) => {
                setSelectedLocationId(option.type === 'spot' ? option.id : null);
                setPredictionErrors((prev) => ({ ...prev, location: false }));
              }}
              placeholder={tSearch('locationPlaceholder')}
              className="w-48"
              hasError={!!predictionErrors.location}
              errorPlaceholder={tSearch('predictionLocationRequired')}
            />

            {/* Date */}
            <DatePickerInput
              value={selectedDate}
              onChange={setSelectedDate}
              className="w-40"
            />

            {/* Time - hidden in prediction mode */}
            {!isPredictionMode && (
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
            )}

            {/* Surfer Level */}
            <select
              value={surferLevel}
              onChange={(e) => {
                setSurferLevel(e.target.value as SurferLevel | '');
                setPredictionErrors((prev) => ({ ...prev, level: false }));
              }}
              className={`px-3 py-2 text-sm border rounded-lg
                focus:outline-none focus:ring-2 bg-white w-32 ${
                  predictionErrors.level
                    ? 'border-red-400 text-red-400 focus:ring-red-500/50 focus:border-red-500'
                    : 'border-sand-200 text-ocean-800 focus:ring-ocean-500/50 focus:border-ocean-500'
                }`}
            >
              <option value="">{predictionErrors.level ? tSearch('predictionLevelRequired') : tSearch('allLevels')}</option>
              <option value="beginner">{tSearch('difficulty.beginner')}</option>
              <option value="intermediate">{tSearch('difficulty.intermediate')}</option>
              <option value="advanced">{tSearch('difficulty.advanced')}</option>
            </select>

            {/* Search / Predict Button */}
            <button
              onClick={isPredictionMode ? handlePredictionSearch : handleSearch}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg
                transition-colors flex items-center gap-1 ${
                  isPredictionMode
                    ? 'bg-indigo-500 hover:bg-indigo-600'
                    : 'bg-ocean-500 hover:bg-ocean-600'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isPredictionMode
                    ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  }
                />
              </svg>
              {isPredictionMode ? tSearch('predictButton') : tSearch('searchButton')}
            </button>

            {/* Nearby Spots Button */}
            <button
              onClick={handleSuggestByDistance}
              disabled={!userLocation}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg
                transition-colors flex items-center gap-1 ${
                  userLocation
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-blue-300 cursor-not-allowed opacity-60'
                }`}
              title={!userLocation
                ? (locale === 'ko' ? '위치 권한이 필요합니다' : 'Location permission required')
                : (locale === 'ko' ? '내 주변 스팟 추천' : 'Nearby Spots')}
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
        {/* Prediction Result Panel or Search Results Panel */}
        {showPrediction && predictionResult ? (
          <PredictionResultPanel
            result={predictionResult}
            surferLevel={surferLevel}
            isOpen={showPrediction}
            onClose={() => {
              setShowPrediction(false);
              setPredictionResult(null);
            }}
            showLocationPrompt={showLocationPrompt}
          />
        ) : (
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
            selectedDate={searchDate}
            selectedTime={searchTime}
            onSuggestByDistance={handleSuggestByDistance}
            userLocation={userLocation}
            onVisibleItemsChange={setVisibleSpots}
            showLocationPrompt={showLocationPrompt}
          />
        )}

        {/* Map */}
        <EnhancedMapboxMap
          spots={displaySpots}
          allSpots={allSpots}
          savedSpots={savedSpots}
          selectedDate={selectedDate}
          showWindParticles={showWindParticles}
          overlayMode={overlayMode}
          onSpotSelect={handleMapSpotSelect}
          onUserLocationChange={(loc) => {
            setUserLocation(loc);
            setShowLocationPrompt(false);
            localStorage.setItem('locationPermissionGranted', 'true');
            localStorage.setItem('userLocation', JSON.stringify(loc));
          }}
          locale={locale}
          center={mapCenter}
          showGeocoder={false}
          showMeasureDistance={false}
          saveCountByLocation={saveCountByLocation}
          onMultiSaveMarkerClick={handleMultiSaveMarkerClick}
        />

        {/* 10-Day Quick Date Selector - Bottom Center of visible map area */}
        <div
          className="absolute bottom-3 z-30 transition-all duration-300 -translate-x-1/2"
          style={{
            left: `calc(${showResults && hasSearched ? '384px' : '0px'} + (100% - ${showResults && hasSearched ? '384px' : '0px'} - ${selectedSpotDetail || timeSlotSelection ? '420px' : '0px'}) / 2)`,
          }}
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

        {/* Time Slot Picker Panel - Right Side (multi-save markers) */}
        {timeSlotSelection && !selectedSpotDetail && (
          <TimeSlotPickerPanel
            locationId={timeSlotSelection.locationId}
            coordinates={timeSlotSelection.coordinates}
            saves={timeSlotSelection.saves}
            currentConditions={getCurrentConditionsForLocation(timeSlotSelection.locationId)}
            onClose={() => setTimeSlotSelection(null)}
            onSelectTimeSlot={handleTimeSlotSelect}
            onSelectCurrent={(surfInfo) => {
              setSelectedSpotDetail({
                surfInfo,
                coordinates: { latitude: timeSlotSelection.coordinates.lat, longitude: timeSlotSelection.coordinates.lng },
              });
              setTimeSlotSelection(null);
            }}
            showLocationPrompt={showLocationPrompt}
            locale={locale as 'en' | 'ko'}
          />
        )}

        {/* Spot Detail Panel - Right Side */}
        {selectedSpotDetail && (
          <SpotDetailPanel
            surfInfo={selectedSpotDetail.surfInfo}
            coordinates={selectedSpotDetail.coordinates}
            isSaved={savedSpots.some(
              (s) => s.locationId === selectedSpotDetail.surfInfo.LocationId
                && s.surfTimestamp === selectedSpotDetail.surfInfo.SurfTimestamp
            )}
            onClose={() => setSelectedSpotDetail(null)}
            onSave={() => {
              handleSaveSpot(selectedSpotDetail.surfInfo);
            }}
            onRemove={() => {
              handleRemoveSpot(
                selectedSpotDetail.surfInfo.LocationId,
                selectedSpotDetail.surfInfo.SurfTimestamp,
              );
            }}
            showLocationPrompt={showLocationPrompt}
            savedTimeslots={savesByLocation.get(selectedSpotDetail.surfInfo.LocationId)}
            currentConditions={getCurrentConditionsForLocation(selectedSpotDetail.surfInfo.LocationId)}
            onTimeslotSelect={handleTimeSlotSelect}
            onCurrentSelect={(surfInfo) => {
              setSelectedSpotDetail({
                surfInfo,
                coordinates: selectedSpotDetail.coordinates,
              });
            }}
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
