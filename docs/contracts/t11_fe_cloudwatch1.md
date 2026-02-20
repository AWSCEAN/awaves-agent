# Contract: t11_fe_cloudwatch1 — Frontend CloudWatch Integration

## Status: AGREED

## Frontend Requirements
- CloudWatch RUM SDK must load without blocking page render
- All API requests must include `X-Amzn-Trace-Id` for trace correlation
- RUM must be disabled in local dev when env vars are not set
- Environment variables documented in `.env.example`

## Backend Proposal
- Accept `X-Amzn-Trace-Id` header in XRayMiddleware and annotate X-Ray segments
- CORS already configured with `allow_headers=["*"]` — no change needed

## Agreement
- **Header**: `X-Amzn-Trace-Id` (string, UUID format)
- **Direction**: Frontend → Backend on every API request
- **Backend handling**: Annotate X-Ray segment with `frontend_trace_id` key
- **Missing header**: No error — silently skip annotation

## Implementation Tracking
| Task | Owner | Status |
|------|-------|--------|
| BE-1: Trace ID annotation | backend | DONE |
| BE-2: CORS allow header | backend | DONE (already covered) |
| FE-1: RUM SDK init | frontend | DONE |
| FE-2: Trace ID injection | frontend | DONE |
| FE-3: Env vars | frontend | DONE |

## Sign-off
- [x] Backend Dev Agent
- [x] Frontend Dev Agent
