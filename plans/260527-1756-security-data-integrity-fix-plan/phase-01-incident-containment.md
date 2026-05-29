---
phase: 1
title: Incident Containment
status: completed
priority: P1
effort: 0.5d
dependencies: []
---

# Phase 1: Incident Containment

## Overview

Remove committed production-looking secrets and unsafe bootstrap defaults. This phase limits blast radius before deeper code fixes.

## Requirements

- Functional: app no longer falls back to production DB/JWT values from committed config.
- Functional: root seeding cannot create a known credential in normal production runtime.
- Non-functional: do not paste live secrets into issues/docs/tests.

## Architecture

Use environment-only secrets for shared/prod config. Keep local development through `application-local.yml`, an ignored `.env`, or an explicit local/bootstrap profile with dummy values. Never use production defaults in committed shared config.

Config validation policy:
- Non-local profiles fail startup when `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, or `JWT_SECRET` is missing.
- Local/bootstrap profile is the only profile allowed to use documented dummy/dev values.
- Root admin seed is disabled outside local/bootstrap and must use env-provided one-time credentials when enabled.
- Issue #1 stays open until owner confirms credential rotation and history purge.

## Related Code Files

- Modify: `README.md`
- Modify: `backend/src/main/resources/application.yml`
- Modify: `backend/src/main/java/com/viepos/backend/DataSeeder.java`
- Modify: `.github/workflows/db-backup.yml`
- Possibly create: `backend/src/test/java/com/viepos/backend/config/...`

## Implementation Steps

1. [x] Prerequisite Gate: Java JDK 17 must be available locally or backend tests must run in CI with linked evidence.
2. [x] Tests Before: add Spring context/config validation test proving non-local profile fails when datasource/JWT env is missing.
3. [x] Tests Before: add local-profile startup/config test proving the documented local path uses only dummy/ignored values.
4. [x] Remove DB password/JWT values from README and `application.yml`; document placeholders only.
5. [x] Add safe local profile path so `spring-boot:run -Dspring-boot.run.profiles=local` remains documented and usable.
6. [x] Add config validation so non-local startup fails when datasource/JWT secret is missing.
7. [x] Gate root admin seed behind local/bootstrap profile and env-provided one-time credentials.
8. [x] Reduce backup artifact exposure: explicit permissions, lower retention, or encrypted dump.
9. [x] Run secret scan on diff before commit.

## Implementation Evidence

- Local Java runtime installed: JDK 17.
- Backend regression command passed: `cd backend && bash ./mvnw test`.
- Commits pushed:
  - `1b778d2 fix(security): remove unsafe secret defaults`
  - `e1a58d1 docs(plan): mark incident containment complete`
- GitHub issue #1 updated with code-side evidence: `https://github.com/huyennguyennhu/ViePOS-F-B-Management-system/issues/1#issuecomment-4556389833`
- Code-side fix is complete. External incident response remains open: rotate Supabase password/JWT/root credentials and purge or invalidate exposed history.

## Success Criteria

- [x] No production-looking credential remains in README/config.
- [x] Normal production startup needs external env secrets.
- [x] Local development still has a documented non-secret startup path.
- [x] Seeder does not create a known root password in production profile.
- [x] Config validation tests pass with JDK 17 or CI evidence is linked.
- [x] Issue #1 can be updated with code-side fix status.

## Risk Assessment

Credential rotation is external. Code can remove exposure, but #1 remains incident-open until owner confirms rotation/history handling.
