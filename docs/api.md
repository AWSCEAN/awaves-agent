# API 명세서

## Base URL

| 환경 | URL |
|------|-----|
| Development | `http://localhost:8000` |
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
curl -X POST http://localhost:8000/register \
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
curl -X POST http://localhost:8000/auth/login \
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

#### GET /surf/search
서핑 스팟 검색

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | ✅ | 검색어 (스팟명, 지역) |

**Response** `200 OK`
```json
[
  {
    "id": "kr-yangyang-jukdo",
    "name": "Jukdo Beach",
    "region": "Yangyang",
    ...
  }
]
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

## Rate Limiting

TODO: 구현 예정
- 인증된 사용자: 100 req/min
- 비인증 사용자: 20 req/min
