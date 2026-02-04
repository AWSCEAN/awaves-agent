## Task ID
t03_user-registration03

## Status
COMPLETED - 2026-02-04

## Objective
Fix Login Page

## Tasks
## Frontend Tasks
- only frontend-dev-agent works on these tasks
1. in login page replace "email" label to "Username"
2. Use username format when logging in. (Registering with username only. email format is not used.)
3. When selecting the surfer level show the radiobutton being selected.

## Agent Order
1. backend
2. frontend
3. qa
4. review
5. docs

## Success Criteria
- [x] API updated (N/A - frontend only)
- [x] UI displays rating
- [x] Tests updated
- [x] Docs synced

## Implementation Summary

### Frontend Changes
| File | Change |
|------|--------|
| `apps/web/app/login/page.tsx` | Changed "Email" → "Username", input type email → text |
| `apps/web/app/register/page.tsx` | Made radio button visible (removed sr-only) |

### Login Page Changes
- Label: "Email" / "이메일" → "Username" / "사용자명"
- Input type: `email` → `text`
- Error message updated for username context
- State variable: `email` → `username`

### Register Page Changes
- Radio button now visible with `w-5 h-5` size
- Removed hidden custom selection indicator
- Uses native radio button with accent color matching level
