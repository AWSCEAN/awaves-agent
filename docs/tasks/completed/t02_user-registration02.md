## Task ID
t02_user-registration02

## Status
COMPLETED - 2026-02-04

## Objective
Fix surf level guide on registration.
Fix DB model usage and migration settings.

## Tasks
## Frontend Tasks
- only frontend-dev-agent works on these tasks
This is a list of FE Agent Tasks for User Registration
the surferLevel text is not in one line for "초급" in korean.
1. extend width of the box to keep it in one line.
2. add visual metric to the box to differentiate the levels(green, orange, red) and a small image of explained text next to the explaination.

## Backend Tasks
- only backend-dev-agent works on these tasks
This is a list of BE Agent Tasks for User Registration
1. Replace User class in model/user.py to use UserV2 class
2. env.local PostgreSQL URL migration not implemented
- Create .env.local file in /api route which reference db for migration.

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
| `apps/api/.env.local` | Created with Neon PostgreSQL connection |
| `apps/api/app/config.py` | Auto-detect and load .env.local |
| `apps/api/app/models/user.py` | Replaced User with UserV2 (single model) |
| `apps/api/app/repositories/__init__.py` | New - repository exports |
| `apps/api/app/repositories/user_repository.py` | New - DB operations |
| `apps/api/app/services/user_service.py` | New - Business logic |
| `apps/api/app/routers/register.py` | Uses service layer, saves to DB |
| `apps/api/app/main.py` | DB initialization on startup (lifespan) |
| `apps/api/app/models/feedback.py` | Removed FK constraint temporarily |

### Frontend Changes
| File | Change |
|------|--------|
| `apps/web/app/register/page.tsx` | Extended width (max-w-lg), color-coded levels, icons |

### Architecture
```
Router (register.py)
    ↓ Dependency Injection
Service (user_service.py)
    ↓ Business Logic
Repository (user_repository.py)
    ↓ Database Operations
PostgreSQL (Neon)
```

### Server Configuration
- Backend runs on port 8001 for local development
- Uses .env.local with Neon PostgreSQL connection
- Auto-creates tables on startup
