# ViePOS - Product Development Requirements

## Vision

ViePOS is a lean desktop web POS for Vietnamese cafes, restaurants, and counters. The product keeps the scope narrow: fast login, clear role boundaries, and a dashboard that exposes only the modules the signed-in user can use.

**Tagline:** Vừa - Đủ - Tinh Gọn
**Slogan:** Từ bán hàng đến vận hành trong một hệ thống

## Core Promise

- Lean: no unused auth complexity in the live path.
- Fast: login and dashboard access stay simple.
- Local-first where it matters: browser navigation and server-side RBAC stay predictable.
- VN-native: Vietnamese copy, VND-centric workflows, and store-friendly role names.

## Target Users

| Persona | Login | Responsibilities | Notes |
|---|---|---|---|
| Quản Lý | Email + password | Review accounts, change roles, disable staff, manage settings | Can reach broader dashboard modules than staff |
| Nhân Viên | Email + password | Work sales and orders, wait for approval if newly registered | New public signups start as `PENDING` |

## Completed Phase 1 Scope

### FR-1.1 Public Registration

- Public signup creates a staff account.
- New accounts default to `STAFF` + `PENDING`.
- Public signup rejects the reserved root email `nguyennlt.ncc@gmail.com`.
- Registration is rate limited with durable PostgreSQL counters.
- The registration response returns the created account state for the UI flow.

### FR-1.2 Login

- Login is email/password only.
- Email is normalized before lookup.
- Login is rate limited with durable PostgreSQL counters.
- `PENDING` and `DISABLED` users are blocked from session creation.
- Successful login redirects to `/dashboard`.
- Better Auth handles the session after credential validation.

### FR-1.3 Better Auth + Prisma Storage

- Better Auth is exposed through `app/api/auth/[...all]/route.ts` for session operations.
- Direct Better Auth credential signup/signin endpoints are blocked; app auth endpoints enforce ViePOS policy.
- Prisma backs the Better Auth tables.
- Current schema includes `User`, `Session`, `Account`, `Verification`, `AppUserProfile`, and `AuthRateLimit`.

### FR-1.4 RBAC

- Dashboard modules are `sales`, `orders`, `menu`, `staff`, `staff-approvals`, `staff-roles`, and `settings`.
- `STAFF` can access `sales` and `orders`.
- `ADMIN` can access `sales`, `orders`, `menu`, `staff`, `staff-approvals`, and `settings`.
- `ROOT_ADMIN` can access all modules, including `staff-roles`.
- `/dashboard` is the shared authenticated shell.

### FR-1.5 Staff Administration

- Approve `STAFF` accounts from `PENDING` to `ACTIVE`.
- Update roles only between `ADMIN` and `STAFF`.
- Disable accounts when allowed by role policy.
- The root admin target is immutable.

### FR-1.6 Route Normalization

- `/admin` redirects to `/dashboard`.
- `/pos` redirects to `/dashboard`.
- `/` redirects to `/login`.
- The legacy browser demo auth path is no longer the production path.

## Phase 2 Planned Scope

- POS sales flow.
- Cart and order management.
- Cash and QR payment flow.
- Receipt output.

## Phase 3 Planned Scope

- Table-based ordering.
- Table state transitions.
- Realtime sync across staff devices.

## Non-Functional Requirements

### Security

- Passwords are hashed before storage.
- Login attempts are rate limited.
- Inactive or disabled users cannot create sessions.
- Root admin cannot be modified as a target.
- Root seed refuses a preclaimed reserved email unless reset/trust is explicit.
- Secure session handling is delegated to Better Auth.

### Reliability

- Public registration and login should fail closed on invalid input.
- Dashboard access should degrade to redirects, not partial privilege leaks.
- Approval and role-change flows should be idempotent from the UI perspective.

### Maintainability

- Auth, RBAC, and transition rules stay in server-side modules.
- File names remain explicit and route-level behavior stays obvious.

## Success Metrics

| Metric | Target |
|---|---|
| Login path correctness | Active users reach `/dashboard`; blocked users do not |
| RBAC correctness | Each role sees only allowed modules |
| Root target protection | Root admin profile cannot be changed as a target |
| Verification | `lint`, `type-check`, `build`, and `prisma validate` pass locally |

## Unresolved Questions

None.
