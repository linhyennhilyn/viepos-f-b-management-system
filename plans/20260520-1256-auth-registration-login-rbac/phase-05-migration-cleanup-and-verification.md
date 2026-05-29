---
phase: 5
title: "Migration Cleanup and Verification"
status: completed
priority: P1
effort: "1d"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Migration Cleanup and Verification

## Context Links

- Plan overview: [`plan.md`](./plan.md)
- Current tests: [`../../__tests__/lib/auth`](../../__tests__/lib/auth)
- Docs to update: [`../../docs/codebase-summary.md`](../../docs/codebase-summary.md), [`../../docs/system-architecture.md`](../../docs/system-architecture.md), [`../../docs/project-roadmap.md`](../../docs/project-roadmap.md)

## Overview

Remove demo/local auth paths from production, update docs, run full verification, and perform whole-plan/security consistency checks before implementation is considered ready.

## Requirements

- Functional: no production route uses localStorage auth or demo credentials.
- Functional: docs reflect `/dashboard`, roles, statuses, root seed, approval flow.
- Non-functional: lint/type/test/build pass.
- Security: regression tests prove root invariants and server-side RBAC.

## Architecture

This phase is cleanup and verification only. No new auth model decisions should appear here; contradictions found here must be resolved back in earlier phases before shipping.

## File Inventory

| File | Action | Test impact |
|------|--------|-------------|
| `lib/auth/browser-session.ts` | Delete or move to demo-only | auth regression |
| `lib/auth/browser-accounts.ts` | Delete or move to demo-only | auth regression |
| `lib/auth/demo-auth.ts` | Delete or test fixture only | auth regression |
| `__tests__/lib/auth/demo-auth.test.ts` | Delete/update | test cleanup |
| `app/admin/page.tsx` | Redirect/delete after dashboard stable | route regression |
| `app/pos/page.tsx` | Redirect/delete after dashboard stable | route regression |
| `docs/codebase-summary.md` | Update | docs |
| `docs/system-architecture.md` | Update | docs |
| `docs/project-roadmap.md` | Update | docs |
| `.env.example` | Verify complete | setup |

## Test Scenario Matrix

| Scenario | Priority | Test before code |
|----------|----------|------------------|
| grep finds no production imports of browser auth helpers | Critical | yes |
| all role/status matrix tests pass | Critical | from prior phases |
| root mutation tests pass | Critical | from prior phases |
| direct forbidden URL/API returns redirect/403 | Critical | after routes |
| docs mention root seed and pending approval | Medium | manual |

## Function / Interface Checklist

- no `validateBrowserLogin` in production route/component code
- no `saveRegisteredAccount` in production route/component code
- no `ProtectedRoute` client-only guard for secure pages
- all dashboard modules use server guard

## Dependency Map

- Depends on all implementation phases.
- Blocks `/ck:cook` completion and PR readiness.

## Implementation Steps

### Tests Before

1. Add grep-based or unit test guard that production files do not import localStorage auth helpers.
2. Ensure role/status/root invariant tests exist before deleting demo paths.

### Refactor / Build

1. Delete or isolate localStorage auth helpers and obsolete tests.
2. Redirect/delete legacy `/admin` and `/pos` pages.
3. Update docs with final auth architecture and setup commands.
4. Verify `.env.example` covers all required auth/db/root variables.
5. Run whole-plan consistency sweep against plan/report/docs.

### Tests After

1. Run full command set.
2. Run DB verification with Docker Postgres or local Postgres:
   - `pnpm exec prisma validate`
   - `pnpm exec prisma migrate dev`
   - root seed command
3. If DB verification cannot run, document the exact skipped reason in the final report.
4. Manually smoke local routes after DB verification:
   - `/login`
   - `/create-account`
   - `/dashboard`
   - `/dashboard/staff/approvals`
   - `/dashboard/staff/roles`

### Regression Gate

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`
5. `pnpm exec prisma validate`
6. `pnpm exec prisma migrate dev` on Docker/local Postgres, or documented skipped reason in final report
7. root seed command on Docker/local Postgres, or documented skipped reason in final report

## Success Criteria

- [x] No production code path relies on localStorage auth.
- [x] Legacy `/admin` and `/pos` do not bypass dashboard RBAC.
- [x] Docs match implemented auth architecture.
- [x] Full verification commands pass.
- [x] DB migration and root seed are smoke-tested on Docker/local Postgres, or skipped with explicit reason.
- [x] Security checklist has no open critical/high items.

## Verification Notes

- Local DB smoke attempted with `DATABASE_URL="postgresql://viepos:viepos@localhost:5432/viepos?schema=public"`.
- `prisma db push --skip-generate` failed with `P1010: User was denied access`; root seed smoke skipped because DB credentials were not accepted.
- Security review fixes completed after initial review: raw credential endpoint guard, DB-backed rate-limit storage, credential-first login status checks, duplicate-email race handling, active-target role changes, guarded root seed preclaim, multi-cookie login forwarding, and real logout.

## Risk Assessment

- Risk: stale docs still mention PIN/quick-login as implemented. Mitigation: mark them explicitly future/out of scope.
- Risk: generated files or build artifacts enter git. Mitigation: verify `.gitignore` and `git status`.

## Security Considerations

- Treat any remaining client-only route guard as a blocker.
- Treat any root mutation gap as a blocker.
- Treat failed tests as blockers; do not skip tests to pass build.
