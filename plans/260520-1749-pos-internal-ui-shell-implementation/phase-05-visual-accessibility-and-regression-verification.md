---
phase: 5
title: "Visual Accessibility and Regression Verification"
status: completed
priority: P1
effort: "0.5d"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Visual Accessibility and Regression Verification

## Context Links

- Package scripts: [`../../package.json`](../../package.json)
- Design guidelines accessibility: [`../../docs/design-guidelines.md`](../../docs/design-guidelines.md)
- Source report success metrics: [`../reports/260520-1710-pos-internal-ui-shell-brainstorm.md`](../reports/260520-1710-pos-internal-ui-shell-brainstorm.md)

## Overview

Verify the final shell against compile, test, visual, responsive, RBAC, and accessibility gates. This phase catches regressions before implementation is called complete.

## Key Insights

- `package.json` currently has Vitest but no Playwright dependency or `e2e/` folder, even though README lists `pnpm test:e2e`.
- Browser screenshots are required by the report; add persistent Playwright coverage so responsive shell verification is repeatable.
- Protected dashboard routes require authenticated test setup; e2e must seed/login a user or preload a storage state before screenshot assertions.
- DB smoke may be blocked locally unless `DATABASE_URL` points to a running Postgres, per prior auth plan.

## Requirements

- Functional: all dashboard routes render, role-specific nav remains correct.
- Non-functional: no syntax/type/build errors; visual acceptance at wide desktop/desktop/tablet/mobile; contrast meets WCAG AA.

## Architecture

Verification layers:
- Unit: nav metadata/RBAC visibility.
- Compile: `pnpm lint`, `pnpm type-check`, `pnpm build`.
- E2E setup: seed root/admin/staff users or create a Playwright storage state through the real login flow.
- Browser: authenticated screenshots at `2560x1440`, `1920x1080`, `1440x1024`, `1024x768`, `390x844`.
- Accessibility: keyboard nav, focus states, landmark structure, text contrast.

## Related Code Files

| Action | File | Notes |
|---|---|---|
| Modify/Create | `__tests__/components/layout/dashboard-navigation.test.ts` | Role and route coverage |
| Create | `e2e/dashboard-shell.spec.ts` | Persistent responsive shell and drawer checks |
| Create | `e2e/authenticated-dashboard.setup.ts` | Seed/login helper or storage state setup |
| Modify | `package.json` | Add Playwright dependency and `test:e2e` script if still missing |
| Create | `playwright.config.ts` | Only if not already present |
| Read | `app/dashboard.css` | Contrast/responsive verification |

## Test Scenario Matrix

| Scenario | Command/Tool | Expected |
|---|---|---|
| Unit regression | `pnpm test` | 0 failures |
| Type safety | `pnpm type-check` | exit 0 |
| Build | `pnpm build` | exit 0 |
| E2E auth setup | Playwright setup | Protected dashboard route reached after real login/storage state |
| Ultra-wide desktop visual | Browser screenshot `2560x1440` | full-width shell, stable sidebar/topbar, text <= `72ch`, forms <= `720px`, content band <= `1600px` where applicable |
| Wide desktop visual | Browser screenshot `1920x1080` | full-width shell, stable sidebar/topbar, text <= `72ch`, forms <= `720px`, content band <= `1600px` where applicable |
| Desktop visual | Browser screenshot `1440x1024` | 225px sidebar, 60px topbar, search, user actions, settings bar |
| Tablet visual | Browser screenshot `1024x768` | responsive layout usable |
| Mobile visual | Browser screenshot `390x844` | drawer usable, no clipped primary nav |
| Contrast | Manual/calculated | sidebar/topbar normal text >= 4.5:1 |
| RBAC | Unit/manual role routes | STAFF/ADMIN/ROOT_ADMIN expected nav sets |

## Function Or Interface Checklist

- `getDashboardNavigationItems`
- `DashboardShell`
- `DashboardSidebar`
- `DashboardTopbar`
- `DashboardShellClient`

## Dependency Map

Final gate depends on every implementation phase. Blocks completion and docs updates.

## Implementation Steps

1. Tests Before: run all existing tests before final visual verification to catch unrelated regressions.
2. Run `pnpm lint`.
3. Run `pnpm type-check`.
4. Run `pnpm test`.
5. Add Playwright config/specs before Phase 3/4 implementation if missing and install the required dev dependency.
6. Add authenticated dashboard setup: seed root/admin/staff users, login through the real UI/API, and store Playwright storage state.
7. Run `pnpm build`.
8. Start `pnpm dev` on an available port.
9. Run `pnpm test:e2e` for authenticated dashboard shell viewports.
10. Capture/inspect browser screenshots at `2560x1440`, `1920x1080`, `1440x1024`, `1024x768`, and `390x844`.
11. Verify keyboard focus through topbar, drawer, nav, and logout.
12. Update docs/changelog only if implementation materially changes documented UI behavior.

## Todo List

- [x] Run all compile/test gates.
- [x] Add persistent Playwright responsive shell coverage.
- [x] Add authenticated dashboard Playwright setup.
- [x] Capture target viewport screenshots.
- [x] Verify keyboard/focus/contrast.
- [x] Record docs impact.

## Success Criteria

- [x] All compile/test commands pass.
- [x] `pnpm test:e2e` exists, reaches authenticated dashboard routes, and passes, or a documented environment blocker explains why it could not run.
- [x] Screenshots match report success metrics.
- [x] No clipped text or overlapping controls at target viewports.
- [x] Wide desktop content respects numeric readable-width constraints.
- [x] Active/sidebar normal text contrast passes WCAG AA.
- [x] RBAC nav still matches STAFF/ADMIN/ROOT_ADMIN matrix.
- [x] Docs impact recorded as none/minor/major.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Browser verification skipped | Completion cannot be claimed until screenshots are inspected |
| Playwright dependency creep | Accepted because README already lists Playwright and screenshots are explicit acceptance gates |
| Local DB blocks protected pages | Use seeded local DB when available; otherwise document blocker and verify unauthenticated compile/build gates |
| E2E screenshots capture login instead of dashboard | Assert dashboard URL/shell landmarks before any screenshot assertion |

## Security Considerations

- Verification must include route guards still present on protected pages.
