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
- Username: `testuser`
- Password: `password123`

---

## Common Response Model

모든 API 응답은 다음 형식을 따릅니다:

```json
{
  "result": "success" | "error",
  "error": null | { "code": "ERROR_CODE", "message": "Error message" },
  "data": { ... } | null
}
```

---

## Endpoints

### 사용자 등록 (Registration)

#### POST /register
사용자명 기반 회원가입

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

**Response** `200 OK`
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
    "created_at": "2026-02-04T12:00:00Z"
  }
}
```

**Error Codes**
| Code | Description |
|------|-------------|
| PASSWORD_MISMATCH | 비밀번호와 확인 비밀번호 불일치 |
| USERNAME_EXISTS | 이미 존재하는 사용자명 |
| CONSENT_REQUIRED | 개인정보 처리 동의 필요 |

---

### 인증 (Authentication)

#### POST /auth/login
로그인 및 토큰 발급

**Request**
```json
{
  "username": "surferlove",
  "password": "anypassword"
}
```

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "user_id": 1,
      "username": "surferlove",
      "user_level": "beginner",
      "privacy_consent_yn": true,
      "last_login_dt": "2026-02-04T12:00:00Z",
      "created_at": "2026-02-04T12:00:00Z"
    }
  }
}
```

**Error Codes**
| Code | Description |
|------|-------------|
| INVALID_CREDENTIALS | 사용자명 또는 비밀번호 불일치 |

---

#### POST /auth/refresh
토큰 갱신

**Request**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

---

#### GET /auth/me 🔒
현재 로그인한 사용자 정보 조회

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "user_id": 1,
    "username": "surferlove",
    "user_level": "beginner",
    "privacy_consent_yn": true,
    "last_login_dt": "2026-02-04T12:00:00Z",
    "created_at": "2026-02-04T12:00:00Z"
  }
}
```

---

#### POST /auth/logout 🔒
로그아웃

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": null
}
```

---

### 저장된 스팟 (Saved Spots) - DynamoDB

#### GET /saved 🔒
저장된 스팟 목록 조회 (캐시 우선, DynamoDB 폴백)

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "items": [
      {
        "user_id": "1",
        "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z",
        "location_id": "33.44#-94.04",
        "surf_timestamp": "2026-01-28T06:00:00Z",
        "saved_at": "2026-01-28T06:10:00Z",
        "departure_date": "2026-01-28",
        "address": "Surfing Beach, California",
        "region": "California",
        "country": "USA",
        "wave_height": 1.5,
        "wave_period": 8.5,
        "wind_speed": 12.0,
        "water_temperature": 18.5,
        "surfer_level": "intermediate",
        "surf_score": 85.5,
        "surf_grade": "A",
        "flag_change": false,
        "change_message": null,
        "feedback_status": "POSITIVE"
      }
    ],
    "total": 1
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| feedback_status | string \| null | 피드백 상태 (POSITIVE / NEGATIVE / DEFERRED / null). 피드백을 제출한 경우 해당 값이 반환됨. |
```

---

#### POST /saved 🔒
스팟 저장

**Request**
```json
{
  "location_id": "33.44#-94.04",
  "surf_timestamp": "2026-01-28T06:00:00Z",
  "departure_date": "2026-01-28",
  "address": "Surfing Beach, California",
  "region": "California",
  "country": "USA",
  "wave_height": 1.5,
  "wave_period": 8.5,
  "wind_speed": 12.0,
  "water_temperature": 18.5,
  "surfer_level": "intermediate",
  "surf_score": 85.5,
  "surf_grade": "A"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| location_id | string | ✅ | 위치 ID (lat#lng 형식) |
| surf_timestamp | string | ✅ | 서핑 데이터 타임스탬프 |
| surfer_level | string | ✅ | 서퍼 레벨 |
| surf_score | float | ✅ | 서핑 점수 (0-100) |
| surf_grade | string | ✅ | 서핑 등급 (A, B, C 등) |
| departure_date | string | ❌ | 출발 예정일 |
| address | string | ❌ | 주소 |
| region | string | ❌ | 지역 |
| country | string | ❌ | 국가 |
| wave_height | float | ❌ | 파고 (m) |
| wave_period | float | ❌ | 파주기 (s) |
| wind_speed | float | ❌ | 풍속 (m/s) |
| water_temperature | float | ❌ | 수온 (°C) |

**Response** `201 Created`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "user_id": "1",
    "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z",
    ...
  }
}
```

**Error Codes**
| Code | Description |
|------|-------------|
| ALREADY_SAVED | 이미 저장된 스팟 |
| SAVE_FAILED | 저장 실패 |

---

#### DELETE /saved 🔒
저장된 스팟 삭제

**Request**
```json
{
  "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z"
}
```

또는

```json
{
  "location_id": "33.44#-94.04",
  "surf_timestamp": "2026-01-28T06:00:00Z"
}
```

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": null
}
```

---

#### GET /saved/{location_id}/{surf_timestamp} 🔒
특정 저장된 스팟 조회

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "user_id": "1",
    "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z",
    ...
  }
}
```

---

#### POST /saved/acknowledge-change 🔒
변경 알림 확인 처리

**Request**
```json
{
  "location_surf_key": "33.44#-94.04#2026-01-28T06:00:00Z"
}
```

또는

```json
{
  "location_id": "33.44#-94.04",
  "surf_timestamp": "2026-01-28T06:00:00Z"
}
```

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": null
}
```

**Description**
- DynamoDB에서 해당 아이템의 `flagChange`를 `false`로 설정
- `changeMessage` 속성 제거
- 캐시 무효화

---

### 피드백 (Feedback) - PostgreSQL

#### POST /feedback/saved-item 🔒
저장된 스팟에 대한 피드백 제출

**Request**
```json
{
  "location_id": "33.44#-94.04",
  "surf_timestamp": "2026-01-28T06:00:00Z",
  "feedback_status": "POSITIVE"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| location_id | string | ✅ | 위치 ID |
| surf_timestamp | string | ✅ | 서핑 데이터 타임스탬프 |
| feedback_status | string | ✅ | POSITIVE / NEGATIVE / DEFERRED |

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "id": 1,
    "user_id": 1,
    "location_id": "33.44#-94.04",
    "surf_timestamp": "2026-01-28T06:00:00Z",
    "feedback_result": true,
    "feedback_status": "POSITIVE",
    "created_at": "2026-02-07T12:00:00Z"
  }
}
```

---

#### GET /feedback/saved-item/{location_id}/{surf_timestamp} 🔒
저장된 스팟에 대한 피드백 조회

**Response** `200 OK`
```json
{
  "result": "success",
  "error": null,
  "data": {
    "id": 1,
    "user_id": 1,
    "location_id": "33.44#-94.04",
    "surf_timestamp": "2026-01-28T06:00:00Z",
    "feedback_result": true,
    "feedback_status": "POSITIVE",
    "created_at": "2026-02-07T12:00:00Z"
  }
}
```

---

## 데이터 저장소

| 데이터 | 저장소 | 설명 |
|--------|--------|------|
| 사용자 정보 | PostgreSQL | users 테이블 |
| 피드백 | PostgreSQL | feedback 테이블 |
| 저장된 스팟 | DynamoDB | saved_list 테이블 |
| 캐시 | Redis/Valkey | 저장된 스팟 캐싱 (TTL: 1시간) |

### DynamoDB Schema (saved_list)
- **Partition Key**: UserId (String)
- **Sort Key**: SortKey (String) - `{lat}#{lng}#{timestamp}` 형식

### PostgreSQL Schema (feedback)
```sql
CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    location_id VARCHAR(100) NOT NULL,
    surf_timestamp VARCHAR(50) NOT NULL,
    feedback_result BOOLEAN,
    feedback_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

---

## 공통 에러 응답

```json
{
  "result": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  },
  "data": null
}
```

| HTTP Code | Description |
|-----------|-------------|
| 400 | 잘못된 요청 |
| 401 | 인증 필요 / 토큰 만료 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 422 | 유효성 검사 실패 |
| 500 | 서버 오류 |

---

---

### 외부 API 통합 (External APIs)

#### Open-Meteo Marine Forecast API
AWAVES는 파도 및 해양 데이터를 위해 Open-Meteo Marine Forecast API를 사용합니다.

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
    "time": ["2026-02-04", "2026-02-05"],
    "wave_height_max": [1.2, 1.5],
    "wave_period_max": [8, 9],
    "wave_direction_dominant": [180, 185],
    "wind_wave_height_max": [1.0, 1.2]
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
    "time": ["2026-02-04", "2026-02-05"],
    "temperature_2m_max": [15, 16],
    "temperature_2m_min": [8, 9],
    "wind_speed_10m_max": [12, 15],
    "wind_direction_10m_dominant": [270, 280]
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

## 캐시 전략

### 저장된 스팟 (Saved Items)
- **Key Pattern**: `awaves:saved:{user_id}`
- **TTL**: 3600초 (1시간)
- **무효화 시점**: 저장, 삭제, 변경 확인 시

---

## Rate Limiting

TODO: 구현 예정
- 인증된 사용자: 100 req/min
- 비인증 사용자: 20 req/min

**Open-Meteo API Rate Limits**
- 무료 사용자: 10,000 requests/day
- API 키 불필요 (비상업용 사용)
