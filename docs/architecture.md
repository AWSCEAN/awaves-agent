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
| Auth | JWT | - | 인증 토큰 |
| Monorepo | pnpm + Turborepo | - | 패키지 관리 |

## 시스템 구성도

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Next.js    │────▶│  FastAPI    │
│   (User)    │     │  Frontend   │     │  Backend    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                           │                    │
                           │                    ▼
                    ┌──────▼──────┐     ┌─────────────┐
                    │   Mapbox    │     │ PostgreSQL  │
                    │   API       │     │  (Neon)     │
                    └─────────────┘     └─────────────┘
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
│   │   │   └── ...
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
│       │   │   ├── saved.py      # 저장된 스팟
│       │   │   └── feedback.py   # 피드백
│       │   ├── schemas/          # Pydantic 스키마
│       │   ├── models/           # SQLAlchemy 모델
│       │   ├── services/         # 비즈니스 로직
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
| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/login` | 로그인 |
| `/register` | 회원가입 |
| `/map` | 지도 (메인 기능) |
| `/saved` | 저장된 스팟 목록 |
| `/mypage` | 프로필 및 설정 |

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
| `/saved` | GET/POST | 저장된 스팟 |
| `/feedback` | POST | 피드백 제출 |

## 데이터 흐름

### 인증 플로우
```
1. 사용자 로그인 요청
2. 백엔드에서 자격증명 검증
3. JWT 토큰 발급 (access + refresh)
4. 프론트엔드에서 localStorage에 저장
5. API 요청 시 Authorization 헤더에 토큰 포함
6. 백엔드에서 토큰 검증 후 응답
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

## 확장 계획

### Phase 2
- 소셜 로그인 (Google, Kakao)
- 실시간 파도 데이터 연동
- 푸시 알림

### Phase 3
- AI 추천 엔진
- 모바일 앱 (React Native)
- 다국어 지원 확장
