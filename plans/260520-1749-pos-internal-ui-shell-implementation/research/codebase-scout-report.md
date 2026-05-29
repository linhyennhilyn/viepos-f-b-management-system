# Codebase Scout Report

---
type: research
date: 2026-05-20
topic: pos-internal-ui-shell-codebase-scout
---

## Summary

The dashboard shell is currently a centered card layout. Auth/RBAC is implemented and should be treated as stable. UI shell work should stay in `components/layout/`, dashboard pages, and `app/dashboard.css`.

## Findings

| Area | Evidence | Planning impact |
|---|---|---|
| Current shell | `components/layout/dashboard-shell.tsx` has inline nav metadata | Extract metadata before styling |
| Current CSS | `app/dashboard.css` uses `.dashboard-card` and centered page | Replace with full app shell layout |
| RBAC | `lib/auth/permissions.ts` maps role to modules | Do not edit for labels/copy |
| Pages | Most dashboard pages are simple placeholders | Safe to restyle with reusable placeholder component |
| Staff pages | approvals/roles include server actions | Preserve forms and server actions |
| Tests | Vitest exists; Playwright not installed | Unit tests first; browser screenshots for visual QA |
| Assets | `public/` missing | Create `public/images/` for brand SVGs |

## Recommendations

- Use server-first shell composition, client only for drawer/collapse state.
- Add nav metadata tests before changing layout.
- Keep layout CSS grouped and tokenized with shell dimension variables.

## Unresolved Questions

None.
