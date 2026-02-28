# API 명세서

## Base URL

| 환경 | URL |
|------|-----|
| Development | `http://localhost:8001` |
| Production | `https://api.awaves.com` (예정) |

## 인증

Bearer Token 방식을 사용합니다.

```
Authorization: Bearer {access_token}
```

### 테스트 계정
- Email: `test@example.com`
- Password: `password123`

---

## Endpoints

### 사용자 등록 V2 (Registration V2)

#### POST /register
사용자명 기반 회원가입 (다단계 UI 지원)

**Request**
```json
{
  "username": "surferlove",
  "password": "anypassword",
  "confirm_password": "anypassword",
  "user_level": "beginner",
  "privacy_consent_yn": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | ✅ | 사용자명 (2-50자) |
| password | string | ✅ | 비밀번호 (제한 없음) |
| confirm_password | string | ✅ | 비밀번호 확인 |
| user_level | string | ✅ | 서핑 레벨 (beginner/intermediate/advanced) |
| privacy_consent_yn | boolean | ✅ | 개인정보 처리 동의 |

**User Level Descriptions**
| Level | Description |
|-------|-------------|
| beginner | 서핑 초보자 또는 파도 위에 올라서기 어려운 분 |
| intermediate | 보드 위에서 균형을 유지하고 긴 라이딩이 가능한 분 |
| advanced | 강한 파도를 타고 다양한 퍼포먼스 기술 구사 가능한 분 |

**Response** `200 OK` (Common Response Model)
```json
{
  "result": "success",
  "error": null,
  "data": {
    "user_id": 1,
    "username": "surferlove",
    "user_level": "beginner",
    "privacy_consent_yn": true,
    "last_login_dt": null,
    "created_at": "2024-02-04T12:00:00Z"
  }
}
```

**Error Response**
```json
{
  "result": "error",
  "error": {
    "code": "USERNAME_EXISTS",
    "message": "Username already exists"
  },
  "data": null
}
```

| Error Code | Description |
|------------|-------------|
| PASSWORD_MISMATCH | 비밀번호와 확인 비밀번호 불일치 |
| USERNAME_EXISTS | 이미 존재하는 사용자명 |
| CONSENT_REQUIRED | 개인정보 처리 동의 필요 |

**Example**
```bash
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "surferlove",
    "password": "mypassword",
    "confirm_password": "mypassword",
    "user_level": "beginner",
    "privacy_consent_yn": true
  }'
```

---

### 인증 (Authentication)

#### POST /auth/register
사용자 등록

**Request**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "nickname": "홍길동",
  "preferred_language": "ko"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | ✅ | 이메일 주소 |
| password | string | ✅ | 비밀번호 (8자 이상) |
| nickname | string | ✅ | 닉네임 (2-50자) |
| preferred_language | string | ❌ | 언어 설정 (ko/en, 기본: en) |

**Response** `201 Created`
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "nickname": "홍길동",
  "preferred_language": "ko",
  "profile_image_url": null,
  "created_at": "2024-02-04T12:00:00Z"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 400 | 이메일 중복 또는 유효성 검사 실패 |
| 422 | 요청 형식 오류 |

---

#### POST /auth/login
로그인 및 토큰 발급

**Request**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

| Field | Description |
|-------|-------------|
| access_token | API 요청 시 사용 (30분 유효) |
| refresh_token | 토큰 갱신 시 사용 (7일 유효) |
| expires_in | access_token 만료 시간 (초) |

**Errors**
| Code | Description |
|------|-------------|
| 401 | 이메일 또는 비밀번호 불일치 |

**Example**
```bash
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

---

#### GET /auth/me
현재 로그인한 사용자 정보 조회 🔒

**Headers**
```
Authorization: Bearer {access_token}
```

**Response** `200 OK`
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "nickname": "홍길동",
  "preferred_language": "ko",
  "profile_image_url": null,
  "created_at": "2024-02-04T12:00:00Z"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 401 | 토큰 없음 또는 만료 |

---

### 서핑 스팟 (Surf Spots)

#### GET /surf/spots
서핑 스팟 목록 조회

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| region | string | 지역 필터 (예: Yangyang) |
| difficulty | string | 난이도 필터 (beginner/intermediate/advanced/expert) |
| min_wave_height | float | 최소 파고 (m) |
| max_wave_height | float | 최대 파고 (m) |
| page | int | 페이지 번호 (기본: 1) |
| page_size | int | 페이지 크기 (기본: 20, 최대: 100) |

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "kr-yangyang-jukdo",
      "name": "Jukdo Beach",
      "name_ko": "죽도해변",
      "latitude": 38.0765,
      "longitude": 128.6234,
      "region": "Yangyang",
      "country": "South Korea",
      "difficulty": "beginner",
      "wave_type": "Beach Break",
      "best_season": ["summer", "fall"],
      "current_conditions": {
        "wave_height": 1.2,
        "wave_height_max": 1.5,
        "wave_period": 8,
        "wind_speed": 12,
        "water_temperature": 22,
        "tide": "mid",
        "rating": 4
      }
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "has_more": true
}
```

---

#### GET /surf/spots/{spot_id}
특정 서핑 스팟 상세 조회

**Response** `200 OK`
```json
{
  "id": "kr-yangyang-jukdo",
  "name": "Jukdo Beach",
  "name_ko": "죽도해변",
  "latitude": 38.0765,
  "longitude": 128.6234,
  "region": "Yangyang",
  "country": "South Korea",
  "difficulty": "beginner",
  "wave_type": "Beach Break",
  "best_season": ["summer", "fall"],
  "description": "Popular surf spot for beginners",
  "description_ko": "초보자에게 인기 있는 서핑 스팟",
  "current_conditions": { ... }
}
```

**Errors**
| Code | Description |
|------|-------------|
| 404 | 스팟을 찾을 수 없음 |

---

#### GET /surf/spots/all
전체 서핑 스팟 목록 조회 (페이지네이션 없음, 맵 표시용)

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| date | string | ❌ | - | 날짜 필터 (YYYY-MM-DD 형식, 예: "2026-02-28") |
| time | string | ❌ | - | 시간 슬롯 필터 (HH:MM 형식, 예: "03:00")<br/>**3시간 범위를 반환**: 선택한 시각부터 3시간 동안의 데이터<br/>• 예: `time="03:00"` → 03:00, 04:00, 05:00 시각의 데이터 반환<br/>• 표준 슬롯: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00<br/>• 주의: `time="21:00"` → 21:00, 22:00, 23:00 (다음 날 00:00으로 넘어가지 않음)<br/>• 생략 시 해당 날짜의 모든 시각 데이터 반환 |

**Response** `200 OK`
```json
[
  {
    "locationId": "38.0765#128.6234",
    "surfTimestamp": "2026-02-28T03:00:00Z",
    "geo": { "lat": 38.0765, "lng": 128.6234 },
    "conditions": {
      "waveHeight": 1.2,
      "wavePeriod": 8.0,
      "windSpeed": 12.0,
      "waterTemperature": 22.0
    },
    "derivedMetrics": {
      "BEGINNER": { "surfScore": 75.0, "surfGrade": "B" },
      "INTERMEDIATE": { "surfScore": 65.0, "surfGrade": "C" },
      "ADVANCED": { "surfScore": 55.0, "surfGrade": "D" }
    },
    "metadata": {
      "modelVersion": "sagemaker-awaves-v1.2",
      "dataSource": "open-meteo",
      "predictionType": "FORECAST",
      "createdAt": "2026-02-28T00:00:00Z"
    }
  }
]
```

**Example**
```bash
# 특정 날짜의 모든 스팟
curl "http://localhost:8001/surf/spots/all?date=2026-02-28"

# 특정 날짜 + 시간 슬롯 (3시간 범위)
curl "http://localhost:8001/surf/spots/all?date=2026-02-28&time=03:00"
```

---

#### GET /surf/nearby
좌표 기반 인근 서핑 스팟 조회

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| lat | float | ✅ | - | 위도 (예: 38.0765) |
| lng | float | ✅ | - | 경도 (예: 128.6234) |
| limit | int | ❌ | 25 | 최대 결과 수 |
| date | string | ❌ | - | 날짜 필터 (YYYY-MM-DD 형식, 예: "2026-02-28") |
| time | string | ❌ | - | 시간 슬롯 필터 (HH:MM 형식, 예: "03:00")<br/>**3시간 범위를 반환**: 선택한 시각부터 3시간 동안의 데이터<br/>• 예: `time="03:00"` → 03:00, 04:00, 05:00 시각의 데이터 반환<br/>• 표준 슬롯: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00<br/>• 주의: `time="21:00"` → 21:00, 22:00, 23:00 (다음 날 00:00으로 넘어가지 않음)<br/>• 생략 시 해당 날짜의 모든 시각 데이터 반환 |

**Response** `200 OK`
```json
[
  {
    "locationId": "38.0765#128.6234",
    "surfTimestamp": "2026-02-28T03:00:00Z",
    "geo": { "lat": 38.0765, "lng": 128.6234 },
    "conditions": { ... },
    "derivedMetrics": { ... },
    "metadata": { ... }
  }
]
```

**Example**
```bash
# 좌표 기반 인근 스팟 조회
curl "http://localhost:8001/surf/nearby?lat=38.0765&lng=128.6234&limit=25"

# 특정 날짜 + 시간 슬롯 필터
curl "http://localhost:8001/surf/nearby?lat=38.0765&lng=128.6234&date=2026-02-28&time=03:00"
```

---

#### GET /surf/search (Deprecated)
> ⚠️ 좌표 기반 부분 문자열 검색. `/search` 엔드포인트로 대체됨.

---

### 위치 키워드 검색 (Location Search - OpenSearch)

#### GET /search
OpenSearch를 사용한 위치 키워드 검색

**Query Parameters**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| q | string | ✅ | - | 검색 키워드 (도시명, 국가명, 장소명 등) |
| size | int | ❌ | 50 | 최대 결과 수 (1-100) |
| date | string | ❌ | - | 날짜 필터 (YYYY-MM-DD 형식, 예: "2026-02-28") |
| time | string | ❌ | - | 시간 슬롯 필터 (HH:MM 형식, 예: "03:00")<br/>**3시간 범위를 반환**: 선택한 시각부터 3시간 동안의 데이터<br/>• 예: `time="03:00"` → 03:00, 04:00, 05:00 시각의 데이터 반환<br/>• 표준 슬롯: 00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00<br/>• 주의: `time="21:00"` → 21:00, 22:00, 23:00 (다음 날 00:00으로 넘어가지 않음)<br/>• 생략 시 해당 날짜의 모든 시각 데이터 반환 |
| surfer_level | string | ❌ | - | 서퍼 레벨 필터 (BEGINNER/INTERMEDIATE/ADVANCED) |
| language | string | ❌ | ko | 응답 언어 (ko/en) |

**검색 대상 필드**
| Field | Weight | Type |
|-------|--------|------|
| display_name | x3 | text (full-text) |
| city | x2 | text (full-text) |
| state | x1 | keyword |
| country | x1 | keyword |

**Response** `200 OK`
```json
[
  {
    "LocationId": "41.6354#-70.2911",
    "SurfTimestamp": "2026-02-11T06:00:00Z",
    "geo": { "lat": 41.6354, "lng": -70.2911 },
    "conditions": {
      "waveHeight": 1.5,
      "wavePeriod": 8.0,
      "windSpeed": 12.0,
      "waterTemperature": 15.0
    },
    "derivedMetrics": {
      "surfScore": 65.0,
      "surfGrade": "B",
      "surfingLevel": "INTERMEDIATE"
    },
    "metadata": {
      "modelVersion": "sagemaker-awaves-v1.2",
      "dataSource": "open-meteo",
      "predictionType": "FORECAST",
      "createdAt": "2026-02-11T00:00:00Z"
    },
    "name": "Keating Road, Hyannis, Barnstable...",
    "region": "Massachusetts",
    "country": "United States",
    "address": "Keating Road, Hyannis, Barnstable...",
    "difficulty": "intermediate",
    "waveType": "Beach Break",
    "bestSeason": []
  }
]
```

**검색 흐름**
```
키워드 입력 → OpenSearch multi_match 검색
         → locationId 추출 (OpenSearch 문서에서 직접)
         → Redis 캐시 확인 (awaves:surf:latest:{locationId})
         → 캐시 미스 시 DynamoDB surf_info 조회
         → 결과 반환
```

**Error Responses**
| Code | Description |
|------|-------------|
| 422 | 유효하지 않은 쿼리 파라미터 |
| 503 | OpenSearch 서비스 불가 |

**Example**
```bash
# 키워드로 검색
curl "http://localhost:8001/search?q=Australia"

# 결과 수 제한
curl "http://localhost:8001/search?q=Bondi&size=10"
```

---

### 저장된 스팟 (Saved Spots)

#### GET /saved 🔒
저장된 스팟 목록 조회

**Response** `200 OK`
```json
[
  {
    "id": "saved-uuid",
    "user_id": "user-uuid",
    "spot_id": "kr-yangyang-jukdo",
    "notes": "다음에 꼭 가보기",
    "saved_at": "2024-02-04T12:00:00Z"
  }
]
```

---

#### POST /saved 🔒
스팟 저장

**Request**
```json
{
  "spot_id": "kr-yangyang-jukdo",
  "notes": "다음에 꼭 가보기"
}
```

**Response** `201 Created`
```json
{
  "id": "saved-uuid",
  "user_id": "user-uuid",
  "spot_id": "kr-yangyang-jukdo",
  "notes": "다음에 꼭 가보기",
  "saved_at": "2024-02-04T12:00:00Z"
}
```

**Errors**
| Code | Description |
|------|-------------|
| 400 | 이미 저장된 스팟 |

---

#### DELETE /saved/{saved_id} 🔒
저장된 스팟 삭제

**Response** `204 No Content`

**Errors**
| Code | Description |
|------|-------------|
| 404 | 저장된 스팟을 찾을 수 없음 |

---

### 피드백 (Feedback)

#### POST /feedback
피드백 제출 (인증 선택)

**Request**
```json
{
  "spot_id": "kr-yangyang-jukdo",
  "type": "data_correction",
  "message": "파도 높이 정보가 실제와 다릅니다."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| spot_id | string | ❌ | 관련 스팟 ID |
| type | string | ✅ | bug / feature / data_correction / general |
| message | string | ✅ | 피드백 내용 (10-2000자) |

**Response** `201 Created`
```json
{
  "id": "feedback-uuid",
  "user_id": "user-uuid 또는 anonymous",
  "spot_id": "kr-yangyang-jukdo",
  "type": "data_correction",
  "message": "파도 높이 정보가 실제와 다릅니다.",
  "created_at": "2024-02-04T12:00:00Z"
}
```

---

## 공통 에러 응답

```json
{
  "detail": "에러 메시지"
}
```

| Code | Description |
|------|-------------|
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 422 | 유효성 검사 실패 |
| 500 | 서버 오류 |

---

---

### 외부 API 통합 (External APIs)

#### Open-Meteo Marine Forecast API
awaves는 파도 및 해양 데이터를 위해 Open-Meteo Marine Forecast API를 사용합니다.

**Endpoint**
```
GET https://marine-api.open-meteo.com/v1/marine
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| latitude | float | 위도 |
| longitude | float | 경도 |
| daily | string | 일별 데이터 변수 (쉼표로 구분) |
| timezone | string | 타임존 (예: Asia/Seoul) |

**Daily Variables**
- `wave_height_max`: 최대 파고 (m)
- `wave_period_max`: 최대 파도 주기 (초)
- `wave_direction_dominant`: 지배적인 파도 방향 (도)
- `wind_wave_height_max`: 최대 풍랑 높이 (m)

**Example Request**
```bash
curl "https://marine-api.open-meteo.com/v1/marine?latitude=38.0765&longitude=128.6234&daily=wave_height_max,wave_period_max,wave_direction_dominant,wind_wave_height_max&timezone=Asia/Seoul"
```

**Example Response**
```json
{
  "latitude": 38.0765,
  "longitude": 128.6234,
  "daily": {
    "time": ["2026-02-04", "2026-02-05", ...],
    "wave_height_max": [1.2, 1.5, 1.8, ...],
    "wave_period_max": [8, 9, 10, ...],
    "wave_direction_dominant": [180, 185, 175, ...],
    "wind_wave_height_max": [1.0, 1.2, 1.5, ...]
  }
}
```

---

#### Open-Meteo Weather Forecast API
바람 및 기상 데이터를 위해 Open-Meteo Weather Forecast API를 사용합니다.

**Endpoint**
```
GET https://api.open-meteo.com/v1/forecast
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| latitude | float | 위도 |
| longitude | float | 경도 |
| daily | string | 일별 데이터 변수 (쉼표로 구분) |
| timezone | string | 타임존 (예: Asia/Seoul) |

**Daily Variables**
- `temperature_2m_max`: 최대 기온 (°C)
- `temperature_2m_min`: 최소 기온 (°C)
- `wind_speed_10m_max`: 최대 풍속 (m/s)
- `wind_direction_10m_dominant`: 지배적인 풍향 (도)

**Example Request**
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=38.0765&longitude=128.6234&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant&timezone=Asia/Seoul"
```

**Example Response**
```json
{
  "latitude": 38.0765,
  "longitude": 128.6234,
  "daily": {
    "time": ["2026-02-04", "2026-02-05", ...],
    "temperature_2m_max": [15, 16, 14, ...],
    "temperature_2m_min": [8, 9, 7, ...],
    "wind_speed_10m_max": [12, 15, 10, ...],
    "wind_direction_10m_dominant": [270, 280, 260, ...]
  }
}
```

---

### Forecast Data Structure

프론트엔드에서 사용하는 예보 데이터 구조:

```typescript
interface ForecastDay {
  date: string;              // ISO 8601 형식 (예: "2026-02-04")
  waveHeight: number;        // 파고 (m)
  wavePeriod: number;        // 파도 주기 (초)
  waveDirection: number;     // 파도 방향 (도)
  windSpeed: number;         // 풍속 (m/s)
  windDirection: number;     // 풍향 (도)
  temperature: number;       // 기온 (°C)
  surfScore: number;         // 서핑 점수 (1-5)
  safetyScore: number;       // 안전 점수 (1-5)
}

interface ForecastData {
  location: {
    lat: number;
    lng: number;
    name?: string;
  };
  days: ForecastDay[];
}
```

**Scoring Logic**
- `surfScore`: 파고, 주기, 풍속을 기반으로 계산 (1=나쁨, 5=최고)
- `safetyScore`: 파고, 풍속을 기반으로 계산 (1=위험, 5=안전)

---

## Rate Limiting

TODO: 구현 예정
- 인증된 사용자: 100 req/min
- 비인증 사용자: 20 req/min

**Open-Meteo API Rate Limits**
- 무료 사용자: 10,000 requests/day
- API 키 불필요 (비상업용 사용)
