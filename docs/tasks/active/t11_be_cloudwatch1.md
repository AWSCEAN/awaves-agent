# Task: t11_be_cloudwatch1 — AWS Observability Stack Integration

## Status: COMPLETE (backend-dev-agent + docs-agent done, awaiting QA/Review)

## Changes Summary

### T1 — JSON Structured Logging (`app/core/logging.py`)
- Created `JsonFormatter` class outputting single-line JSON to stdout
- Fields: `timestamp`, `level`, `message`, `logger`, `exception` (optional), `request_id` (optional)
- `setup_json_logging()` replaces root logger handlers at startup
- Suppresses noisy third-party loggers (uvicorn.access, botocore)
- CloudWatch Logs Insights query: `fields @timestamp, message | filter level="ERROR" | sort @timestamp desc`

### T2 — CloudWatch Custom Metrics (`app/middleware/metrics.py`)
- Singleton boto3 CloudWatch client (Namespace: `awaves/Application`)
- `CloudWatchMetricsMiddleware` collects per-request:
  - `API_Latency` (Milliseconds) with Endpoint dimension
  - `API_Error_Count` (Count) for 4xx/5xx responses
- Service-level helpers:
  - `emit_cache_hit(cache_name)` / `emit_cache_miss(cache_name)` — added to `surf_cache.py`, `inference_cache.py`
  - `emit_ml_inference_latency(latency_ms)` — added to `prediction_service.py`
  - `emit_external_api_failure(service)` — added to `prediction_service.py` on SageMaker failure
- All CloudWatch puts run in executor threads (non-blocking)

### T3 — X-Ray Tracing (`app/core/tracing.py`)
- `init_tracing()` calls `patch_all()` to auto-patch boto3, httpx, etc.
- `XRayMiddleware` wraps each request in a `FastAPI` segment with HTTP metadata
- Gracefully degrades: logs warning if `aws-xray-sdk` not installed or daemon not running
- Added `aws-xray-sdk>=2.14.0` to `requirements.txt`

### T4 — Subsegment Instrumentation
- **DynamoDB**: `dynamodb_subsegment()` context manager in `base_repository.py`
  - Applied to `_scan_all_items()` (DynamoDB_Scan) and `get_spot_data()` (DynamoDB_Query) in `surf_data_repository.py`
- **Redis**: `_redis_subsegment()` context manager in `cache/base.py`
  - Applied to `get()` calls in `surf_cache.py` and `inference_cache.py`
- **SageMaker**: `_sagemaker_subsegment()` context manager in `prediction_service.py`
  - Wraps the httpx call to SageMaker endpoint

### Middleware Registration (`app/main.py`)
- `setup_json_logging()` called before any logger is created
- `init_tracing()` called at module level
- Middleware stack (outermost first): CORS → XRayMiddleware → CloudWatchMetricsMiddleware

## Files Changed
| File | Action |
|------|--------|
| `app/core/__init__.py` | NEW |
| `app/core/logging.py` | NEW — T1 |
| `app/core/tracing.py` | NEW — T3 |
| `app/middleware/__init__.py` | NEW |
| `app/middleware/metrics.py` | NEW — T2 |
| `app/main.py` | MODIFIED — imports + middleware registration |
| `app/services/cache/base.py` | MODIFIED — added `_redis_subsegment` |
| `app/services/cache/surf_cache.py` | MODIFIED — cache metrics + Redis subsegment |
| `app/services/cache/inference_cache.py` | MODIFIED — cache metrics + Redis subsegment |
| `app/repositories/base_repository.py` | MODIFIED — added `dynamodb_subsegment` |
| `app/repositories/surf_data_repository.py` | MODIFIED — DynamoDB subsegments |
| `app/services/prediction_service.py` | MODIFIED — SageMaker subsegment + metrics |
| `app/repositories/saved_list_repository.py` | MODIFIED — DynamoDB subsegments (PutItem, Query, GetItem, DeleteItem, UpdateItem) |
| `app/repositories/user_repository.py` | MODIFIED — added logger |
| `app/services/cache/saved_cache.py` | MODIFIED — cache metrics + Redis subsegment |
| `app/services/cache/auth_cache.py` | MODIFIED — cache metrics + Redis subsegment |
| `app/services/auth.py` | MODIFIED — added logger + security logging |
| `app/services/user_service.py` | MODIFIED — added logger + registration logging |
| `app/services/opensearch_service.py` | MODIFIED — External_API_Failure metrics |
| `app/services/search_service.py` | MODIFIED — External_API_Failure metric on fallback |
| `requirements.txt` | MODIFIED — added `aws-xray-sdk>=2.14.0` |
| `docs/observability.md` | NEW — full observability documentation |
| `docs/architecture.md` | MODIFIED — added observability section + directory entries |
| `docs/progress.md` | MODIFIED — added 2026-02-20 work log |
