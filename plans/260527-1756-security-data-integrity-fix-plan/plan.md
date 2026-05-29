---
title: Security Data Integrity Fix Plan
description: >-
  Fix critical ViePOS security, authorization, checkout, inventory, and data
  exposure bugs with tests-first phases.
status: in-progress
priority: P1
effort: 5d
branch: main
tags:
  - bugfix
  - backend
  - frontend
  - auth
  - security
  - data-integrity
  - tdd
blockedBy: []
blocks: []
created: '2026-05-27T10:57:22.029Z'
createdBy: 'ck:plan'
source: skill
---

# Security Data Integrity Fix Plan

## Overview

Fix GitHub issues #1-#8 found during full codebase review. Scope is security and data correctness only: no stack change, no new auth provider, no UI redesign.

Priority order:
1. Contain live secret/root-bootstrap risk.
2. Move authorization decisions to backend.
3. Close account/PIN takeover paths.
4. Make checkout totals server-owned.
5. Make inventory/session state consistent.
6. Sanitize data exposure and API contracts.
7. Run regression gates.

Scope Challenge:
- Existing code: Spring Security/JWT, controllers, repositories, `ProductPriceService`, audit service, Vite API wrapper.
- Minimum changes: fix policy and invariants in current Spring Boot/Vite architecture; defer email-token password reset and broad service rewrite.
- Complexity: >8 files justified by independent bug domains. Keep new abstractions to small policy/helper services only.
- Selected mode: HOLD SCOPE with `--hard --tdd`.

Research:
- Auth/security researcher recommends P0 secrets, P1 server RBAC, P2 request integrity, P3 error/export safety, P4 frontend contracts.
- Order/inventory review findings already verified in issues #4-#6; no new architecture needed beyond service-level invariants and tests.

## Execution Notes

Last updated: 2026-05-28.

- Phase 1 code-side containment is complete and pushed:
  - `1b778d2 fix(security): remove unsafe secret defaults`
  - `e1a58d1 docs(plan): mark incident containment complete`
  - GitHub evidence: issue #1 comment `https://github.com/huyennguyennhu/ViePOS-F-B-Management-system/issues/1#issuecomment-4556389833`
- Local Java gate is resolved with JDK 17 from Homebrew. Backend tests for Phase 1 passed via `cd backend && bash ./mvnw test`.
- Phase 1 remains incident-open operationally until owner confirms Supabase/JWT/root credential rotation and exposed-history handling.
- Phase 2 code is implemented and reviewed. Backend route matrix and elevated-target guard tests pass in `cd backend && bash ./mvnw test`.
- Phase 2 fixed source: `SecurityConfig` now uses explicit allowlists plus deny-by-default fallback; `StaffController` blocks ADMIN from creating/promoting/editing/deleting ADMIN or ROOT_ADMIN targets.
- Phase 3 code is implemented and reviewed. Account/PIN request safety tests pass; frontend forgot-PIN no longer submits logged-out reset data.
- Phase 4 code is implemented and reviewed. Checkout prices, totals, and payment rows are now server-owned for takeaway, append-items, and card session checkout paths.
- Phase 4 fixed source: `OrderCheckoutService` resolves prices through `ProductPriceService`, `CheckoutPaymentValidationService` rejects mismatched tender before touched write paths, and card session duration aliases reuse checkout service-type normalization.
- Phase 5 issue #5 is implemented and reviewed. Manual export now maps to backend `EXPORT`, existing DBs have a non-destructive enum patch, inventory mutations lock products in stable order, and export/sale paths reject negative stock before writes.
- Phase 5 issue #6 is implemented and reviewed. Card session start locks the card row, rejects existing active sessions before side effects, and cancellation locks the order row, restocks once, records inventory adjustment, preserves payments, completes active sessions, and releases cards.
- Phase 6 issue #7 is implemented and reviewed. Stack traces are removed from API responses, CSV exports neutralize spreadsheet formulas including whitespace/control-prefix variants, and export ZIP reads are bounded to explicit date ranges of 31 days or less.
- Phase 6 issue #8 is implemented and reviewed. Frontend wrappers now target existing backend routes for admin login and categories, and no logged-out forgot-PIN submit wrapper remains.
- Phase 6 verification passed: targeted backend tests passed 6 tests, full backend suite passed 54 tests, frontend build passed with only the existing Vite large chunk warning, static leak/contract grep returned no matches, and final code review found no findings.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Incident Containment](./phase-01-incident-containment.md) | Completed |
| 2 | [Authorization Boundary](./phase-02-authorization-boundary.md) | Completed |
| 3 | [Account Request and PIN Safety](./phase-03-account-request-and-pin-safety.md) | Completed |
| 4 | [Checkout Total Ownership](./phase-04-checkout-total-ownership.md) | Completed |
| 5 | [Inventory and Session Consistency](./phase-05-inventory-and-session-consistency.md) | Completed |
| 6 | [Data Exposure and API Contracts](./phase-06-data-exposure-and-api-contracts.md) | Completed |
| 7 | [Regression Verification](./phase-07-regression-verification.md) | Pending |

## Dependencies

- No unfinished overlapping plans found.
- Completed prior auth/RBAC plan exists but current Spring Boot code diverges from that documented Next.js/Better Auth architecture.
- GitHub issues:
  - #1 Critical secrets/default prod DB/root seed
  - #2 Critical STAFF privilege escalation
  - #3 Critical account/PIN takeover
  - #4 High checkout totals/payment trust
  - #5 High inventory export/stock consistency
  - #6 High session double-book/cancel consistency
  - #7 High stack trace/CSV/export exposure
  - #8 Medium frontend API contract mismatch

## Architecture Decision

- Keep Spring Boot + JWT + PostgreSQL. Do not introduce Better Auth or Prisma.
- Backend is source of truth for role, target, price, total, inventory, and data-export policy.
- Frontend `localStorage.role` is UX only.
- Use `@WebMvcTest`/`MockMvc` or Spring Boot tests for API policy and regression gates.
- Avoid H2 for repository/integration tests that touch PostgreSQL enum mappings; use MockMvc slices, mocked repositories, or PostgreSQL/Testcontainers when DB behavior matters.
- Authorization defaults to explicit route allowlists. Unknown `/api/**` routes must not become STAFF-accessible through a broad authenticated fallback.
- Forgot-PIN policy for this fix plan: disable logged-out PIN reset and keep only authenticated PIN change/request. Defer email-token reset to a future issue.
- Secret config policy: non-local startup fails when datasource or JWT secret env is missing; local/bootstrap profile remains the only safe seeded-dev path.
- Checkout money policy: server-calculated totals win. Client `item.price` and `paymentAmount` never set `order.totalAmount`; payment mismatch returns 400 except cash over-tender tracked through `cashReceived`.
- Prefer small focused services/helpers:
  - authorization policy for actor/target checks,
  - checkout pricing/total calculation,
  - inventory mutation guard,
  - global error handler and CSV escaping utility.
- Do not mark #1 complete until external credential rotation is verified by owner.

## Red Team Findings Applied

- Do not remove config defaults without adding a safe local-dev path; otherwise developer startup breaks.
- Do not claim payment refund/void unless schema supports payment state; preserve payment history and document limitation.
- Do not rely on frontend tests for RBAC; every privilege boundary needs backend direct-call coverage.
- Do not close #1 from code alone; rotation/history purge is external evidence.
- Do not leave forgot-PIN behavior to implementer choice; logged-out reset is disabled in this plan.
- Do not leave `/api/**` fallback broad enough to grant unlisted management routes to STAFF.
- Do not normalize checkout payment mismatch silently; reject inconsistent payment totals and keep cash tender separate.

## Applied High Recommendations

- Phase 1 fail-fast secret plan is implemented with concrete runtime validation and tests; Java 17 local gate is resolved.
- Phase 2 must implement an explicit method/path route matrix before changing authorization policy.
- Phase 3 policy is fixed: logged-out forgot-PIN is disabled in this plan; email-token recovery is deferred.

## Phase 2 Evidence

- Backend tests: `cd backend && bash ./mvnw test` passed 17 tests, 0 failures/errors.
- Code review: code-reviewer re-review found no blocking issues after `/api/settings/data-range` was made ROOT_ADMIN-only and missing matrix rows were added.
- Regression coverage includes STAFF management denials, ADMIN root-settings denial, ROOT_ADMIN settings access, unlisted `/api/**` fallback denial, and elevated target create/promote/edit/delete guards.

## Phase 3 Evidence

- Backend tests: `cd backend && bash ./mvnw test` passed 24 tests, 0 failures/errors.
- Frontend build: `cd frontend && pnpm run build` passed.
- Code review: code-reviewer re-review found no blocking issues after locked request transitions, marker-based role mapping, and admin-registration reject guard were added.
- Regression coverage includes display-name role smuggling, server-controlled admin request marker, logged-out forgot-PIN rejection, authenticated PIN change binding, wrong PIN request type rejection, and pending request row locking.

## Phase 4 Implementation Notes

- Test-first scope:
  - tampered `item.price` cannot change persisted unit price or total,
  - `paymentAmount` below server total returns 400,
  - transfer/non-cash overpay or mismatch returns 400,
  - cash `cashReceived` greater than server total succeeds while payment amount remains server total,
  - append-items increases total exactly once,
  - append-items payment amount equals server-calculated addon subtotal.
- Keep compatibility for existing service type names: `TAKEAWAY`, `FOUR_HOURS`, `PACKAGE_4H`, `FULL_DAY`, `FULLTIME`.
- Do not add payment refund/void schema in Phase 4. Preserve the existing payment model and fix amount ownership only.
- Prefer a small checkout payment validation helper over duplicating mismatch logic in both order and card controllers.
- Code-review gate for Phase 4 must specifically inspect price-source ownership, append total math, and cash-vs-payment amount semantics before committing.

## Phase 4 Evidence

- Backend tests: `cd backend && bash ./mvnw test` passed 37 tests, 0 failures/errors.
- Code review:
  - First review found one blocking service-type alias gap; fixed and retested.
  - Re-review found one medium card-session duration alias gap; fixed and retested.
  - Final narrow re-review found no blocking/important findings.
- Regression coverage includes tampered item price, transfer under/over mismatch, cash over/under tender, append total double-count prevention, append addon payment amount, card session underpay pre-write rejection, and service-type alias compatibility.

## Global Validation Gates

- [x] Backend tests cover STAFF/ADMIN/ROOT_ADMIN route matrix.
- [x] Backend tests prove unknown or unlisted management `/api/**` routes are not STAFF-accessible.
- [x] Backend tests cover admin smuggling and PIN reset takeover regressions.
- [x] Backend tests cover unauthenticated forgot-PIN rejection and authenticated PIN change binding.
- [ ] Backend config tests cover non-local fail-fast secrets and safe local profile startup.
- [x] Backend tests cover checkout server-side pricing and append total.
- [x] Backend tests cover payment mismatch, cash over-tender, and append addon payment amount.
- [x] Backend tests cover inventory export enum, negative stock rejection, and session double-book guard.
- [x] Frontend build/type-check passes after API wrapper changes.
- [x] No stack traces or raw secrets in API responses/config.
- [x] `git diff` secret scan before commit.

## Unresolved Questions

- Has Supabase password/JWT/root credential already been rotated?
