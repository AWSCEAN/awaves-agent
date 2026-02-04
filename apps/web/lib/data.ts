import type { SurfSpot } from '@/types';

export const mockSpots: SurfSpot[] = [
  // Korean Spots
  {
    id: 'kr-yangyang-jukdo',
    name: 'Jukdo Beach',
    nameKo: '죽도해변',
    latitude: 38.0765,
    longitude: 128.6234,
    region: 'Yangyang',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'One of the most popular surf spots in Korea, perfect for beginners with consistent waves.',
    descriptionKo: '한국에서 가장 인기 있는 서핑 스팟 중 하나로, 일정한 파도로 초보자에게 적합합니다.',
    currentConditions: {
      waveHeight: 1.2,
      waveHeightMax: 1.5,
      wavePeriod: 8,
      waveDirection: 90,
      windSpeed: 12,
      windDirection: 45,
      waterTemperature: 22,
      airTemperature: 26,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-yangyang-surfyy',
    name: 'Surfyy Beach',
    nameKo: '서피비치',
    latitude: 38.0421,
    longitude: 128.5987,
    region: 'Yangyang',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'A dedicated surf beach with great facilities and consistent beginner-friendly waves.',
    descriptionKo: '훌륭한 시설과 초보자에게 적합한 일정한 파도를 갖춘 전용 서핑 해변입니다.',
    currentConditions: {
      waveHeight: 1.0,
      waveHeightMax: 1.3,
      wavePeriod: 7,
      waveDirection: 85,
      windSpeed: 10,
      windDirection: 50,
      waterTemperature: 22,
      airTemperature: 25,
      tide: 'high',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-busan-songjeong',
    name: 'Songjeong Beach',
    nameKo: '송정해수욕장',
    latitude: 35.1789,
    longitude: 129.2001,
    region: 'Busan',
    country: 'South Korea',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: 'Busan\'s premier surf spot with more challenging waves during typhoon season.',
    descriptionKo: '태풍 시즌에 더 도전적인 파도가 있는 부산의 대표 서핑 스팟입니다.',
    currentConditions: {
      waveHeight: 1.5,
      waveHeightMax: 2.0,
      wavePeriod: 10,
      waveDirection: 120,
      windSpeed: 15,
      windDirection: 90,
      waterTemperature: 24,
      airTemperature: 28,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-jeju-jungmun',
    name: 'Jungmun Beach',
    nameKo: '중문해변',
    latitude: 33.2436,
    longitude: 126.4125,
    region: 'Jeju',
    country: 'South Korea',
    difficulty: 'advanced',
    waveType: 'Reef Break',
    bestSeason: ['winter', 'spring'],
    description: 'Jeju\'s famous surf spot with powerful reef breaks for experienced surfers.',
    descriptionKo: '경험 많은 서퍼를 위한 강력한 리프 브레이크가 있는 제주의 유명한 서핑 스팟입니다.',
    currentConditions: {
      waveHeight: 2.0,
      waveHeightMax: 2.8,
      wavePeriod: 12,
      waveDirection: 200,
      windSpeed: 18,
      windDirection: 180,
      waterTemperature: 20,
      airTemperature: 22,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // US Spots
  {
    id: 'us-ca-huntington',
    name: 'Huntington Beach',
    latitude: 33.6595,
    longitude: -117.9988,
    region: 'California',
    country: 'United States',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Surf City USA - one of the most iconic surf spots in the world with consistent waves year-round.',
    currentConditions: {
      waveHeight: 1.5,
      waveHeightMax: 2.0,
      wavePeriod: 11,
      waveDirection: 270,
      windSpeed: 8,
      windDirection: 300,
      waterTemperature: 18,
      airTemperature: 24,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-ca-mavericks',
    name: 'Mavericks',
    latitude: 37.4953,
    longitude: -122.4961,
    region: 'California',
    country: 'United States',
    difficulty: 'expert',
    waveType: 'Reef Break',
    bestSeason: ['winter'],
    description: 'World-famous big wave spot with massive swells during winter. For expert surfers only.',
    currentConditions: {
      waveHeight: 4.0,
      waveHeightMax: 8.0,
      wavePeriod: 18,
      waveDirection: 280,
      windSpeed: 20,
      windDirection: 315,
      waterTemperature: 12,
      airTemperature: 14,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-hi-pipeline',
    name: 'Pipeline',
    latitude: 21.6650,
    longitude: -158.0532,
    region: 'Hawaii',
    country: 'United States',
    difficulty: 'expert',
    waveType: 'Reef Break',
    bestSeason: ['winter'],
    description: 'The most famous wave in the world. Legendary left-hand barrel over shallow reef.',
    currentConditions: {
      waveHeight: 3.0,
      waveHeightMax: 4.5,
      wavePeriod: 15,
      waveDirection: 315,
      windSpeed: 12,
      windDirection: 45,
      waterTemperature: 25,
      airTemperature: 28,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-hi-waikiki',
    name: 'Waikiki',
    latitude: 21.2765,
    longitude: -157.8270,
    region: 'Hawaii',
    country: 'United States',
    difficulty: 'beginner',
    waveType: 'Reef Break',
    bestSeason: ['summer', 'fall'],
    description: 'The birthplace of modern surfing. Long, gentle waves perfect for learning.',
    currentConditions: {
      waveHeight: 0.8,
      waveHeightMax: 1.2,
      wavePeriod: 12,
      waveDirection: 180,
      windSpeed: 10,
      windDirection: 60,
      waterTemperature: 26,
      airTemperature: 30,
      tide: 'high',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
];

export const regions = {
  korea: ['Yangyang', 'Busan', 'Jeju', 'Pohang', 'Ulsan'],
  usa: ['California', 'Hawaii', 'Florida', 'Oregon', 'New Jersey'],
};

export const getSpotsByRegion = (region: string): SurfSpot[] => {
  return mockSpots.filter((spot) => spot.region === region);
};

export const getSpotsByCountry = (country: string): SurfSpot[] => {
  return mockSpots.filter((spot) => spot.country === country);
};

export const getSpotById = (id: string): SurfSpot | undefined => {
  return mockSpots.find((spot) => spot.id === id);
};

export const searchSpots = (query: string): SurfSpot[] => {
  const lowerQuery = query.toLowerCase();
  return mockSpots.filter(
    (spot) =>
      spot.name.toLowerCase().includes(lowerQuery) ||
      spot.nameKo?.toLowerCase().includes(lowerQuery) ||
      spot.region.toLowerCase().includes(lowerQuery) ||
      spot.country.toLowerCase().includes(lowerQuery)
  );
};
