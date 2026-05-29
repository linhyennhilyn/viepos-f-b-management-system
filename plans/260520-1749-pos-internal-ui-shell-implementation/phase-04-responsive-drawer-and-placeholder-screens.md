---
phase: 4
title: "Responsive Drawer and Placeholder Screens"
status: completed
priority: P2
effort: "0.75d"
dependencies: [2, 3]
---

# Phase 4: Responsive Drawer and Placeholder Screens

## Context Links

- Dashboard route pages: [`../../app/dashboard`](../../app/dashboard)
- Staff approval page: [`../../app/dashboard/staff/approvals/page.tsx`](../../app/dashboard/staff/approvals/page.tsx)
- Staff roles page: [`../../app/dashboard/staff/roles/page.tsx`](../../app/dashboard/staff/roles/page.tsx)

## Overview

Make the shell responsive and upgrade route placeholders without inventing real POS workflows. Desktop remains primary, and wide desktop/tablet/mobile must all be usable and testable.

## Key Insights

- Most route pages are 12-line placeholders; staff approval/roles pages contain real admin forms and must keep server actions.
- No `e2e/` directory exists. Responsive verification may need browser-driven checks in Phase 5.
- Mobile drawer likely needs a small client component for open/close state.
- Wide desktop needs content scaling rules, not just empty space around a narrow dashboard.

## Requirements

- Functional: sidebar becomes drawer on small viewport; topbar remains usable; placeholders look intentional.
- Non-functional: touch targets >= 44px; no clipped labels at 390px width.

## Architecture

Responsive behavior:
- Wide desktop >= 1600px: full-width shell with stable sidebar/topbar and content grids that can expand by columns.
- Ultra-wide desktop `2560x1440`: same shell frame; cards/forms follow max width constraints from Phase 3.
- Desktop >= 1024px: fixed sidebar + topbar.
- Tablet/mobile < 1024px: topbar menu button opens drawer overlay.
- Drawer closes on link selection and close button.
- Search becomes compact input or icon-first control.

Placeholder strategy:
- Introduce reusable placeholder/metric components only if it reduces repeated route markup.
- Do not fake API state. Static copy is allowed; real staff forms stay real.

## Related Code Files

| Action | File | Notes |
|---|---|---|
| Modify | `components/layout/dashboard-shell-client.tsx` | Drawer/collapse state |
| Modify | `app/dashboard.css` | Responsive media queries |
| Create | `components/layout/dashboard-module-placeholder.tsx` | Optional reusable placeholder component |
| Modify | `app/dashboard/page.tsx` | Overview placeholder/metric layout |
| Modify | `app/dashboard/{sales,orders,menu,staff,settings}/page.tsx` | Intentional placeholder screens |
| Modify | `app/dashboard/staff/approvals/page.tsx` | Preserve real form actions; update layout only |
| Modify | `app/dashboard/staff/roles/page.tsx` | Preserve real form actions; update layout only |

## Test Scenario Matrix

| Scenario | Test Type | Expected |
|---|---|---|
| Drawer toggle | Component/browser | Opens and closes at mobile viewport |
| Wide content scaling | Playwright/browser | Text <= `72ch`, forms <= `720px`, content band <= `1600px` where applicable at `1920x1080` and `2560x1440` |
| Drawer route links | Browser/manual | Links visible and tappable at 390px |
| Touch target size | Browser/manual | nav/action buttons >= 44px tall |
| Placeholder copy | Build/review | No fake API data or invented POS state |
| Staff forms preserved | Existing tests/build | Server actions still compile |

## Function Or Interface Checklist

- `DashboardShellClient` or equivalent drawer state component.
- `DashboardModulePlaceholder` if created.
- Existing `approveAction`, `roleAction`, `disableAction` remain server actions.

## Dependency Map

Depends on desktop shell structure from Phase 3. Blocks final visual verification.

## Implementation Steps

1. Tests Before: create failing Playwright specs for drawer toggle, drawer links, touch targets, and wide-content constraints before responsive CSS changes.
2. Add mobile drawer state with accessible buttons and `aria-expanded`.
3. Add wide desktop CSS for content grids and readable text/form widths.
4. Add responsive CSS for `<1024px` and narrow mobile.
5. Update route placeholders with consistent module titles, descriptions, empty states, and lightweight metric blocks.
6. Keep staff approval/roles business forms intact.
7. Run `pnpm type-check`, `pnpm test`, `pnpm build`.

## Todo List

- [x] Implement drawer state and accessible controls.
- [x] Add wide desktop content scaling.
- [x] Add responsive CSS for tablet/mobile.
- [x] Upgrade placeholders without fake data.
- [x] Preserve staff admin form behavior.

## Success Criteria

- [x] `2560x1440` and `1920x1080` viewports have full-width shells with numeric readable-width constraints enforced.
- [x] `390x844` viewport has usable nav drawer and no clipped topbar text.
- [x] `1024x768` viewport keeps organized tablet layout.
- [x] Placeholder screens are visibly intentional without fake integrations.
- [x] Existing admin server actions still compile.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Responsive behavior over-expands scope | Only shell/drawer/placeholders; no POS workflows |
| Staff forms break while restyling | Treat forms as existing business behavior; change containers only |
| Mobile drawer inaccessible | Use semantic buttons, `aria-expanded`, visible focus |

## Security Considerations

- Do not downgrade `requireModuleAccess` checks in route pages.
