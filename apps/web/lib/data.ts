import type { SurfInfo, SurferLevel } from '@/types';
import type { SearchResult } from '@/components/SearchResultsList';
import { generateSurfGrade, generateSurfingLevel, calculateSurfScore, toLocationId, getBestSurfInfoForDate, round2 } from './services/surfInfoService';

// Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Helper to build a SurfInfo entry from spot metadata + initial conditions
function makeSurfInfo(
  lat: number,
  lng: number,
  conditions: { waveHeight: number; wavePeriod: number; windSpeed: number; waterTemperature: number },
  meta: {
    name: string;
    nameKo?: string;
    region: string;
    country: string;
    address?: string;
    difficulty: SurferLevel;
    waveType: string;
    bestSeason: string[];
    description?: string;
    descriptionKo?: string;
  }
): SurfInfo {
  const surfScore = calculateSurfScore(conditions.waveHeight, conditions.wavePeriod, conditions.windSpeed);
  return {
    LocationId: toLocationId(lat, lng),
    SurfTimestamp: new Date().toISOString(),
    geo: { lat, lng },
    conditions: {
      waveHeight: round2(conditions.waveHeight),
      wavePeriod: round2(conditions.wavePeriod),
      windSpeed: round2(conditions.windSpeed),
      waterTemperature: round2(conditions.waterTemperature),
    },
    derivedMetrics: {
      surfScore: round2(surfScore),
      surfGrade: generateSurfGrade(surfScore),
      surfingLevel: generateSurfingLevel(conditions.waveHeight, conditions.windSpeed),
    },
    metadata: {
      modelVersion: 'sagemaker-awaves-v1.2',
      dataSource: 'open-meteo',
      predictionType: 'FORECAST',
      createdAt: new Date().toISOString(),
    },
    ...meta,
  };
}

// ============================================================
// 50 Mock Surf Spots as SurfInfo
// ============================================================

export const mockSpots: SurfInfo[] = [
  // --- Korean Spots - Yangyang Area ---
  makeSurfInfo(38.0765, 128.6234,
    { waveHeight: 1.2, wavePeriod: 8, windSpeed: 12, waterTemperature: 22 },
    { name: 'Jukdo Beach', nameKo: '죽도해변', region: 'Yangyang', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'One of the most popular surf spots in Korea, perfect for beginners with consistent waves.', descriptionKo: '한국에서 가장 인기 있는 서핑 스팟 중 하나로, 일정한 파도로 초보자에게 적합합니다.' }),
  makeSurfInfo(38.0421, 128.5987,
    { waveHeight: 1.0, wavePeriod: 7, windSpeed: 10, waterTemperature: 22 },
    { name: 'Surfyy Beach', nameKo: '서피비치', region: 'Yangyang', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'A dedicated surf beach with great facilities and consistent beginner-friendly waves.', descriptionKo: '훌륭한 시설과 초보자에게 적합한 일정한 파도를 갖춘 전용 서핑 해변입니다.' }),
  makeSurfInfo(38.0542, 128.6123,
    { waveHeight: 1.4, wavePeriod: 9, windSpeed: 14, waterTemperature: 22 },
    { name: 'Hajodae Beach', nameKo: '하조대해변', region: 'Yangyang', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Beautiful beach with slightly more challenging waves, great for progressing surfers.', descriptionKo: '약간 더 도전적인 파도가 있는 아름다운 해변으로, 실력 향상 중인 서퍼에게 좋습니다.' }),
  makeSurfInfo(38.0876, 128.6312,
    { waveHeight: 0.9, wavePeriod: 7, windSpeed: 11, waterTemperature: 21 },
    { name: 'Ingu Beach', nameKo: '인구해변', region: 'Yangyang', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Quiet beach with gentle waves, less crowded than other Yangyang spots.', descriptionKo: '부드러운 파도가 있는 조용한 해변으로, 다른 양양 스팟보다 덜 붐빕니다.' }),

  // --- Korean Spots - Busan Area ---
  makeSurfInfo(35.1789, 129.2001,
    { waveHeight: 1.5, wavePeriod: 10, windSpeed: 15, waterTemperature: 24 },
    { name: 'Songjeong Beach', nameKo: '송정해수욕장', region: 'Busan', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: "Busan's premier surf spot with more challenging waves during typhoon season.", descriptionKo: '태풍 시즌에 더 도전적인 파도가 있는 부산의 대표 서핑 스팟입니다.' }),
  makeSurfInfo(35.0467, 128.9654,
    { waveHeight: 0.8, wavePeriod: 7, windSpeed: 10, waterTemperature: 24 },
    { name: 'Dadaepo Beach', nameKo: '다대포해변', region: 'Busan', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Wide sandy beach with gentle waves, good for beginners.', descriptionKo: '부드러운 파도가 있는 넓은 모래 해변으로 초보자에게 좋습니다.' }),
  makeSurfInfo(35.2534, 129.2312,
    { waveHeight: 1.6, wavePeriod: 11, windSpeed: 16, waterTemperature: 23 },
    { name: 'Ilgwang Beach', nameKo: '일광해변', region: 'Busan', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'Slightly more advanced spot north of Busan with consistent swells.', descriptionKo: '부산 북쪽에 위치한 일정한 너울이 있는 중급 스팟입니다.' }),

  // --- Korean Spots - Jeju ---
  makeSurfInfo(33.2436, 126.4125,
    { waveHeight: 2.0, wavePeriod: 12, windSpeed: 18, waterTemperature: 20 },
    { name: 'Jungmun Beach', nameKo: '중문해변', region: 'Jeju', country: 'South Korea', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter', 'spring'], description: "Jeju's famous surf spot with powerful reef breaks for experienced surfers.", descriptionKo: '경험 많은 서퍼를 위한 강력한 리프 브레이크가 있는 제주의 유명한 서핑 스팟입니다.' }),
  makeSurfInfo(33.4978, 126.4523,
    { waveHeight: 0.7, wavePeriod: 6, windSpeed: 12, waterTemperature: 22 },
    { name: 'Iho Tewoo Beach', nameKo: '이호테우해변', region: 'Jeju', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Easy waves with unique horse-shaped lighthouses, great for beginners.', descriptionKo: '독특한 말 모양 등대가 있는 초보자에게 좋은 부드러운 파도.' }),
  makeSurfInfo(33.2234, 126.2945,
    { waveHeight: 1.3, wavePeriod: 9, windSpeed: 14, waterTemperature: 21 },
    { name: 'Sagye Beach', nameKo: '사계해변', region: 'Jeju', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'South Jeju beach with mountain views and good waves.', descriptionKo: '산 전망과 좋은 파도가 있는 제주 남쪽 해변.' }),

  // --- Korean Spots - Other ---
  makeSurfInfo(36.0712, 129.4234,
    { waveHeight: 1.4, wavePeriod: 10, windSpeed: 15, waterTemperature: 20 },
    { name: 'Wolpo Beach', nameKo: '월포해변', region: 'Pohang', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'East coast spot with consistent winter swells.', descriptionKo: '일정한 겨울 너울이 있는 동해안 스팟.' }),
  makeSurfInfo(35.4567, 129.3412,
    { waveHeight: 1.0, wavePeriod: 8, windSpeed: 11, waterTemperature: 23 },
    { name: 'Jinha Beach', nameKo: '진하해변', region: 'Ulsan', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Clean beach with gentle waves, popular with local surfers.', descriptionKo: '깨끗한 해변과 부드러운 파도, 지역 서퍼들에게 인기 있습니다.' }),

  // --- US Spots - California ---
  makeSurfInfo(33.6595, -117.9988,
    { waveHeight: 1.5, wavePeriod: 11, windSpeed: 8, waterTemperature: 18 },
    { name: 'Huntington Beach', region: 'California', country: 'United States', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Surf City USA - one of the most iconic surf spots in the world with consistent waves year-round.' }),
  makeSurfInfo(37.4953, -122.4961,
    { waveHeight: 4.0, wavePeriod: 18, windSpeed: 20, waterTemperature: 12 },
    { name: 'Mavericks', region: 'California', country: 'United States', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter'], description: 'World-famous big wave spot with massive swells during winter. For expert surfers only.' }),
  makeSurfInfo(33.3817, -117.5883,
    { waveHeight: 1.8, wavePeriod: 13, windSpeed: 6, waterTemperature: 19 },
    { name: 'Trestles', region: 'California', country: 'United States', difficulty: 'advanced', waveType: 'Point Break', bestSeason: ['summer', 'fall'], description: 'World-class wave in San Clemente with multiple peaks and perfect conditions.' }),
  makeSurfInfo(34.0357, -118.6813,
    { waveHeight: 1.2, wavePeriod: 12, windSpeed: 7, waterTemperature: 18 },
    { name: 'Malibu Surfrider', region: 'California', country: 'United States', difficulty: 'intermediate', waveType: 'Point Break', bestSeason: ['summer', 'fall'], description: 'Iconic longboard wave with perfect peeling rights.' }),
  makeSurfInfo(34.3733, -119.4783,
    { waveHeight: 2.2, wavePeriod: 14, windSpeed: 5, waterTemperature: 15 },
    { name: 'Rincon', region: 'California', country: 'United States', difficulty: 'advanced', waveType: 'Point Break', bestSeason: ['winter'], description: 'Queen of the Coast - legendary right point break.' }),
  makeSurfInfo(36.9519, -122.0265,
    { waveHeight: 2.0, wavePeriod: 13, windSpeed: 10, waterTemperature: 14 },
    { name: 'Steamer Lane', region: 'California', country: 'United States', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['fall', 'winter'], description: 'Santa Cruz iconic spot with powerful reef breaks.' }),

  // --- US Spots - Hawaii ---
  makeSurfInfo(21.665, -158.0532,
    { waveHeight: 3.0, wavePeriod: 15, windSpeed: 12, waterTemperature: 25 },
    { name: 'Pipeline', region: 'Hawaii', country: 'United States', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter'], description: 'The most famous wave in the world. Legendary left-hand barrel over shallow reef.' }),
  makeSurfInfo(21.2765, -157.827,
    { waveHeight: 0.8, wavePeriod: 12, windSpeed: 10, waterTemperature: 26 },
    { name: 'Waikiki', region: 'Hawaii', country: 'United States', difficulty: 'beginner', waveType: 'Reef Break', bestSeason: ['summer', 'fall'], description: 'The birthplace of modern surfing. Long, gentle waves perfect for learning.' }),
  makeSurfInfo(21.6789, -158.0412,
    { waveHeight: 3.5, wavePeriod: 16, windSpeed: 14, waterTemperature: 25 },
    { name: 'Sunset Beach', region: 'Hawaii', country: 'United States', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter'], description: 'Powerful and unpredictable North Shore spot for experts.' }),
  makeSurfInfo(21.6422, -158.0661,
    { waveHeight: 4.5, wavePeriod: 18, windSpeed: 16, waterTemperature: 25 },
    { name: 'Waimea Bay', region: 'Hawaii', country: 'United States', difficulty: 'advanced', waveType: 'Beach Break', bestSeason: ['winter'], description: 'Big wave beach break famous for Eddie Aikau competition.' }),
  makeSurfInfo(20.9339, -156.3569,
    { waveHeight: 2.5, wavePeriod: 14, windSpeed: 22, waterTemperature: 24 },
    { name: 'Hookipa', region: 'Hawaii', country: 'United States', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter', 'spring'], description: 'Maui famous for surf and windsurfing with powerful waves.' }),

  // --- US Spots - East Coast ---
  makeSurfInfo(27.8561, -80.4486,
    { waveHeight: 1.3, wavePeriod: 9, windSpeed: 12, waterTemperature: 26 },
    { name: 'Sebastian Inlet', region: 'Florida', country: 'United States', difficulty: 'intermediate', waveType: 'Jetty Break', bestSeason: ['fall', 'winter'], description: 'Best wave in Florida, consistent swells from tropical systems.' }),
  makeSurfInfo(28.3656, -80.5982,
    { waveHeight: 0.9, wavePeriod: 8, windSpeed: 10, waterTemperature: 27 },
    { name: 'Cocoa Beach Pier', region: 'Florida', country: 'United States', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Famous Florida surf spot with gentle waves, home of Kelly Slater.' }),
  makeSurfInfo(40.1024, -74.0326,
    { waveHeight: 1.5, wavePeriod: 10, windSpeed: 15, waterTemperature: 16 },
    { name: 'Manasquan Inlet', region: 'New Jersey', country: 'United States', difficulty: 'intermediate', waveType: 'Jetty Break', bestSeason: ['fall', 'winter'], description: 'Consistent East Coast break with good shape.' }),

  // --- International ---
  makeSurfInfo(-28.1567, 153.5497,
    { waveHeight: 1.8, wavePeriod: 12, windSpeed: 8, waterTemperature: 22 },
    { name: 'Snapper Rocks', region: 'Gold Coast', country: 'Australia', difficulty: 'advanced', waveType: 'Point Break', bestSeason: ['winter'], description: 'World-famous superbank creating perfect barrels.' }),
  makeSurfInfo(-38.3678, 144.2816,
    { waveHeight: 2.2, wavePeriod: 14, windSpeed: 12, waterTemperature: 14 },
    { name: 'Bells Beach', region: 'Victoria', country: 'Australia', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['fall', 'winter'], description: 'Iconic Australian surf spot home to Rip Curl Pro.' }),
  makeSurfInfo(39.3559, -9.3763,
    { waveHeight: 2.5, wavePeriod: 13, windSpeed: 10, waterTemperature: 17 },
    { name: 'Supertubos', region: 'Peniche', country: 'Portugal', difficulty: 'advanced', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'Heavy beach break barrels hosting WSL events.' }),
  makeSurfInfo(-8.8291, 115.0849,
    { waveHeight: 2.0, wavePeriod: 14, windSpeed: 8, waterTemperature: 28 },
    { name: 'Uluwatu', region: 'Bali', country: 'Indonesia', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['dry'], description: 'World-class left reef break with perfect long walls.' }),
  makeSurfInfo(-8.8152, 115.0991,
    { waveHeight: 2.5, wavePeriod: 15, windSpeed: 6, waterTemperature: 28 },
    { name: 'Padang Padang', region: 'Bali', country: 'Indonesia', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['dry'], description: 'Heavy barreling left over shallow reef, experts only.' }),
  makeSurfInfo(35.3378, 140.3967,
    { waveHeight: 1.4, wavePeriod: 10, windSpeed: 12, waterTemperature: 20 },
    { name: 'Tsurigasaki Beach', region: 'Chiba', country: 'Japan', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: '2020 Olympic surfing venue with consistent waves.' }),

  // --- Additional Korean Spots to reach 50 ---
  makeSurfInfo(37.8765, 128.8312,
    { waveHeight: 1.1, wavePeriod: 8, windSpeed: 13, waterTemperature: 21 },
    { name: 'Gyeongpo Beach', nameKo: '경포해변', region: 'Gangneung', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Popular Gangneung beach with gentle waves.', descriptionKo: '부드러운 파도가 있는 인기 강릉 해변.' }),
  makeSurfInfo(37.7891, 128.9123,
    { waveHeight: 1.3, wavePeriod: 9, windSpeed: 14, waterTemperature: 20 },
    { name: 'Jeongdongjin Beach', nameKo: '정동진해변', region: 'Gangneung', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'Famous sunrise spot with good winter swells.', descriptionKo: '좋은 겨울 파도가 있는 유명한 일출 스팟.' }),
  makeSurfInfo(33.2891, 126.1678,
    { waveHeight: 1.8, wavePeriod: 11, windSpeed: 16, waterTemperature: 19 },
    { name: 'Hyeopjae Beach', nameKo: '협재해변', region: 'Jeju', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['winter', 'spring'], description: 'Beautiful beach with turquoise water and decent waves.', descriptionKo: '청록색 물과 적절한 파도가 있는 아름다운 해변.' }),
  makeSurfInfo(34.7521, 127.7412,
    { waveHeight: 0.8, wavePeriod: 7, windSpeed: 9, waterTemperature: 23 },
    { name: 'Yeosu Manseongri Beach', nameKo: '만성리해변', region: 'Yeosu', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer'], description: 'South coast gentle beach, great for beginners.', descriptionKo: '남해안 부드러운 해변, 초보자에게 좋습니다.' }),
  makeSurfInfo(35.1523, 129.1345,
    { waveHeight: 1.2, wavePeriod: 9, windSpeed: 12, waterTemperature: 24 },
    { name: 'Haeundae Beach', nameKo: '해운대해변', region: 'Busan', country: 'South Korea', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: "Korea's most famous beach, occasional surf conditions.", descriptionKo: '한국에서 가장 유명한 해변, 가끔 서핑 조건이 됩니다.' }),
  makeSurfInfo(38.1234, 128.6567,
    { waveHeight: 1.5, wavePeriod: 10, windSpeed: 13, waterTemperature: 21 },
    { name: 'Naksan Beach', nameKo: '낙산해변', region: 'Yangyang', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Beautiful east coast beach near Naksansa Temple.', descriptionKo: '낙산사 근처 아름다운 동해안 해변.' }),
  makeSurfInfo(33.4523, 126.3456,
    { waveHeight: 1.6, wavePeriod: 10, windSpeed: 17, waterTemperature: 20 },
    { name: 'Gwakji Beach', nameKo: '곽지해변', region: 'Jeju', country: 'South Korea', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'Northwest Jeju beach with good wave consistency.', descriptionKo: '좋은 파도 일정성을 가진 제주 북서쪽 해변.' }),

  // --- Additional International Spots ---
  makeSurfInfo(-33.8912, 151.2743,
    { waveHeight: 1.4, wavePeriod: 10, windSpeed: 14, waterTemperature: 20 },
    { name: 'Bondi Beach', region: 'Sydney', country: 'Australia', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: "Sydney's most iconic beach with consistent surf." }),
  makeSurfInfo(-27.4773, 153.0135,
    { waveHeight: 1.2, wavePeriod: 9, windSpeed: 11, waterTemperature: 23 },
    { name: 'Burleigh Heads', region: 'Gold Coast', country: 'Australia', difficulty: 'intermediate', waveType: 'Point Break', bestSeason: ['winter', 'spring'], description: 'Classic Gold Coast point break.' }),
  makeSurfInfo(43.4833, -1.5583,
    { waveHeight: 1.6, wavePeriod: 11, windSpeed: 9, waterTemperature: 19 },
    { name: 'La Côte des Basques', region: 'Biarritz', country: 'France', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer', 'fall'], description: 'Beautiful French beach with long gentle waves.' }),
  makeSurfInfo(28.0997, -15.4367,
    { waveHeight: 1.8, wavePeriod: 12, windSpeed: 15, waterTemperature: 21 },
    { name: 'El Confital', region: 'Gran Canaria', country: 'Spain', difficulty: 'advanced', waveType: 'Reef Break', bestSeason: ['winter'], description: 'Powerful reef break in the Canary Islands.' }),
  makeSurfInfo(-8.7501, 115.1678,
    { waveHeight: 1.3, wavePeriod: 10, windSpeed: 8, waterTemperature: 28 },
    { name: 'Kuta Beach', region: 'Bali', country: 'Indonesia', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['dry'], description: 'Popular beginner-friendly surf in Bali.' }),
  makeSurfInfo(34.0219, 131.0635,
    { waveHeight: 1.1, wavePeriod: 8, windSpeed: 10, waterTemperature: 19 },
    { name: 'Tsunoshima', region: 'Yamaguchi', country: 'Japan', difficulty: 'intermediate', waveType: 'Beach Break', bestSeason: ['fall', 'winter'], description: 'Beautiful island spot with clear water.' }),
  makeSurfInfo(24.3381, 124.1558,
    { waveHeight: 1.0, wavePeriod: 9, windSpeed: 11, waterTemperature: 27 },
    { name: 'Sunabe Seawall', region: 'Okinawa', country: 'Japan', difficulty: 'intermediate', waveType: 'Reef Break', bestSeason: ['fall', 'winter'], description: 'Tropical reef break with warm water.' }),
  makeSurfInfo(-3.7319, 39.59,
    { waveHeight: 1.5, wavePeriod: 11, windSpeed: 13, waterTemperature: 27 },
    { name: 'Diani Beach', region: 'Mombasa', country: 'Kenya', difficulty: 'intermediate', waveType: 'Reef Break', bestSeason: ['winter'], description: 'East African reef break with warm Indian Ocean water.' }),
  makeSurfInfo(14.5333, 120.9333,
    { waveHeight: 1.4, wavePeriod: 10, windSpeed: 12, waterTemperature: 29 },
    { name: 'San Juan', region: 'La Union', country: 'Philippines', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['winter'], description: 'Philippines surf capital with beginner-friendly waves.' }),
  makeSurfInfo(9.5618, 76.0095,
    { waveHeight: 1.1, wavePeriod: 9, windSpeed: 10, waterTemperature: 28 },
    { name: 'Kovalam Beach', region: 'Kerala', country: 'India', difficulty: 'beginner', waveType: 'Beach Break', bestSeason: ['summer'], description: 'Growing surf scene in tropical south India.' }),
];

// ============================================================
// Search & Filter Functions
// ============================================================

export interface SpotSearchFilters {
  location?: string;
  date?: string;
  time?: string;
  surferLevel?: SurferLevel;
  userLat?: number;
  userLng?: number;
}

export const searchSpotsWithFilters = (filters: SpotSearchFilters): SearchResult[] => {
  let results = [...mockSpots];

  // Filter by location text
  if (filters.location) {
    const lower = filters.location.toLowerCase();
    results = results.filter(
      (spot) =>
        spot.name.toLowerCase().includes(lower) ||
        spot.nameKo?.toLowerCase().includes(lower) ||
        spot.region.toLowerCase().includes(lower) ||
        spot.country.toLowerCase().includes(lower)
    );
  }

  // Filter by surfer level
  if (filters.surferLevel) {
    const hierarchy: SurferLevel[] = ['beginner', 'intermediate', 'advanced'];
    const userIdx = hierarchy.indexOf(filters.surferLevel);
    results = results.filter((spot) => {
      const spotIdx = hierarchy.indexOf(spot.difficulty);
      return spotIdx <= userIdx;
    });
  }

  // For each result, generate forecast-based scores for the given date
  const enriched: SearchResult[] = results.map((spot) => {
    if (filters.date) {
      const best = getBestSurfInfoForDate(spot, filters.date);
      return {
        ...spot,
        conditions: best.conditions,
        derivedMetrics: best.derivedMetrics,
        SurfTimestamp: best.SurfTimestamp,
        distance: (filters.userLat !== undefined && filters.userLng !== undefined)
          ? calculateDistance(filters.userLat, filters.userLng, spot.geo.lat, spot.geo.lng)
          : undefined,
      };
    }
    return {
      ...spot,
      distance: (filters.userLat !== undefined && filters.userLng !== undefined)
        ? calculateDistance(filters.userLat, filters.userLng, spot.geo.lat, spot.geo.lng)
        : undefined,
    };
  });

  // Sort by surf score descending
  return enriched.sort((a, b) => b.derivedMetrics.surfScore - a.derivedMetrics.surfScore);
};

// Get nearby spots sorted by distance
export const getNearbySpots = (
  userLat: number,
  userLng: number,
  limit: number = 25,
  filters?: { date?: string; time?: string }
): SearchResult[] => {
  const enriched: SearchResult[] = mockSpots.map((spot) => {
    const distance = calculateDistance(userLat, userLng, spot.geo.lat, spot.geo.lng);

    if (filters?.date) {
      const best = getBestSurfInfoForDate(spot, filters.date);
      return {
        ...spot,
        conditions: best.conditions,
        derivedMetrics: best.derivedMetrics,
        SurfTimestamp: best.SurfTimestamp,
        distance,
      };
    }
    return { ...spot, distance };
  });

  return enriched.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)).slice(0, limit);
};

// Get unique locations for autocomplete
export const getUniqueLocations = (): Array<{ id: string; name: string; nameKo?: string; type: 'spot' | 'region' | 'country' }> => {
  const locations: Array<{ id: string; name: string; nameKo?: string; type: 'spot' | 'region' | 'country' }> = [];

  mockSpots.forEach((spot) => {
    locations.push({
      id: spot.LocationId,
      name: spot.name,
      nameKo: spot.nameKo,
      type: 'spot',
    });
  });

  const uniqueRegions = new Set(mockSpots.map((s) => s.region));
  uniqueRegions.forEach((region) => {
    locations.push({ id: `region-${region}`, name: region, type: 'region' });
  });

  const uniqueCountries = new Set(mockSpots.map((s) => s.country));
  uniqueCountries.forEach((country) => {
    locations.push({ id: `country-${country}`, name: country, type: 'country' });
  });

  return locations;
};

export { TIME_SLOTS as availableTimeSlots } from './services/surfInfoService';

export const DEMO_USER_LOCATION = {
  lat: 37.5665,
  lng: 126.9780,
};
