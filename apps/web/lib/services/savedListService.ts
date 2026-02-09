import type { SavedListItem, SurfInfo } from '@/types';

const STORAGE_KEY = 'awaves-saved-list';

export function getSavedList(userId: string): SavedListItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const items: SavedListItem[] = JSON.parse(raw);
    return items.filter((item) => item.userId === userId);
  } catch {
    return [];
  }
}

export function addToSavedList(userId: string, surfInfo: SurfInfo): SavedListItem {
  // Prevent duplicate saves for the same location
  if (isLocationSaved(userId, surfInfo.LocationId)) {
    const existing = getSavedList(userId).find((item) => item.locationId === surfInfo.LocationId);
    if (existing) return existing;
  }

  const now = new Date().toISOString();
  const dateOnly = surfInfo.SurfTimestamp.split('T')[0];

  const item: SavedListItem = {
    userId,
    locationSurfKey: `${surfInfo.LocationId}#${surfInfo.SurfTimestamp}`,
    locationId: surfInfo.LocationId,
    surfTimestamp: surfInfo.SurfTimestamp,
    savedAt: now,
    address: surfInfo.address || '',
    region: surfInfo.region,
    country: surfInfo.country,
    departureDate: dateOnly,
    waveHeight: surfInfo.conditions.waveHeight,
    wavePeriod: surfInfo.conditions.wavePeriod,
    windSpeed: surfInfo.conditions.windSpeed,
    waterTemperature: surfInfo.conditions.waterTemperature,
    surfingLevel: surfInfo.derivedMetrics.surfingLevel,
    surfScore: surfInfo.derivedMetrics.surfScore,
    surfGrade: surfInfo.derivedMetrics.surfGrade,
    name: surfInfo.name,
    nameKo: surfInfo.nameKo,
  };

  const all = getAllItems();
  all.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return item;
}

export function removeFromSavedList(userId: string, locationId: string): void {
  const all = getAllItems();
  const filtered = all.filter(
    (item) => !(item.userId === userId && item.locationId === locationId)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isLocationSaved(userId: string, locationId: string): boolean {
  const items = getSavedList(userId);
  return items.some((item) => item.locationId === locationId);
}

function getAllItems(): SavedListItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
