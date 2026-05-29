---
phase: 6
title: "Data Exposure and API Contracts"
status: completed
priority: P2
effort: "0.75d"
dependencies: [2, 3]
---

# Phase 6: Data Exposure and API Contracts

## Overview

Remove stack trace leaks, neutralize CSV export risks, bound exports, and fix dead frontend API wrappers.

Completed 2026-05-28.

## Requirements

- Functional: API errors return sanitized messages and trace IDs.
- Functional: exported CSV cannot execute formulas in spreadsheet apps.
- Functional: frontend wrappers match backend routes.
- Non-functional: export remains downloadable with stable filename behavior.

## Architecture

Use one `@RestControllerAdvice` for errors. Use a CSV escaping utility. Keep frontend API service as thin route map.

Implemented:
- `GlobalExceptionHandler` returns sanitized error bodies, keeps server-side stack logging, preserves framework HTTP statuses, and exposes a trace ID only for unexpected 500 responses.
- `CsvExportUtil` quotes CSV values, doubles embedded quotes, and neutralizes spreadsheet formula prefixes after leading whitespace/control characters.
- Export ZIP requires `startDate` and `endDate`, rejects invalid or over-31-day ranges before repository reads, and uses date-bounded repository queries.
- Frontend route wrappers now match backend routes for admin login and categories; logged-out forgot-PIN submit path remains disabled by Phase 3 policy.

## Related Code Files

- Modify: `backend/src/main/java/com/viepos/backend/controllers/OrderController.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/CardController.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/DataManagementController.java`
- Create: `backend/src/main/java/com/viepos/backend/controllers/GlobalExceptionHandler.java` or similar
- Create: `backend/src/main/java/com/viepos/backend/util/CsvExportUtil.java` or similar
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/pages/StaffLoginPage.tsx`
- Create/modify tests under backend/frontend test locations

## Implementation Steps

1. [x] Tests Before: malformed checkout response does not include `stackTrace`.
2. [x] Tests Before: CSV field beginning `=`, `+`, `-`, `@` is neutralized.
3. [x] Tests Before: broad export range rejected/bounded.
4. [x] Remove local `@ExceptionHandler` stack trace bodies from controllers.
5. [x] Add global sanitized exception handler with server-side logging.
6. [x] Add CSV escape/neutralization helper and use it for exports.
7. [x] Add export max range/streaming or pagination guard.
8. [x] Fix `authAPI.adminLogin` to `/api/auth/login` or remove it.
9. [x] Fix `productAPI.getCategories` to `/api/categories` or remove it.
10. [x] Align forgot-PIN UI with Phase 3 policy: hide logged-out reset or replace it with a non-submitting "contact manager" flow.
11. [x] Regression Gate: backend targeted tests + frontend build/type-check.

## Success Criteria

- [x] No API response exposes stack trace.
- [x] CSV formula injection blocked.
- [x] Export cannot load unbounded dataset into memory.
- [x] API wrappers no longer point to nonexistent routes.
- [x] Staff login page no longer submits logged-out forgot-PIN `{ email, newPin }`.

## Evidence

- RED tests were run first and failed while `GlobalExceptionHandler` and `CsvExportUtil` behavior was missing.
- Targeted backend tests passed: `cd backend && bash ./mvnw -Dtest=DataManagementControllerExportSafetyTest,GlobalExceptionHandlerTest,CsvExportUtilTest test` passed 6 tests, 0 failures/errors.
- Full backend tests passed: `cd backend && bash ./mvnw test` passed 54 tests, 0 failures/errors.
- Frontend build passed: `cd frontend && pnpm run build` passed, with existing Vite large chunk warning only.
- Static leak/contract grep passed: no matches for `stackTrace`, `printStackTrace`, `authAPI.forgotPin`, `forgotPin:`, `/api/auth/admin/login`, or `/api/products/categories` under backend Java and frontend source.
- Code review found and fixes verified:
  - HTTP status-carrying exceptions must not be converted to 500.
  - CSV formula neutralization must handle leading whitespace/control characters.
  - Spring MVC `ErrorResponse` exceptions must preserve their HTTP status.

## Risk Assessment

Forgot-PIN UI must follow the settled Phase 3 policy. Keep the frontend change minimal: remove the logged-out PIN reset submit path and use a non-submitting contact-manager fallback if UI copy is needed.

Residual risk:
- `DataManagementController` remains large; extraction was limited to CSV utility only to keep Phase 6 focused.
- Historical docs may still include example placeholders; Phase 6 only verifies runtime API/config response exposure, not a broad documentation rewrite.
