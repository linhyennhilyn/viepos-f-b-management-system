# ViePOS - Project Roadmap

**Last Updated:** 2026-05-20  
**Status:** Phase 1 complete. Phase 2 is next, and the responsive internal dashboard shell foundation is in place.

## Phase Overview

| Phase | Title | Status | Deliverables |
|---|---|---|---|
| **Phase 1** | Authentication, registration, and RBAC | ✅ Complete | Better Auth, public registration, login, dashboard module gating, staff approval and role transitions |
| **Phase 2** | POS sales and payments | 📋 Planned | Menu, cart, cash / QR payment, receipts |
| **Phase 3** | Table management | 📋 Planned | Table grid, table orders, realtime sync |
| **Phase 4+** | Reporting and expansion | 🔮 Future | Analytics, multi-branch, inventory, and later features |

## Phase 1: Authentication, Registration, and RBAC

### Completed Scope

- [x] Prisma/PostgreSQL schema for Better Auth-compatible `User`, `Session`, `Account`, `Verification`, and `AppUserProfile`
- [x] Better Auth route handler at `app/api/auth/[...all]/route.ts` with direct credential endpoint guard
- [x] Public registration endpoint at `app/api/app-auth/register`
- [x] Login endpoint at `app/api/app-auth/login`
- [x] Logout endpoint at `app/api/app-auth/logout`
- [x] Public signup defaults to `STAFF` + `PENDING`
- [x] Reserved root email `nguyennlt.ncc@gmail.com` is rejected
- [x] Login is email/password only with PostgreSQL-backed rate limiting
- [x] `PENDING` and `DISABLED` users cannot create sessions
- [x] Successful login redirects to `/dashboard`
- [x] Dashboard module gating is enforced on the server
- [x] Staff approval, role update, and disable flows are implemented
- [x] Root admin target is immutable
- [x] `/admin` and `/pos` redirect to `/dashboard`
- [x] Local verification passed: lint, type-check, build, Prisma validate

### Progress Notes

- 2026-05-20: Auth registration/login/RBAC implementation completed. Browser demo auth imports remain only as legacy scaffold helpers.
- 2026-05-20: DB migrate/seed smoke blocked locally because Postgres is running but the example `viepos` role/database is missing.

### Definition Of Done

- [x] Users can register publicly as staff.
- [x] Active users can log in and reach the dashboard.
- [x] Inactive users are blocked before session creation.
- [x] Dashboard modules are filtered by role on the server.
- [x] Staff approval and role transitions are protected.

## Phase 2: POS Sales and Payments

### Planned Scope

- [ ] Menu management for sales work.
- [ ] Cart and order creation.
- [ ] Cash payment handling.
- [ ] Bank transfer / QR payment handling.
- [ ] Receipt rendering and printing.

### Current Foundation

- [x] Responsive internal dashboard shell, mobile drawer, and shared placeholder screens are implemented.
- [x] Playwright dashboard-shell coverage exists for authenticated desktop, tablet, and mobile viewport checks.

### Dependencies

- Phase 1 complete.

### Success Criteria

- [ ] Staff can move from dashboard entry into sales workflows without auth regressions.
- [ ] Payment paths remain server-validated.
- [ ] Receipts print or fall back cleanly when hardware is unavailable.

## Phase 3: Table Management

### Planned Scope

- [ ] Table grid and table status tracking.
- [ ] Table-specific orders.
- [ ] Realtime sync across staff devices.
- [ ] Table settlement flow.

### Dependencies

- Phase 1 complete.
- Phase 2 complete.

### Success Criteria

- [ ] Table state changes stay consistent across clients.
- [ ] Realtime updates remain visible to all active staff sessions.

## Phase 4 And Beyond

### Future Themes

- Analytics and reporting.
- Multi-branch support.
- Inventory and supplier workflows.
- Customer loyalty and advanced promotions.

## Current Risks

- DB migrate/seed smoke still needs a local Postgres pass.
- Future POS and table modules should reuse the server-side RBAC pattern and the internal shell foundation already in place.

## Unresolved Questions

None.
