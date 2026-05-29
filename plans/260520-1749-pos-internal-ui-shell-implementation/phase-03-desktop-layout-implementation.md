---
phase: 3
title: "Desktop Layout Implementation"
status: completed
priority: P1
effort: "0.75d"
dependencies: [1, 2]
---

# Phase 3: Desktop Layout Implementation

## Context Links

- Current CSS: [`../../app/dashboard.css`](../../app/dashboard.css)
- Global tokens: [`../../app/globals.css`](../../app/globals.css)
- Design guidelines: [`../../docs/design-guidelines.md`](../../docs/design-guidelines.md)

## Overview

Replace card-centered dashboard styling with the canonical desktop shell: 225px dark sidebar, 60px white topbar, off-white content area, search pill, right action/user group, bottom settings bar. Include wide-desktop behavior so `1920x1080`, `2560x1440`, and larger screens do not produce stretched, unreadable content.

## Key Insights

- Current CSS uses centered `.dashboard-card`; it must become an app shell.
- Canonical shell overrides older design guideline sidebar width of 280px for this surface.
- Active nav must use dark green + white text. Do not use white normal text on `#3CB018`.

## Requirements

- Functional: desktop shell matches the approved 1440x1024 structure and remains polished at wide desktop widths.
- Non-functional: WCAG AA for normal text; stable dimensions to prevent layout shifts.

## Architecture

CSS strategy:
- Keep `app/dashboard.css` as route-level dashboard styling.
- Add shell class groups: `.dashboard-shell`, `.dashboard-sidebar`, `.dashboard-topbar`, `.dashboard-main`, `.dashboard-content`.
- Use CSS custom properties for shell dimensions: `--dashboard-sidebar-width: 225px`, `--dashboard-topbar-height: 60px`.
- Use semantic HTML: `aside`, `header`, `nav`, `main`.
- For wide screens, keep the shell full-bleed but constrain dense content bands/cards with responsive grids and readable max line lengths.
- Numeric wide constraints: text blocks max `72ch`; forms max `720px`; dense card grids use `repeat(auto-fit, minmax(260px, 1fr))` with a max content band of `1600px` unless a table/grid surface needs full width.

## Related Code Files

| Action | File | Notes |
|---|---|---|
| Modify | `app/dashboard.css` | Full shell layout and desktop states |
| Modify | `components/layout/dashboard-sidebar.tsx` | Desktop nav and settings pin |
| Modify | `components/layout/dashboard-topbar.tsx` | Search and user/action area |
| Modify | `components/layout/dashboard-shell.tsx` | Apply shell containers |

## Test Scenario Matrix

| Scenario | Test Type | Expected |
|---|---|---|
| CSS tokens present | Static/Vitest or review | 225px sidebar, 60px topbar |
| Active text contrast | Unit helper or manual calc | white on `#256E05` passes AA |
| Landmark structure | Build/HTML review | `aside`, `header`, `nav`, `main` present |
| Desktop screenshot | Browser visual | Layout matches canonical structure |
| Wide desktop screenshot | Browser visual | Full-width shell, stable sidebar/topbar, text <= `72ch`, forms <= `720px`, content band <= `1600px` where applicable |

## Function Or Interface Checklist

- `DashboardSidebar`
- `DashboardTopbar`
- `DashboardShell`
- CSS classes for shell/active item/search/user area/settings bar.

## Dependency Map

Depends on Phase 2 component split. Blocks responsive behavior because mobile should adapt the final desktop structure.

## Implementation Steps

1. Tests Before: add/confirm contrast expectation for active colors and add failing Playwright checks for desktop/wide shell dimensions before CSS changes.
2. Replace `.dashboard-page` centered layout with full-height shell layout.
3. Implement sidebar width `225px`, background `#143D00`, active dark green surface, white text/icons.
4. Implement topbar height `60px`, search pill `262x38`, right action/user group.
5. Pin settings area at sidebar bottom with `52px` height.
6. Add wide desktop rules: content grids may add columns, text blocks keep readable max widths, forms/buttons keep stable dimensions.
7. Preserve existing page children in content area.
8. Run `pnpm type-check`, `pnpm build`.

## Todo List

- [x] Add contrast check/notes.
- [x] Replace card layout CSS.
- [x] Implement desktop sidebar/topbar/content layout.
- [x] Add wide desktop content constraints.
- [x] Verify desktop build.

## Success Criteria

- [x] Desktop shell uses 225px sidebar and 60px topbar.
- [x] Wide desktop shell at `1920x1080` and `2560x1440` fills the viewport with text <= `72ch`, forms <= `720px`, and dense content band <= `1600px` where applicable.
- [x] Active/sidebar text passes WCAG AA normal text contrast.
- [x] Existing dashboard pages render inside the shell without route changes.
- [x] `pnpm build` passes.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| CSS becomes monolithic | Group by shell sections and avoid unrelated auth CSS edits |
| Text clipped in topbar | Use min/max widths and overflow-safe user labels |
| White-on-light-green regression | Tests/notes lock dark active text surface |

## Security Considerations

- Layout changes must not remove server-side page guards.
