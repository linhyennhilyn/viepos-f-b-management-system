---
phase: 7
title: "Regression Verification"
status: pending
priority: P1
effort: "0.75d"
dependencies: [1, 2, 3, 4, 5, 6]
---

# Phase 7: Regression Verification

## Overview

Run full verification, update docs/roadmap/changelog, and close or annotate GitHub issues with evidence.

## Requirements

- Functional: all fixed issues have passing regression tests or explicit external-blocker notes.
- Non-functional: no syntax/build failures; docs reflect security/data changes.

## Architecture

Use repo-native commands. Do not mark external secret rotation complete unless owner confirms.

## Related Code Files

- Modify: `docs/project-roadmap.md`
- Modify/create: `docs/project-changelog.md` if present/needed
- Modify: `docs/system-architecture.md` if auth/data policy changed
- GitHub issues #1-#8

## Implementation Steps

1. Run backend tests with Java available: `cd backend && bash ./mvnw test`.
2. Run frontend install/build if deps available: `cd frontend && pnpm install && pnpm build`.
3. For DB-touching tests, use PostgreSQL/Testcontainers or mock repositories; avoid H2 false confidence with PostgreSQL enum mappings.
4. Run focused manual smoke list:
   - STAFF cannot access management APIs.
   - ROOT_ADMIN can access settings.
   - POS sale creates correct total/payment.
   - Inventory export rejects overdraw.
5. Run secret scan before commit.
6. Update docs for new env requirements, RBAC matrix, checkout/inventory invariants.
7. Update each GitHub issue:
   - close if code + tests fully fix,
   - leave open with blocker note for external rotation/history.
8. Prepare conventional commit(s) by domain.

## Success Criteria

- [ ] Backend tests pass.
- [ ] Frontend build passes or blocker documented.
- [ ] Docs impact recorded.
- [ ] Issues #2-#8 can be closed or linked to PR; #1 has rotation status note.

## Risk Assessment

Local machine currently lacks Java runtime and frontend deps. Verification may require installing prerequisites or CI run.
