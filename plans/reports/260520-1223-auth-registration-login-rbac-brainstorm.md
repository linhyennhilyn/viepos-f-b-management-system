---
type: brainstorm-report
date: 2026-05-20
topic: auth-registration-login-rbac
status: approved-redteam-applied
red_team_applied: true
---

# Auth Registration Login RBAC Brainstorm

## Summary

Hoàn tất auth thật cho ViePOS: đăng ký, đăng nhập, session, account approval, role guard server-side.

Approved direction:
- Use Better Auth + Prisma/PostgreSQL path, not localStorage auth.
- `ROOT_ADMIN` account is created by seed script/env.
- Root email: `nguyennlt.ncc@gmail.com`.
- Public register creates `STAFF` with `PENDING` status.
- Public register with root email is rejected/reserved; root email is seed-only.
- `PENDING` staff cannot enter POS or management.
- `ROOT_ADMIN` or `ADMIN` can approve staff account to `ACTIVE`.
- Only `ROOT_ADMIN` can promote/demote role between `ADMIN` and `STAFF`.
- `ROOT_ADMIN` is immutable from UI/API: cannot demote, delete, disable, or email-change.
- `ADMIN` has full operations access, but no role management and no root mutation.
- `STAFF` only order hàng and bán hàng after approval.
- All roles login with email + password.
- Successful login redirects every active role to `/dashboard`.

## Codebase Findings

| Area | Current state |
|------|---------------|
| Stack | Next.js 15, React 19, TypeScript, pnpm |
| Current auth | UI scaffold + localStorage session |
| Current routes | `/login`, `/create-account`, `/admin`, `/pos` |
| Current roles | `manager | staff` in client code |
| Missing | Prisma, PostgreSQL, Better Auth integration, middleware, secure cookies, server-side RBAC |
| Docs constraint | Better Auth planned, PostgreSQL/Prisma planned, auth Phase 1 |

## Requirements

### Functional

- Register form accepts name, email, password, confirm password.
- Public register always creates `STAFF` + `PENDING`.
- Public register with root email is rejected as reserved, never converted to staff.
- Root account is not created by public register; it is created by seed/env.
- Email unique, normalized lower-case.
- Login accepts email + password for all roles.
- Login for `PENDING` or `DISABLED` account is blocked.
- Successful login redirects active users to `/dashboard`.
- Shared dashboard shell renders navigation based on role and status.
- `ROOT_ADMIN` can update other users' roles.
- `ROOT_ADMIN` and `ADMIN` can approve `PENDING` staff to `ACTIVE`.
- `ADMIN` cannot update roles.
- `STAFF` cannot access management features.

### Security

- Passwords hashed server-side through auth layer.
- Auth state uses secure HTTP-only session cookie, not localStorage.
- Route guards run server-side.
- API handlers enforce role/status checks independently from UI.
- Direct URL/API access returns redirect or `403`.
- Root account cannot be demoted, deleted, disabled, role-edited, or email-changed.
- Login endpoint is rate-limited after 5 failed attempts per 10 minutes per email+IP.
- Register endpoint is rate-limited after 3 attempts per hour per IP.
- Cookie policy is explicit: `HttpOnly`, `Secure` in production, `SameSite=Lax` or stricter.
- Mutating server actions/API routes enforce CSRF protection or framework-equivalent same-site protection.

## Evaluated Approaches

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| `ROOT_ADMIN | ADMIN | STAFF` enum + `PENDING | ACTIVE | DISABLED` status | Clear, testable, secure, maps directly to owner/admin/staff workflow | Slightly more schema/state handling | Recommended |
| `MANAGER | STAFF` + `isRoot` | Smaller enum | Conditional checks spread everywhere, easier security bugs | Rejected |
| Dynamic permission table | Flexible | Overkill for MVP, larger UI/test matrix | Rejected |

## Final Design

### Roles

```ts
type Role = 'ROOT_ADMIN' | 'ADMIN' | 'STAFF';
type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
```

Role semantics:
- `ROOT_ADMIN`: owner. Full access. Can manage roles. Protected from demotion/deletion/disable/email-change.
- `ADMIN`: shift manager. Full operations access. Can approve pending staff. Cannot manage roles/root.
- `STAFF`: sales/order only after account is active.

Status semantics:
- `PENDING`: newly registered staff. Cannot enter `/dashboard`.
- `ACTIVE`: can login and access allowed modules.
- `DISABLED`: blocked from login and access.

### Root Admin Bootstrap

Root is created by seed script/env, not by public signup.

Required seed inputs:
- `ROOT_ADMIN_EMAIL=nguyennlt.ncc@gmail.com`
- `ROOT_ADMIN_PASSWORD=...`
- optional `ROOT_ADMIN_NAME=...`

Seed behavior:
1. Normalize root email.
2. Upsert root user.
3. Force `role = ROOT_ADMIN`.
4. Force `status = ACTIVE`.
5. Never overwrite password unless explicit reset flag is used.

Reason:
- Prevents public root hijack by entering owner email without verification.
- Keeps root creation auditable and deployment-controlled.

### Register

Data flow:
1. User submits register form.
2. Server normalizes email.
3. Reject root email because root is seed-only.
4. Reject duplicate email.
5. Assign `role = STAFF`.
6. Assign `status = PENDING`.
7. Hash password through Better Auth/auth layer.
8. Create user.
9. Show pending approval state. Do not auto-login into POS.

Public register never creates `ROOT_ADMIN` or `ADMIN`; root email is reserved for seed.

### Login

Data flow:
1. User submits email/password.
2. Server verifies password hash.
3. Server loads app user role/status.
4. If `PENDING`: reject login or redirect to pending approval screen.
5. If `DISABLED`: reject login.
6. If `ACTIVE`: create secure session.
7. Redirect to `/dashboard`.
8. Dashboard resolves allowed modules from session role.

### Account Approval

Approval is not role management.

Allowed:
- `ROOT_ADMIN` can approve `PENDING` staff to `ACTIVE`.
- `ADMIN` can approve `PENDING` staff to `ACTIVE`.

Forbidden:
- `ADMIN` cannot change role.
- `ADMIN` cannot approve/disable/mutate `ROOT_ADMIN`.
- `STAFF` cannot approve accounts.

### Account Disable

Disable is status management, not role management.

Allowed:
- `ROOT_ADMIN` can disable `ADMIN` and `STAFF`.
- `ADMIN` can disable `STAFF`.

Forbidden:
- Nobody can disable `ROOT_ADMIN`.
- `ADMIN` cannot disable another `ADMIN`.
- `STAFF` cannot disable anyone.

### Dashboard Access

Use one shared route tree:
- `/dashboard`: all active roles.
- `/dashboard/sales`: `ROOT_ADMIN`, `ADMIN`, `STAFF`.
- `/dashboard/orders`: `ROOT_ADMIN`, `ADMIN`, `STAFF`.
- `/dashboard/menu`: `ROOT_ADMIN`, `ADMIN`.
- `/dashboard/staff`: `ROOT_ADMIN`, `ADMIN`.
- `/dashboard/staff/approvals`: `ROOT_ADMIN`, `ADMIN`.
- `/dashboard/staff/roles`: `ROOT_ADMIN`.
- `/dashboard/settings`: `ROOT_ADMIN`, `ADMIN`.

UI may hide forbidden nav items, but server remains source of truth.

### Role Update

Only `ROOT_ADMIN` can update role.

Rules:
- Actor must be `ROOT_ADMIN`.
- Target cannot satisfy `isRootAdmin(target)`.
- Allowed target roles: `ADMIN`, `STAFF`.
- Never allow setting another user to `ROOT_ADMIN` from normal UI/API unless explicitly added later.
- Role update must be denied for unauthenticated, `STAFF`, `ADMIN`, `PENDING`, or `DISABLED` actors.

### Root Invariant

Centralize:

```ts
const ROOT_ADMIN_EMAIL = 'nguyennlt.ncc@gmail.com';
const isRootAdmin = (user) =>
  user.email.toLowerCase() === ROOT_ADMIN_EMAIL && user.role === 'ROOT_ADMIN';
```

All write paths must reject these target operations when `isRootAdmin(target)`:
- role update
- status update
- delete
- email update
- ownership transfer
- password reset by non-root

## Implementation Path

Use Better Auth + Prisma/PostgreSQL.

Implementation constraints:
- Do not keep localStorage auth as production path.
- Keep existing Figma UI where possible; submit to server auth endpoints/actions.
- Add Prisma schema before auth service.
- Store app-specific `role` and `status` in a dedicated 1:1 `AppUserProfile` table linked to the Better Auth user.
- Add middleware/server-side guard utilities for route protection.
- Add role/status helper functions to prevent scattered string checks.
- Keep filenames kebab-case per repo standards.
- Prefer KISS: no dynamic permission table until business needs it.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Public root hijack | Critical | Root created only by seed/env; public register never assigns root/admin |
| Public staff enters POS without approval | Critical | Register creates `PENDING`; dashboard/POS requires `ACTIVE` |
| Root email check duplicated | High | Centralize `ROOT_ADMIN_EMAIL` and `isRootAdmin` helper |
| UI-only RBAC | High | Enforce in server actions/API/middleware |
| Root demotion/delete/disable bug | High | Dedicated invariant and tests for every root mutation path |
| Brute-force login/register | High | Rate limit by IP and email; generic error messages |
| Cookie/CSRF weakness | Medium | HttpOnly/Secure/SameSite cookie and CSRF/same-site mutation guard |
| LocalStorage scaffold leaks into prod path | Medium | Remove or isolate demo auth from production auth |
| Better Auth vs custom auth drift | Medium | Plan uses Better Auth + Prisma; custom auth rejected for current scope |
| Scope creep into PIN/OTP | Low | Explicitly out of scope now |

## Validation Criteria

- Seed creates/keeps `nguyennlt.ncc@gmail.com` as `ROOT_ADMIN` + `ACTIVE`.
- Public register normal email creates `STAFF` + `PENDING`.
- Public register root email is rejected/reserved.
- Public register cannot create `ROOT_ADMIN` or `ADMIN`.
- `PENDING` staff cannot enter `/dashboard` or `/dashboard/sales`.
- `ROOT_ADMIN` can approve pending staff to active.
- `ADMIN` can approve pending staff to active.
- `STAFF` cannot approve accounts.
- Login active users redirects to `/dashboard`.
- Staff cannot open management routes.
- Staff cannot call management APIs.
- Admin cannot update roles.
- Root can promote staff to admin.
- Root can demote admin to staff.
- Root cannot be demoted/deleted/disabled/email-changed.
- Login/register rate limits are tested.
- Role/status checks are tested at server/API level, not only UI.

## Out Of Scope

- PIN login.
- Quick login 7 ngày.
- Forgot password / OTP email.
- POS/order implementation details.
- Dynamic permissions UI.
- Multi-branch org model.
- Public creation of admin/root accounts.

## Recommendations

- Use `/ck:plan --tdd` next.
- Reason: this changes auth and authorization, a critical security boundary. Tests should lock role/status/root invariants before implementation.

## Red-Team Changes Applied

- Replaced public root assignment with seed/env root bootstrap.
- Added `PENDING | ACTIVE | DISABLED` account status.
- Public signup now creates `STAFF + PENDING`.
- Root email is explicitly reserved and seed-only.
- Added staff approval before POS/dashboard access.
- Added root immutable invariant beyond role update.
- Added login/register rate limit requirement.
- Added cookie and CSRF policy requirement.
- Chose Better Auth + Prisma path explicitly.

## Unresolved Questions

None.
