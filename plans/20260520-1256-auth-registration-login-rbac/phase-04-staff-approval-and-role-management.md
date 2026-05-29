---
phase: 4
title: "Staff Approval and Role Management"
status: completed
priority: P1
effort: "2d"
dependencies: [1, 2, 3]
---

# Phase 4: Staff Approval and Role Management

## Context Links

- Phase 3 dashboard shell: [`phase-03-dashboard-rbac-shell.md`](./phase-03-dashboard-rbac-shell.md)
- Source report role rules: [`../reports/260520-1223-auth-registration-login-rbac-brainstorm.md`](../reports/260520-1223-auth-registration-login-rbac-brainstorm.md)

## Overview

Add account approval and root-only role management. Admin/root can activate pending staff; only root can promote/demote `ADMIN`/`STAFF`. Root target remains immutable.

## Requirements

- Functional: pending staff list is visible to admin/root.
- Functional: admin/root can approve pending staff to active.
- Functional: root can promote active staff to admin and demote admin to staff.
- Functional: admin cannot change roles.
- Functional: root can disable admin/staff; admin can disable staff only.
- Security: root cannot be demoted, disabled, deleted, or email-changed.

## Architecture

Separate account status changes from role changes:
- Approval service: `PENDING -> ACTIVE` for staff accounts; actor `ROOT_ADMIN | ADMIN`.
- Disable service: root can disable `ADMIN`/`STAFF`; admin can disable `STAFF`; staff cannot disable anyone; nobody can disable root.
- Role service: actor `ROOT_ADMIN` only; target roles `ADMIN | STAFF`; target cannot be root.

Use server actions or route handlers behind dashboard forms. Every mutation checks actor session, actor status, target invariant, and allowed transition.

## File Inventory

| File | Action | Test impact |
|------|--------|-------------|
| `server/auth/user-admin-service.ts` | Create | unit/integration |
| `app/dashboard/staff/approvals/page.tsx` | Implement | route tests |
| `app/dashboard/staff/roles/page.tsx` | Implement root-only UI | route tests |
| `components/auth/user-status-actions.tsx` | Create if needed | component tests |
| `components/auth/user-role-actions.tsx` | Create if needed | component tests |
| `lib/auth/user-transitions.ts` | Create | unit tests |
| `__tests__/server/auth/user-admin-service.test.ts` | Create | TDD |
| `__tests__/lib/auth/user-transitions.test.ts` | Create | TDD |

## Test Scenario Matrix

| Scenario | Priority | Test before code |
|----------|----------|------------------|
| root approves pending staff | Critical | yes |
| admin approves pending staff | Critical | yes |
| staff cannot approve | Critical | yes |
| pending actor cannot approve | Critical | yes |
| root promotes staff to admin | Critical | yes |
| root demotes admin to staff | Critical | yes |
| admin cannot promote/demote | Critical | yes |
| root disables active admin/staff | Critical | yes |
| admin disables active staff | Critical | yes |
| admin cannot disable admin/root | Critical | yes |
| staff cannot disable anyone | Critical | yes |
| root target cannot be role/status/email/delete mutated | Critical | yes |
| cannot set another user to root through UI/API | Critical | yes |

## Function / Interface Checklist

- `approveStaffAccount(actor, targetId)`
- `updateUserRole(actor, targetId, role)`
- `assertMutableTarget(target)`
- `assertCanApproveAccount(actor, target)`
- `assertCanUpdateRole(actor, target)`
- `assertCanDisableAccount(actor, target)`

## Dependency Map

- Depends on Phase 3 dashboard modules and server guards.
- Depends on Phase 1 root invariant helper.
- Blocks final cleanup because old admin/pos pages should not remain as unmanaged access paths.

## Implementation Steps

### Tests Before

1. Write transition tests for approval and role update authorization.
2. Write disable transition tests for root/admin/staff actors.
3. Write root invariant tests for every mutation path.
4. Write route/server action tests for `403` behavior where practical.

### Refactor / Build

1. Implement user admin service with explicit transition functions.
2. Implement pending staff list and approval action.
3. Implement root-only role management page.
4. Implement disable actions using the fixed actor/target matrix.
5. Use optimistic UI only after server mutation succeeds; avoid pretending approval succeeded.
6. Add audit-friendly status/role update messages in UI.

### Tests After

1. Add integration tests with Prisma test DB if harness exists.
2. Add dashboard route smoke tests for admin/root/staff access.

### Regression Gate

1. `pnpm lint`
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm build`

## Success Criteria

- [x] Admin/root can approve pending staff.
- [x] Staff cannot approve accounts.
- [x] Root can promote/demote admin/staff.
- [x] Admin cannot change roles.
- [x] Disable transitions follow the root/admin/staff matrix.
- [x] Root target is immutable across role/status/delete/email mutations.
- [x] Transition tests pass.

## Risk Assessment

- Risk: role and status mutations blur together. Mitigation: separate services/functions and tests.
- Risk: root target protection only exists on one path. Mitigation: central `assertMutableTarget` used by all user mutations.

## Security Considerations

- Deny by default on unknown role/status.
- Do not trust submitted target role/status strings without validation.
- Return `403` for unauthorized mutation attempts.
- Role changes require active targets; pending/disabled accounts cannot be promoted or demoted.
