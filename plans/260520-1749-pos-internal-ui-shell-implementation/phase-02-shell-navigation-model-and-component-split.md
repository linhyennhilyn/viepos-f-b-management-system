---
phase: 2
title: "Shell Navigation Model and Component Split"
status: completed
priority: P1
effort: "0.75d"
dependencies: [1]
---

# Phase 2: Shell Navigation Model and Component Split

## Context Links

- Current shell: [`../../components/layout/dashboard-shell.tsx`](../../components/layout/dashboard-shell.tsx)
- RBAC modules: [`../../lib/auth/permissions.ts`](../../lib/auth/permissions.ts)
- Dashboard pages: [`../../app/dashboard/page.tsx`](../../app/dashboard/page.tsx)

## Overview

Extract dashboard shell structure and nav metadata into focused files before visual refactor. This keeps RBAC server-side and prevents `dashboard-shell.tsx` from becoming a large mixed-concern component.

## Key Insights

- Current `MODULE_COPY` is inside `dashboard-shell.tsx`; move it to UI nav metadata so labels/icons can change without touching permissions.
- `DashboardShell` is currently a server component. Keep it server-first; isolate interactivity in a client child only if drawer/collapse state needs it.
- Active route styling likely needs `usePathname`, so a small client nav wrapper may be needed.

## Requirements

- Functional: nav renders overview plus visible modules, preserving STAFF/ADMIN/ROOT_ADMIN visibility.
- Non-functional: component files under 200 LOC; UI copy remains outside `lib/auth/permissions.ts`.

## Architecture

Proposed split:
- `dashboard-shell.tsx`: server wrapper, user/modules composition.
- `dashboard-navigation-items.tsx`: module UI metadata and grouping.
- `dashboard-sidebar.tsx`: sidebar markup.
- `dashboard-topbar.tsx`: topbar markup.
- `dashboard-shell-client.tsx`: optional client state for drawer/collapse/active route.

## Related Code Files

| Action | File | Notes |
|---|---|---|
| Modify | `components/layout/dashboard-shell.tsx` | Thin composition wrapper |
| Create | `components/layout/dashboard-navigation-items.tsx` | Labels, hrefs, icons, grouping |
| Create | `components/layout/dashboard-sidebar.tsx` | Dark navigation surface |
| Create | `components/layout/dashboard-topbar.tsx` | Logo, search, user/actions |
| Create | `components/layout/dashboard-shell-client.tsx` | Only if interactive state requires client component |
| Create | `__tests__/components/layout/dashboard-navigation.test.ts` | UI nav metadata and RBAC visibility tests |

## Test Scenario Matrix

| Scenario | Test Type | Expected |
|---|---|---|
| STAFF nav | Vitest | Overview, Sales, Orders only |
| ADMIN nav | Vitest | Overview, Sales, Orders, Menu, Staff, Approvals, Settings |
| ROOT_ADMIN nav | Vitest | ADMIN set plus Staff roles |
| Label/copy source | Static/unit | UI labels come from layout metadata, not permissions file |
| Route coverage | Unit | Every route in report has one nav item or child item |

## Function Or Interface Checklist

- `DashboardNavigationItem`
- `getDashboardNavigationItems(user)`
- `DASHBOARD_NAVIGATION_GROUPS`
- Existing `getVisibleDashboardModules(user)`
- `DashboardShell({ user, children })`

## Dependency Map

Depends on Phase 1 assets. Blocks visual layout, responsive drawer, and RBAC verification.

## Implementation Steps

1. Tests Before: write failing tests for nav visibility and route coverage.
2. Extract nav metadata from `dashboard-shell.tsx` into `dashboard-navigation-items.tsx`.
3. Keep module IDs typed as `DashboardModule`; include overview separately.
4. Add grouped children for staff approvals/roles without dropping direct route access.
5. Split topbar/sidebar markup into focused components.
6. Run `pnpm test -- __tests__/components/layout/dashboard-navigation.test.ts`.
7. Run `pnpm type-check`.

## Todo List

- [x] Add navigation tests first.
- [x] Extract typed nav metadata.
- [x] Split shell components.
- [x] Verify role-specific nav sets.

## Success Criteria

- [x] Navigation metadata tests pass for all roles.
- [x] `lib/auth/permissions.ts` unchanged unless access rules change.
- [x] `dashboard-shell.tsx` remains a small composition component.
- [x] No component file exceeds 200 LOC.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Client component expands too far | Keep client state wrapper small; pass serializable nav props |
| Route hidden by grouping | Unit test every RBAC-visible route |
| Icon mismatch | Use lucide for standard module icons only |

## Security Considerations

- Navigation visibility is not authorization. Keep route guards via `requireActiveUser` and `requireModuleAccess`.
