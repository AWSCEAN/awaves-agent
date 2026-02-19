# 시스템 아키텍처

## 개요

AWAVES는 AI 기반 서핑 스팟 탐색 플랫폼입니다. 사용자의 실력과 선호도에 맞는 최적의 서핑 스팟을 추천하고, 실시간 파도 데이터를 제공합니다.

## 기술 스택

| 영역 | 기술 | 버전 | 용도 |
|------|------|------|------|
| Frontend | Next.js | 14.2 | 웹 애플리케이션 |
| UI Framework | Tailwind CSS | 3.4 | 스타일링 |
| Map | Mapbox GL JS | 3.3 | 지도 시각화 |
| Backend | FastAPI | 0.110+ | REST API 서버 |
| Language | Python | 3.11 | 백엔드 언어 |
| Database | PostgreSQL | 15+ | 주 데이터 저장소 |
| Cache | Redis | 7+ | 세션/캐시 |
| Search | OpenSearch | 2.x | 위치 키워드 검색 |
| Auth | JWT | - | 인증 토큰 |
| Monorepo | pnpm + Turborepo | - | 패키지 관리 |

## 시스템 구성도

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  FastAPI    │
│   (User)    │     │  Frontend   │     │  Backend    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                    │
                           │            ┌───────┼───────────┐
                           │            ▼       ▼           ▼
                    ┌──────▼──────┐  ┌───────┐ ┌─────────┐ ┌──────────┐
                    │   Mapbox    │  │ Postgr│ │DynamoDB  │ │OpenSearch│
                    │   API       │  │ eSQL  │ │(surf_info│ │(locations│
                    └─────────────┘  └───────┘ │locations)│ │  index)  │
                                               └────┬────┘ └──────────┘
                                                    │
                                             ┌──────▼──────┐
                                             │   Redis     │
                                             │   Cache     │
                                             └─────────────┘
```

## 디렉토리 구조

```
awaves-agent/
├── apps/
│   ├── web/                      # Frontend
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── page.tsx          # Landing page
│   │   │   ├── login/            # 로그인
│   │   │   ├── register/         # 회원가입
│   │   │   ├── map/              # 지도 (메인)
│   │   │   ├── saved/            # 저장된 스팟
│   │   │   └── mypage/           # 마이페이지
│   │   ├── components/           # React 컴포넌트
│   │   │   ├── MapboxMap.tsx     # 지도 컴포넌트
│   │   │   ├── SpotCard.tsx      # 스팟 카드
│   │   │   ├── InfoPanel.tsx     # 정보 패널
│   │   │   ├── ProtectedRoute.tsx # 인증 필요 라우트 가드
│   │   │   ├── Providers.tsx     # 전역 Provider 래퍼
│   │   │   └── ...
│   │   ├── contexts/             # React Context
│   │   │   └── AuthContext.tsx   # 인증 상태 관리
│   │   ├── lib/                  # 유틸리티
│   │   │   ├── apiServices.ts    # API 클라이언트
│   │   │   ├── data.ts           # Mock 데이터
│   │   │   └── geocoder.ts       # 지오코딩
│   │   └── types/                # TypeScript 타입
│   │
│   └── api/                      # Backend
│       ├── app/
│       │   ├── main.py           # FastAPI 앱 진입점
│       │   ├── config.py         # 설정 관리
│       │   ├── routers/          # API 라우터
│       │   │   ├── auth.py       # 인증
│       │   │   ├── surf.py       # 서핑 데이터
│       │   │   ├── search.py     # 위치 키워드 검색 (OpenSearch)
│       │   │   ├── saved.py      # 저장된 스팟
│       │   │   └── feedback.py   # 피드백
│       │   ├── schemas/          # Pydantic 스키마
│       │   ├── models/           # SQLAlchemy 모델
│       │   ├── repositories/     # 데이터 접근 계층 (Repository 패턴)
│       │   │   ├── base_repository.py       # BaseDynamoDBRepository (공유 DDB 클라이언트)
│       │   │   ├── saved_list_repository.py # SavedListRepository (저장 목록 CRUD)
│       │   │   ├── surf_data_repository.py  # SurfDataRepository (서핑 예보 데이터)
│       │   │   └── user_repository.py       # UserRepository (사용자 CRUD, PostgreSQL)
│       │   ├── services/         # 비즈니스 로직
│       │   │   ├── opensearch_service.py    # OpenSearch 클라이언트
│       │   │   ├── search_service.py        # 검색 오케스트레이션
│       │   │   ├── prediction_service.py    # ML 추론 예측 서비스
│       │   │   ├── cache/                   # Redis 캐시 (도메인별 분리)
│       │   │   │   ├── __init__.py          # CacheService 통합 re-export
│       │   │   │   ├── base.py              # BaseCacheService (공유 Redis 클라이언트)
│       │   │   │   ├── auth_cache.py        # AuthCacheService (리프레시 토큰)
│       │   │   │   ├── saved_cache.py       # SavedItemsCacheService (저장 목록)
│       │   │   │   ├── surf_cache.py        # SurfSpotsCacheService (서핑 스팟)
│       │   │   │   └── inference_cache.py   # InferenceCacheService (ML 예측)
│       │   ├── scripts/          # 데이터 인제스션 스크립트
│       │   └── db/               # DB 설정
│       └── tests/                # 테스트
│
├── packages/
│   └── shared/                   # 공유 타입
│
└── docs/                         # 문서
```

## 주요 컴포넌트

### Frontend (apps/web)

#### 역할
- 사용자 인터페이스 제공
- 지도 기반 서핑 스팟 시각화
- 실시간 파도 데이터 표시
- 사용자 인증 및 프로필 관리

#### 주요 페이지
| 경로 | 설명 | 인증 필요 |
|------|------|-----------|
| `/` | 랜딩 페이지 | 아니오 |
| `/login` | 로그인 | 아니오 |
| `/register` | 회원가입 | 아니오 |
| `/map` | 지도 (메인 기능) | 예 |
| `/saved` | 저장된 스팟 목록 | 예 |
| `/mypage` | 프로필 및 설정 | 예 |

### Backend (apps/api)

#### 역할
- REST API 제공
- 사용자 인증/인가
- 데이터 CRUD
- 외부 API 연동

#### API 엔드포인트
| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/auth/register` | POST | 회원가입 |
| `/auth/login` | POST | 로그인 |
| `/auth/me` | GET | 현재 사용자 |
| `/surf/spots` | GET | 스팟 목록 |
| `/surf/spots/{id}` | GET | 스팟 상세 |
| `/search` | GET | 위치 키워드 검색 (OpenSearch) |
| `/saved` | GET/POST | 저장된 스팟 |
| `/feedback` | POST | 피드백 제출 |

## 데이터 흐름

### 인증 플로우
```
1. 사용자 로그인 요청
2. 백엔드에서 자격증명 검증
3. JWT 토큰 발급 (access + refresh)
4. 프론트엔드에서 localStorage에 저장
5. AuthContext가 사용자 정보 로드 및 상태 관리
6. API 요청 시 Authorization 헤더에 토큰 포함
7. 백엔드에서 토큰 검증 후 응답
```

### 프론트엔드 인증 아키텍처
```
┌─────────────────────────────────────────────────────────────┐
│                      AuthProvider                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ AuthContext (user, isAuthenticated, login, logout)  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│           ┌───────────────┼───────────────┐                 │
│           ▼               ▼               ▼                 │
│     ┌──────────┐   ┌──────────┐   ┌──────────────┐         │
│     │ 공개 페이지│   │ 로그인    │   │ ProtectedRoute│         │
│     │ (/, /login)│  │ /logout  │   │ (map, saved,  │         │
│     │           │   │ 버튼     │   │  mypage)      │         │
│     └──────────┘   └──────────┘   └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

### 지도 데이터 플로우
```
1. 사용자가 /map 페이지 접근
2. Mapbox GL 초기화 (한국 중심)
3. 백엔드에서 스팟 데이터 조회
4. 지도에 마커 렌더링
5. 마커 클릭 시 팝업/패널에 상세 정보 표시
```

## 보안 아키텍처

### 인증 (Authentication)
- JWT 기반 토큰 인증
- Access Token: 30분 만료
- Refresh Token: 7일 만료
- bcrypt 비밀번호 해싱

### 인가 (Authorization)
- Protected 라우트는 토큰 필수
- 사용자별 데이터 격리 (저장된 스팟 등)

### CORS
- 허용된 Origin만 접근 가능
- 환경변수로 동적 설정

## 지도 시스템 아키텍처

### 개요
AWAVES의 지도 시스템은 Mapbox GL JS를 기반으로 하며, Open-Meteo API를 통해 실시간 해양 및 기상 데이터를 통합합니다.

### 컴포넌트 계층

```
┌─────────────────────────────────────────────────────────────┐
│                    /map/page.tsx                            │
│                   (Map Page Container)                      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ EnhancedMap  │  │ DateSelector │  │ ForecastPopup│
│  BoxMap      │  │              │  │              │
└──────┬───────┘  └──────────────┘  └──────────────┘
       │
       ├─── WindParticles (Canvas Layer)
       ├─── Mapbox GL JS (Base Map)
       ├─── Mapbox Geocoder (Search)
       └─── Custom Controls (Geolocation, Wind Toggle, Measure)
```

### 데이터 흐름

```
┌──────────────┐
│   User       │
│   Action     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Component Event Handler             │
│  (Click, Date Change, etc.)          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Service Layer                       │
│  - openMeteoService.ts               │
│  - mockForecastData.ts               │
└──────┬───────────────────────────────┘
       │
       ├─── Open-Meteo Marine API
       ├─── Open-Meteo Weather API
       └─── localStorage (Saved Spots)
       │
       ▼
┌──────────────────────────────────────┐
│  Data Processing                     │
│  - Calculate surfScore               │
│  - Calculate safetyScore             │
│  - Generate 10-day forecast          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Component State Update              │
│  (useState, useEffect)               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  UI Rendering                        │
│  - Map markers update                │
│  - Popup display                     │
│  - Overlay update                    │
└──────────────────────────────────────┘
```

### 주요 컴포넌트

#### 1. EnhancedMapboxMap.tsx
**역할**: 메인 지도 컴포넌트
**기능**:
- Mapbox GL 초기화 및 관리
- 마커 렌더링 (저장된 스팟, 클릭 위치)
- 사용자 상호작용 처리 (클릭, 줌, 이동)
- 지도 컨트롤 추가 (줌, 지오로케이션, 측정)
- 날짜별 오버레이 표시

**의존성**:
- `mapbox-gl`: 지도 렌더링
- `mapbox-gl-geocoder`: 위치 검색
- `@turf/length`, `@turf/helpers`: 거리 측정

#### 2. DateSelector.tsx
**역할**: 10일 예보 날짜 선택기
**기능**:
- 오늘/내일 라벨 표시
- 스크롤 가능한 날짜 버튼
- 선택된 날짜 하이라이트
- 날짜 변경 시 부모에게 알림

#### 3. WindParticles.tsx
**역할**: Canvas 기반 바람 파티클 애니메이션
**기능**:
- 바람 방향 및 속도 시각화
- 성능 최적화 (requestAnimationFrame)
- 토글 on/off
- 지도 이동/줌 시 자동 재조정

#### 4. ForecastPopup.tsx
**역할**: 예보 데이터 팝업
**기능**:
- 10일 예보 데이터 표시
- 서핑 점수, 안전 점수 시각화
- 파고, 주기, 풍속, 기온 표시
- 저장 기능 (하트 버튼)

### 서비스 계층

#### openMeteoService.ts
**역할**: Open-Meteo API 클라이언트
**메서드**:
```typescript
- getMarineForecast(lat, lng): 해양 예보 (파고, 주기, 방향)
- getWeatherForecast(lat, lng): 기상 예보 (풍속, 풍향, 기온)
- getCombinedForecast(lat, lng): 통합 예보 데이터
```

#### mockForecastData.ts
**역할**: Mock 예보 데이터 생성
**메서드**:
```typescript
- generateMockForecast(lat, lng, days): 10일 mock 데이터 생성
- calculateSurfScore(wave, wind): 서핑 점수 계산 (1-5)
- calculateSafetyScore(wave, wind): 안전 점수 계산 (1-5)
```

#### mockAuth.ts
**역할**: Mock 인증 시스템
**메서드**:
```typescript
- login(username, password): 로그인 (testuser/testuser)
- logout(): 로그아웃
- isAuthenticated(): 인증 상태 확인
```

### 저장된 스팟 시스템

```
┌─────────────────────────────────────────┐
│          localStorage                   │
│  Key: "saved-spots"                     │
│  Value: SavedSpot[]                     │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  SavedSpot Interface                    │
│  {                                      │
│    id: string                           │
│    name: string                         │
│    lat: number                          │
│    lng: number                          │
│    addedAt: string                      │
│  }                                      │
└─────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Map Marker Rendering                   │
│  - Heart emoji (❤️) for saved spots    │
│  - Click to view forecast               │
│  - Right-click to remove                │
└─────────────────────────────────────────┘
```

**기본 저장된 스팟**:
1. Jukdo Beach (38.0765, 128.6234)
2. Songjeong Beach (35.1789, 129.2001)
3. Custom Spot 1 (37.5, 129.0)

### 예보 데이터 처리

#### Surf Score 계산 로직
```typescript
function calculateSurfScore(waveHeight, wavePeriod, windSpeed) {
  // 파고 점수 (0.5-2.5m = 좋음)
  const waveScore = waveHeight > 0.5 && waveHeight < 2.5 ? 5 : 3;

  // 주기 점수 (8-14초 = 좋음)
  const periodScore = wavePeriod >= 8 && wavePeriod <= 14 ? 5 : 3;

  // 풍속 점수 (<10m/s = 좋음)
  const windScore = windSpeed < 10 ? 5 : windSpeed < 15 ? 3 : 1;

  return Math.round((waveScore + periodScore + windScore) / 3);
}
```

#### Safety Score 계산 로직
```typescript
function calculateSafetyScore(waveHeight, windSpeed) {
  if (waveHeight > 3 || windSpeed > 15) return 1; // 위험
  if (waveHeight > 2 || windSpeed > 12) return 2; // 주의
  if (waveHeight > 1.5 || windSpeed > 10) return 3; // 보통
  if (waveHeight > 1 || windSpeed > 8) return 4; // 안전
  return 5; // 매우 안전
}
```

### 성능 최적화

#### 1. 데이터 캐싱
- Open-Meteo API 응답 캐싱 (5분 TTL)
- localStorage에 저장된 스팟 캐싱
- 컴포넌트 레벨 메모이제이션 (useMemo, useCallback)

#### 2. 렌더링 최적화
- WindParticles: requestAnimationFrame 사용
- 마커 클러스터링 (향후 구현 예정)
- 가상 스크롤 (긴 목록에 적용)

#### 3. 번들 크기 최적화
- Mapbox GL JS: CDN 사용 고려
- Tree-shaking: 사용하지 않는 모듈 제거
- Code splitting: 라우트별 분할

---

## 확장 계획

### Phase 2
- 소셜 로그인 (Google, Kakao)
- 실시간 파도 데이터 연동 (부표 데이터)
- 푸시 알림 (파도 조건 알림)
- 백엔드 API 연동 (저장된 스팟 동기화)

### Phase 3
- AI 추천 엔진 (사용자 레벨 기반)
- 모바일 앱 (React Native)
- 다국어 지원 확장
- 소셜 기능 (스팟 리뷰, 사진 공유)
