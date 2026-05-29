---
title: "POS Internal UI Shell Implementation"
description: "Replace the current card-style dashboard with the approved responsive ViePOS internal shell while preserving server-side RBAC."
status: completed
priority: P2
effort: "3d"
branch: "main"
tags: [feature, frontend, dashboard, responsive, tdd]
blockedBy: []
blocks: []
created: "2026-05-20T10:49:13.651Z"
createdBy: "ck:plan"
source: skill
---

# POS Internal UI Shell Implementation

## Overview

Implement the agreed internal POS dashboard shell from `plans/reports/260520-1710-pos-internal-ui-shell-brainstorm.md`.
Scope is UI shell + route placeholders only: topbar, dark sidebar, responsive wide/desktop/tablet/mobile layouts, RBAC-preserved navigation, and visual/accessibility verification. Real POS cart/payment/table workflows stay out of scope.

Scope Challenge:
- Existing code: `components/layout/dashboard-shell.tsx`, `app/dashboard.css`, dashboard route pages, `lib/auth/permissions.ts`, existing auth/RBAC tests.
- Minimum changes: split shell into focused layout/nav components, add logo/reference assets, update dashboard CSS, add tests for nav/RBAC and responsive shell behavior.
- Complexity: expected 8-12 touched source/test files; justified because current shell is one card and responsive/drawer behavior needs component separation.
- Selected mode: HOLD SCOPE with `--deep --tdd`.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Reference Assets and Baseline Tests](./phase-01-reference-assets-and-baseline-tests.md) | Completed |
| 2 | [Shell Navigation Model and Component Split](./phase-02-shell-navigation-model-and-component-split.md) | Completed |
| 3 | [Desktop Layout Implementation](./phase-03-desktop-layout-implementation.md) | Completed |
| 4 | [Responsive Drawer and Placeholder Screens](./phase-04-responsive-drawer-and-placeholder-screens.md) | Completed |
| 5 | [Visual Accessibility and Regression Verification](./phase-05-visual-accessibility-and-regression-verification.md) | Completed |

## Dependencies

- Source report: [`../reports/260520-1710-pos-internal-ui-shell-brainstorm.md`](../reports/260520-1710-pos-internal-ui-shell-brainstorm.md)
- Completed prior plan: [`../20260520-1256-auth-registration-login-rbac/plan.md`](../20260520-1256-auth-registration-login-rbac/plan.md)
- No unfinished overlapping project plans found.
- `docs/development-rules.md` and root `CLAUDE.md` were not present; use `README.md`, `docs/codebase-summary.md`, `docs/code-standards.md`, and `docs/design-guidelines.md`.

## Architecture Decision

- Keep RBAC source of truth in `lib/auth/permissions.ts`; do not edit it for labels/copy.
- Move nav metadata to a UI-owned module under `components/layout/`.
- Keep `DashboardShell` server-renderable where possible. Use a small client component only for drawer/collapse state if needed.
- Use `lucide-react` for standard UI icons. Use committed SVG/image assets only for ViePOS brand marks.
- Active nav uses dark green surface with white text; `#3CB018` is accent/hover/UI-only, not normal white text background.
- Persistent Playwright e2e is part of the TDD loop. Add authenticated dashboard setup before implementing responsive layout.

## Global Validation Gates

- [x] `pnpm lint`
- [x] `pnpm type-check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Browser screenshot check at `2560x1440`, `1920x1080`, `1440x1024`, `1024x768`, `390x844`
- [x] Playwright e2e uses a seeded authenticated user or documented storage state to reach protected dashboard routes
- [x] RBAC nav visibility verified for STAFF, ADMIN, ROOT_ADMIN
- [x] Normal text contrast passes WCAG AA in sidebar/topbar states

## Unresolved Questions

None.
