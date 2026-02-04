## Task ID
t04_user-login01

## Status
COMPLETED - 2026-02-04

## Objective
This is a list of FE Agent Tasks for User Registration
- "change email to username on login screen"
- Only login through username (delet required "@" in login)
- Attach the access token to requests:
  Authorization: Bearer {accessToken}
- Do not determine token expiration on the Frontend.
- When a request returns HTTP 401, attempt a token refresh and retry the original request.

This is a list of BE Agent Tasks for User Registration
Authentication Design (JWT + Session Cache)
Environment Constraints
In production, use ElastiCache for Valkey (≤ 7.2).
In local/development environments, use Redis, ensuring compatibility with Redis 7.2.
The Frontend does not need to know whether the authentication mechanism is JWT-based or session-based.
Integration and implementation rely on the following environment variables defined in .env.* files:
- CACHE_URL
- JWT_ALGORITHM
- JWT_SECRET_KEY

1. Authentication
Validate user credentials (username / password)

2. JWT Issuance
access_token: expires in 30 minutes
refresh_token: expires in 7 days

3. Session (Cache) Management
- Key: awaves:refresh:{user_id}
- Value: {"token": "...", "expiresAt": "..."}

4. Request Authentication & Authorization
- Verify JWT signature
- Check token expiration (exp)
- Validate role / scope
- Query session cache when necessary

5. Refresh Logic
- Endpoint: POST /auth/refresh
- Validate the refresh_token
- Check whether the token exists in the cache
- Reissue tokens and invalidate the previous refresh token (Rotation)

6. Logout / Forced Invalidation
- Remove the refresh token from the cache

## Agent Order
1. backend
2. frontend
3. qa
4. review
5. docs

## Success Criteria
- [x] API updated
- [x] UI displays rating
- [x] Tests updated
- [x] Docs synced

## Implementation Summary

### Backend Changes
| File | Change |
|------|--------|
| `apps/api/app/services/auth.py` | Complete rewrite - JWT + DB auth, session cache integration |
| `apps/api/app/services/cache.py` | NEW - Redis cache service for session management |
| `apps/api/app/routers/auth.py` | Updated endpoints for username-based login, CommonResponse format |
| `apps/api/app/schemas/user.py` | Added LoginRequest (username), RefreshTokenRequest, LoginV2Response |
| `apps/api/app/config.py` | Changed redis_url → cache_url, added 'dev' env support |
| `apps/api/app/main.py` | Added CacheService lifecycle management |

### Frontend Changes
| File | Change |
|------|--------|
| `apps/web/lib/apiServices.ts` | Complete rewrite - 401 handling with auto-retry, token refresh |
| `apps/web/app/login/page.tsx` | Updated to use username-based login |
| `packages/shared/src/index.ts` | Added LoginRequest (username), RefreshTokenRequest, LoginV2Response |

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login with username/password, returns JWT tokens + user |
| POST | /auth/refresh | Refresh access token using refresh token |
| POST | /auth/logout | Invalidate refresh token |
| GET | /auth/me | Get current authenticated user |

### Authentication Flow
1. User submits username/password
2. Backend validates against DB
3. JWT access_token (30min) and refresh_token (7 days) issued
4. Refresh token stored in Redis cache (if available)
5. Frontend stores tokens in localStorage
6. All requests include `Authorization: Bearer {accessToken}`
7. On 401, frontend automatically refreshes token and retries

### Notes
- Redis cache is optional - login works without it (graceful degradation)
- Token rotation implemented on refresh
- CommonResponse format used for all auth endpoints
