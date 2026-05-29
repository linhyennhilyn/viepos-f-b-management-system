---
phase: 1
title: "Database and Auth Foundation"
status: completed
priority: P1
effort: "1.5d"
dependencies: []
---

# Phase 1: Database and Auth Foundation

## Context Links

- Source report: [`../reports/260520-1223-auth-registration-login-rbac-brainstorm.md`](../reports/260520-1223-auth-registration-login-rbac-brainstorm.md)
- Docs: [`../../docs/system-architecture.md`](../../docs/system-architecture.md)
- Docs: [`../../docs/code-standards.md`](../../docs/code-standards.md)

## Overview

Install and configure Prisma/PostgreSQL + Better Auth foundation. Define durable role/status schema and root bootstrap so no public request can create root/admin privileges.

## Requirements

- Functional: Prisma schema exists for users, sessions/accounts required by Better Auth, and app role/status fields.
- Functional: root seed upserts `nguyennlt.ncc@gmail.com` as `ROOT_ADMIN` + `ACTIVE`.
- Non-functional: no localStorage auth in production path.
- Security: root seed password comes from env; root role/status is forced by seed.

## Architecture

Data model target:

```ts
type Role = 'ROOT_ADMIN' | 'ADMIN' | 'STAFF';
type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
```

Better Auth owns credential/session tables. ViePOS authorization reads role/status from a dedicated 1:1 `AppUserProfile` table linked to the Better Auth user. This keeps app policy independent from Better Auth schema details.

## File Inventory

| File | Action | Test impact |
|------|--------|-------------|
| `package.json` | Modify dependencies/scripts | build/install |
| `.env.example` | Create or update root/db/auth env docs | manual setup |
| `prisma/schema.prisma` | Create | schema validation |
| `prisma/seed.ts` | Create | seed tests/manual run |
| `lib/auth/auth-roles.ts` | Create | unit tests |
| `lib/auth/server-auth.ts` | Create | integration tests later |
| `server/db/client.ts` | Create | unit/import safety |
| `__tests__/lib/auth/auth-roles.test.ts` | Create | TDD first |
| `__tests__/server/db/root-seed.test.ts` | Create | TDD first |

## Test Scenario Matrix

| Scenario | Priority | Test before code |
|----------|----------|------------------|
| normal email maps to `STAFF` | Critical | yes |
| root email constant is normalized | Critical | yes |
| `isRootAdmin` requires both root email and root role | Critical | yes |
| seed forces root role/status active | Critical | yes |
| seed does not silently overwrite password without reset flag | High | yes |
| app profile is created/kept for root user | Critical | yes |
| schema has role/status enums | High | after schema |

## Function / Interface Checklist

- `ROOT_ADMIN_EMAIL`
- `normalizeEmail(email)`
- `isRootAdmin(user)`
- `getInitialRoleForPublicSignup()` returns only `STAFF`
- `getInitialStatusForPublicSignup()` returns only `PENDING`
- root seed entrypoint

## Dependency Map

- Blocks Phase 2 auth flows.
- Blocks Phase 4 role/status mutations.
- Phase 3 can only render dashboard once session helper shape is known.

## Implementation Steps

### Tests Before

1. Write unit tests for email normalization, root invariant, signup role/status defaults.
2. Write automated seed behavior tests using a test database or mocked Prisma client.

### Refactor / Build

1. Add dependencies: `better-auth`, Prisma packages, database driver/runtime needs, and validation helper if needed.
2. Add Prisma schema with role/status enums, Better Auth compatible models, and 1:1 `AppUserProfile`.
3. Add Prisma client wrapper in `server/db/client.ts`.
4. Add Better Auth base config file without wiring UI yet.
5. Add root seed script and package script.
6. Add `.env.example` entries for DB, auth secret/base URL, root seed env.

### Tests After

1. Run Prisma schema validation.
2. Run root seed against local dev DB when env exists.
3. Add tests for exported auth-role helpers.

### Regression Gate

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Success Criteria

- [x] Prisma schema validates.
- [x] Better Auth config imports without runtime errors.
- [x] Root seed can create/keep `nguyennlt.ncc@gmail.com` as `ROOT_ADMIN` + `ACTIVE`.
- [x] Public signup helper cannot return root/admin.
- [x] Role/status helper tests pass.

## Risk Assessment

- Risk: Better Auth schema customization may fight app role/status fields. Mitigation: keep role/status in `AppUserProfile`.
- Risk: tests need a DB. Mitigation: use a local/test database or mocked Prisma client for root seed tests.

## Security Considerations

- Never seed password from committed values.
- Root invariant must not depend only on role or only on email.
- `.env*` remains ignored; only `.env.example` is committed.
