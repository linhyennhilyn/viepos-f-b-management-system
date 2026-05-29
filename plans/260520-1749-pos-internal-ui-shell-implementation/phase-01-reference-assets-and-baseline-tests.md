---
phase: 1
title: "Reference Assets and Baseline Tests"
status: completed
priority: P1
effort: "0.5d"
dependencies: []
---

# Phase 1: Reference Assets and Baseline Tests

## Context Links

- Source report: [`../reports/260520-1710-pos-internal-ui-shell-brainstorm.md`](../reports/260520-1710-pos-internal-ui-shell-brainstorm.md)
- Design guidelines: [`../../docs/design-guidelines.md`](../../docs/design-guidelines.md)
- Current shell: [`../../components/layout/dashboard-shell.tsx`](../../components/layout/dashboard-shell.tsx)
- Current CSS: [`../../app/dashboard.css`](../../app/dashboard.css)

## Overview

Create stable implementation references before UI changes: commit brand/reference assets, capture current RBAC expectations in tests, and document exact visual targets for later phases.

## Key Insights

- `public/` does not exist yet, despite design docs expecting `public/images/logo.svg` and related assets.
- The canonical full SVG currently exists only in chat/report summary; implementation needs a committed source artifact for visual QA.
- Current RBAC tests cover permissions logic; shell navigation still needs UI-owned metadata tests once metadata is extracted.

## Requirements

- Functional: asset files available to the app; canonical full SVG source stored in plan assets or `public/images/` as appropriate.
- Non-functional: no business workflow changes; no raw giant SVG paths pasted into React components.

## Architecture

Assets split:
- `public/images/` for runtime brand assets used by the app.
- `plans/260520-1749-pos-internal-ui-shell-implementation/assets/` for canonical reference SVG if it is QA-only.
- `plans/260520-1749-pos-internal-ui-shell-implementation/research/` for scout notes.

## Related Code Files

| Action | File | Notes |
|---|---|---|
| Create | `public/images/logo.svg` | Wordmark from report, green-on-light surface |
| Create | `public/images/logomark.svg` | Compact brand mark |
| Create | `public/images/logo-white.svg` | If exact white variant available; otherwise derive only from supplied source |
| Create | `plans/260520-1749-pos-internal-ui-shell-implementation/assets/canonical-dashboard-shell-1440x1024.svg` | Full reference SVG from prompt/report; blocking visual QA asset |
| Create | `__tests__/components/layout/dashboard-navigation.test.ts` | Implement with Phase 2 after nav metadata extraction |

## Test Scenario Matrix

| Scenario | Test Type | Expected |
|---|---|---|
| Runtime logo paths exist | Unit/file existence | `public/images/logo.svg` and logomark path present |
| Canonical reference stored | File existence | `canonical-dashboard-shell-1440x1024.svg` present before visual implementation starts |
| Existing RBAC unchanged | Existing Vitest | `__tests__/lib/auth/permissions.test.ts` still passes |

## Function Or Interface Checklist

- Existing `getVisibleDashboardModules(user)` remains unchanged.
- Future `getDashboardNavigationItems(user)` reads UI metadata only, not RBAC policy.

## Dependency Map

Phase 1 blocks every later phase because layout measurements and assets become stable references.

## Implementation Steps

1. Tests Before: run existing `pnpm test -- __tests__/lib/auth/permissions.test.ts` to pin RBAC baseline.
2. Create `public/images/` and add supplied logo/logomark assets.
3. Store full canonical SVG source. If the source cannot be recovered, stop and ask the user to provide/export it before implementing visual layout.
4. Keep all SVGs as committed assets, not large JSX path blobs.
5. Run `pnpm type-check`.

## Todo List

- [x] Run current permissions test.
- [x] Add brand assets under `public/images/`.
- [x] Add canonical full SVG source.
- [x] Confirm no asset embedding grows component files.

## Success Criteria

- [x] Existing permissions tests pass before UI edits.
- [x] Runtime brand assets exist under `public/images/`.
- [x] Canonical desktop reference SVG is stored before Phase 3 starts.
- [x] No source file exceeds 200 LOC due to asset embedding.

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Asset drift from design | Store source SVG and avoid hand-redrawing brand marks |
| Missing white logo variant | Use green logo on light topbar; use logomark/wordmark only where contrast is valid |
| Raw SVG bloats React files | Commit SVG as assets, import/reference by path |
| Canonical SVG unavailable | Stop and request the source asset; do not downgrade visual acceptance silently |

## Security Considerations

- No auth logic changes.
- Do not commit secrets or environment files while adding assets.
