## Task ID
t01_user-registration01

## Status
COMPLETED - 2026-02-04

## Objective
Implement a username-based user registration flow with a multi-step UI and GraphQL-based backend API

## Tasks
## Frontend Task
This is a list of FE Agent Tasks for User Registration
In the registration page:

On the current page, include username, password, and confirm password (excluding email)
After inputting username and password, proceed to the next step on another page to select user_level with information about each level.

Proficiency Level Descriptions:

Beginner: A surfing novice or someone with low proficiency who has difficulty riding on waves
Intermediate: Someone who can skillfully maintain balance on the board and perform long rides
Advanced: Someone who can ride strong waves and execute various performance maneuvers

Password security policy: None (Allow all)
Add a checkbox for privacy policy consent: Display detailed consent information in a popup (check for privacy_consent)
Provide registration information to Backend via GraphQL

## Backend Task
This is a list of BE Agent Tasks for User Registration
(PostgreSQL) Create user table: user_id(biginteger), username, password, user_level, privacy_consent_yn, last_login_dt
request uri: /register
request model: username, password, confirm_password, user_level, privacy_consent_yn
register business logic:

Verify that password and confirm_password match

No password security policy (Allow all)

Insert into user db
Respond with the registered user's information using GraphQL

All API responses use a common response model in the following format
{
  "result":
  "error": {
    "code":
    "message":
  }
  "data":
}

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
- Added `UserV2` model in `apps/api/app/models/user.py`
- Added registration schemas in `apps/api/app/schemas/user.py`
- Created `/register` endpoint in `apps/api/app/routers/register.py`
- Updated `apps/api/app/main.py` to include new router

### Frontend Changes
- Updated `apps/web/app/register/page.tsx` with multi-step form:
  - Step 1: Username, Password, Confirm Password
  - Step 2: User Level Selection, Privacy Consent
- Added privacy policy popup
- Bilingual support (Korean/English)

### Types
- Added V2 types in `packages/shared/src/index.ts`
- Added `registerV2` method in `apps/web/lib/apiServices.ts`

### Tests
- Added `apps/api/tests/test_register.py`

### Documentation
- Updated `docs/api.md` with new `/register` endpoint
- Updated `docs/progress.md`
