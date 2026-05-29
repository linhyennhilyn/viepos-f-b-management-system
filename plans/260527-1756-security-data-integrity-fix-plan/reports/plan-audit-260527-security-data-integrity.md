# Plan Audit: Security Data Integrity Fix Plan

Date: 2026-05-27
Scope: `plans/260527-1756-security-data-integrity-fix-plan/`
Mode: adversarial plan audit, logic/security focus

## Findings

### High: Phase 2 lacks an explicit backend route allowlist, so STAFF access can remain open through `anyRequest().authenticated()`

Current code grants STAFF to management routes and then authenticates every other route. Plan says "Keep true POS endpoints available to STAFF" but does not enumerate POS endpoints or specify final fallback behavior. This is risky because unlisted management endpoints can remain STAFF-accessible if they fall through to `.anyRequest().authenticated()`.

Evidence:
- Plan: `phase-02-authorization-boundary.md:37-47`
- Current code: `backend/src/main/java/com/viepos/backend/security/SecurityConfig.java:44-66`

Required plan patch:
- Add a method/path RBAC matrix as an implementation artifact before code edits.
- Explicitly list STAFF-allowed POS endpoints.
- Set management endpoints to ADMIN/ROOT_ADMIN only.
- Define fallback: authenticated read-only endpoints only, or deny-by-default for unknown `/api/**` with explicit allows.

### High: Forgot-PIN policy is still unresolved but Phase 3 and Phase 6 depend on it

Plan architecture says minimal choice is authenticated PIN change/request and defer email-token unauthenticated reset. But plan still says "make logged-out forgot PIN either disabled or explicitly safe" and global unresolved questions ask whether forgotten PIN remains authenticated-only. That is a contradiction: implementation cannot be TDD-hard if the policy under test is undecided.

Evidence:
- Plan: `plan.md:98-101`
- Phase 3: `phase-03-account-request-and-pin-safety.md:23-26`, `phase-03-account-request-and-pin-safety.md:42`
- Phase 6 depends on this UI policy: `phase-06-data-exposure-and-api-contracts.md:49-61`
- Current public flow: `backend/src/main/java/com/viepos/backend/controllers/StaffController.java:369-388`

Required plan patch:
- Choose default now: disable logged-out forgot PIN for this fix plan, keep authenticated PIN change only.
- Move email-token reset to future issue/phase.
- Add regression tests for unauthenticated `/api/staff/forgot-pin` rejection and UI removal/disable.

### High: Phase 1 has no concrete test strategy for fail-fast secret config and may block on missing local Java/CI

Plan requires "Tests Before" proving required secret properties are env/profile-only, but does not name the test shape or how to run it given the known blocker: local machine lacks Java. This can turn the P0 containment phase into a manual edit without a reliable gate.

Evidence:
- Phase 1: `phase-01-incident-containment.md:36-42`
- Phase 7 blocker: `phase-07-regression-verification.md:34-58`
- Current hard-coded fallbacks: `backend/src/main/resources/application.yml:8-23`
- Current root seed: `backend/src/main/java/com/viepos/backend/DataSeeder.java:37-51`

Required plan patch:
- Specify exact tests: Spring context test with non-local profile fails when datasource/JWT missing; local profile can start with dummy/ignored config.
- Add prerequisite gate before Phase 1: install JDK 17 locally or run the backend test suite in CI and link result.
- Add config validation class if needed, not only YAML edits.

### Medium-High: Payment mismatch behavior remains "selected policy" instead of deterministic

Phase 4 says mismatch is "rejected or normalized per selected policy". For checkout money flows, this must not be left to implementer choice. Current code trusts client `paymentAmount`, overrides server total, and append-items adds client addon again.

Evidence:
- Phase 4: `phase-04-checkout-total-ownership.md:38-45`
- Current total override: `backend/src/main/java/com/viepos/backend/controllers/OrderController.java:198-220`
- Current append double-add path: `backend/src/main/java/com/viepos/backend/controllers/OrderController.java:246-277`
- Current item price trust: `backend/src/main/java/com/viepos/backend/services/OrderCheckoutService.java:86-135`

Required plan patch:
- Choose one behavior: server-calculated total is authoritative; mismatched `paymentAmount` returns 400 unless it is modeled separately as cash tender.
- Add tests for underpay, overpay, exact pay, and append addon payment.

### Medium: Phase 5 cancellation scope is too broad without concrete state invariants

Plan says cancellation should handle inventory/payment/session effects deliberately, but does not define the exact allowed transitions or idempotency behavior. Current status update only changes order status and note; adding restock/session logic without invariants risks double-restocking or corrupting payment history.

Evidence:
- Phase 5: `phase-05-inventory-and-session-consistency.md:40-48`
- Current cancel path: `backend/src/main/java/com/viepos/backend/controllers/OrderController.java:138-149`
- Current inventory deduction can go negative: `backend/src/main/java/com/viepos/backend/services/OrderCheckoutService.java:180-201`

Required plan patch:
- Define cancellation invariants before implementation:
  - only `COMPLETED`/active orders can transition to `CANCELLED` once,
  - restock happens once via compensating transaction,
  - payment rows remain immutable unless schema has status,
  - session/card release rules are explicit.
- Add idempotency regression: repeated cancel does not restock twice.

### Medium: Export memory bound is ambiguous: "streaming or pagination guard" can overbuild

Plan wants to bound or stream exports. Current code loads entire tables via `findAll()` and builds CSV/ZIP in memory. The plan should choose the smallest first fix, otherwise implementation may turn into a broad export rewrite.

Evidence:
- Phase 6: `phase-06-data-exposure-and-api-contracts.md:40-47`
- Current in-memory export: `backend/src/main/java/com/viepos/backend/controllers/DataManagementController.java:168-240`

Required plan patch:
- Pick a first fix: reject missing/too-wide date range and cap max days/rows.
- Treat streaming export as later enhancement unless cap is insufficient.

### Low-Medium: Phase 7 names `docs/project-changelog.md`, but repo does not currently have it

Plan says modify/create `docs/project-changelog.md` "if present/needed". Project instructions require changelog maintenance after bug fixes, and existing docs list has no changelog. Leaving this conditional may skip required docs.

Evidence:
- Phase 7: `phase-07-regression-verification.md:25-30`, `phase-07-regression-verification.md:42-47`
- Existing docs: no `docs/project-changelog.md`

Required plan patch:
- Make changelog creation explicit in Phase 7.
- Add docs impact line and issue links for #1-#8.

## Verdict

Plan is directionally correct and matches real bugs. Do not start `/ck:cook` yet. Patch the plan first for deterministic policies and verification gates, then run whole-plan consistency sweep.

## Unresolved Questions

- Has owner rotated Supabase/JWT/root credentials and purged exposed history?
- Confirm default forgot-PIN policy: disable logged-out reset now, defer email-token reset?
- What max export range/row cap is acceptable for production?
