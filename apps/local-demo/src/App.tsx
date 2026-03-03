import { useState, useEffect, useCallback, useMemo } from 'react';
import { addDays, format, differenceInDays } from 'date-fns';
import { Geolocation } from '@capacitor/geolocation';
import { ko, enUS } from 'date-fns/locale';
import { LocaleProvider, useLocale } from './contexts/LocaleContext';
import type { SurfInfo, SavedListItem, SurferLevel, SurfingLevel, PredictionResult } from './types';
import type { SpotSelectionData, OverlayMode } from './components/EnhancedMapboxMap';
import { SPOTS } from './data/spots';
import {
  generateSurfInfoForSpot,
  getMetricsForLevel,
  surferLevelToKey,
  isCoordString,
  getDefaultFromTime,
  getDefaultToTime,
  getSavedItems,
  saveItem,
  deleteItem,
} from './services/surfInfoService';
import EnhancedMapboxMap from './components/EnhancedMapboxMap';
import SearchResultsList from './components/SearchResultsList';
import type { SearchResult } from './components/SearchResultsList';
import SpotDetailPanel from './components/SpotDetailPanel';
import PredictionResultPanel from './components/PredictionResultPanel';
import TimeSlotPickerPanel from './components/TimeSlotPickerPanel';
import LocationAutocomplete from './components/LocationAutocomplete';
import DatePickerInput from './components/DatePickerInput';
import TimeRangeSelector from './components/TimeRangeSelector';
import SavedItemCard from './components/SavedItemCard';

// ── Helpers ──────────────────────────────────────────────────────────────────

function utcToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBestSurfInfoInRange(
  spot: typeof SPOTS[0],
  dateStr: string,
  fromTime: string,
  toTime: string,
): SurfInfo {
  const allSlots = generateSurfInfoForSpot(spot, dateStr);
  const fromHour = parseInt(fromTime.split(':')[0]);
  const toHour = parseInt(toTime.split(':')[0]);
  const inRange = allSlots.filter((s) => {
    const h = parseInt(s.surfTimestamp.split('T')[1].split(':')[0]);
    return h >= fromHour && h <= toHour;
  });
  const pool = inRange.length > 0 ? inRange : allSlots;
  return pool.reduce((best, curr) =>
    curr.derivedMetrics.INTERMEDIATE.surfScore > best.derivedMetrics.INTERMEDIATE.surfScore ? curr : best
  );
}

// ── Main app content ─────────────────────────────────────────────────────────

function AppContent() {
  const { locale, setLocale } = useLocale();
  const dateLocale = locale === 'ko' ? ko : enUS;

  // Search state
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(utcToday);
  const [selectedFromTime, setSelectedFromTime] = useState<string>(getDefaultFromTime());
  const [selectedToTime, setSelectedToTime] = useState<string>(getDefaultToTime());
  const [surferLevel, setSurferLevel] = useState<SurferLevel | ''>('');

  // Active search criteria (updated only on search click)
  const [searchDate, setSearchDate] = useState<Date>(new Date());
  const [searchFromTime, setSearchFromTime] = useState<string>(getDefaultFromTime());
  const [searchToTime, setSearchToTime] = useState<string>(getDefaultToTime());

  // User location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('userLocation');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showLocationPrompt, setShowLocationPrompt] = useState(() =>
    !localStorage.getItem('locationPermissionGranted')
  );

  // Results state
  const [allSpots, setAllSpots] = useState<SurfInfo[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [visibleSpots, setVisibleSpots] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Map state
  const [showWindParticles, setShowWindParticles] = useState(false);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('none');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
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

  // LLM fetch key — increment on spot click to trigger advice refresh
  const [llmFetchKey, setLlmFetchKey] = useState(0);

  // Saved items from localStorage
  const [savedItems, setSavedItems] = useState<SavedListItem[]>(getSavedItems);

  const refreshSaved = useCallback(() => { setSavedItems(getSavedItems()); }, []);

  // Quick date selector
  const [showQuickDateSelect, setShowQuickDateSelect] = useState(true);

  // Bottom nav tab
  const [activeTab, setActiveTab] = useState<'map' | 'saved' | 'profile'>('map');

  // Load all spots on mount (best slot for today)
  useEffect(() => {
    const dateStr = utcToday().toISOString().split('T')[0];
    const infos = SPOTS.map((spot) => getBestSurfInfoInRange(spot, dateStr, '00:00', '23:00'));
    setAllSpots(infos);
  }, []);

  // Saved spots as SavedListItem[] for map markers
  const savedSpots = savedItems;

  // Group saves by locationId
  const saveCountByLocation = useMemo(() => {
    const counts = new Map<string, number>();
    savedSpots.forEach((s) => counts.set(s.locationId, (counts.get(s.locationId) || 0) + 1));
    return counts;
  }, [savedSpots]);

  const savesByLocation = useMemo(() => {
    const grouped = new Map<string, SavedListItem[]>();
    savedSpots.forEach((s) => {
      if (!grouped.has(s.locationId)) grouped.set(s.locationId, []);
      grouped.get(s.locationId)!.push(s);
    });
    return grouped;
  }, [savedSpots]);

  const dateOptions = useMemo(() => {
    const today = utcToday();
    return Array.from({ length: 10 }, (_, i) => addDays(today, i));
  }, []);

  const { daysFromToday, isPredictionMode } = useMemo(() => {
    const today = utcToday();
    const days = differenceInDays(selectedDate, today);
    return { daysFromToday: days, isPredictionMode: days > 9 };
  }, [selectedDate]);

  const isTimeRangeValid = useMemo(() => {
    return parseInt(selectedFromTime.split(':')[0]) <= parseInt(selectedToTime.split(':')[0]);
  }, [selectedFromTime, selectedToTime]);

  // ── Mobile detection ───────────────────────────────────────────────────────

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Mock search ────────────────────────────────────────────────────────────

  const doSearch = useCallback((query: string, date: Date, fromTime: string, toTime: string) => {
    const dateStr = date.toISOString().split('T')[0];
    const q = query.trim().toLowerCase();

    const matchingSpots = q
      ? SPOTS.filter((s) =>
          s.name.toLowerCase().includes(q) ||
          s.nameKo.includes(q) ||
          s.region.toLowerCase().includes(q) ||
          s.regionKo.includes(q) ||
          s.country.toLowerCase().includes(q)
        )
      : SPOTS;

    const infos = matchingSpots.map((spot) =>
      getBestSurfInfoInRange(spot, dateStr, fromTime, toTime)
    );

    // Also refresh allSpots for map
    const allInfos = SPOTS.map((spot) => getBestSurfInfoInRange(spot, dateStr, fromTime, toTime));
    setAllSpots(allInfos);

    return infos as SearchResult[];
  }, []);

  const handleSearch = useCallback(() => {
    setVisibleSpots([]);
    setSearchResults([]);
    setShowResults(true);
    setHasSearched(true);
    setIsSearching(true);
    setSelectedSpotDetail(null);
    setShowPrediction(false);
    setPredictionResult(null);
    setTimeSlotSelection(null);
    setSearchDate(selectedDate);
    setSearchFromTime(selectedFromTime);
    setSearchToTime(selectedToTime);

    // Simulate brief loading
    setTimeout(() => {
      const results = doSearch(locationQuery, selectedDate, selectedFromTime, selectedToTime);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
  }, [locationQuery, selectedDate, selectedFromTime, selectedToTime, doSearch]);

  const handlePredictionSearch = useCallback(() => {
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
    setTimeSlotSelection(null);

    // Find the spot by locationId and generate mock prediction
    const spot = SPOTS.find((s) => s.locationId === selectedLocationId);
    if (!spot) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const slots = generateSurfInfoForSpot(spot, dateStr);
    const best = slots.reduce((a, b) =>
      b.derivedMetrics.INTERMEDIATE.surfScore > a.derivedMetrics.INTERMEDIATE.surfScore ? b : a
    );
    const metrics = getMetricsForLevel(best.derivedMetrics, surferLevel);
    const weekNum = Math.ceil(differenceInDays(selectedDate, utcToday()) / 7);
    const weekStart = selectedDate;
    const weekEnd = addDays(selectedDate, 6);
    const weekRange = `Week ${weekNum}: ${weekStart.getUTCDate()}/${weekStart.getUTCMonth() + 1} – ${weekEnd.getUTCDate()}/${weekEnd.getUTCMonth() + 1}`;

    const result: PredictionResult = {
      locationId: spot.locationId,
      surfTimestamp: best.surfTimestamp,
      geo: spot.geo,
      derivedMetrics: {
        surfScore: metrics.surfScore,
        surfGrade: metrics.surfGrade,
        surfingLevel: surferLevel.toUpperCase(),
      },
      metadata: { modelVersion: 'demo-v1.0', dataSource: 'mock', predictionType: 'PREDICTION', createdAt: new Date().toISOString() },
      weekNumber: weekNum,
      weekRange,
      spotName: spot.name,
      spotNameKo: spot.nameKo,
    };

    setPredictionResult(result);
    setShowPrediction(true);
    setMapCenter({ lat: spot.geo.lat, lng: spot.geo.lng });
  }, [locationQuery, selectedLocationId, selectedDate, surferLevel]);

  const doNearbySearch = useCallback((location: { lat: number; lng: number }) => {
    setVisibleSpots([]);
    setSearchResults([]);
    setShowResults(true);
    setHasSearched(true);
    setIsSearching(true);
    setSelectedSpotDetail(null);
    setSearchDate(selectedDate);
    setSearchFromTime(selectedFromTime);
    setSearchToTime(selectedToTime);

    setTimeout(() => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const allWithDist = SPOTS
        .map((spot) => {
          const distance = haversine(location.lat, location.lng, spot.geo.lat, spot.geo.lng);
          const info = getBestSurfInfoInRange(spot, dateStr, selectedFromTime, selectedToTime);
          return { ...info, distance } as SearchResult;
        })
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

      // Show spots within 50 km; if none, fall back to the 10 nearest
      const within50 = allWithDist.filter((s) => (s.distance ?? Infinity) <= 50);
      setSearchResults(within50.length > 0 ? within50 : allWithDist.slice(0, 10));
      setIsSearching(false);
    }, 300);
  }, [selectedDate, selectedFromTime, selectedToTime]);

  const handleSuggestByDistance = useCallback(async () => {
    if (userLocation) {
      doNearbySearch(userLocation);
      return;
    }

    setIsRequestingLocation(true);
    try {
      // Request permissions first (required on Android)
      await Geolocation.requestPermissions();
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15000,
      });
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(loc);
      localStorage.setItem('userLocation', JSON.stringify(loc));
      localStorage.setItem('locationPermissionGranted', 'true');
      setShowLocationPrompt(false);
      setIsRequestingLocation(false);
      doNearbySearch(loc);
    } catch {
      setIsRequestingLocation(false);
    }
  }, [userLocation, doNearbySearch]);

  const handleAllowLocation = async () => {
    setShowLocationPrompt(false);
    localStorage.setItem('locationPermissionGranted', 'true');
    try {
      await Geolocation.requestPermissions();
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
      const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
      setUserLocation(loc);
      localStorage.setItem('userLocation', JSON.stringify(loc));
    } catch { /* silently fail */ }
  };

  // ── Save / Remove ──────────────────────────────────────────────────────────

  const handleSaveSpot = useCallback((surfInfo: SurfInfo) => {
    setMapCenter({ lat: surfInfo.geo.lat, lng: surfInfo.geo.lng });
    setSelectedSpotDetail({ surfInfo, coordinates: { latitude: surfInfo.geo.lat, longitude: surfInfo.geo.lng } });

    const effLevel = ((surfInfo as unknown as { displayLevel?: string }).displayLevel) || surferLevel;
    const metrics = getMetricsForLevel(surfInfo.derivedMetrics, effLevel);
    const nameRaw = surfInfo.name || surfInfo.address;
    const displayName = (nameRaw && !isCoordString(nameRaw)) ? nameRaw : '';
    const locationSurfKey = `${surfInfo.locationId}#${surfInfo.surfTimestamp}#${surferLevelToKey(effLevel)}`;

    const item: SavedListItem = {
      locationId: surfInfo.locationId,
      surfTimestamp: surfInfo.surfTimestamp,
      surfingLevel: surferLevelToKey(effLevel) as SurfingLevel,
      surfScore: metrics.surfScore,
      surfGrade: metrics.surfGrade,
      surfGradeNumeric: metrics.surfGradeNumeric,
      name: displayName || surfInfo.name,
      nameKo: surfInfo.nameKo,
      region: surfInfo.region,
      regionKo: surfInfo.regionKo,
      country: surfInfo.country,
      countryKo: surfInfo.countryKo,
      address: surfInfo.address,
      waveHeight: surfInfo.conditions.waveHeight,
      wavePeriod: surfInfo.conditions.wavePeriod,
      windSpeed: surfInfo.conditions.windSpeed,
      waterTemperature: surfInfo.conditions.waterTemperature,
      locationSurfKey,
      savedAt: new Date().toISOString(),
    };
    saveItem(item);
    refreshSaved();
  }, [surferLevel, refreshSaved]);

  const handleRemoveSpot = useCallback((locationId: string, surfTimestamp?: string, surfingLevel?: string) => {
    const level = surfingLevel?.toUpperCase();
    const saved = savedSpots.find((s) => {
      if (s.locationId !== locationId) return false;
      if (surfTimestamp && s.surfTimestamp !== surfTimestamp) return false;
      if (level && s.surfingLevel !== level) return false;
      return true;
    });
    if (saved) { deleteItem(saved.locationSurfKey); refreshSaved(); }
  }, [savedSpots, refreshSaved]);

  // ── Spot selection ─────────────────────────────────────────────────────────

  const handleSpotClick = useCallback((spot: SearchResult) => {
    if (isMobile) setShowResults(false);
    setMapCenter({ lat: spot.geo.lat, lng: spot.geo.lng });
    setTimeSlotSelection(null);
    setSelectedSpotDetail({ surfInfo: spot, coordinates: { latitude: spot.geo.lat, longitude: spot.geo.lng } });
    setLlmFetchKey((k) => k + 1);
  }, [isMobile]);

  const handleMapSpotSelect = useCallback((data: SpotSelectionData) => {
    setTimeSlotSelection(null);
    const enrichedNameKo = data.surfInfo.nameKo
      || allSpots.find((s) => s.locationId === data.surfInfo.locationId)?.nameKo;
    const spotDetail = enrichedNameKo && !data.surfInfo.nameKo
      ? { ...data, surfInfo: { ...data.surfInfo, nameKo: enrichedNameKo } }
      : data;
    setSelectedSpotDetail(spotDetail);
    if (isMobile) setShowResults(false);
    setMapCenter({ lat: data.coordinates.latitude, lng: data.coordinates.longitude });
    setLlmFetchKey((k) => k + 1);
  }, [isMobile, allSpots]);

  const handleMultiSaveMarkerClick = useCallback((locationId: string, coordinates: { lat: number; lng: number }) => {
    setMapCenter({ lat: coordinates.lat, lng: coordinates.lng });
    const saves = savesByLocation.get(locationId) || [];
    if (saves.length === 1) {
      const save = saves[0];
      const currentSpot = allSpots.find((s) => s.locationId === locationId);
      const surfInfo: SurfInfo = currentSpot || {
        locationId: save.locationId,
        surfTimestamp: save.surfTimestamp,
        geo: { lat: coordinates.lat, lng: coordinates.lng },
        conditions: { waveHeight: save.waveHeight, wavePeriod: save.wavePeriod, windSpeed: save.windSpeed, waterTemperature: save.waterTemperature },
        derivedMetrics: {
          BEGINNER: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
          INTERMEDIATE: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
          ADVANCED: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
        },
        metadata: { modelVersion: 'demo-v1.0', dataSource: 'mock', predictionType: 'FORECAST', createdAt: '' },
        name: save.name, nameKo: save.nameKo, region: save.region, regionKo: save.regionKo,
        country: save.country, address: save.address, waveType: '', bestSeason: [],
      };
      setSelectedSpotDetail({ surfInfo, coordinates: { latitude: coordinates.lat, longitude: coordinates.lng } });
    } else if (saves.length > 1) {
      // Multiple saves: show TimeSlotPickerPanel
      setSelectedSpotDetail(null);
      setTimeSlotSelection({ locationId, coordinates, saves });
    }
  }, [savesByLocation, allSpots]);

  const handleTimeslotSelect = useCallback((save: SavedListItem) => {
    const [latStr, lngStr] = save.locationId.split('#');
    const lat = Number(latStr); const lng = Number(lngStr);
    const enrichedSpot = allSpots.find((s) => s.locationId === save.locationId);
    const surfInfo: SurfInfo & { displayLevel?: string } = {
      locationId: save.locationId,
      surfTimestamp: save.surfTimestamp,
      geo: { lat, lng },
      conditions: { waveHeight: save.waveHeight, wavePeriod: save.wavePeriod, windSpeed: save.windSpeed, waterTemperature: save.waterTemperature },
      derivedMetrics: {
        BEGINNER: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
        INTERMEDIATE: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
        ADVANCED: { surfScore: save.surfScore, surfGrade: save.surfGrade, surfGradeNumeric: 0 },
      },
      metadata: { modelVersion: 'demo-v1.0', dataSource: 'mock', predictionType: 'FORECAST', createdAt: '' },
      name: enrichedSpot?.name || save.name,
      nameKo: enrichedSpot?.nameKo || save.nameKo,
      region: save.region, regionKo: save.regionKo,
      country: save.country, address: save.address, waveType: '', bestSeason: [],
      displayLevel: save.surfingLevel,
    };
    setSelectedSpotDetail({ surfInfo, coordinates: { latitude: lat, longitude: lng } });
    setTimeSlotSelection(null);
    setLlmFetchKey((k) => k + 1);
  }, [allSpots]);


  const savedSpotIds = useMemo(() =>
    new Set(savedSpots.map((s) => `${s.locationId}#${s.surfTimestamp}#${s.surfingLevel || ''}`)),
    [savedSpots]
  );

  const hasDetailPanel = !!selectedSpotDetail;
  const centerOffset = useMemo<[number, number] | undefined>(
    () => hasDetailPanel ? (isMobile ? [0, -160] : [-210, 0]) : undefined,
    [isMobile, hasDetailPanel]
  );

  const displaySpots = (hasSearched && showResults) ? visibleSpots : allSpots;

  const getCurrentConditionsForLocation = useCallback((locationId: string): SurfInfo | null => {
    return allSpots.find((s) => s.locationId === locationId) || null;
  }, [allSpots]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col pb-14 md:pb-0" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="glass z-50 px-3 py-1.5">
        {/* Mobile header */}
        <div className="md:hidden flex flex-col gap-1">
          {/* Row 1: Logo + Location */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-ocean-600 font-bold text-base tracking-wide">AWAVES</span>
              <span className="text-[10px] bg-ocean-100 text-ocean-500 px-1.5 py-0.5 rounded font-medium">DEMO</span>
            </div>
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
              placeholder={locale === 'ko' ? '위치 검색...' : 'Search location...'}
              className="flex-1 min-w-0"
              hasError={!!predictionErrors.location}
            />
          </div>

          {/* Row 2: Date | Time | Level */}
          <div className="flex gap-1">
            <DatePickerInput value={selectedDate} onChange={setSelectedDate} className="flex-[1.5] min-w-0" />
            {!isPredictionMode && (
              <TimeRangeSelector
                fromTime={selectedFromTime}
                toTime={selectedToTime}
                onFromChange={setSelectedFromTime}
                onToChange={setSelectedToTime}
                className="flex-[1.6]"
              />
            )}
            <select
              value={surferLevel}
              onChange={(e) => {
                setSurferLevel(e.target.value as SurferLevel | '');
                setPredictionErrors((prev) => ({ ...prev, level: false }));
              }}
              className={`flex-[1.3] min-w-0 px-1.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                predictionErrors.level
                  ? 'border-red-400 text-red-400 focus:ring-red-500/50'
                  : 'border-sand-200 text-ocean-800 focus:ring-ocean-500/50'
              }`}
            >
              <option value="">{predictionErrors.level ? (locale === 'ko' ? '레벨 필수' : 'Level required') : (locale === 'ko' ? '전체 레벨' : 'All Levels')}</option>
              <option value="beginner">{locale === 'ko' ? '초급' : 'Beginner'}</option>
              <option value="intermediate">{locale === 'ko' ? '중급' : 'Intermediate'}</option>
              <option value="advanced">{locale === 'ko' ? '상급' : 'Advanced'}</option>
            </select>
          </div>

          {!isTimeRangeValid && !isPredictionMode && (
            <div className="text-xs text-red-500 px-1.5">Start time must be before or equal to end time</div>
          )}

          {/* Row 3: Action chips */}
          <div className="flex gap-1">
            <button
              onClick={isPredictionMode ? handlePredictionSearch : handleSearch}
              disabled={isSearching || (!isPredictionMode && !isTimeRangeValid)}
              className={`flex-1 px-2 py-1 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 ${
                (isSearching || (!isPredictionMode && !isTimeRangeValid)) ? 'opacity-60 cursor-not-allowed' : ''
              } ${isPredictionMode ? 'bg-indigo-500' : 'bg-ocean-500'}`}
            >
              {isSearching ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isPredictionMode
                      ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"}
                  />
                </svg>
              )}
              {isPredictionMode ? (locale === 'ko' ? '예측' : 'Predict') : (locale === 'ko' ? '검색' : 'Search')}
            </button>
            <button
              onClick={handleSuggestByDistance}
              disabled={isRequestingLocation}
              className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 ${
                isRequestingLocation ? 'bg-blue-300 text-white cursor-wait' : 'bg-blue-500 text-white'
              }`}
            >
              {isRequestingLocation ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {locale === 'ko' ? '주변' : 'Near'}
            </button>
            <button
              onClick={() => setOverlayMode((prev) => prev === 'surf' ? 'none' : 'surf')}
              className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 ${
                overlayMode === 'surf' ? 'bg-green-500 text-white' : 'bg-sand-100 text-ocean-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {locale === 'ko' ? '서프' : 'Surf'}
            </button>
            <button
              onClick={() => setShowWindParticles(!showWindParticles)}
              className={`px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 ${
                showWindParticles ? 'bg-ocean-500 text-white' : 'bg-sand-100 text-ocean-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5c1.104 0 2 .896 2 2s-.896 2-2 2H3M17 11c1.104 0 2 .896 2 2s-.896 2-2 2H3M9 17c1.104 0 2 .896 2 2s-.896 2-2 2H3" />
              </svg>
              {locale === 'ko' ? '바람' : 'Wind'}
            </button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-ocean-600 font-bold text-lg tracking-wide">AWAVES</span>
            <span className="text-xs bg-ocean-100 text-ocean-500 px-1.5 py-0.5 rounded font-medium">DEMO</span>
          </div>

          <div className="flex-1 flex items-center gap-2 flex-wrap">
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
              placeholder={locale === 'ko' ? '위치 검색...' : 'Search location...'}
              className="w-48"
              hasError={!!predictionErrors.location}
            />
            <DatePickerInput value={selectedDate} onChange={setSelectedDate} className="w-40" />
            {!isPredictionMode && (
              <TimeRangeSelector
                fromTime={selectedFromTime}
                toTime={selectedToTime}
                onFromChange={setSelectedFromTime}
                onToChange={setSelectedToTime}
              />
            )}
            <select
              value={surferLevel}
              onChange={(e) => {
                setSurferLevel(e.target.value as SurferLevel | '');
                setPredictionErrors((prev) => ({ ...prev, level: false }));
              }}
              className={`px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 w-32 ${
                predictionErrors.level
                  ? 'border-red-400 text-red-400 focus:ring-red-500/50'
                  : 'border-sand-200 text-ocean-800 focus:ring-ocean-500/50'
              }`}
            >
              <option value="">{predictionErrors.level ? (locale === 'ko' ? '레벨 필수' : 'Level required') : (locale === 'ko' ? '전체 레벨' : 'All Levels')}</option>
              <option value="beginner">{locale === 'ko' ? '초급' : 'Beginner'}</option>
              <option value="intermediate">{locale === 'ko' ? '중급' : 'Intermediate'}</option>
              <option value="advanced">{locale === 'ko' ? '상급' : 'Advanced'}</option>
            </select>
            <button
              onClick={isPredictionMode ? handlePredictionSearch : handleSearch}
              disabled={isSearching}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                isSearching ? 'opacity-60 cursor-not-allowed' : ''
              } ${isPredictionMode ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-ocean-500 hover:bg-ocean-600'}`}
            >
              {isSearching ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={isPredictionMode
                      ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      : "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"}
                  />
                </svg>
              )}
              {isPredictionMode ? (locale === 'ko' ? '예측' : 'Predict') : (locale === 'ko' ? '검색' : 'Search')}
            </button>
            <button
              onClick={handleSuggestByDistance}
              disabled={isRequestingLocation}
              className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                isRequestingLocation ? 'bg-blue-300 cursor-wait' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {isRequestingLocation ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {locale === 'ko' ? '주변' : 'Nearby'}
            </button>
            <button
              onClick={() => setOverlayMode((prev) => prev === 'surf' ? 'none' : 'surf')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                overlayMode === 'surf' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-sand-200 text-ocean-700 hover:bg-sand-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {locale === 'ko' ? '서프 점수' : 'Surf Score'}
            </button>
            <button
              onClick={() => setShowWindParticles(!showWindParticles)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1 ${
                showWindParticles ? 'bg-ocean-500 text-white hover:bg-ocean-600' : 'bg-sand-200 text-ocean-700 hover:bg-sand-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5c1.104 0 2 .896 2 2s-.896 2-2 2H3M17 11c1.104 0 2 .896 2 2s-.896 2-2 2H3M9 17c1.104 0 2 .896 2 2s-.896 2-2 2H3" />
              </svg>
              {locale === 'ko' ? '바람 입자' : 'Wind'}
            </button>
          </div>

          {/* Right: EN/KO toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-sand-100 hover:bg-sand-200 transition-colors"
            >
              <svg className="w-4 h-4 text-ocean-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-xs font-semibold text-ocean-700">{locale === 'ko' ? 'KO' : 'EN'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Location Permission Prompt */}
      {showLocationPrompt && (
        <div className="fixed top-14 left-0 right-0 z-50 px-4 py-3 border-t border-sand-200 flex items-center justify-between bg-blue-100 shadow-md">
          <div className="flex items-center gap-2 text-sm text-ocean-700">
            <svg className="w-5 h-5 text-ocean-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{locale === 'ko' ? '주변 서핑 스팟을 찾기 위해 위치 권한이 필요합니다' : 'Allow location access to find nearby surf spots'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLocationPrompt(false)} className="px-3 py-1 text-sm text-ocean-600 hover:text-ocean-800">
              {locale === 'ko' ? '거부' : 'Deny'}
            </button>
            <button onClick={handleAllowLocation} className="px-3 py-1 text-sm bg-ocean-500 text-white rounded-lg hover:bg-ocean-600">
              {locale === 'ko' ? '허용' : 'Allow'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative min-h-0" style={{ display: activeTab === 'map' ? undefined : 'none' }}>
        {/* Prediction Result Panel OR Search Results Panel */}
        {showPrediction && predictionResult ? (
          <PredictionResultPanel
            result={predictionResult}
            surferLevel={surferLevel}
            isOpen={showPrediction}
            onClose={() => { setShowPrediction(false); setPredictionResult(null); }}
            showLocationPrompt={showLocationPrompt}
          />
        ) : (
          !(isMobile && selectedSpotDetail) && (
            <SearchResultsList
              results={searchResults}
              isOpen={showResults && hasSearched}
              isLoading={isSearching}
              onClose={() => { setShowResults(false); setVisibleSpots([]); }}
              onSpotClick={handleSpotClick}
              onSaveSpot={handleSaveSpot}
              onRemoveSpot={handleRemoveSpot}
              savedSpotIds={savedSpotIds}
              selectedDate={searchDate}
              selectedFromTime={searchFromTime}
              selectedToTime={searchToTime}
              onSuggestByDistance={handleSuggestByDistance}
              userLocation={userLocation}
              onVisibleItemsChange={setVisibleSpots}
              showLocationPrompt={showLocationPrompt}
              surferLevel={surferLevel}
              selectedSpotDetail={selectedSpotDetail}
            />
          )
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
          saveCountByLocation={saveCountByLocation}
          onMultiSaveMarkerClick={handleMultiSaveMarkerClick}
          centerOffset={centerOffset}
          surferLevel={surferLevel}
        />

        {/* 10-Day Quick Date Selector */}
        <div
          className="absolute bottom-16 md:bottom-3 z-30 transition-all duration-300 left-2 right-2 md:left-auto md:right-auto md:-translate-x-1/2"
          style={{
            left: !isMobile
              ? `calc(${showResults && hasSearched ? '384px' : '0px'} + (100% - ${showResults && hasSearched ? '384px' : '0px'} - ${selectedSpotDetail ? '420px' : '0px'}) / 2)`
              : undefined,
          }}
        >
          {showQuickDateSelect ? (
            <>
              <button
                onClick={() => setShowQuickDateSelect(false)}
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 bg-white rounded-full shadow-md
                  hover:bg-sand-50 transition-colors border border-sand-200 text-[10px] text-ocean-600 font-medium flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 15l-7-7-7 7" />
                </svg>
                {locale === 'ko' ? '접기' : 'Hide'}
              </button>
              <div className="glass rounded-2xl md:rounded-full shadow-lg px-2 py-1 overflow-x-auto hide-scrollbar">
                <div className="flex items-center gap-0.5 flex-nowrap">
                  {dateOptions.map((date, index) => {
                    const isSelected = date.toISOString().split('T')[0] === selectedDate.toISOString().split('T')[0];
                    const dayLabel = index === 0
                      ? (locale === 'ko' ? '오늘' : 'Today')
                      : index === 1
                        ? (locale === 'ko' ? '내일' : 'Tmrw')
                        : format(date, 'EEE', { locale: dateLocale });
                    const dateLabel = date.getUTCDate().toString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-full transition-all duration-200 ${
                          isSelected ? 'bg-ocean-500 text-white shadow-sm' : 'text-ocean-700 hover:bg-white/80'
                        }`}
                      >
                        <span className="text-xs font-semibold whitespace-nowrap">{dayLabel} {dateLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowQuickDateSelect(true)}
              className="bg-white/75 backdrop-blur-sm rounded-full shadow px-2 py-0.5 flex items-center gap-1
                hover:bg-white/95 transition-colors border border-white/40"
            >
              <svg className="w-3 h-3 text-ocean-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[11px] font-medium text-ocean-700 whitespace-nowrap">
                {daysFromToday === 0 ? (locale === 'ko' ? '오늘' : 'Today')
                  : daysFromToday === 1 ? (locale === 'ko' ? '내일' : 'Tmrw')
                  : format(selectedDate, 'EEE', { locale: dateLocale })}{' '}
                {selectedDate.getUTCDate()}
              </span>
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
            onSelectTimeSlot={handleTimeslotSelect}
            onSelectCurrent={(surfInfo) => {
              const enhanced = { ...surfInfo, displayLevel: surferLevel };
              setSelectedSpotDetail({
                surfInfo: enhanced as SurfInfo & { displayLevel?: string },
                coordinates: { latitude: timeSlotSelection.coordinates.lat, longitude: timeSlotSelection.coordinates.lng },
              });
              setTimeSlotSelection(null);
              setLlmFetchKey((k) => k + 1);
            }}
            showLocationPrompt={showLocationPrompt}
            locale={locale as 'en' | 'ko'}
            surferLevel={surferLevel}
          />
        )}

        {/* Spot Detail Panel - Right Side */}
        {selectedSpotDetail && (
          <SpotDetailPanel
            surfInfo={selectedSpotDetail.surfInfo}
            coordinates={selectedSpotDetail.coordinates}
            isSaved={savedSpots.some(
              (s) => s.locationId === selectedSpotDetail.surfInfo.locationId
                && s.surfTimestamp === selectedSpotDetail.surfInfo.surfTimestamp
                && s.surfingLevel === (((selectedSpotDetail.surfInfo as unknown as { displayLevel?: string }).displayLevel) || surferLevel).toUpperCase()
            )}
            onClose={() => setSelectedSpotDetail(null)}
            onSave={() => handleSaveSpot(selectedSpotDetail.surfInfo)}
            onRemove={() => {
              const effLevel = ((selectedSpotDetail.surfInfo as unknown as { displayLevel?: string }).displayLevel) || surferLevel;
              handleRemoveSpot(selectedSpotDetail.surfInfo.locationId, selectedSpotDetail.surfInfo.surfTimestamp, effLevel);
            }}
            showLocationPrompt={showLocationPrompt}
            savedTimeslots={savesByLocation.get(selectedSpotDetail.surfInfo.locationId)}
            currentConditions={getCurrentConditionsForLocation(selectedSpotDetail.surfInfo.locationId)}
            onTimeslotSelect={handleTimeslotSelect}
            onCurrentSelect={(surfInfo) => {
              setSelectedSpotDetail({
                surfInfo: { ...surfInfo, displayLevel: surferLevel } as SurfInfo & { displayLevel?: string },
                coordinates: selectedSpotDetail.coordinates,
              });
              setLlmFetchKey((k) => k + 1);
            }}
            surferLevel={surferLevel}
            llmFetchKey={llmFetchKey}
          />
        )}
      </div>

      {/* ── Saved Tab Panel ─────────────────────────────────────────────────── */}
      {activeTab === 'saved' && (
        <div className="flex-1 overflow-y-auto bg-sand-gradient min-h-0">
          {/* Sticky header */}
          <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-sand-200 px-4 py-4 z-10">
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              <div>
                <h1 className="text-xl font-bold text-ocean-800">
                  {locale === 'ko' ? '저장된 스팟' : 'Saved Spots'}
                </h1>
                <p className="text-sm text-ocean-500 mt-0.5">
                  {savedItems.length > 0
                    ? `${savedItems.length} ${locale === 'ko' ? '개 저장됨' : `spot${savedItems.length !== 1 ? 's' : ''} saved`}`
                    : (locale === 'ko' ? '아직 저장된 스팟이 없습니다' : 'No saved spots yet')}
                </p>
              </div>
            </div>
          </div>

          {savedItems.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center min-h-64 gap-4 px-6 py-12">
              <div className="text-6xl">🌊</div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-ocean-700 mb-1">
                  {locale === 'ko' ? '저장된 서핑 스팟이 없습니다' : 'No saved surf spots yet'}
                </h3>
                <p className="text-sm text-ocean-400">
                  {locale === 'ko'
                    ? '지도에서 서핑 스팟을 탐색하고 저장해보세요'
                    : 'Explore surf spots on the map and save your favorites'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('map')}
                className="btn-primary mt-2"
              >
                {locale === 'ko' ? '스팟 탐색하기' : 'Explore Spots'}
              </button>
            </div>
          ) : (
            /* Card list — columns layout matches production saved/page.tsx */
            <div className="p-3 md:p-6 columns-1 md:columns-2 lg:columns-3 gap-3 md:gap-6 space-y-3 md:space-y-6 max-w-5xl mx-auto">
              {savedItems.map((item) => {
                const [latStr, lngStr] = item.locationId.split('#');
                const lat = parseFloat(latStr);
                const lng = parseFloat(lngStr);
                return (
                  <SavedItemCard
                    key={item.locationSurfKey}
                    item={item}
                    lang={locale as 'en' | 'ko'}
                    onRemove={() => {
                      deleteItem(item.locationSurfKey);
                      refreshSaved();
                    }}
                    onViewOnMap={() => {
                      setActiveTab('map');
                      setMapCenter({ lat, lng });
                      const currentSpot = allSpots.find((s) => s.locationId === item.locationId);
                      const surfInfo: SurfInfo = currentSpot || {
                        locationId: item.locationId,
                        surfTimestamp: item.surfTimestamp,
                        geo: { lat, lng },
                        conditions: {
                          waveHeight: item.waveHeight,
                          wavePeriod: item.wavePeriod,
                          windSpeed: item.windSpeed,
                          waterTemperature: item.waterTemperature,
                        },
                        derivedMetrics: {
                          BEGINNER: { surfScore: item.surfScore, surfGrade: item.surfGrade, surfGradeNumeric: 0 },
                          INTERMEDIATE: { surfScore: item.surfScore, surfGrade: item.surfGrade, surfGradeNumeric: 0 },
                          ADVANCED: { surfScore: item.surfScore, surfGrade: item.surfGrade, surfGradeNumeric: 0 },
                        },
                        metadata: { modelVersion: 'demo-v1.0', dataSource: 'mock', predictionType: 'FORECAST', createdAt: '' },
                        name: item.name,
                        nameKo: item.nameKo,
                        region: item.region,
                        country: item.country,
                        address: item.address,
                        waveType: '',
                        bestSeason: [],
                      };
                      setSelectedSpotDetail({
                        surfInfo: { ...surfInfo, displayLevel: item.surfingLevel } as SurfInfo & { displayLevel?: string },
                        coordinates: { latitude: lat, longitude: lng },
                      });
                      setLlmFetchKey((k) => k + 1);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Profile Tab Panel ──────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="flex-1 overflow-y-auto bg-white min-h-0">
          <div className="px-4 pt-4 pb-2 border-b border-sand-200">
            <h2 className="text-base font-bold text-ocean-800">
              {locale === 'ko' ? '프로필' : 'Profile'}
            </h2>
          </div>
          <div className="flex flex-col items-center gap-4 px-6 py-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-ocean-800">{locale === 'ko' ? '데모 사용자' : 'Demo User'}</p>
              <p className="text-sm text-gray-500 mt-1">
                {locale === 'ko' ? '오프라인 데모 모드' : 'Offline Demo Mode'}
              </p>
            </div>
            <div className="w-full rounded-2xl bg-sand-50 border border-sand-200 divide-y divide-sand-200 overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{locale === 'ko' ? '저장된 스팟' : 'Saved Spots'}</span>
                <span className="text-sm font-semibold text-ocean-700">{savedItems.length}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{locale === 'ko' ? '앱 버전' : 'App Version'}</span>
                <span className="text-sm font-semibold text-ocean-700">Demo 1.0</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">{locale === 'ko' ? '데이터' : 'Data'}</span>
                <span className="text-sm font-semibold text-ocean-700">{locale === 'ko' ? '오프라인 모의 데이터' : 'Offline Mock'}</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center px-4">
              {locale === 'ko'
                ? 'AWAVES 데모 앱입니다. 실시간 서핑 데이터와 AI 기능은 프로덕션 버전에서만 제공됩니다.'
                : 'This is the AWAVES demo app. Real-time surf data and AI features are available in the production version.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom Navigation ────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden bg-white border-t-2 border-ocean-100"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex items-center justify-around h-14">
          {/* Map */}
          <button
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
              activeTab === 'map' ? 'text-ocean-700' : 'text-gray-600 hover:text-ocean-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-[10px] font-semibold">{locale === 'ko' ? '지도' : 'Map'}</span>
          </button>

          {/* Saved */}
          <button
            onClick={() => setActiveTab(activeTab === 'saved' ? 'map' : 'saved')}
            className={`relative flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
              activeTab === 'saved' ? 'text-ocean-700' : 'text-gray-600 hover:text-ocean-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {savedItems.length > 0 && (
              <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">
                {savedItems.length > 9 ? '9+' : savedItems.length}
              </span>
            )}
            <span className="text-[10px] font-semibold">{locale === 'ko' ? '저장' : 'Saved'}</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab(activeTab === 'profile' ? 'map' : 'profile')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
              activeTab === 'profile' ? 'text-ocean-700' : 'text-gray-600 hover:text-ocean-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-semibold">{locale === 'ko' ? '프로필' : 'Profile'}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
            className="flex flex-col items-center gap-0.5 px-4 py-1.5 text-gray-600 hover:text-ocean-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="text-[10px] font-semibold">{locale === 'ko' ? 'KO' : 'EN'}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  );
}
