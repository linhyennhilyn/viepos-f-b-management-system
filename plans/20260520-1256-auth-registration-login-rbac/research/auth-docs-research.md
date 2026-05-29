# Auth Docs Research

## Sources

- Better Auth email/password: https://better-auth.com/docs/authentication/email-password
- Better Auth Prisma adapter: https://better-auth.com/docs/adapters/prisma
- Better Auth rate limit: https://better-auth.com/docs/concepts/rate-limit
- Next.js authentication guide: https://nextjs.org/docs/app/building-your-application/authentication
- Prisma Next.js guide: https://www.prisma.io/docs/guides/nextjs

## Findings

- Better Auth supports email/password auth and route handler integration for Next.js.
- Better Auth supports Prisma adapter path, matching repo docs.
- Better Auth has built-in rate-limit concepts; plan still requires tests/wrappers around app-specific endpoints.
- Next.js route protection should not rely only on client-side guards. Server-side checks in layouts/pages/API are required.
- Prisma setup should come before auth service integration because role/status/root seed need schema certainty.

## Plan Impact

- Phase 1 handles Prisma + Better Auth foundation first.
- Phase 2 wraps registration/login with app role/status rules.
- Phase 3 treats server guards as source of truth.
- Phase 4 keeps approval and role mutation separate.
- Phase 5 removes localStorage auth paths and updates stale docs.

## Unresolved Questions

None.
