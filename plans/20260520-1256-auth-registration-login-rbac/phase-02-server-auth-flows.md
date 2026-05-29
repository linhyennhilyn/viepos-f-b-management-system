---
phase: 2
title: "Server Auth Flows"
status: completed
priority: P1
effort: "2d"
dependencies: [1]
---

# Phase 2: Server Auth Flows

## Context Links

- Phase 1: [`phase-01-database-and-auth-foundation.md`](./phase-01-database-and-auth-foundation.md)
- Current forms: [`../../components/auth/login-form.tsx`](../../components/auth/login-form.tsx), [`../../components/auth/create-account-form.tsx`](../../components/auth/create-account-form.tsx)

## Overview

Replace localStorage/demo auth with server registration and login. Public registration creates pending staff; login blocks pending/disabled accounts and creates secure sessions for active users.

## Requirements

- Functional: `/create-account` submits to server and creates `STAFF + PENDING`.
- Functional: root email registration is rejected because root is seed-only.
- Functional: `/login` submits email/password for all roles, no role switch or PIN path.
- Functional: active users redirect to `/dashboard`; pending users see pending approval message.
- Non-functional: generic auth errors avoid user enumeration.
- Security: rate limit login/register with concrete thresholds.

## Architecture

Use Better Auth route handler for email/password where possible. Wrap app-specific registration/login gates around Better Auth calls so role/status rules are enforced before session creation.

Server-side checks:
- registration rejects root email, then uses role/status helper defaults.
- login loads app user after password verification and before redirect/session acceptance.
- pending/disabled users cannot receive dashboard access.
- login rate limit: 5 failed attempts per 10 minutes per email+IP.
- register rate limit: 3 attempts per hour per IP.

## File Inventory

| File | Action | Test impact |
|------|--------|-------------|
| `app/api/auth/[...all]/route.ts` | Create | route integration |
| `app/(auth)/login/page.tsx` | Keep route, update component usage | UI smoke |
| `app/(auth)/create-account/page.tsx` | Keep route, update component usage | UI smoke |
| `components/auth/login-form.tsx` | Modify to email/password only | component behavior |
| `components/auth/create-account-form.tsx` | Modify pending staff copy/server submit | component behavior |
| `lib/auth/browser-session.ts` | Delete or isolate from production path | regression risk |
| `lib/auth/browser-accounts.ts` | Delete or isolate from production path | regression risk |
| `lib/auth/demo-auth.ts` | Delete or isolate test fixture only | regression risk |
| `lib/auth/account-registration.ts` | Replace with server validation schema | unit tests |
| `server/auth/register-user.ts` | Create | unit/integration |
| `server/auth/login-policy.ts` | Create | unit tests |
| `__tests__/server/auth/register-user.test.ts` | Create | TDD |
| `__tests__/server/auth/login-policy.test.ts` | Create | TDD |

## Test Scenario Matrix

| Scenario | Priority | Test before code |
|----------|----------|------------------|
| public register creates `STAFF + PENDING` | Critical | yes |
| root email public register is rejected/reserved | Critical | yes |
| duplicate email rejected | High | yes |
| pending login blocked | Critical | yes |
| disabled login blocked | Critical | yes |
| active root/admin/staff login allowed | Critical | yes |
| login rate limit triggers after 5 failed attempts in 10 minutes per email+IP | High | yes |
| register rate limit triggers after 3 attempts in 1 hour per IP | High | yes |

## Function / Interface Checklist

- `registerStaffAccount(input)`
- `assertPublicEmailCanRegister(email)`
- `canCreateSessionForUser(user)`
- `getPostLoginRedirect(user)` returns `/dashboard`
- server validation schema for register/login inputs
- rate limit wrapper for auth endpoints

## Dependency Map

- Depends on Phase 1 schema/auth config.
- Blocks Phase 3 dashboard guards.
- Blocks Phase 4 approval/role mutations because users must exist in DB.

## Implementation Steps

### Tests Before

1. Write tests for `registerStaffAccount` role/status output.
2. Write tests for login policy: pending/disabled blocked; active allowed.
3. Write tests that root email cannot register publicly at all.
4. Write rate-limit tests for login and register thresholds.

### Refactor / Build

1. Create Better Auth route handler.
2. Replace browser account/session helpers in production UI.
3. Simplify login UI to email/password only; remove manager/staff switch and PIN input from current flow.
4. Update create-account copy: account awaits approval.
5. Add server-side validation and generic user-facing error messages.
6. Add auth rate limiting using Better Auth config or server wrapper with the fixed thresholds above.
7. Redirect successful login to `/dashboard`.

### Tests After

1. Add route-level tests for register/login if test harness supports route handlers.
2. Add UI smoke tests once Playwright/e2e exists; otherwise document manual route checks.

### Regression Gate

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Success Criteria

- [x] LocalStorage auth is no longer production login/register path.
- [x] Public register creates pending staff only.
- [x] Root email cannot register publicly.
- [x] Pending/disabled login cannot enter dashboard.
- [x] Active users login and redirect to `/dashboard`.
- [x] Login/register rate-limit thresholds are enforced and tested.
- [x] Login/register tests pass.

## Risk Assessment

- Risk: Better Auth email/password flow may auto-create session before app status check. Mitigation: use Better Auth hooks/callbacks if available; otherwise use explicit server registration/login wrapper that checks status before redirect.
- Risk: removing PIN changes existing UI expectations. Mitigation: PIN is explicitly out of scope in report.

## Security Considerations

- Keep auth errors generic.
- Never expose whether an email is root/admin/staff.
- Rate limit before expensive password verification where possible.
- Direct Better Auth credential signup/signin endpoints are blocked; app auth routes are the only production credential path.
- Login verifies credentials before returning pending/disabled status messaging.
