# Observability (CloudWatch + X-Ray)

## 개요

awaves API는 AWS 관측 가능성 스택(CloudWatch Logs, CloudWatch Metrics, X-Ray Tracing)을 통합하여 운영 가시성을 확보합니다. EKS 환경에서 Fluent Bit / CloudWatch Agent / X-Ray DaemonSet가 Terraform으로 프로비저닝되어 있다고 가정하며, 이 문서는 **애플리케이션 레벨 계측**을 다룹니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Middleware Stack                            │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │  │
│  │  │  CORS Middleware │→│ XRayMiddleware    │→│ CloudWatch  │  │  │
│  │  │                 │  │ (segment per req) │  │ Metrics MW │  │  │
│  │  └─────────────────┘  └──────────────────┘  └────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│  ┌───────────────┐  ┌───────┴────────┐  ┌────────────────────────┐ │
│  │   Routers     │  │   Services     │  │   Repositories         │ │
│  │  auth, surf,  │→│  auth, search, │→│  surf_data, saved_list,│ │
│  │  saved, ...   │  │  prediction,   │  │  user (PostgreSQL)     │ │
│  │               │  │  opensearch    │  │                        │ │
│  └───────────────┘  └───────┬────────┘  └────────┬───────────────┘ │
│                              │                     │                 │
│                     ┌────────┴──────────┐  ┌──────┴──────────┐     │
│                     │  Cache Layer      │  │  Data Stores    │     │
│                     │  (Redis)          │  │  DynamoDB       │     │
│                     │  + Redis_Get      │  │  + DynamoDB_*   │     │
│                     │    subsegments    │  │    subsegments  │     │
│                     └────────┬──────────┘  └──────┬──────────┘     │
│                              │                     │                 │
└──────────────────────────────┼─────────────────────┼─────────────────┘
                               │                     │
              ┌────────────────┼─────────────────────┼──────────────┐
              ▼                ▼                     ▼              ▼
       ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐
       │ CloudWatch │  │ CloudWatch │  │   X-Ray      │  │ Fluent   │
       │ Metrics    │  │ Logs       │  │   Daemon     │  │ Bit      │
       │ (boto3)    │  │ (stdout)   │  │   (:2000)    │  │          │
       └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  └────┬─────┘
             │               │                │               │
             ▼               ▼                ▼               ▼
       ┌──────────────────────────────────────────────────────────┐
       │                 AWS CloudWatch / X-Ray Console           │
       │  - Metrics Dashboard    - Logs Insights    - Service Map │
       └──────────────────────────────────────────────────────────┘
```

## 구성 파일

| 파일 | 역할 |
|------|------|
| `app/core/logging.py` | JSON 구조화 로깅 (`JsonFormatter`, `setup_json_logging`) |
| `app/core/tracing.py` | X-Ray 초기화 (`init_tracing`, `XRayMiddleware`) |
| `app/middleware/metrics.py` | CloudWatch 커스텀 메트릭 (`CloudWatchMetricsMiddleware`, 헬퍼 함수) |
| `app/main.py` | 미들웨어 등록 및 초기화 호출 |

---

## 1. JSON 구조화 로깅 (CloudWatch Logs)

### 포맷

모든 로그는 단일 행 JSON으로 stdout에 출력됩니다. Fluent Bit가 이를 CloudWatch Logs로 전달합니다.

```json
{
  "timestamp": "2026-02-20T12:34:56.789012+00:00",
  "level": "ERROR",
  "message": "Failed to get spot data: timeout",
  "logger": "app.repositories.surf_data_repository",
  "exception": "Traceback (most recent call last):\n  ..."
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | ISO 8601 | UTC 타임스탬프 |
| `level` | string | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `message` | string | 로그 메시지 |
| `logger` | string | Python 로거 이름 (모듈 경로) |
| `exception` | string | 예외 발생 시 traceback (선택) |
| `request_id` | string | 요청 추적 ID (선택, 향후 확장) |

### 로깅 적용 범위

| 계층 | 파일 | 주요 로그 내용 |
|------|------|---------------|
| Service | `auth.py` | 로그인 성공/실패, 토큰 갱신 실패, 로그아웃 |
| Service | `user_service.py` | 회원가입 성공/실패 (사유 포함) |
| Service | `opensearch_service.py` | OpenSearch 연결/검색/인덱싱 실패 |
| Service | `search_service.py` | OpenSearch 폴백 발생 |
| Service | `prediction_service.py` | SageMaker 호출 실패 |
| Repository | `surf_data_repository.py` | DynamoDB 스캔/쿼리 실패 |
| Repository | `saved_list_repository.py` | DynamoDB CRUD 실패 |
| Repository | `user_repository.py` | PostgreSQL 쿼리 (SQLAlchemy) |
| Cache | `base.py`, `*_cache.py` | Redis 연결/조회/저장 실패 |

### CloudWatch Logs Insights 쿼리 예시

**에러 로그 조회:**
```
fields @timestamp, message, logger
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

**로그인 실패 모니터링:**
```
fields @timestamp, message
| filter message like /Login failed/
| stats count(*) as failCount by bin(5m)
```

**SageMaker 호출 실패 추적:**
```
fields @timestamp, message, logger
| filter logger = "app.services.prediction_service" and level = "WARNING"
| sort @timestamp desc
```

**서비스별 에러 분포:**
```
fields logger
| filter level = "ERROR"
| stats count(*) as errorCount by logger
| sort errorCount desc
```

**회원가입 통계:**
```
fields @timestamp, message
| filter logger = "app.services.user_service"
| parse message "Registration failed: * (username=*)" as reason, username
| stats count(*) as cnt by reason
```

---

## 2. CloudWatch Custom Metrics

### Namespace: `awaves/Application`

모든 메트릭은 `awaves/Application` 네임스페이스로 전송됩니다. boto3 CloudWatch 클라이언트는 싱글턴 패턴으로 초기화되며, `put_metric_data` 호출은 `run_in_executor`로 비동기 처리되어 요청 지연에 영향을 주지 않습니다.

### 메트릭 목록

| 메트릭 | 단위 | 차원 | 소스 위치 | 설명 |
|--------|------|------|----------|------|
| `API_Latency` | Milliseconds | Endpoint | `middleware/metrics.py` | HTTP 요청별 응답 시간 |
| `API_Error_Count` | Count | Endpoint | `middleware/metrics.py` | 4xx/5xx 응답 카운트 |
| `Cache_Hit` | Count | CacheName | `*_cache.py` | Redis 캐시 히트 |
| `Cache_Miss` | Count | CacheName | `*_cache.py` | Redis 캐시 미스 |
| `ML_Inference_Latency` | Milliseconds | - | `prediction_service.py` | SageMaker 추론 응답 시간 |
| `External_API_Failure` | Count | Service | 여러 서비스 | 외부 API 호출 실패 |

### 차원 값

**CacheName:**
- `surf_spots` — 서핑 스팟 전체 캐시
- `inference` — ML 추론 예측 캐시
- `saved_items` — 사용자 저장 목록 캐시
- `auth_token` — 리프레시 토큰 캐시

**Service (External_API_Failure):**
- `SageMaker` — ML 추론 엔드포인트 호출 실패
- `OpenSearch` — 검색 엔진 연결/쿼리 실패

### CloudWatch 알람 설정 예시 (참고)

```yaml
# 5분간 에러율 5% 초과 시 알람
API_Error_Rate_Alarm:
  MetricName: API_Error_Count
  Namespace: awaves/Application
  Statistic: Sum
  Period: 300
  Threshold: 10
  ComparisonOperator: GreaterThanThreshold

# ML 추론 지연 1초 초과 시 알람
ML_Latency_Alarm:
  MetricName: ML_Inference_Latency
  Namespace: awaves/Application
  Statistic: Average
  Period: 300
  Threshold: 1000
  ComparisonOperator: GreaterThanThreshold
```

---

## 3. X-Ray Tracing

### 초기화

`app/core/tracing.py`의 `init_tracing()`이 앱 시작 시 호출됩니다:
1. `xray_recorder.configure(service="awaves-API", context_missing="LOG_ERROR")`
2. `patch_all()` — boto3, httpx 등 지원 라이브러리 자동 패치
3. X-Ray 데몬이 없으면 경고 로그만 출력하고 정상 동작 (graceful degradation)

### Segment 구조

```
FastAPI (segment)                    ← XRayMiddleware가 생성
├── DynamoDB_Scan (subsegment)       ← surf_data_repository._scan_all_items()
├── DynamoDB_Query (subsegment)      ← surf_data_repository.get_spot_data()
│                                      saved_list_repository.get_saved_list()
│                                      saved_list_repository.get_saved_item()
├── DynamoDB_PutItem (subsegment)    ← saved_list_repository.save_item()
├── DynamoDB_DeleteItem (subsegment) ← saved_list_repository.delete_item()
├── DynamoDB_UpdateItem (subsegment) ← saved_list_repository.acknowledge_change()
├── Redis_Get (subsegment)           ← *_cache.py get 조회 메서드
├── SageMaker_Invoke (subsegment)    ← prediction_service._call_sagemaker()
└── [auto-patched] (subsegment)      ← boto3/httpx 자동 패치 결과
```

### X-Ray Service Map 해석 가이드

X-Ray Service Map에서 다음 노드가 표시됩니다:

```
                     ┌───────────┐
          ┌─────────▶│ DynamoDB  │
          │          └───────────┘
          │
┌─────────┴──┐       ┌───────────┐
│  FastAPI   │──────▶│   Redis   │
│ (awaves-   │       └───────────┘
│   API)     │
└─────────┬──┘       ┌───────────┐
          │          │ SageMaker │
          └─────────▶│ Endpoint  │
                     └───────────┘
```

**해석 포인트:**
- **노드 색상**: 녹색(정상), 노란색(4xx 에러), 빨간색(5xx 에러/장애)
- **연결선 두께**: 호출 빈도에 비례
- **평균 지연**: 각 노드에 표시되는 ms 값
- **에러율**: 노드 클릭 시 상세 에러율 확인

**병목 진단 절차:**
1. Service Map에서 빨간/노란 노드 식별
2. 해당 노드 클릭 → Response Time Distribution 확인
3. 느린 트레이스 선택 → 세그먼트 타임라인에서 병목 서브세그먼트 확인
4. 서브세그먼트 이름으로 코드 위치 추적 (예: `DynamoDB_Scan` → `surf_data_repository.py`)

---

## 4. Graceful Degradation

관측 가능성 계측이 서비스 가용성에 영향을 주지 않도록 모든 계측은 fail-safe로 구현되어 있습니다:

| 컴포넌트 | 실패 시 동작 |
|----------|------------|
| CloudWatch Metrics | `put_metric_data` 실패 → 경고 로그 출력, 요청 정상 처리 |
| X-Ray Daemon 미실행 | `context_missing="LOG_ERROR"` → 로그만 출력, 서브세그먼트 no-op |
| `aws-xray-sdk` 미설치 | `ImportError` catch → 트레이싱 비활성화 |
| Redis 연결 실패 | 캐시 미스로 처리, 메트릭 emit은 best-effort |

---

## 5. 로컬 개발 환경에서 확인

### JSON 로그 확인

```bash
cd apps/api && .venv/Scripts/python -m uvicorn app.main:app --reload --port 8001
```

터미널에 JSON 형식 로그가 출력되는지 확인:
```
{"timestamp":"...","level":"INFO","message":"Redis cache connected successfully","logger":"app.services.cache.base"}
```

### 엔드포인트 테스트

```bash
# 정상 요청 → API_Latency 메트릭
curl http://localhost:8001/health

# 인증 실패 → WARNING 로그 + API_Error_Count
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nobody","password":"wrong"}'

# 404 → API_Error_Count 메트릭
curl http://localhost:8001/nonexistent
```

### X-Ray 로컬 테스트 (선택)

X-Ray 데몬을 로컬에서 실행하려면:
```bash
# X-Ray 데몬 다운로드 후
./xray_daemon -o -n ap-northeast-2
```

---

## 변경 이력

| 날짜 | 작업 | Task ID |
|------|------|---------|
| 2026-02-20 | 초기 관측 가능성 스택 통합 | t11_be_cloudwatch1 |
