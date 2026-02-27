import type { SurfGrade, SurfingLevel, SurfInfo, SurfInfoDerivedMetrics, LevelMetrics } from '@/types';

// --- Level Metrics Helper ---

/**
 * Get the metrics for a specific surfer level from derivedMetrics.
 * If surferLevel is empty (All Levels), defaults to INTERMEDIATE.
 */
export function getMetricsForLevel(
  derivedMetrics: SurfInfoDerivedMetrics | undefined,
  surferLevel: string = ''
): LevelMetrics {
  const fallback: LevelMetrics = { surfScore: 0, surfGrade: 'D' as SurfGrade, surfGradeNumeric: 0.0 };
  if (!derivedMetrics) return fallback;
  const levelKey = surferLevelToKey(surferLevel);
  return derivedMetrics[levelKey] ?? fallback;
}

/**
 * Map surferLevel (lowercase) to SurfInfoDerivedMetrics key (uppercase).
 */
export function surferLevelToKey(surferLevel: string): keyof SurfInfoDerivedMetrics {
  switch (surferLevel.toLowerCase()) {
    case 'beginner': return 'BEGINNER';
    case 'advanced': return 'ADVANCED';
    case 'intermediate':
    default: return 'INTERMEDIATE';
  }
}

// --- Grade/Level Generators ---

export function generateSurfGrade(score: number): SurfGrade {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

export function generateSurfingLevel(waveHeight: number, windSpeed: number): SurfingLevel {
  if (waveHeight >= 2.5 || windSpeed >= 30) return 'ADVANCED';
  if (waveHeight >= 1.2 || windSpeed >= 15) return 'INTERMEDIATE';
  return 'BEGINNER';
}

// --- UI Helpers ---

export function getGradeBgColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-100';
    case 'B': return 'bg-yellow-100';
    case 'C': return 'bg-orange-100';
    case 'D': return 'bg-red-100';
    default: return 'bg-gray-100';
  }
}

export function getGradeTextColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-700';
    case 'B': return 'text-yellow-700';
    case 'C': return 'text-orange-700';
    case 'D': return 'text-red-700';
    default: return 'text-gray-700';
  }
}

export function getGradeBorderColor(grade: string): string {
  switch (grade) {
    case 'A': return 'border-green-300';
    case 'B': return 'border-yellow-300';
    case 'C': return 'border-orange-300';
    case 'D': return 'border-red-300';
    default: return 'border-gray-300';
  }
}

// --- Score Calculation ---

export function calculateSurfScore(waveHeight: number, wavePeriod: number, windSpeed: number): number {
  let score = 50;
  // Wave height contribution (ideal 1.0-2.5m)
  if (waveHeight >= 1.0 && waveHeight <= 2.5) score += 25;
  else if (waveHeight >= 0.5 && waveHeight < 1.0) score += 10;
  else if (waveHeight > 2.5 && waveHeight <= 4.0) score += 15;
  else score -= 10;
  // Wave period contribution (longer = better)
  if (wavePeriod >= 10) score += 15;
  else if (wavePeriod >= 7) score += 8;
  else score -= 5;
  // Wind contribution (lower = better for clean waves)
  if (windSpeed < 10) score += 10;
  else if (windSpeed < 20) score += 0;
  else if (windSpeed < 30) score -= 10;
  else score -= 20;
  return Math.max(0, Math.min(100, score));
}

// --- Mock SurfInfo Generation ---

export function toLocationId(lat: number, lng: number): string {
  return `${parseFloat(lat.toFixed(4))}#${parseFloat(lng.toFixed(4))}`;
}

export function parseLocationId(locationId: string): { lat: number; lng: number } {
  const parts = locationId.split('#');
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (isNaN(lat) || isNaN(lng)) {
    return { lat: 0, lng: 0 };
  }
  return { lat, lng };
}

export const TIME_SLOTS = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '24:00'];

/**
 * Get the most recent 3-hour time slot rounded down from the current LOCAL time.
 * e.g. local 11:00 → '09:00', local 15:30 → '15:00', local 02:00 → '00:00'
 */
export function getCurrentTimeSlot(): string {
  const now = new Date();
  const hours = now.getHours();
  const roundedHour = Math.floor(hours / 3) * 3;
  return `${roundedHour.toString().padStart(2, '0')}:00`;
}

/**
 * Convert a local date + time slot to UTC date + time for DynamoDB queries.
 * DynamoDB SurfTimestamp is stored in UTC, so we need to convert.
 * e.g. KST (UTC+9): 2026-02-13 03:00 → UTC: 2026-02-12 18:00
 */
export function localToUTC(localDate: string, localTime: string): { date: string; time: string } {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hours, minutes] = localTime.split(':').map(Number);
  const local = new Date(year, month - 1, day, hours, minutes);
  const utcY = local.getUTCFullYear();
  const utcM = (local.getUTCMonth() + 1).toString().padStart(2, '0');
  const utcD = local.getUTCDate().toString().padStart(2, '0');
  const utcH = local.getUTCHours().toString().padStart(2, '0');
  const utcMin = local.getUTCMinutes().toString().padStart(2, '0');
  return { date: `${utcY}-${utcM}-${utcD}`, time: `${utcH}:${utcMin}` };
}

export function generateSurfInfoForSpot(
  spot: {
    locationId: string;
    geo: { lat: number; lng: number };
    name: string;
    nameKo?: string;
    region: string;
    country: string;
    address?: string;
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
          surfGradeNumeric: 0.0,
        },
        INTERMEDIATE: {
          surfScore: round2(surfScore),
          surfGrade: generateSurfGrade(surfScore),
          surfGradeNumeric: 0.0,
        },
        ADVANCED: {
          surfScore: round2(surfScore * 1.1 > 100 ? 100 : surfScore * 1.1),
          surfGrade: generateSurfGrade(Math.min(100, surfScore * 1.1)),
          surfGradeNumeric: 0.0,
        },
      },
      metadata: {
        modelVersion: 'sagemaker-awaves-v1.2',
        dataSource: 'open-meteo',
        predictionType: 'FORECAST' as const,
        createdAt: new Date().toISOString(),
      },
      name: spot.name,
      nameKo: spot.nameKo,
      region: spot.region,
      country: spot.country,
      address: spot.address,
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

// --- Utility ---

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
