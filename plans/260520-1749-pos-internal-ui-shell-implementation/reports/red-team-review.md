# Red-Team Review

---
type: reviewer
date: 2026-05-20
topic: pos-internal-ui-shell-plan-red-team
status: completed
---

## Findings

| Severity | Finding | Verdict | Action |
|---|---|---|---|
| Important | Visual/responsive acceptance was initially too manual for `--tdd`; package lacks Playwright despite README claiming `pnpm test:e2e`. | Accepted | Phase 5 now requires persistent Playwright config/spec and `test:e2e` script if missing. |
| Important | Protected dashboard screenshots can accidentally test `/login` because dashboard pages redirect unauthenticated users. | Accepted | Phase 5 now requires authenticated Playwright setup and route/shell assertions before screenshots. |
| Medium | Canonical full SVG source may still be missing locally. | Accepted as gate | Phase 1 blocks later visual QA until full source is stored; no silent measurement-only downgrade. |
| Medium | Ultra-wide success criteria were subjective. | Accepted | Phase 3/5 now include numeric constraints for line length, form width, and content bands. |
| Low | Plan touches 8-12 files, above ideal minimal count. | Accepted rationale | Split is justified to keep files under 200 LOC and avoid monolithic shell. |

## Rejected Findings

| Finding | Reason |
|---|---|
| Use `#3CB018` active bg with white text to match SVG exactly | Rejected. User explicitly confirmed dark background + white text; WCAG also requires avoiding white normal text on `#3CB018`. |
| Edit `lib/auth/permissions.ts` for labels | Rejected. Current RBAC code is policy-only; labels belong in layout nav metadata. |

## Unresolved Questions

None.
