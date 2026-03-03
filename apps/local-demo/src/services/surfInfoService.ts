// Copied from apps/web/lib/services/surfInfoService.ts
// Standalone version with no external imports

import type { SurfGrade, SurfingLevel, SurfInfo, SurfInfoDerivedMetrics, LevelMetrics } from '../types';

const VALID_SURF_GRADES: readonly SurfGrade[] = ['A', 'B', 'C', 'D', 'E'];

export function getMetricsForLevel(
  derivedMetrics: SurfInfoDerivedMetrics | undefined,
  surferLevel: string = ''
): LevelMetrics {
  const fallback: LevelMetrics = { surfScore: 0, surfGrade: 'D' as SurfGrade, surfGradeNumeric: 0.0 };
  if (!derivedMetrics) return fallback;
  const levelKey = surferLevelToKey(surferLevel);
  const metrics = derivedMetrics[levelKey] ?? fallback;

  const rawGrade = metrics.surfGrade as unknown;
  if (typeof rawGrade === 'string' && VALID_SURF_GRADES.includes(rawGrade as SurfGrade)) {
    return { ...metrics, surfGrade: rawGrade as SurfGrade };
  }
  const numericFromGrade =
    typeof rawGrade === 'number' ? rawGrade
    : typeof rawGrade === 'string' ? Number(rawGrade)
    : NaN;
  const numericGrade = !isNaN(numericFromGrade) ? numericFromGrade : metrics.surfGradeNumeric;
  return { ...metrics, surfGrade: convertSurfGradeToLabel(Number(numericGrade)) };
}

export function surferLevelToKey(surferLevel: string): keyof SurfInfoDerivedMetrics {
  switch (surferLevel.toLowerCase()) {
    case 'beginner': return 'BEGINNER';
    case 'advanced': return 'ADVANCED';
    default: return 'INTERMEDIATE';
  }
}

export function generateSurfGrade(score: number): SurfGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'E';
}

export function convertSurfGradeToLabel(surfGradeNumeric: number | undefined | null): SurfGrade {
  if (surfGradeNumeric == null || isNaN(surfGradeNumeric)) return 'E';
  const rounded = Math.round(surfGradeNumeric);
  switch (rounded) {
    case 4: return 'A';
    case 3: return 'B';
    case 2: return 'C';
    case 1: return 'D';
    case 0: return 'E';
    default: return rounded > 4 ? 'A' : 'E';
  }
}

export function getSurfScoreColors(score: number | string): {
  hex: string;
  text: string;
  bg: string;
  dot: string;
} {
  const s = Number(score);
  if (s >= 70) return { hex: '#22c55e', text: 'text-green-600', bg: 'bg-green-50 border-green-200', dot: 'bg-green-500' };
  if (s >= 40) return { hex: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' };
  return { hex: '#ef4444', text: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' };
}

export function getGradeBgColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-100';
    case 'B': return 'bg-yellow-100';
    case 'C': return 'bg-orange-100';
    case 'D': return 'bg-red-100';
    case 'E': return 'bg-gray-200';
    default: return 'bg-gray-100';
  }
}

export function getGradeTextColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-700';
    case 'B': return 'text-yellow-700';
    case 'C': return 'text-orange-700';
    case 'D': return 'text-red-700';
    case 'E': return 'text-gray-900';
    default: return 'text-gray-700';
  }
}

export function getGradeBorderColor(grade: string): string {
  switch (grade) {
    case 'A': return 'border-green-300';
    case 'B': return 'border-yellow-300';
    case 'C': return 'border-orange-300';
    case 'D': return 'border-red-300';
    case 'E': return 'border-gray-400';
    default: return 'border-gray-300';
  }
}

function gradeLetterToNumeric(grade: SurfGrade): number {
  switch (grade) {
    case 'A': return 4.0;
    case 'B': return 3.0;
    case 'C': return 2.0;
    case 'D': return 1.0;
    default: return 0.0;
  }
}

export function calculateSurfScore(waveHeight: number, wavePeriod: number, windSpeed: number): number {
  let score = 50;
  if (waveHeight >= 1.0 && waveHeight <= 2.5) score += 25;
  else if (waveHeight >= 0.5 && waveHeight < 1.0) score += 10;
  else if (waveHeight > 2.5 && waveHeight <= 4.0) score += 15;
  else score -= 10;
  if (wavePeriod >= 10) score += 15;
  else if (wavePeriod >= 7) score += 8;
  else score -= 5;
  if (windSpeed < 10) score += 10;
  else if (windSpeed < 20) score += 0;
  else if (windSpeed < 30) score -= 10;
  else score -= 20;
  return Math.max(0, Math.min(100, score));
}

export const TIME_SLOTS = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];

export const TIME_HOURS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export function isCoordString(s?: string | null): boolean {
  if (!s) return true;
  return /^-?\d+\.?\d*[#,]\s*-?\d+\.?\d*$/.test(s.trim());
}

export function generateSurfInfoForSpot(
  spot: {
    locationId: string;
    geo: { lat: number; lng: number };
    name: string;
    nameKo?: string;
    region: string;
    regionKo?: string;
    country: string;
    countryKo?: string;
    city?: string;
    cityKo?: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    waveType: string;
    bestSeason: string[];
    description?: string;
    descriptionKo?: string;
  },
  date: string
): SurfInfo[] {
  const seed = hashCode(`${spot.locationId}-${date}`);

  return TIME_SLOTS.map((time, i) => {
    const variation = seededRandom(seed + i * 1000);
    const timeVariation = seededRandom(seed + i * 2000);

    const waveHeight = 0.3 + variation * 3.5;
    const wavePeriod = 5 + timeVariation * 12;
    const windSpeed = 2 + variation * 35;
    const waterTemperature = 10 + timeVariation * 18;
    const surfScore = calculateSurfScore(waveHeight, wavePeriod, windSpeed);

    return {
      locationId: spot.locationId,
      surfTimestamp: `${date}T${time}:00Z`,
      geo: spot.geo,
      conditions: {
        waveHeight: round2(waveHeight),
        wavePeriod: round2(wavePeriod),
        windSpeed: round2(windSpeed),
        waterTemperature: round2(waterTemperature),
      },
      derivedMetrics: {
        BEGINNER: {
          surfScore: round2(surfScore * 0.85),
          surfGrade: generateSurfGrade(surfScore * 0.85),
          surfGradeNumeric: gradeLetterToNumeric(generateSurfGrade(surfScore * 0.85)),
        },
        INTERMEDIATE: {
          surfScore: round2(surfScore),
          surfGrade: generateSurfGrade(surfScore),
          surfGradeNumeric: gradeLetterToNumeric(generateSurfGrade(surfScore)),
        },
        ADVANCED: {
          surfScore: round2(Math.min(100, surfScore * 1.1)),
          surfGrade: generateSurfGrade(Math.min(100, surfScore * 1.1)),
          surfGradeNumeric: gradeLetterToNumeric(generateSurfGrade(Math.min(100, surfScore * 1.1))),
        },
      },
      metadata: {
        modelVersion: 'demo-v1.0',
        dataSource: 'mock',
        predictionType: 'FORECAST' as const,
        createdAt: new Date().toISOString(),
      },
      name: spot.name,
      nameKo: spot.nameKo,
      region: spot.region,
      regionKo: spot.regionKo,
      country: spot.country,
      countryKo: spot.countryKo,
      city: spot.city,
      cityKo: spot.cityKo,
      difficulty: spot.difficulty,
      waveType: spot.waveType,
      bestSeason: spot.bestSeason,
      description: spot.description,
      descriptionKo: spot.descriptionKo,
    };
  });
}

export function getBestSurfInfoForDate(
  spot: Parameters<typeof generateSurfInfoForSpot>[0],
  date: string
): SurfInfo {
  const infos = generateSurfInfoForSpot(spot, date);
  return infos.reduce((best, curr) =>
    curr.derivedMetrics.INTERMEDIATE.surfScore > best.derivedMetrics.INTERMEDIATE.surfScore ? curr : best
  );
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function parseUTCTimestamp(ts?: string): Date | null {
  if (!ts) return null;
  const hasTimezone = ts.endsWith('Z') || ts.endsWith('+00:00') || /[+-]\d{2}:\d{2}$/.test(ts);
  return new Date(hasTimezone ? ts : ts + 'Z');
}

export function getDefaultFromTime(): string {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const fromHour = currentMinute === 0 ? currentHour : Math.min(currentHour + 1, 23);
  return `${fromHour.toString().padStart(2, '0')}:00`;
}

export function getDefaultToTime(): string {
  return '23:00';
}

// Saved spots via localStorage (full SavedListItem objects)
const SAVED_ITEMS_KEY = 'awaves_demo_saved_items';

export function getSavedItems(): import('../types').SavedListItem[] {
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveItem(item: import('../types').SavedListItem): void {
  const items = getSavedItems();
  if (!items.find((i) => i.locationSurfKey === item.locationSurfKey)) {
    items.push(item);
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  }
}

export function deleteItem(locationSurfKey: string): void {
  const items = getSavedItems().filter((i) => i.locationSurfKey !== locationSurfKey);
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
}
