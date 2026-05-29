# Validation Review

## Critical Questions

| Question | Answer |
|----------|--------|
| How is root created without public takeover? | Seed/env only; public root email is reserved/rejected |
| Can a random signup enter POS? | No. Public signup creates `STAFF + PENDING`; dashboard requires `ACTIVE` |
| Who approves staff? | `ROOT_ADMIN` or `ADMIN` can approve pending staff to active |
| Who changes roles? | Only `ROOT_ADMIN`; `ADMIN` cannot promote/demote |
| Can root be changed by another account? | No. Root target is immutable for role/status/delete/email updates |
| Where are app role/status fields stored? | Dedicated 1:1 `AppUserProfile`, not Better Auth-owned credential/session tables |
| Who can disable accounts? | Root can disable admin/staff; admin can disable staff; staff cannot disable anyone; nobody can disable root |
| What are auth rate limits? | Login: 5 failed attempts/10 min/email+IP. Register: 3 attempts/hour/IP |
| Are root seed tests optional? | No. Automated seed tests are required via test DB or mocked Prisma client |
| Is localStorage auth still production path? | No. Phase 5 requires deletion/isolation and grep guard |
| Where do all roles go after login? | `/dashboard` |
| Are PIN and quick login included? | No. Explicitly out of scope |

## Result

Plan is specific enough for TDD implementation after the listed gates are followed.

## Unresolved Questions

None.
