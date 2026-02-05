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

| Email | Password | 설명 |
|-------|----------|------|
| test@example.com | password123 | 기본 테스트 계정 |
| demo@awaves.com | password123 | 데모 계정 |
| surfer@korea.com | password123 | 한국어 설정 계정 |

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
