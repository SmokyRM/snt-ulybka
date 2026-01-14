# QA Template: Admin QA Tools

**Date:** YYYY-MM-DD  
**Commit hash:** `<commit-hash>`  
**Tester:** `<tester-name>`  
**Environment:** `<environment>` (e.g., localhost dev, staging, preview)

## Notes
- `<any-additional-notes>`

---

## RBAC Roles

### Guest
- [-] Access to `/admin/qa` redirects to login
- [-] No QA tools visible

### Resident
- [-] Access to `/admin/qa` redirects to login
- [-] No QA tools visible

### Staff Roles (Chairman, Secretary, Accountant)
- [-] Access to `/admin/qa` redirects to login (not admin)
- [-] No QA tools visible

### Admin
- [-] Can access `/admin/qa` page
- [-] QA tools visible and functional
- [-] Can activate QA scenarios
- [-] Can reset QA scenarios

---

## Navigation

### QA Page Access
- [-] URL: `/admin/qa` accessible for admin
- [-] QA banner displays current scenario
- [-] Reset button works correctly

### Office QA Scenarios
- [-] Chairman scenario: `/office?qa=chairman` works
- [-] Accountant scenario: `/office?qa=accountant` works
- [-] Secretary scenario: `/office?qa=secretary` works
- [-] Navigation to office with QA param sets cookie correctly
- [-] Clean URL redirect after QA activation

### Cabinet QA Scenarios
- [-] Resident scenario: `/cabinet?qa=resident` works
- [-] Navigation to cabinet with QA param sets cookie correctly
- [-] Clean URL redirect after QA activation

### Admin QA Scenarios
- [-] Admin scenario: `/admin?qa=admin` works
- [-] Navigation to admin with QA param sets cookie correctly
- [-] Clean URL redirect after QA activation

---

## Reset Functionality

### Server-side Reset Endpoint
- [-] `POST /api/admin/qa/reset` clears `qaScenario` cookie
- [-] `POST /api/admin/qa/reset` clears `admin_view` cookie
- [-] Cookies cleared with correct options (maxAge=0, expires, path, sameSite, secure)
- [-] Response returns success status

### Client-side Reset Buttons
- [-] Admin QA Banner reset button works
- [-] QA Floating Indicator reset button works
- [-] Forbidden QA Reset button (dev-only) works
- [-] Reset clears localStorage keys containing "qa" or "admin_view"
- [-] Reset clears sessionStorage keys containing "qa" or "admin_view"
- [-] Hard reload to `/admin/qa` after reset
- [-] Fallback to `/admin/qa?qa=clear` if API fails

---

## Service & Integration

### Middleware QA Processing
- [-] `?qa=role` param processed before RBAC/auth checks
- [-] Cookie set correctly for API routes (`/api/*`)
- [-] Cookie set correctly for page routes
- [-] Clean URL redirect after QA activation (no `?qa=` in final URL)
- [-] QA cookie persists across navigation

### Effective Role Resolution
- [-] `effectiveRole` correctly uses QA override when `qaScenario` cookie is set
- [-] RBAC guards respect `effectiveRole` (not just `role`)
- [-] Admin guard uses `effectiveRole === "admin"` for QA override
- [-] Office guard uses `effectiveRole` for staff roles

### Forbidden Page Integration
- [-] QA reset button visible on `/forbidden` in dev mode only
- [-] QA reset button hidden in production
- [-] CTA links on `/forbidden` use clean URLs (no `next`/`qa` params)
- [-] QA reset from forbidden allows subsequent login

---

## Regressions

### Authentication
- [-] Resident login works after QA reset
- [-] Admin login works after QA reset
- [-] Staff login works after QA reset
- [-] No stuck states on `/login` or `/staff-login` after QA reset

### Navigation
- [-] Default routes work correctly after QA reset
- [-] Onboarding flows work correctly
- [-] No redirect loops

### Storage
- [-] No QA cookies persist after reset
- [-] No QA-related localStorage keys persist after reset
- [-] No QA-related sessionStorage keys persist after reset

---

## Summary

**Total checks:** `<count>`  
**Passed:** `<count>`  
**Failed:** `<count>`  
**Skipped:** `<count>`

**Overall status:** ✅ Pass / ❌ Fail / ⚠️ Partial
