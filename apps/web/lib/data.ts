import type { SurfSpot, ForecastTimeSlot, SpotForecastData, SurferLevel } from '@/types';

// Helper to generate dates for the next 10 days
function generateAvailableDates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Helper to generate time slots with forecast data
function generateTimeSlots(
  baseWaveHeight: number,
  baseSurfScore: number,
  baseSafetyScore: number,
  waterTemp: number,
  airTemp: number,
): ForecastTimeSlot[] {
  const times = ['06:00', '09:00', '12:00', '15:00', '18:00'];
  return times.map((time, index) => {
    // Vary conditions slightly throughout the day
    const hourVariation = Math.sin((index / 4) * Math.PI) * 0.3;
    const waveHeight = Math.max(0.3, baseWaveHeight + hourVariation);
    const surfScore = Math.min(100, Math.max(0, baseSurfScore + Math.round((Math.random() - 0.5) * 15)));
    const safetyScore = Math.min(100, Math.max(0, baseSafetyScore + Math.round((Math.random() - 0.5) * 10)));

    return {
      time,
      waveHeight: Math.round(waveHeight * 10) / 10,
      waveHeightMax: Math.round((waveHeight + 0.5) * 10) / 10,
      wavePeriod: 8 + Math.round(Math.random() * 6),
      waveDirection: 180 + Math.round((Math.random() - 0.5) * 90),
      windSpeed: 8 + Math.round(Math.random() * 12),
      windDirection: 45 + Math.round(Math.random() * 90),
      waterTemperature: waterTemp + Math.round((Math.random() - 0.5) * 2),
      airTemperature: airTemp + index * 2 - 2, // warmer midday
      swellHeight: Math.round((waveHeight * 0.8) * 10) / 10,
      swellPeriod: 10 + Math.round(Math.random() * 4),
      swellDirection: 200 + Math.round((Math.random() - 0.5) * 60),
      surfScore,
      safetyScore,
    };
  });
}

// Generate forecast data for 10 days
function generateForecastsForDates(
  baseWaveHeight: number,
  baseSurfScore: number,
  baseSafetyScore: number,
  waterTemp: number,
  airTemp: number,
): { [date: string]: ForecastTimeSlot[] } {
  const forecasts: { [date: string]: ForecastTimeSlot[] } = {};
  const dates = generateAvailableDates();

  dates.forEach((date, dayIndex) => {
    // Vary conditions slightly each day
    const dayVariation = Math.sin((dayIndex / 9) * Math.PI * 2) * 0.4;
    const dayWaveHeight = Math.max(0.3, baseWaveHeight + dayVariation);
    const daySurfScore = Math.max(0, baseSurfScore + Math.round((Math.random() - 0.5) * 20));
    const daySafetyScore = Math.max(0, baseSafetyScore + Math.round((Math.random() - 0.5) * 15));

    forecasts[date] = generateTimeSlots(
      dayWaveHeight,
      daySurfScore,
      daySafetyScore,
      waterTemp,
      airTemp
    );
  });

  return forecasts;
}

export const mockSpots: SurfSpot[] = [
  // Korean Spots - Yangyang Area
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
    id: 'kr-yangyang-hajodae',
    name: 'Hajodae Beach',
    nameKo: '하조대해변',
    latitude: 38.0542,
    longitude: 128.6123,
    region: 'Yangyang',
    country: 'South Korea',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Beautiful beach with slightly more challenging waves, great for progressing surfers.',
    descriptionKo: '약간 더 도전적인 파도가 있는 아름다운 해변으로, 실력 향상 중인 서퍼에게 좋습니다.',
    currentConditions: {
      waveHeight: 1.4,
      waveHeightMax: 1.8,
      wavePeriod: 9,
      waveDirection: 88,
      windSpeed: 14,
      windDirection: 55,
      waterTemperature: 22,
      airTemperature: 26,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-yangyang-ingu',
    name: 'Ingu Beach',
    nameKo: '인구해변',
    latitude: 38.0876,
    longitude: 128.6312,
    region: 'Yangyang',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Quiet beach with gentle waves, less crowded than other Yangyang spots.',
    descriptionKo: '부드러운 파도가 있는 조용한 해변으로, 다른 양양 스팟보다 덜 붐빕니다.',
    currentConditions: {
      waveHeight: 0.9,
      waveHeightMax: 1.2,
      wavePeriod: 7,
      waveDirection: 92,
      windSpeed: 11,
      windDirection: 48,
      waterTemperature: 21,
      airTemperature: 25,
      tide: 'low',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  // Korean Spots - Busan Area
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
    description: "Busan's premier surf spot with more challenging waves during typhoon season.",
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
    id: 'kr-busan-dadaepo',
    name: 'Dadaepo Beach',
    nameKo: '다대포해변',
    latitude: 35.0467,
    longitude: 128.9654,
    region: 'Busan',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Wide sandy beach with gentle waves, good for beginners.',
    descriptionKo: '부드러운 파도가 있는 넓은 모래 해변으로 초보자에게 좋습니다.',
    currentConditions: {
      waveHeight: 0.8,
      waveHeightMax: 1.1,
      wavePeriod: 7,
      waveDirection: 150,
      windSpeed: 10,
      windDirection: 100,
      waterTemperature: 24,
      airTemperature: 27,
      tide: 'mid',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-busan-ilgwang',
    name: 'Ilgwang Beach',
    nameKo: '일광해변',
    latitude: 35.2534,
    longitude: 129.2312,
    region: 'Busan',
    country: 'South Korea',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: 'Slightly more advanced spot north of Busan with consistent swells.',
    descriptionKo: '부산 북쪽에 위치한 일정한 너울이 있는 중급 스팟입니다.',
    currentConditions: {
      waveHeight: 1.6,
      waveHeightMax: 2.1,
      wavePeriod: 11,
      waveDirection: 125,
      windSpeed: 16,
      windDirection: 85,
      waterTemperature: 23,
      airTemperature: 27,
      tide: 'high',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // Korean Spots - Jeju
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
    description: "Jeju's famous surf spot with powerful reef breaks for experienced surfers.",
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
  {
    id: 'kr-jeju-iho',
    name: 'Iho Tewoo Beach',
    nameKo: '이호테우해변',
    latitude: 33.4978,
    longitude: 126.4523,
    region: 'Jeju',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Easy waves with unique horse-shaped lighthouses, great for beginners.',
    descriptionKo: '독특한 말 모양 등대가 있는 초보자에게 좋은 부드러운 파도.',
    currentConditions: {
      waveHeight: 0.7,
      waveHeightMax: 1.0,
      wavePeriod: 6,
      waveDirection: 320,
      windSpeed: 12,
      windDirection: 290,
      waterTemperature: 22,
      airTemperature: 24,
      tide: 'mid',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-jeju-sagye',
    name: 'Sagye Beach',
    nameKo: '사계해변',
    latitude: 33.2234,
    longitude: 126.2945,
    region: 'Jeju',
    country: 'South Korea',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: 'South Jeju beach with mountain views and good waves.',
    descriptionKo: '산 전망과 좋은 파도가 있는 제주 남쪽 해변.',
    currentConditions: {
      waveHeight: 1.3,
      waveHeightMax: 1.7,
      wavePeriod: 9,
      waveDirection: 210,
      windSpeed: 14,
      windDirection: 200,
      waterTemperature: 21,
      airTemperature: 23,
      tide: 'low',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // Korean Spots - Other
  {
    id: 'kr-pohang-wolpo',
    name: 'Wolpo Beach',
    nameKo: '월포해변',
    latitude: 36.0712,
    longitude: 129.4234,
    region: 'Pohang',
    country: 'South Korea',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: 'East coast spot with consistent winter swells.',
    descriptionKo: '일정한 겨울 너울이 있는 동해안 스팟.',
    currentConditions: {
      waveHeight: 1.4,
      waveHeightMax: 1.9,
      wavePeriod: 10,
      waveDirection: 95,
      windSpeed: 15,
      windDirection: 60,
      waterTemperature: 20,
      airTemperature: 22,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'kr-ulsan-jinha',
    name: 'Jinha Beach',
    nameKo: '진하해변',
    latitude: 35.4567,
    longitude: 129.3412,
    region: 'Ulsan',
    country: 'South Korea',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Clean beach with gentle waves, popular with local surfers.',
    descriptionKo: '깨끗한 해변과 부드러운 파도, 지역 서퍼들에게 인기 있습니다.',
    currentConditions: {
      waveHeight: 1.0,
      waveHeightMax: 1.3,
      wavePeriod: 8,
      waveDirection: 110,
      windSpeed: 11,
      windDirection: 70,
      waterTemperature: 23,
      airTemperature: 26,
      tide: 'high',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  // US Spots - California
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
    id: 'us-ca-trestles',
    name: 'Trestles',
    latitude: 33.3817,
    longitude: -117.5883,
    region: 'California',
    country: 'United States',
    difficulty: 'advanced',
    waveType: 'Point Break',
    bestSeason: ['summer', 'fall'],
    description: 'World-class wave in San Clemente with multiple peaks and perfect conditions.',
    currentConditions: {
      waveHeight: 1.8,
      waveHeightMax: 2.4,
      wavePeriod: 13,
      waveDirection: 260,
      windSpeed: 6,
      windDirection: 350,
      waterTemperature: 19,
      airTemperature: 25,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-ca-malibu',
    name: 'Malibu Surfrider',
    latitude: 34.0357,
    longitude: -118.6813,
    region: 'California',
    country: 'United States',
    difficulty: 'intermediate',
    waveType: 'Point Break',
    bestSeason: ['summer', 'fall'],
    description: 'Iconic longboard wave with perfect peeling rights.',
    currentConditions: {
      waveHeight: 1.2,
      waveHeightMax: 1.6,
      wavePeriod: 12,
      waveDirection: 190,
      windSpeed: 7,
      windDirection: 310,
      waterTemperature: 18,
      airTemperature: 24,
      tide: 'high',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-ca-rincon',
    name: 'Rincon',
    latitude: 34.3733,
    longitude: -119.4783,
    region: 'California',
    country: 'United States',
    difficulty: 'advanced',
    waveType: 'Point Break',
    bestSeason: ['winter'],
    description: 'Queen of the Coast - legendary right point break.',
    currentConditions: {
      waveHeight: 2.2,
      waveHeightMax: 3.0,
      wavePeriod: 14,
      waveDirection: 250,
      windSpeed: 5,
      windDirection: 0,
      waterTemperature: 15,
      airTemperature: 18,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-ca-steamer-lane',
    name: 'Steamer Lane',
    latitude: 36.9519,
    longitude: -122.0265,
    region: 'California',
    country: 'United States',
    difficulty: 'advanced',
    waveType: 'Reef Break',
    bestSeason: ['fall', 'winter'],
    description: 'Santa Cruz iconic spot with powerful reef breaks.',
    currentConditions: {
      waveHeight: 2.0,
      waveHeightMax: 2.8,
      wavePeriod: 13,
      waveDirection: 280,
      windSpeed: 10,
      windDirection: 340,
      waterTemperature: 14,
      airTemperature: 17,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // US Spots - Hawaii
  {
    id: 'us-hi-pipeline',
    name: 'Pipeline',
    latitude: 21.665,
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
    longitude: -157.827,
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
  {
    id: 'us-hi-sunset',
    name: 'Sunset Beach',
    latitude: 21.6789,
    longitude: -158.0412,
    region: 'Hawaii',
    country: 'United States',
    difficulty: 'expert',
    waveType: 'Reef Break',
    bestSeason: ['winter'],
    description: 'Powerful and unpredictable North Shore spot for experts.',
    currentConditions: {
      waveHeight: 3.5,
      waveHeightMax: 5.0,
      wavePeriod: 16,
      waveDirection: 320,
      windSpeed: 14,
      windDirection: 50,
      waterTemperature: 25,
      airTemperature: 27,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-hi-waimea',
    name: 'Waimea Bay',
    latitude: 21.6422,
    longitude: -158.0661,
    region: 'Hawaii',
    country: 'United States',
    difficulty: 'expert',
    waveType: 'Beach Break',
    bestSeason: ['winter'],
    description: 'Big wave beach break famous for Eddie Aikau competition.',
    currentConditions: {
      waveHeight: 4.5,
      waveHeightMax: 7.0,
      wavePeriod: 18,
      waveDirection: 330,
      windSpeed: 16,
      windDirection: 40,
      waterTemperature: 25,
      airTemperature: 27,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-hi-hookipa',
    name: 'Hookipa',
    latitude: 20.9339,
    longitude: -156.3569,
    region: 'Hawaii',
    country: 'United States',
    difficulty: 'advanced',
    waveType: 'Reef Break',
    bestSeason: ['winter', 'spring'],
    description: 'Maui famous for surf and windsurfing with powerful waves.',
    currentConditions: {
      waveHeight: 2.5,
      waveHeightMax: 3.5,
      wavePeriod: 14,
      waveDirection: 340,
      windSpeed: 22,
      windDirection: 60,
      waterTemperature: 24,
      airTemperature: 26,
      tide: 'high',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // US Spots - East Coast
  {
    id: 'us-fl-sebastian',
    name: 'Sebastian Inlet',
    latitude: 27.8561,
    longitude: -80.4486,
    region: 'Florida',
    country: 'United States',
    difficulty: 'intermediate',
    waveType: 'Jetty Break',
    bestSeason: ['fall', 'winter'],
    description: 'Best wave in Florida, consistent swells from tropical systems.',
    currentConditions: {
      waveHeight: 1.3,
      waveHeightMax: 1.8,
      wavePeriod: 9,
      waveDirection: 80,
      windSpeed: 12,
      windDirection: 90,
      waterTemperature: 26,
      airTemperature: 29,
      tide: 'mid',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-fl-cocoa',
    name: 'Cocoa Beach Pier',
    latitude: 28.3656,
    longitude: -80.5982,
    region: 'Florida',
    country: 'United States',
    difficulty: 'beginner',
    waveType: 'Beach Break',
    bestSeason: ['summer', 'fall'],
    description: 'Famous Florida surf spot with gentle waves, home of Kelly Slater.',
    currentConditions: {
      waveHeight: 0.9,
      waveHeightMax: 1.3,
      wavePeriod: 8,
      waveDirection: 75,
      windSpeed: 10,
      windDirection: 100,
      waterTemperature: 27,
      airTemperature: 31,
      tide: 'high',
      rating: 3,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'us-nj-manasquan',
    name: 'Manasquan Inlet',
    latitude: 40.1024,
    longitude: -74.0326,
    region: 'New Jersey',
    country: 'United States',
    difficulty: 'intermediate',
    waveType: 'Jetty Break',
    bestSeason: ['fall', 'winter'],
    description: 'Consistent East Coast break with good shape.',
    currentConditions: {
      waveHeight: 1.5,
      waveHeightMax: 2.0,
      wavePeriod: 10,
      waveDirection: 90,
      windSpeed: 15,
      windDirection: 270,
      waterTemperature: 16,
      airTemperature: 18,
      tide: 'low',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
  // International Spots
  {
    id: 'au-goldcoast-snapper',
    name: 'Snapper Rocks',
    latitude: -28.1567,
    longitude: 153.5497,
    region: 'Gold Coast',
    country: 'Australia',
    difficulty: 'advanced',
    waveType: 'Point Break',
    bestSeason: ['winter'],
    description: 'World-famous superbank creating perfect barrels.',
    currentConditions: {
      waveHeight: 1.8,
      waveHeightMax: 2.4,
      wavePeriod: 12,
      waveDirection: 100,
      windSpeed: 8,
      windDirection: 240,
      waterTemperature: 22,
      airTemperature: 24,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'au-bells-beach',
    name: 'Bells Beach',
    latitude: -38.3678,
    longitude: 144.2816,
    region: 'Victoria',
    country: 'Australia',
    difficulty: 'advanced',
    waveType: 'Reef Break',
    bestSeason: ['fall', 'winter'],
    description: 'Iconic Australian surf spot home to Rip Curl Pro.',
    currentConditions: {
      waveHeight: 2.2,
      waveHeightMax: 3.0,
      wavePeriod: 14,
      waveDirection: 220,
      windSpeed: 12,
      windDirection: 0,
      waterTemperature: 14,
      airTemperature: 16,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'pt-peniche-supertubos',
    name: 'Supertubos',
    latitude: 39.3559,
    longitude: -9.3763,
    region: 'Peniche',
    country: 'Portugal',
    difficulty: 'expert',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: 'Heavy beach break barrels hosting WSL events.',
    currentConditions: {
      waveHeight: 2.5,
      waveHeightMax: 3.5,
      wavePeriod: 13,
      waveDirection: 290,
      windSpeed: 10,
      windDirection: 60,
      waterTemperature: 17,
      airTemperature: 19,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'id-bali-uluwatu',
    name: 'Uluwatu',
    latitude: -8.8291,
    longitude: 115.0849,
    region: 'Bali',
    country: 'Indonesia',
    difficulty: 'advanced',
    waveType: 'Reef Break',
    bestSeason: ['dry'],
    description: 'World-class left reef break with perfect long walls.',
    currentConditions: {
      waveHeight: 2.0,
      waveHeightMax: 2.8,
      wavePeriod: 14,
      waveDirection: 200,
      windSpeed: 8,
      windDirection: 120,
      waterTemperature: 28,
      airTemperature: 31,
      tide: 'mid',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'id-bali-padang',
    name: 'Padang Padang',
    latitude: -8.8152,
    longitude: 115.0991,
    region: 'Bali',
    country: 'Indonesia',
    difficulty: 'expert',
    waveType: 'Reef Break',
    bestSeason: ['dry'],
    description: 'Heavy barreling left over shallow reef, experts only.',
    currentConditions: {
      waveHeight: 2.5,
      waveHeightMax: 3.5,
      wavePeriod: 15,
      waveDirection: 210,
      windSpeed: 6,
      windDirection: 110,
      waterTemperature: 28,
      airTemperature: 30,
      tide: 'low',
      rating: 5,
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: 'jp-chiba-ichinomiya',
    name: 'Tsurigasaki Beach',
    latitude: 35.3378,
    longitude: 140.3967,
    region: 'Chiba',
    country: 'Japan',
    difficulty: 'intermediate',
    waveType: 'Beach Break',
    bestSeason: ['fall', 'winter'],
    description: '2020 Olympic surfing venue with consistent waves.',
    currentConditions: {
      waveHeight: 1.4,
      waveHeightMax: 1.9,
      wavePeriod: 10,
      waveDirection: 130,
      windSpeed: 12,
      windDirection: 60,
      waterTemperature: 20,
      airTemperature: 23,
      tide: 'high',
      rating: 4,
      updatedAt: new Date().toISOString(),
    },
  },
];

// Generate forecast data for all spots
export const spotForecastData: SpotForecastData[] = mockSpots.map((spot) => {
  const baseWaveHeight = spot.currentConditions?.waveHeight || 1.0;
  const baseSurfScore =
    spot.currentConditions?.rating === 5
      ? 85
      : spot.currentConditions?.rating === 4
        ? 70
        : spot.currentConditions?.rating === 3
          ? 55
          : 40;
  const baseSafetyScore = spot.difficulty === 'beginner' ? 85 : spot.difficulty === 'intermediate' ? 70 : spot.difficulty === 'advanced' ? 55 : 40;

  return {
    spotId: spot.id,
    availableDates: generateAvailableDates(),
    forecasts: generateForecastsForDates(
      baseWaveHeight,
      baseSurfScore,
      baseSafetyScore,
      spot.currentConditions?.waterTemperature || 20,
      spot.currentConditions?.airTemperature || 22
    ),
  };
});

export const regions = {
  korea: ['Yangyang', 'Busan', 'Jeju', 'Pohang', 'Ulsan'],
  usa: ['California', 'Hawaii', 'Florida', 'New Jersey'],
  australia: ['Gold Coast', 'Victoria'],
  portugal: ['Peniche'],
  indonesia: ['Bali'],
  japan: ['Chiba'],
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

export const getSpotForecast = (spotId: string): SpotForecastData | undefined => {
  return spotForecastData.find((f) => f.spotId === spotId);
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

// Search filters interface
export interface SpotSearchFilters {
  location?: string;
  date?: string;
  time?: string;
  surferLevel?: SurferLevel;
  userLat?: number;
  userLng?: number;
}

// Advanced search with filters, sorted by surf score
export const searchSpotsWithFilters = (filters: SpotSearchFilters): Array<SurfSpot & { surfScore: number; safetyScore: number; distance?: number }> => {
  let results = mockSpots;

  // Filter by location (search in name, region, country)
  if (filters.location) {
    const lowerLocation = filters.location.toLowerCase();
    results = results.filter(
      (spot) =>
        spot.name.toLowerCase().includes(lowerLocation) ||
        spot.nameKo?.toLowerCase().includes(lowerLocation) ||
        spot.region.toLowerCase().includes(lowerLocation) ||
        spot.country.toLowerCase().includes(lowerLocation)
    );
  }

  // Filter by surfer level
  if (filters.surferLevel) {
    const levelHierarchy: SurferLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const userLevelIndex = levelHierarchy.indexOf(filters.surferLevel);
    results = results.filter((spot) => {
      const spotLevelIndex = levelHierarchy.indexOf(spot.difficulty);
      return spotLevelIndex <= userLevelIndex;
    });
  }

  // Get scores from forecast data and calculate distance
  const resultsWithScores = results.map((spot) => {
    const forecastData = getSpotForecast(spot.id);
    let surfScore = 50;
    let safetyScore = 70;

    if (forecastData && filters.date && forecastData.forecasts[filters.date]) {
      const dayForecasts = forecastData.forecasts[filters.date];

      if (filters.time) {
        // Find specific time slot
        const timeSlot = dayForecasts.find((slot) => slot.time === filters.time);
        if (timeSlot) {
          surfScore = timeSlot.surfScore;
          safetyScore = timeSlot.safetyScore;
        }
      } else {
        // Average of all time slots for the day
        surfScore = Math.round(dayForecasts.reduce((sum, slot) => sum + slot.surfScore, 0) / dayForecasts.length);
        safetyScore = Math.round(dayForecasts.reduce((sum, slot) => sum + slot.safetyScore, 0) / dayForecasts.length);
      }
    } else if (forecastData) {
      // Use first available day's average
      const dates = Object.keys(forecastData.forecasts);
      if (dates.length > 0) {
        const firstDayForecasts = forecastData.forecasts[dates[0]];
        surfScore = Math.round(firstDayForecasts.reduce((sum, slot) => sum + slot.surfScore, 0) / firstDayForecasts.length);
        safetyScore = Math.round(firstDayForecasts.reduce((sum, slot) => sum + slot.safetyScore, 0) / firstDayForecasts.length);
      }
    }

    // Calculate distance if user location provided
    let distance: number | undefined;
    if (filters.userLat !== undefined && filters.userLng !== undefined) {
      distance = calculateDistance(filters.userLat, filters.userLng, spot.latitude, spot.longitude);
    }

    return {
      ...spot,
      surfScore,
      safetyScore,
      distance,
    };
  });

  // Sort by surf score (highest first)
  return resultsWithScores.sort((a, b) => b.surfScore - a.surfScore);
};

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get unique locations for autocomplete
export const getUniqueLocations = (): Array<{ id: string; name: string; nameKo?: string; type: 'spot' | 'region' | 'country' }> => {
  const locations: Array<{ id: string; name: string; nameKo?: string; type: 'spot' | 'region' | 'country' }> = [];

  // Add all spots
  mockSpots.forEach((spot) => {
    locations.push({
      id: spot.id,
      name: spot.name,
      nameKo: spot.nameKo,
      type: 'spot',
    });
  });

  // Add unique regions
  const uniqueRegions = new Set(mockSpots.map((spot) => spot.region));
  uniqueRegions.forEach((region) => {
    locations.push({
      id: `region-${region}`,
      name: region,
      type: 'region',
    });
  });

  // Add unique countries
  const uniqueCountries = new Set(mockSpots.map((spot) => spot.country));
  uniqueCountries.forEach((country) => {
    locations.push({
      id: `country-${country}`,
      name: country,
      type: 'country',
    });
  });

  return locations;
};

// Available time slots for search
export const availableTimeSlots = ['06:00', '09:00', '12:00', '15:00', '18:00'];
