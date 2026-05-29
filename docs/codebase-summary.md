# ViePOS - Codebase Summary

Generated from `repomix-output.xml` on 2026-05-20.

## Current State

**Status:** Auth registration, login, dashboard RBAC, and the responsive internal dashboard shell are implemented.
**Live auth path:** Better Auth + Prisma + app-specific register/login routes.
**Post-login surface:** `/dashboard` with server-side module filtering, responsive shell navigation, and placeholder module pages.
**Package manager:** pnpm
**Main framework:** Next.js 15 (App Router) + React 19 + TypeScript

## Implemented Entry Points

| File | Purpose |
|---|---|
| `app/page.tsx` | Root redirect to `/login` |
| `app/(auth)/login/page.tsx` | Public login page |
| `app/(auth)/create-account/page.tsx` | Public registration page |
| `app/api/auth/[...all]/route.ts` | Better Auth route handler with direct credential endpoint guard |
| `app/api/app-auth/register/route.ts` | App-specific public registration API |
| `app/api/app-auth/login/route.ts` | App-specific login API |
| `app/api/app-auth/logout/route.ts` | App-specific logout API |
| `components/layout/dashboard-shell.tsx` | Authenticated dashboard shell wrapper |
| `components/layout/dashboard-shell-client.tsx` | Responsive drawer state and current-route shell composition |
| `components/layout/dashboard-navigation-items.tsx` | Dashboard nav metadata grouped by visible modules |
| `components/layout/dashboard-sidebar.tsx` | Responsive sidebar and drawer navigation |
| `components/layout/dashboard-topbar.tsx` | Topbar, search, user actions, and mobile menu button |
| `components/layout/dashboard-module-placeholder.tsx` | Shared placeholder surface for shell-only routes |
| `app/dashboard/page.tsx` | Authenticated dashboard overview placeholder |
| `app/dashboard/sales/page.tsx` | Sales module |
| `app/dashboard/orders/page.tsx` | Orders module |
| `app/dashboard/menu/page.tsx` | Menu module |
| `app/dashboard/staff/page.tsx` | Staff module |
| `app/dashboard/staff/approvals/page.tsx` | Staff approval module |
| `app/dashboard/staff/roles/page.tsx` | Staff role-management module |
| `app/dashboard/settings/page.tsx` | Settings module |
| `app/dashboard.css` | Route-level shell styling and responsive breakpoints |
| `e2e/dashboard-shell.spec.ts` | Authenticated Playwright shell regression coverage |
| `app/admin/page.tsx` | Legacy route redirect to `/dashboard` |
| `app/pos/page.tsx` | Legacy route redirect to `/dashboard` |

## Auth And RBAC Surface

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `User`, `Session`, `Account`, `Verification`, `AppUserProfile`, and `AuthRateLimit` models |
| `server/auth/better-auth.ts` | Better Auth config with Prisma adapter and email/password enabled |
| `server/auth/better-auth-route-policy.ts` | Blocks direct Better Auth credential signup/signin bypass |
| `server/auth/auth-repository.ts` | Prisma-backed credential user creation and login lookup |
| `server/auth/register-user.ts` | Public signup validation and reserved-email rejection |
| `server/auth/login-policy.ts` | Login/session eligibility rules and rate-limit thresholds |
| `server/auth/rate-limit-store.ts` | PostgreSQL-backed auth rate-limit counters |
| `server/auth/user-admin-service.ts` | Approve, role-change, and disable flows |
| `lib/auth/auth-roles.ts` | Role, status, and root-admin helpers |
| `lib/auth/permissions.ts` | Dashboard module visibility by role |
| `lib/auth/require-session.ts` | Active-user and module access guards |
| `lib/auth/user-transitions.ts` | Transition policy for approve/role/disable actions |

## Current Folder Map

```
ViePOS/
├── app/
│   ├── (auth)/                 # Login and registration screens
│   ├── api/
│   │   ├── auth/[...all]/      # Better Auth handler with credential bypass guard
│   │   └── app-auth/           # App-specific register/login/logout endpoints
│   ├── dashboard/              # Authenticated shell + module pages
│   ├── admin/                  # Legacy redirect to /dashboard
│   └── pos/                    # Legacy redirect to /dashboard
│
├── components/
│   ├── auth/                   # Login, registration, and auth shell UI
│   └── layout/                 # Dashboard shell and shared layout pieces
│
├── lib/auth/                   # Roles, permissions, session guards, transitions
├── server/auth/                # Better Auth wiring and user admin services
├── server/db/                  # Prisma client and root seed entry point
├── prisma/                     # Database schema
└── docs/                       # Project documentation
```

## Current Limits

- Production auth now uses email/password plus RBAC; the old browser demo auth helpers remain in the tree only as legacy scaffold code.
- DB migrate/seed smoke is blocked locally because the example `viepos` Postgres role/database is not present.
- POS, payments, and table workflows are not part of the live auth/RBAC slice yet; the current dashboard pages are shell placeholders except for the existing staff admin forms.
- Playwright shell coverage now exercises authenticated dashboard rendering across desktop, tablet, and mobile viewport sizes.

## Notes

- Staff login is blocked while status is PENDING or DISABLED.
- ROOT_ADMIN is the immutable target in transition policy.
- Dashboard module access is server-enforced, not client-only.
- The dashboard shell uses a 225px sidebar, a 60px topbar, and a mobile drawer below 1024px.

## Unresolved Questions

None.
