# 2026-05-20 Auth RBAC Implementation

## Changes

- Replaced production browser demo auth path with Better Auth + Prisma-backed email/password auth.
- Added app-owned `AppUserProfile` for `ROOT_ADMIN`, `ADMIN`, `STAFF` and `PENDING`, `ACTIVE`, `DISABLED`.
- Added guarded app auth endpoints for register, login, and logout.
- Blocked direct Better Auth credential signup/signin so app policy cannot be bypassed.
- Added `/dashboard` module shell with server-side RBAC and legacy `/admin`/`/pos` redirects.
- Added staff approval, role update, and disable transitions with root target immutability.

## Verification

- `pnpm test`: 12 files, 43 tests passed.
- `pnpm lint`: passed.
- `pnpm type-check`: passed.
- `pnpm build`: passed.
- `DATABASE_URL="postgresql://viepos:viepos@localhost:5432/viepos?schema=public" pnpm exec prisma validate`: passed.

## Notes

- Local DB push/seed smoke blocked because local Postgres does not accept the example `viepos` credentials.
- Security review led to fixes for raw credential endpoint bypass, status leak before password verification, durable rate limits, transition races, malformed request bodies, root preclaim guard, multi-cookie forwarding, and real logout.

## Unresolved Questions

None.
