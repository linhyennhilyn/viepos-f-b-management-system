---
type: journal
date: 2026-05-20
topic: pos-internal-ui-shell
---

# POS Internal UI Shell

## Context

Executed `plans/260520-1749-pos-internal-ui-shell-implementation/plan.md` with TDD. Goal: replace card dashboard with responsive internal shell while preserving server RBAC.

## What Happened

- Added runtime ViePOS logo assets and canonical shell reference.
- Extracted dashboard nav metadata into UI-owned layout code; `lib/auth/permissions.ts` unchanged.
- Split shell into server wrapper, client drawer state, sidebar, topbar, and placeholder components.
- Replaced centered dashboard card with 225px sidebar, 60px topbar, full shell content, responsive mobile drawer.
- Upgraded dashboard module placeholders without adding fake POS workflows.
- Added Vitest coverage for assets, RBAC nav, layout contracts, e2e setup, and placeholder/server-action preservation.
- Added Playwright e2e with authenticated dashboard setup and target viewport screenshots.
- Tightened review findings: safe explicit e2e DB env, no root-password fallback, closed/open mobile drawer accessibility, exact `aria-current`, CSS files under 200 lines.

## Verification

- `pnpm lint` passed.
- `pnpm build` passed.
- `pnpm type-check` passed.
- `pnpm test` passed: 16 files, 56 tests.
- `pnpm test:e2e` passed: 6 Playwright tests.
- Screenshots saved for 2560x1440, 1920x1080, 1440x1024, 1024x768, 390x844.

## Decisions

- Keep RBAC source in `lib/auth/permissions.ts`; UI labels/routes live in `components/layout/dashboard-navigation-items.tsx`.
- Keep e2e setup explicit and local-safe; no fallback to arbitrary `DATABASE_URL`.
- Run build and Playwright sequentially because both touch `.next`.

## Next

- Future CI should provide explicit `E2E_*` env or use a dedicated `viepos_e2e` database.
- Next.js dev warning about `allowedDevOrigins` can be handled when CI/browser noise warrants it.

## Unresolved Questions

None.
