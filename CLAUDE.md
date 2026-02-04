# AWAVES Project - Claude Code Configuration

이 프로젝트는 Claude Code 멀티 에이전트 시스템을 사용합니다.

## Quick Start

```bash
# Frontend 실행
pnpm --filter web dev

# Backend 실행
cd apps/api && uvicorn app.main:app --reload
```

## Multi-Agent System

이 프로젝트는 5개의 전문 에이전트로 구성된 개발 워크플로우를 사용합니다.

### Agent 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Request                                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                  ┌──────────────┴──────────────┐
                  │                             │
                  ▼                             ▼
     ┌────────────────────┐        ┌────────────────────┐
     │ Frontend Dev Agent │◄──────►│ Backend Dev Agent  │
     │ ────────────────── │  API   │ ────────────────── │
     │ apps/web/ 담당     │  계약  │ apps/api/ 담당     │
     │ React/Next.js      │  협의  │ FastAPI/Python     │
     └─────────┬──────────┘        └──────────┬─────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Review Agent   │
                    │   보안/품질 검증  │
                    └────────┬─────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
              ┌──────────┐     ┌──────────┐
              │  NO-GO   │     │    GO    │
              │ 수정필요  │     │   통과   │
              └────┬─────┘     └────┬─────┘
                   │                │
                   ▼                ▼
              Dev Agent로     ┌──────────────────┐
              돌아가기        │    QA Agent      │
                              │   테스트 검증    │
                              └────────┬─────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                        ┌──────────┐     ┌──────────┐
                        │   FAIL   │     │   PASS   │
                        └────┬─────┘     └────┬─────┘
                             │                │
                             ▼                ▼
                        Dev Agent로     ┌──────────────────┐
                        돌아가기        │   Docs Agent     │
                                        │   문서 업데이트   │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │ User Confirmation│
                                        └──────────────────┘
```

### Agent 목록

| Agent | File | 담당 영역 | 역할 |
|-------|------|----------|------|
| **Frontend Dev** | `frontend-dev-agent.md` | `apps/web/` | React/Next.js 개발 |
| **Backend Dev** | `backend-dev-agent.md` | `apps/api/` | FastAPI/Python 개발 |
| **Review** | `review-agent.md` | 전체 코드 | 보안/품질 검증 |
| **QA** | `qa-agent.md` | 전체 시스템 | 테스트 실행/검증 |
| **Docs** | `docs-agent.md` | `/docs/` | 문서 작성/유지 |

### 역할 분리 정책 (Critical Rule)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ⚠️ 역할 분리 원칙                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend Dev Agent          Backend Dev Agent                  │
│  ✅ apps/web/* 수정          ✅ apps/api/* 수정                 │
│  ❌ apps/api/* 수정 금지     ❌ apps/web/* 수정 금지            │
│                                                                 │
│  API 필요 시:                API 완료 시:                       │
│  → @backend-dev-agent 요청   → @frontend-dev-agent 알림         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 워크플로우 by Task Type

**Frontend Only:**
```
Frontend Dev → Review → QA → Docs
```

**Backend Only:**
```
Backend Dev → Review → QA → Docs
```

**Full-Stack:**
```
Backend Dev ←→ Frontend Dev (API 협의) → Review → QA → Docs
```

---

## Project Structure

```
awaves-agent/
├── apps/
│   ├── web/                 # Next.js 14 Frontend (@frontend-dev-agent)
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # Utilities & API services
│   │   └── types/           # TypeScript types
│   │
│   └── api/                 # FastAPI Backend (@backend-dev-agent)
│       ├── app/
│       │   ├── routers/     # API endpoints
│       │   ├── schemas/     # Pydantic models
│       │   ├── models/      # SQLAlchemy models
│       │   ├── services/    # Business logic
│       │   └── db/          # Database config
│       └── tests/
│
├── packages/
│   └── shared/              # Shared TypeScript types
│
├── docs/                    # Documentation (@docs-agent)
│   ├── architecture.md
│   ├── api.md
│   ├── development.md
│   ├── progress.md
│   └── qa/                  # QA reports
│
└── .claude/
    └── agents/              # Agent prompts
        ├── frontend-dev-agent.md
        ├── backend-dev-agent.md
        ├── review-agent.md
        ├── qa-agent.md
        └── docs-agent.md
```

---

## Development Rules

### 역할 분리 규칙

1. **Frontend 작업** → `@frontend-dev-agent` 호출
2. **Backend 작업** → `@backend-dev-agent` 호출
3. **양쪽 작업** → 각 Agent 순차 호출 + API 협의

### Gate 규칙

1. **코드 변경 후 Review Agent 호출** - 예외 없음
2. **마일스톤 완료 시 QA Agent 호출** - 테스트 필수
3. **기능 추가/변경 시 Docs Agent 호출** - 문서 동기화

### 코드 표준

- TypeScript strict mode (Frontend)
- Python type hints 필수 (Backend)
- 함수 50줄 이하
- 단일 책임 원칙
- 명시적 에러 처리

### 금지 사항

- ❌ 하드코딩된 시크릿
- ❌ 프로덕션 코드에 더미 데이터
- ❌ bare except/catch
- ❌ 리뷰 없는 배포
- ❌ 담당 영역 외 코드 수정

---

## Environment Setup

### Frontend (.env.local)
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend (.env)
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET_KEY=your-secret
CORS_ORIGINS=http://localhost:3000,http://localhost:3003
```

---

## Testing

### Frontend
```bash
pnpm --filter web test
pnpm --filter web build  # Type check
```

### Backend
```bash
cd apps/api
pytest
curl http://localhost:8000/health
```

### Test Credentials
- Email: `test@example.com`
- Password: `password123`

---

## Agent 호출 예시

```markdown
# Frontend 작업
@frontend-dev-agent
버튼 컴포넌트에 로딩 상태 추가해줘

# Backend 작업
@backend-dev-agent
사용자 프로필 업데이트 API 추가해줘

# 코드 리뷰
@review-agent
Files: apps/web/components/Button.tsx
Change type: feature

# QA 테스트
@qa-agent
Feature: 사용자 로그인 플로우

# 문서 업데이트
@docs-agent
Update: 새 API 엔드포인트 추가됨
```

---

## Useful Commands

```bash
# Monorepo
pnpm install                    # 의존성 설치
pnpm dev                        # 모든 앱 개발 서버 실행
pnpm build                      # 모든 앱 빌드

# Frontend
pnpm --filter web dev           # Next.js 개발 서버
pnpm --filter web build         # 프로덕션 빌드

# Backend
cd apps/api
uvicorn app.main:app --reload   # FastAPI 개발 서버
pytest                          # 테스트 실행

# API Testing
curl http://localhost:8000/docs # Swagger UI
```
