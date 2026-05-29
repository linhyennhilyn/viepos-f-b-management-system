# Red Team Review

## Verdict

CAUTION, mitigated in-plan.

## Findings

| Finding | Severity | Resolution |
|---------|----------|------------|
| Root email could be ambiguously handled in public register | Critical | Plan/report now require public root email rejection; root is seed-only |
| Middleware-only auth would be bypass-prone | High | Phase 3 requires server layout/page/API guards as source of truth |
| Better Auth may create sessions before app status checks | High | Phase 2 calls this out and requires wrapper/hooks before session acceptance |
| Role/status mutation boundaries could blur | High | Phase 4 separates approval service from role service |
| Disable actor/target rules were underspecified | High | Phase 4 now defines root/admin/staff disable matrix and tests |
| Root seed test was optional | High | Phase 1 now requires automated root seed tests |
| Rate-limit gate was vague | Medium | Phase 2 now sets login/register thresholds and tests |
| Better Auth custom fields might be brittle | Medium | Phase 1 now uses 1:1 `AppUserProfile` for app role/status |
| Existing docs mention PIN/quick login as auth path | Medium | Phase 5 requires docs cleanup and marks PIN/quick-login out of scope |

## Required Gates

- Public root email register rejection test.
- Pending/disabled login rejection tests.
- Root immutable target tests for role/status/delete/email.
- Disable transition tests for root/admin/staff actor matrix.
- Rate limit tests for login/register thresholds.
- Server-side route/API permission tests.
- Grep/test guard for localStorage auth imports in production paths.

## Unresolved Questions

None.
