---
phase: 2
title: Authorization Boundary
status: completed
priority: P1
effort: 1d
dependencies:
  - 1
---

# Phase 2: Authorization Boundary

## Overview

Move all management authorization to backend and prevent STAFF from using admin/settings/product/category/staff mutation APIs.

## Requirements

- Functional: STAFF can use POS flows only.
- Functional: ADMIN can manage staff/products/categories/inventory only where business policy allows.
- Functional: ROOT_ADMIN required for settings export/delete and role elevation.
- Non-functional: frontend route guards remain UX only.

## Architecture

Tighten `SecurityConfig` route matchers and add controller/service-level actor checks for target-sensitive actions. Prefer one policy helper over repeated inline role branching.

Authorization policy:
- Public: `/api/ping`, `/error`, `/api/auth/login`, `/api/staff/login`, `/api/staff/register` only.
- STAFF: explicit POS and self-service endpoints only. Keep selling/session flows and product/category read endpoints required by POS.
- ADMIN: staff/product/category/inventory management where target role is STAFF only.
- ROOT_ADMIN: `/api/settings/data`, `/api/settings/export/zip`, role elevation, and admin/root target management.
- Fallback: unknown or unlisted `/api/**` routes are not STAFF-accessible. Prefer deny-by-default for write/management routes and explicit read allowlist for POS data.

Route matrix deliverable before implementation:
- List method + path + allowed roles for staff management, settings data, products/categories, inventory, orders, cards/sessions, auth/PIN, and POS reads.
- Include at least one regression row for an unlisted management route to prove broad `.anyRequest().authenticated()` does not reopen STAFF access.

Concrete route matrix for this phase:

| Method | Path | Public | STAFF | ADMIN | ROOT_ADMIN | Notes |
|--------|------|--------|-------|-------|------------|-------|
| GET | `/api/ping`, `/error` | Yes | Yes | Yes | Yes | Health/error only |
| POST | `/api/auth/login` | Yes | Yes | Yes | Yes | Admin login endpoint |
| POST | `/api/auth/admin/register` | Yes for now | Yes for now | Yes for now | Yes for now | Keep unchanged in Phase 2; Phase 3 handles role-smuggling/admin registration policy |
| POST | `/api/staff/login`, `/api/staff/register` | Yes | Yes | Yes | Yes | Existing public staff auth/request flow |
| POST | `/api/staff/verify-pin`, `/api/staff/pin-change-request` | No | Yes | No | No | Self-service POS PIN routes |
| POST | `/api/staff/forgot-pin` | No | No | No | No | Disabled by Phase 3 policy; do not keep STAFF allow in final matrix |
| GET | `/api/products`, `/api/categories`, `/api/cards/free` | No | Yes | Yes | Yes | POS read data |
| POST | `/api/cards/session`, `/api/orders/takeaway`, `/api/orders/append-items` | No | Yes | Yes | Yes | POS selling/session flows |
| GET | `/api/staff/all`, `/api/staff/pending`, `/api/staff/history/**`, `/api/staff/pin-change-requests/**`, `/api/staff/pin-reset-requests/**` | No | No | Yes | Yes | Management reads |
| POST/PUT/DELETE | `/api/staff/**` management mutations | No | No | ADMIN for STAFF targets only | Yes | Controller/service target checks still required |
| POST/PUT/DELETE | `/api/products/**`, `/api/categories/**` | No | No | Yes | Yes | Catalog management |
| POST/PUT/DELETE | `/api/inventory/**` | No | No | Yes | Yes | Inventory management |
| PUT | `/api/orders/*/status` | No | No | Yes | Yes | Order management/cancel semantics continue in Phase 5 |
| DELETE | `/api/settings/data` | No | No | No | Yes | Root-only destructive action |
| GET | `/api/settings/export/zip` | No | No | No | Yes | Root-only data export |
| Any | unlisted `/api/**` management-style route | No | No | No by default | No by default | Add explicit allow later; no broad STAFF fallback |

Current execution note:
- Tests-first route matrix lives in `backend/src/test/java/com/viepos/backend/security/SecurityRouteMatrixTest.java`.
- Elevated target guards live in `backend/src/test/java/com/viepos/backend/controllers/StaffControllerAuthorizationTest.java`.
- RED was verified before implementation: STAFF management and ADMIN root-settings assertions returned 200 under old policy.
- GREEN evidence after implementation: `cd backend && bash ./mvnw test` passed 17 tests, 0 failures/errors.

## Related Code Files

- Modify: `backend/src/main/java/com/viepos/backend/security/SecurityConfig.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/StaffController.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/DataManagementController.java`
- Possibly create: `backend/src/main/java/com/viepos/backend/security/AuthorizationPolicy.java`
- Create/modify tests under `backend/src/test/java/...`

## Implementation Steps

1. [x] Tests Before: write the backend route matrix and role tests for STAFF/ADMIN/ROOT_ADMIN on `/api/staff/**`, product/category mutations, inventory mutations, order status, `/api/settings/**`, POS order/card/session endpoints, and POS read endpoints.
   - Use direct backend calls; do not depend on frontend route guards.
2. [x] Tests Before: add a regression proving STAFF cannot access an unlisted management `/api/**` endpoint through fallback authentication.
3. [x] Update `SecurityConfig` so STAFF cannot call management routes and unlisted management routes cannot fall through to broad authenticated access.
4. [x] Add actor-target checks:
   - STAFF cannot manage users.
   - ADMIN cannot create/edit/disable ADMIN or ROOT_ADMIN.
   - ROOT_ADMIN controls admin/root-level operations.
5. [x] Require ROOT_ADMIN for `/api/settings/data`, `/api/settings/data-range`, and `/api/settings/export/zip`.
6. [x] Keep explicit POS endpoints available to STAFF.
7. [x] Tests After: add direct-call tests proving localStorage role changes cannot grant backend rights.
8. [x] Regression Gate: backend compile + targeted security tests.

## Success Criteria

- [x] STAFF receives 403 for staff CRUD/approve/reject/role change/settings export/delete.
- [x] ADMIN cannot create/promote/admin-root targets.
- [x] ROOT_ADMIN can perform root-only operations.
- [x] POS STAFF flows still authenticate.
- [x] Unknown/unlisted management `/api/**` routes are not STAFF-accessible through fallback auth.

## Risk Assessment

Over-tightening can break POS endpoints currently living under broad authenticated routes. Mitigate with explicit route matrix before implementation and one STAFF POS smoke test.
