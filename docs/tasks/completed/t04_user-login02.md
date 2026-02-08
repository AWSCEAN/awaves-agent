## Task ID
t04_user-login02

## Status
COMPLETED - 2026-02-05

## Objective
The objective is to enforce authentication-based UI behavior and access control,
ensuring that only authenticated users can access protected pages while providing clear login and logout flows.

### Frontend Tasks
- If the user is logged in, replace the Login button with a Logout button in the top-right corner of the main page.
- When the Get Started button is clicked, redirect to the login page if the user is not logged in.

### Backend Tasks
- All pages except the login page and the main page must be accessible only when the user is logged in.

## Agent Order
1. backend
2. frontend
3. qa
4. review
5. docs

## Success Criteria
- [x] API updated (backend auth middleware verified)
- [x] UI displays Login/Logout toggle correctly
- [x] Protected routes enforce authentication
- [x] Tests updated
- [x] Docs synced

## Implementation Summary

### Frontend Changes
| File | Change |
|------|--------|
| `apps/web/contexts/AuthContext.tsx` | NEW - Authentication context with user state management |
| `apps/web/components/ProtectedRoute.tsx` | NEW - Route guard component for protected pages |
| `apps/web/components/Providers.tsx` | NEW - Global provider wrapper for AuthProvider |
| `apps/web/app/layout.tsx` | Added Providers wrapper |
| `apps/web/app/page.tsx` | Added Login/Logout toggle, Get Started redirect logic |
| `apps/web/app/login/page.tsx` | Updated to use AuthContext login function |
| `apps/web/app/map/page.tsx` | Wrapped with ProtectedRoute |
| `apps/web/app/mypage/page.tsx` | Wrapped with ProtectedRoute, integrated auth logout |
| `apps/web/app/saved/page.tsx` | Wrapped with ProtectedRoute |

### Backend Verification
| File | Status |
|------|--------|
| `apps/api/app/routers/saved.py` | JWT auth required on all endpoints |
| `apps/api/app/routers/auth.py` | Auth endpoints working correctly |
| `apps/api/app/routers/surf.py` | Public endpoints (intentional) |

### Page Access Control
| Page | Authentication Required |
|------|------------------------|
| `/` | No |
| `/login` | No |
| `/register` | No |
| `/map` | Yes |
| `/saved` | Yes |
| `/mypage` | Yes |

### Authentication Flow
1. User visits protected page → redirected to /login
2. User logs in via AuthContext.login()
3. AuthContext updates user state immediately
4. Router navigates to /map
5. ProtectedRoute sees isAuthenticated=true → allows access
6. Main page shows Logout button instead of Login

### Bug Fix
- **Issue**: Login redirected to /map but stayed on login screen
- **Cause**: Login page used `authService.login()` directly instead of `useAuth().login()`
- **Fix**: Updated login page to use AuthContext login function which updates user state synchronously

### Notes
- localStorage tokens checked on SSR with `typeof window` guard
- ProtectedRoute shows loading state during auth check
- Logout clears tokens and user state, redirects to home
