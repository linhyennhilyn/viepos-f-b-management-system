---
phase: 3
title: "Dashboard RBAC Shell"
status: completed
priority: P1
effort: "1.5d"
dependencies: [1, 2]
---

# Phase 3: Dashboard RBAC Shell

## Context Links

- Current protected route: [`../../components/auth/protected-route.tsx`](../../components/auth/protected-route.tsx)
- Current pages: [`../../app/admin/page.tsx`](../../app/admin/page.tsx), [`../../app/pos/page.tsx`](../../app/pos/page.tsx)

## Overview

Create a shared `/dashboard` route with server-side role/status guards. Replace split `/admin` and `/pos` entry behavior with one dashboard shell that exposes modules based on permissions.

## Requirements

- Functional: all active roles land on `/dashboard`.
- Functional: staff sees only sales/order modules.
- Functional: admin/root see operations modules.
- Non-functional: dashboard is responsive and matches current auth visual direction.
- Security: route protection runs on server, not client-only `ProtectedRoute`.

## Architecture

Use a server-side session accessor and permission map:

```ts
type DashboardModule = 'sales' | 'orders' | 'menu' | 'staff' | 'staff-approvals' | 'staff-roles' | 'settings';
```

Dashboard layout reads session on the server, checks `status === ACTIVE`, then computes visible modules from role. Nested pages call the same guard.

## File Inventory

| File | Action | Test impact |
|------|--------|-------------|
| `app/dashboard/page.tsx` | Create | route smoke |
| `app/dashboard/layout.tsx` | Create | route guard |
| `app/dashboard/sales/page.tsx` | Create or move POS placeholder | access tests |
| `app/dashboard/orders/page.tsx` | Create placeholder | access tests |
| `app/dashboard/menu/page.tsx` | Create placeholder | access tests |
| `app/dashboard/staff/page.tsx` | Create placeholder | access tests |
| `app/dashboard/staff/approvals/page.tsx` | Create placeholder | access tests |
| `app/dashboard/staff/roles/page.tsx` | Create placeholder | access tests |
| `app/dashboard/settings/page.tsx` | Create placeholder | access tests |
| `components/layout/dashboard-shell.tsx` | Create | component tests |
| `lib/auth/permissions.ts` | Create | unit tests |
| `lib/auth/require-session.ts` | Create | integration tests |
| `middleware.ts` | Create if needed | route tests |
| `app/admin/page.tsx` | Redirect or remove after dashboard stable | regression |
| `app/pos/page.tsx` | Redirect or remove after dashboard stable | regression |
| `__tests__/lib/auth/permissions.test.ts` | Create | TDD |

## Test Scenario Matrix

| Scenario | Priority | Test before code |
|----------|----------|------------------|
| active staff allowed sales/orders only | Critical | yes |
| active admin allowed operations but not staff roles | Critical | yes |
| root allowed staff roles | Critical | yes |
| pending/disabled cannot access dashboard | Critical | yes |
| unauthenticated redirects to login | Critical | yes |
| direct URL access denied for forbidden modules | Critical | yes |

## Function / Interface Checklist

- `canAccessDashboard(user)`
- `canAccessModule(user, module)`
- `getVisibleDashboardModules(user)`
- `requireActiveUser()`
- `requireModuleAccess(module)`

## Dependency Map

- Depends on Phase 2 server session.
- Blocks Phase 4 UI placement for approvals/role management.
- Phase 5 removes old routes after dashboard is stable.

## Implementation Steps

### Tests Before

1. Write permission matrix tests for each role/status/module.
2. Write tests for unauthenticated/pending/disabled dashboard denial using guard helpers.

### Refactor / Build

1. Create `permissions.ts` with role/status module matrix.
2. Create server-side session guard helpers.
3. Create `/dashboard` layout and shell.
4. Move existing admin/pos placeholder content into dashboard modules.
5. Make `/admin` and `/pos` removed or server-guarded redirects to `/dashboard`.
6. Remove client-only `ProtectedRoute` from production guarded routes.

### Tests After

1. Add route-level tests or server helper tests for direct module access.
2. Add visual/manual smoke check for dashboard nav per role after seed/test users exist.

### Regression Gate

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Success Criteria

- [x] `/dashboard` exists and is the only post-login destination.
- [x] Permission matrix tests cover every role/status.
- [x] Staff cannot access management modules by URL.
- [x] Admin cannot access role management by URL.
- [x] Root can access all modules.
- [x] `/admin` and `/pos` are removed or server-guarded redirects; no unguarded legacy route remains.

## Risk Assessment

- Risk: middleware cannot securely validate full session by cookie alone. Mitigation: use server guard in layouts/pages/API as source of truth; middleware can be convenience redirect only.
- Risk: duplicated permission checks in UI and API. Mitigation: central `permissions.ts`.

## Security Considerations

- Server guards must check status and role.
- Hidden nav is not a security boundary.
- Avoid exposing role management links to unauthorized users, but still enforce on server.
