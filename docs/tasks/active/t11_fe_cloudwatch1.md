# Task: t11_fe_cloudwatch1 — Frontend CloudWatch RUM & Trace ID Integration

## Status: COMPLETE

## Overview
Integrate CloudWatch RUM monitoring with the Next.js frontend and enable end-to-end trace correlation with the backend X-Ray setup.

## Changes Summary

### BE-1 — Frontend Trace ID Annotation (`app/core/tracing.py`)
- Modified `XRayMiddleware.dispatch()` to extract `X-Amzn-Trace-Id` header from incoming requests
- Calls `segment.put_annotation("frontend_trace_id", fe_trace_id)` when header is present
- Missing header handled gracefully (no error, pass-through)

### BE-2 — CORS Configuration (`app/main.py`)
- Already configured with `allow_headers=["*"]` which permits `X-Amzn-Trace-Id`
- No code change required

### FE-1 — CloudWatch RUM SDK Initialization (`components/CloudWatchRUM.tsx`)
- Created `CloudWatchRUM` client component using `next/script` with `afterInteractive` strategy
- Renders nothing when `NEXT_PUBLIC_RUM_IDENTITY_POOL_ID` is not set (safe for local dev)
- Configures RUM with: performance, errors, http telemetries + X-Ray enabled
- Added to root `layout.tsx` outside Providers (no render-blocking)

### FE-2 — Trace ID Injection (`lib/apiServices.ts`)
- Added `generateTraceId()` function using `crypto.randomUUID()`
- Modified `apiRequest()` to inject `X-Amzn-Trace-Id` header on every outgoing request
- All existing API services (auth, surf, saved, feedback) automatically included — no call-site changes needed

### FE-3 — Environment Variables
- Added `NEXT_PUBLIC_RUM_IDENTITY_POOL_ID`, `NEXT_PUBLIC_RUM_ENDPOINT`, `NEXT_PUBLIC_RUM_APP_MONITOR_ID` to `.env.local` (empty for local dev)
- Documented variable names in `.env.example`

## Files Changed
| File | Action |
|------|--------|
| `apps/api/app/core/tracing.py` | MODIFIED — BE-1: frontend trace ID annotation |
| `apps/web/components/CloudWatchRUM.tsx` | NEW — FE-1: RUM SDK client component |
| `apps/web/app/layout.tsx` | MODIFIED — FE-1: added CloudWatchRUM import |
| `apps/web/lib/apiServices.ts` | MODIFIED — FE-2: trace ID injection in apiRequest |
| `apps/web/.env.local` | MODIFIED — FE-3: RUM environment variables |
| `apps/web/.env.example` | MODIFIED — FE-3: documented RUM variables |

## Key Decisions
- Used existing `apiRequest` centralised function instead of creating a separate `apiFetch` wrapper — avoids duplicate code
- CloudWatchRUM component returns null when no identity pool ID is configured — safe for local development
- Placed CloudWatchRUM outside Providers in layout to keep it isolated from app state
- Used `crypto.randomUUID()` for trace IDs — lightweight, browser-native, sufficient for correlation

## Prerequisites for Production
- CloudWatch RUM App Monitor must be provisioned (Terraform — see BE-3 in task spec)
- Cognito Identity Pool ID must be set in deployment environment variables
- X-Ray daemon must be running on backend infrastructure
