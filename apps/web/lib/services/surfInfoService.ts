import type { SurfGrade, SurfingLevel, SurfInfo } from '@/types';

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

export const TIME_SLOTS = ['06:00', '09:00', '12:00', '15:00', '18:00'];

export function generateSurfInfoForSpot(
  spot: {
    LocationId: string;
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
  const seed = hashCode(`${spot.LocationId}-${date}`);

  return TIME_SLOTS.map((time, i) => {
    const variation = seededRandom(seed + i * 1000);
    const timeVariation = seededRandom(seed + i * 2000);

    const waveHeight = 0.3 + variation * 3.5;
    const wavePeriod = 5 + timeVariation * 12;
    const windSpeed = 2 + variation * 35;
    const waterTemperature = 10 + timeVariation * 18;

    const surfScore = calculateSurfScore(waveHeight, wavePeriod, windSpeed);

    return {
      LocationId: spot.LocationId,
      SurfTimestamp: `${date}T${time}:00Z`,
      geo: spot.geo,
      conditions: {
        waveHeight: round2(waveHeight),
        wavePeriod: round2(wavePeriod),
        windSpeed: round2(windSpeed),
        waterTemperature: round2(waterTemperature),
      },
      derivedMetrics: {
        surfScore: round2(surfScore),
        surfGrade: generateSurfGrade(surfScore),
        surfingLevel: generateSurfingLevel(waveHeight, windSpeed),
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
    curr.derivedMetrics.surfScore > best.derivedMetrics.surfScore ? curr : best
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
