# API Contract: User Registration V2

**Contract ID:** t01_user-registration01
**Status:** AGREED
**Created:** 2026-02-04
**Last Updated:** 2026-02-04

---

## 1. Frontend Requirements

**Requested by:** @frontend-dev-agent

### Feature Description
Multi-step user registration flow with username-based authentication (not email).

### UI Requirements
- **Step 1:** Username, Password, Confirm Password fields
- **Step 2:** User level selection with descriptions, Privacy consent checkbox with popup

### Required Data
```typescript
// Request to send
{
  username: string;        // 2-50 characters
  password: string;        // No restrictions
  confirm_password: string;
  user_level: 'beginner' | 'intermediate' | 'advanced';
  privacy_consent_yn: boolean;
}

// Expected response
{
  user_id: number;
  username: string;
  user_level: string;
  privacy_consent_yn: boolean;
  created_at: string;
}
```

### Error Handling Needs
- Password mismatch feedback
- Username already exists feedback
- Consent required feedback

---

## 2. Backend Proposal

**Proposed by:** @backend-dev-agent

### Endpoint
```
POST /register
```

### Request Schema
```json
{
  "username": "string (2-50 chars, required)",
  "password": "string (required, no policy)",
  "confirm_password": "string (required)",
  "user_level": "enum: beginner|intermediate|advanced (required)",
  "privacy_consent_yn": "boolean (required)"
}
```

### Response Schema (Common Response Model)
```json
{
  "result": "success | error",
  "error": {
    "code": "string | null",
    "message": "string | null"
  },
  "data": {
    "user_id": "biginteger",
    "username": "string",
    "user_level": "string",
    "privacy_consent_yn": "boolean",
    "last_login_dt": "datetime | null",
    "created_at": "datetime"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| PASSWORD_MISMATCH | 200 | password != confirm_password |
| USERNAME_EXISTS | 200 | Username already registered |
| CONSENT_REQUIRED | 200 | privacy_consent_yn is false |

### Database Schema
```sql
CREATE TABLE users_v2 (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_level VARCHAR(20) NOT NULL,
  privacy_consent_yn BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_dt TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 3. Agreement

### Agreed Interface

| Aspect | Agreement |
|--------|-----------|
| Endpoint | `POST /register` (root level, not under /auth) |
| Response Format | Common Response Model with result/error/data |
| Password Policy | None (allow all) |
| Validation | Server-side password match check |
| Error Reporting | Via error.code in response body |

### Frontend Implementation Notes
- Use `authService.registerV2()` method
- Handle response.data.result for success/error
- Map error codes to localized messages

### Backend Implementation Notes
- Return 200 OK for all responses (success and business errors)
- Use 422 only for schema validation failures
- Hash password before storing

---

## 4. Test Cases

### Success Case
```bash
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "confirm_password": "test123",
    "user_level": "beginner",
    "privacy_consent_yn": true
  }'
```

Expected:
```json
{
  "result": "success",
  "error": null,
  "data": {
    "user_id": 1,
    "username": "testuser",
    "user_level": "beginner",
    "privacy_consent_yn": true,
    "last_login_dt": null,
    "created_at": "2026-02-04T12:00:00Z"
  }
}
```

### Error Case - Password Mismatch
```bash
curl -X POST http://localhost:8001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123",
    "confirm_password": "different",
    "user_level": "beginner",
    "privacy_consent_yn": true
  }'
```

Expected:
```json
{
  "result": "error",
  "error": {
    "code": "PASSWORD_MISMATCH",
    "message": "Password and confirm password do not match"
  },
  "data": null
}
```

---

## 5. Implementation Tracking

| Component | File | Status |
|-----------|------|--------|
| DB Model | `apps/api/app/models/user.py` | ✅ Done |
| Schemas | `apps/api/app/schemas/user.py` | ✅ Done |
| Router | `apps/api/app/routers/register.py` | ✅ Done |
| Main | `apps/api/app/main.py` | ✅ Done |
| Types | `packages/shared/src/index.ts` | ✅ Done |
| API Service | `apps/web/lib/apiServices.ts` | ✅ Done |
| Register Page | `apps/web/app/register/page.tsx` | ✅ Done |
| Tests | `apps/api/tests/test_register.py` | ✅ Done |
| API Docs | `docs/api.md` | ✅ Done |

---

## 6. Sign-off

| Agent | Status | Date |
|-------|--------|------|
| @backend-dev-agent | Implemented | 2026-02-04 |
| @frontend-dev-agent | Implemented | 2026-02-04 |
| @review-agent | Pending | - |
| @qa-agent | Pending | - |
| @docs-agent | Completed | 2026-02-04 |
