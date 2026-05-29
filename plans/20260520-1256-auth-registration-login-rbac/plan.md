---
title: "Auth Registration Login RBAC Implementation"
description: "Replace localStorage auth scaffold with Better Auth + Prisma/PostgreSQL registration, login, account approval, and server-side RBAC."
status: completed
priority: P1
branch: "main"
tags: [auth, rbac, prisma, better-auth, security, tdd]
blockedBy: []
blocks: []
created: "2026-05-20T05:56:51.658Z"
createdBy: "ck:plan"
source: skill
---

# Auth Registration Login RBAC Implementation

## Overview

Implement production auth for ViePOS. Public signup creates pending staff accounts. Root admin is seeded from env. All active users login with email/password and land on `/dashboard`; server-side guards restrict modules and APIs by role/status.

Source report: [`plans/reports/260520-1223-auth-registration-login-rbac-brainstorm.md`](../reports/260520-1223-auth-registration-login-rbac-brainstorm.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Database and Auth Foundation](./phase-01-database-and-auth-foundation.md) | Completed |
| 2 | [Server Auth Flows](./phase-02-server-auth-flows.md) | Completed |
| 3 | [Dashboard RBAC Shell](./phase-03-dashboard-rbac-shell.md) | Completed |
| 4 | [Staff Approval and Role Management](./phase-04-staff-approval-and-role-management.md) | Completed |
| 5 | [Migration Cleanup and Verification](./phase-05-migration-cleanup-and-verification.md) | Completed with DB smoke blocked locally |

## Dependencies

- No unfinished overlapping project plans found.
- Requires PostgreSQL `DATABASE_URL` and root seed env:
  - `ROOT_ADMIN_EMAIL=nguyennlt.ncc@gmail.com`
  - `ROOT_ADMIN_PASSWORD`
  - optional `ROOT_ADMIN_NAME`
- New production path: Better Auth + Prisma/PostgreSQL. LocalStorage auth becomes demo-only or removed.

## Architecture Decision

Use explicit `Role = ROOT_ADMIN | ADMIN | STAFF` and `UserStatus = PENDING | ACTIVE | DISABLED`.
Store app authorization fields in a dedicated 1:1 `AppUserProfile` table linked to the Better Auth user. Better Auth owns identity/session tables; ViePOS owns role/status policy.

Access summary:
- `PENDING`/`DISABLED`: cannot enter `/dashboard`.
- `STAFF`: active sales/order only.
- `ADMIN`: operations management + account approval, no role mutation.
- `ROOT_ADMIN`: full access + role mutation, immutable target.
- Root email is reserved for seed only; public register rejects it.
- Disable rules: root can disable admin/staff; admin can disable staff only; nobody can disable root; staff cannot disable anyone.
- Rate limits: login allows 5 failed attempts per 10 minutes per email+IP; register allows 3 attempts per hour per IP.

## Unresolved Questions

None.

## External References

- Better Auth email/password: https://better-auth.com/docs/authentication/email-password
- Better Auth Prisma adapter: https://better-auth.com/docs/adapters/prisma
- Better Auth rate limit: https://better-auth.com/docs/concepts/rate-limit
- Next.js authentication guide: https://nextjs.org/docs/app/building-your-application/authentication
- Prisma Next.js guide: https://www.prisma.io/docs/guides/nextjs

## Global Validation Gates

- [x] `pnpm lint`
- [x] `pnpm type-check`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] Route/API role checks tested for `ROOT_ADMIN`, `ADMIN`, `STAFF`, `PENDING`, `DISABLED`
- [x] Root mutation invariant tested for role/status/delete/email update paths
- [x] Public register root email rejection tested

## Verification Notes

- `DATABASE_URL="postgresql://viepos:viepos@localhost:5432/viepos?schema=public" pnpm exec prisma validate` passed.
- `DATABASE_URL="postgresql://viepos:viepos@localhost:5432/viepos?schema=public" pnpm exec prisma db push --skip-generate` blocked locally with `P1010: User was denied access`; root seed smoke not run because migration connection failed.
- Review fixes added: direct Better Auth credential endpoints are blocked, route handlers use PostgreSQL-backed auth rate limits, login verifies credentials before status messaging, root seed rejects untrusted preclaimed root email, and logout clears Better Auth cookies.
