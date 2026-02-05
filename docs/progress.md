# 프로젝트 진행 상황

## 현재 상태
- **마일스톤**: M4 - 저장 & 피드백 기능
- **상태**: ✅ 완료
- **마지막 업데이트**: 2026-02-05 22:20

## 다음 작업
1. [x] 사용자명 기반 회원가입 V2 구현 (t01_user-registration01)
2. [x] 회원가입 UI/DB 개선 (t02_user-registration02)
3. [x] 인증 기반 UI 동작 및 접근 제어 (t04_user-login02)
4. [x] 저장된 스팟 기능 구현 (t06_savedlist01)
5. [ ] 지도 페이지 Mapbox 통합 테스트

## 블로커
- 없음

---

## 작업 기록

### 2026-02-05
#### 완료
- 저장된 스팟 기능 구현 (Task: t06_savedlist01)
  - Backend: DynamoDB 서비스 구현 (aioboto3 기반 비동기 작업)
  - Backend: 저장 목록 스키마/라우터 DynamoDB 통합
  - Backend: Redis 캐시 확장 (saved items 캐시 레이어)
  - Backend: PostgreSQL에 saved_item_feedback 테이블 추가
  - Frontend: SavedItemCard 컴포넌트 신규 생성
  - Frontend: Saved 페이지 API 통합 및 상태 관리
  - Frontend: 조건 변경 알림 UI 구현
  - Frontend: 피드백 UI (thumbs up/down) 구현
  - Frontend: 삭제 확인 모달 구현
  - QA: API 엔드포인트 테스트 완료
  - Review: 보안 및 품질 검토 통과

- 인증 기반 UI 동작 및 접근 제어 (Task: t04_user-login02)
  - Frontend: AuthContext 구현 (사용자 인증 상태 관리)
  - Frontend: ProtectedRoute 컴포넌트 구현 (라우트 가드)
  - Frontend: 메인 페이지 로그인/로그아웃 버튼 토글
  - Frontend: Get Started 버튼 클릭 시 미로그인 사용자 로그인 페이지 리다이렉트
  - Frontend: 보호된 페이지 (map, mypage, saved) 인증 필요 적용
  - Backend: 보호된 라우트 JWT 인증 검증 완료
  - QA: 전체 테스트 통과
  - Review: 보안 및 품질 검토 통과

#### 결정 사항
- localStorage 기반 토큰 저장: SSR 안전성 체크 포함
- ProtectedRoute 패턴 사용: 각 페이지를 개별적으로 래핑하여 인증 상태 관리

---

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
| M2 | 사용자 인증 완성 | ✅ | 2026-02-05 |
| M3 | 지도 & 스팟 기능 | 🟡 | - |
| M4 | 저장 & 피드백 기능 | ✅ | 2026-02-05 |
| M5 | 배포 & 최적화 | ⬜ | - |
