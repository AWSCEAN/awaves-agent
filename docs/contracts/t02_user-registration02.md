# API Contract: User Registration V2 Fixes

**Contract ID:** t02_user-registration02
**Status:** AGREED
**Created:** 2026-02-04
**Last Updated:** 2026-02-04

---

## 1. Backend Changes

**Implemented by:** @backend-dev-agent

### Environment Configuration
- Created `.env.local` with Neon PostgreSQL connection
- Updated `config.py` to auto-detect and load `.env.local`
- Server runs on port 8001 for local development

### Database Model
- Renamed `UserV2` to `User` (primary user model)
- Removed legacy `User` model (was email-based)
- Table: `users` with columns:
  - `user_id` (BIGSERIAL PRIMARY KEY)
  - `username` (VARCHAR(50) UNIQUE)
  - `password_hash` (VARCHAR(255))
  - `user_level` (VARCHAR(20))
  - `privacy_consent_yn` (BOOLEAN)
  - `last_login_dt` (TIMESTAMP)
  - `created_at` (TIMESTAMP)

### Architecture (Separation of Concerns)
```
Router (register.py)
    ↓
Service (user_service.py)
    ↓
Repository (user_repository.py)
    ↓
Database (PostgreSQL via SQLAlchemy)
```

### Files Changed
| File | Change |
|------|--------|
| `apps/api/.env.local` | Created with Neon DB connection |
| `apps/api/app/config.py` | Auto-detect .env.local |
| `apps/api/app/models/user.py` | Replaced User with UserV2 |
| `apps/api/app/repositories/user_repository.py` | New - DB operations |
| `apps/api/app/services/user_service.py` | New - Business logic |
| `apps/api/app/routers/register.py` | Uses service layer, saves to DB |
| `apps/api/app/main.py` | DB initialization on startup |

---

## 2. Frontend Changes

**Implemented by:** @frontend-dev-agent

### UI Improvements
1. **Extended width** - Container changed from `max-w-md` to `max-w-lg`
2. **Color-coded levels**:
   - Beginner: Green (border, background, text)
   - Intermediate: Orange (border, background, text)
   - Advanced: Red (border, background, text)
3. **Visual icons**:
   - Beginner: 🌊 (wave)
   - Intermediate: 🏄 (surfer)
   - Advanced: 🔥 (fire)
4. **Shortened Korean text** to fit single line

### Files Changed
| File | Change |
|------|--------|
| `apps/web/app/register/page.tsx` | UI improvements, color coding, icons |

---

## 3. Test Cases

### Backend Test - Registration
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

Expected Response:
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
    "created_at": "2026-02-04T05:08:17.777798"
  }
}
```

---

## 4. Sign-off

| Agent | Status | Date |
|-------|--------|------|
| @backend-dev-agent | Implemented | 2026-02-04 |
| @frontend-dev-agent | Implemented | 2026-02-04 |
| @review-agent | Pending | - |
| @qa-agent | Pending | - |
| @docs-agent | Pending | - |
