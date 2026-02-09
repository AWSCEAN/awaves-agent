# 개발 환경 설정 가이드

## 필수 요구사항

| 도구 | 버전 | 설치 확인 |
|------|------|----------|
| Node.js | 18+ | `node --version` |
| pnpm | 9+ | `pnpm --version` |
| Python | 3.11+ | `python --version` |
| Git | 2.40+ | `git --version` |

## 초기 설정

### 1. 레포지토리 클론

```bash
git clone https://github.com/your-org/awaves-agent.git
cd awaves-agent
```

### 2. 의존성 설치

```bash
# Node.js 패키지 설치 (pnpm workspaces)
pnpm install

# Python 패키지 설치
cd apps/api
pip install -e .
cd ../..
```

### 3. 환경 변수 설정

#### Frontend (.env.local)
`apps/web/.env.local` 파일 생성:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
NEXT_PUBLIC_API_URL=http://localhost:8001
```

#### Backend (.env)
`apps/api/.env` 파일 생성:

```env
# Environment
ENV=local
DEBUG=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/awaves

# Redis (선택)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003
```

## 개발 서버 실행

### 방법 1: 개별 실행

```bash
# Terminal 1 - Frontend
pnpm --filter web dev

# Terminal 2 - Backend
cd apps/api
uvicorn app.main:app --reload
```

### 방법 2: Turbo 사용 (전체 실행)

```bash
pnpm dev
```

## 접속 URL

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| API Docs (Swagger) | http://localhost:8001/docs |
| API Docs (ReDoc) | http://localhost:8001/redoc |

## 테스트 계정

| Type | Username/Email | Password | 설명 |
|------|----------------|----------|------|
| Mock Auth | testuser | testuser | 지도 페이지 Mock 인증 |
| Email Auth | test@example.com | password123 | 기본 테스트 계정 |
| Email Auth | demo@awaves.com | password123 | 데모 계정 |
| Email Auth | surfer@korea.com | password123 | 한국어 설정 계정 |

## 유용한 명령어

### 모노레포 관리

```bash
# 모든 패키지 의존성 설치
pnpm install

# 특정 앱만 실행
pnpm --filter web dev
pnpm --filter web build

# 모든 앱 빌드
pnpm build

# 캐시 정리
pnpm clean
```

### Frontend (Next.js)

```bash
cd apps/web

# 개발 서버
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버
pnpm start

# 린트 검사
pnpm lint
```

### Backend (FastAPI)

```bash
cd apps/api

# 개발 서버 (자동 리로드)
uvicorn app.main:app --reload

# 특정 포트 지정
uvicorn app.main:app --reload --port 8001

# 테스트 실행
pytest

# 타입 체크
mypy app

# 코드 포맷팅
black app
ruff check app
```

### API 테스트

```bash
# 헬스 체크
curl http://localhost:8001/health

# 로그인
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 인증이 필요한 API (토큰 사용)
curl http://localhost:8001/auth/me \
  -H "Authorization: Bearer {your-token}"
```

## IDE 설정

### VS Code / Cursor 추천 익스텐션

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-python.python",
    "ms-python.vscode-pylance",
    "charliermarsh.ruff"
  ]
}
```

### settings.json

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  "python.analysis.typeCheckingMode": "basic"
}
```

## 지도 기능 테스트

### 기본 기능 테스트

#### 1. 지도 로드 확인
```bash
# Frontend 실행
cd apps/web
pnpm dev

# 브라우저에서 접속
# http://localhost:3000/map

# 확인 사항:
# ✅ 지도가 한국 중심으로 표시됨
# ✅ 저장된 스팟 마커(❤️) 3개 표시
# ✅ 줌, 이동 컨트롤 동작
# ✅ 지오로케이션 버튼 동작
```

#### 2. 날짜 선택기 테스트
```
1. 날짜 버튼 클릭
2. Today/Tomorrow 라벨 확인
3. 선택된 날짜 하이라이트 확인
4. 지도 오버레이 변경 확인
```

#### 3. 예보 팝업 테스트
```
1. 지도의 임의 위치 클릭
2. 로딩 표시 확인
3. 예보 팝업 표시 확인:
   - 10일 예보 데이터
   - 서핑 점수 (1-5 점)
   - 안전 점수 (1-5 점)
   - 파고, 주기, 풍속, 기온
4. 하트 버튼으로 저장 기능 테스트
```

#### 4. 바람 파티클 테스트
```
1. Wind Particles 토글 버튼 클릭
2. 바람 애니메이션 표시/숨김 확인
3. 지도 이동 시 파티클 위치 조정 확인
```

#### 5. 거리 측정 테스트
```
1. Measure Distance 버튼 클릭
2. 지도에 두 개 이상의 포인트 클릭
3. 거리(km) 표시 확인
4. Clear 버튼으로 측정 삭제 확인
```

#### 6. 위치 검색 테스트
```
1. 검색창에 "Seoul" 입력
2. 자동완성 목록 표시 확인
3. 결과 선택 시 지도 이동 확인
```

#### 7. 저장된 스팟 테스트
```
1. 하트 마커(❤️) 클릭
2. 해당 위치의 예보 팝업 표시 확인
3. localStorage 확인:
   localStorage.getItem('saved-spots')
```

### Open-Meteo API 테스트

#### Marine Forecast API
```bash
curl "https://marine-api.open-meteo.com/v1/marine?latitude=38.0765&longitude=128.6234&daily=wave_height_max,wave_period_max,wave_direction_dominant&timezone=Asia/Seoul"
```

**예상 응답**:
- Status: 200 OK
- daily.wave_height_max: 배열 (10일)
- daily.wave_period_max: 배열 (10일)
- daily.wave_direction_dominant: 배열 (10일)

#### Weather Forecast API
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=38.0765&longitude=128.6234&daily=temperature_2m_max,wind_speed_10m_max&timezone=Asia/Seoul"
```

**예상 응답**:
- Status: 200 OK
- daily.temperature_2m_max: 배열 (10일)
- daily.wind_speed_10m_max: 배열 (10일)

### 일반적인 문제 해결

#### Mapbox 토큰 오류
```
Error: Invalid Mapbox token
```
**해결책**:
1. `.env.local` 파일 확인
2. 토큰이 `pk.`로 시작하는지 확인
3. 서버 재시작 (`pnpm dev`)

#### CORS 오류 (Open-Meteo)
```
CORS policy: No 'Access-Control-Allow-Origin' header
```
**해결책**:
- Open-Meteo는 CORS를 허용하므로 이 오류는 발생하지 않아야 함
- 네트워크 연결 확인
- 브라우저 캐시 삭제

#### 지도가 표시되지 않음
```
Map container not found
```
**해결책**:
1. `mapbox-gl` CSS import 확인
2. 컨테이너 div의 높이 설정 확인 (`h-screen`)
3. 브라우저 콘솔에서 에러 확인

#### 저장된 스팟이 표시되지 않음
**해결책**:
1. localStorage 확인:
   ```javascript
   localStorage.getItem('saved-spots')
   ```
2. 기본 스팟 추가:
   ```javascript
   localStorage.setItem('saved-spots', JSON.stringify([
     {id: '1', name: 'Jukdo Beach', lat: 38.0765, lng: 128.6234, addedAt: new Date().toISOString()}
   ]))
   ```
3. 페이지 새로고침

---

## 문제 해결

### Port 충돌

```bash
# 사용 중인 포트 확인 (Windows)
netstat -ano | findstr :3000
netstat -ano | findstr :8001

# 프로세스 종료 (Windows)
taskkill /PID {PID} /F
```

### pnpm 설치 오류

```bash
# pnpm 재설치
npm install -g pnpm

# store 정리
pnpm store prune
```

### Python 모듈 오류

```bash
# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 패키지 재설치
pip install -e .
```

## Git 워크플로우

### 브랜치 전략

```
main            # 프로덕션
├── develop     # 개발 통합
    ├── feature/ACE-XX-description  # 기능 개발
    ├── bugfix/ACE-XX-description   # 버그 수정
    └── hotfix/ACE-XX-description   # 긴급 수정
```

### 커밋 메시지 컨벤션

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 변경
style: 코드 포맷팅
refactor: 리팩토링
test: 테스트 추가/수정
chore: 빌드, 설정 변경
```

### PR 체크리스트

- [ ] Review Agent 통과
- [ ] QA Agent 테스트 통과
- [ ] Docs Agent로 문서 업데이트
- [ ] 린트 오류 없음
- [ ] 빌드 성공
