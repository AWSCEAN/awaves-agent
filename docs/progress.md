# 프로젝트 진행 상황

## 현재 상태
- **마일스톤**: M2 - 사용자 인증 완성
- **상태**: 🟡 진행중
- **마지막 업데이트**: 2026-02-04 15:00

## 다음 작업
1. [x] 사용자명 기반 회원가입 V2 구현 (t01_user-registration01)
2. [x] 회원가입 UI/DB 개선 (t02_user-registration02)
3. [ ] 프론트엔드-백엔드 API 연동 완성
4. [ ] 지도 페이지 Mapbox 통합 테스트
5. [ ] 사용자 인증 플로우 E2E 테스트
6. [ ] 저장된 스팟 기능 구현

## 블로커
- 없음

---

## 작업 기록

### 2026-02-04
#### 완료
- 회원가입 UI/DB 개선 (Task: t02_user-registration02)
  - Backend: `.env.local` 생성 (Neon PostgreSQL 연결)
  - Backend: User 모델 통합 (UserV2 → User)
  - Backend: Repository/Service 계층 분리 (user_repository.py, user_service.py)
  - Backend: 실제 DB 저장 구현 (Neon PostgreSQL)
  - Frontend: 레벨 선택 UI 개선 (색상 구분: 초급-녹색, 중급-주황, 고급-빨강)
  - Frontend: 레벨별 아이콘 추가 (🌊, 🏄, 🔥)
  - Frontend: 한국어 텍스트 줄바꿈 문제 수정

- 사용자명 기반 회원가입 V2 구현 (Task: t01_user-registration01)
  - Backend: `/register` 엔드포인트 추가 (Common Response Model 적용)
  - Backend: UserV2 모델 추가 (user_id, username, password, user_level, privacy_consent_yn, last_login_dt)
  - Frontend: 다단계 회원가입 UI 구현 (Step 1: 계정정보, Step 2: 레벨선택)
  - Frontend: 개인정보 처리방침 팝업 추가
  - Tests: test_register.py 추가
  - Docs: API 명세서 업데이트

---

### 2024-02-04
#### 완료
- 모노레포 구조 설정 (pnpm workspaces + Turborepo)
- Next.js 14 프론트엔드 초기 구성
  - 랜딩 페이지
  - 로그인/회원가입 페이지
  - 지도 페이지 (Mapbox 연동)
  - 저장된 스팟 페이지
  - 마이페이지
- FastAPI 백엔드 초기 구성
  - 인증 API (register, login, me)
  - 서핑 스팟 API
  - 저장된 스팟 API
  - 피드백 API
- 프론트엔드 로그인 → 백엔드 API 연동
- 테스트 사용자 추가 (test@example.com / password123)
- 멀티 에이전트 시스템 설정

#### 결정 사항
- JWT 만료 시간 30분: 보안과 UX 균형 고려
- CORS origins를 comma-separated string으로 처리: .env 호환성
- 한국어/영어 이중 언어 지원: 글로벌 서비스 준비

#### 기술 스택 확정
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Backend: FastAPI + Python 3.11
- Database: PostgreSQL (Neon)
- Cache: Redis Cloud
- Map: Mapbox GL JS

---

## 마일스톤 현황

| # | 마일스톤 | 상태 | 완료일 |
|---|---------|------|--------|
| M1 | 프로젝트 초기 설정 | ✅ | 2024-02-04 |
| M2 | 사용자 인증 완성 | 🟡 | - |
| M3 | 지도 & 스팟 기능 | ⬜ | - |
| M4 | 저장 & 피드백 기능 | ⬜ | - |
| M5 | 배포 & 최적화 | ⬜ | - |
