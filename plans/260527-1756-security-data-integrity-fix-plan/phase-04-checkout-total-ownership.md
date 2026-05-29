---
phase: 4
title: Checkout Total Ownership
status: completed
priority: P1
effort: 1d
dependencies:
  - 2
---

# Phase 4: Checkout Total Ownership

## Overview

Make backend own POS pricing, totals, and payment reconciliation. Fix append-items double counting.

## Requirements

- Functional: unit prices come from product/category pricing and service type.
- Functional: order totals equal persisted order item totals.
- Functional: append-items adds line subtotal once and creates payment for addon once.
- Non-functional: reject impossible/mismatched client totals with clear 400 errors.

## Architecture

Extend `OrderCheckoutService` to resolve price from `ProductPriceService`. Treat frontend price/paymentAmount as requested tender info, not source of truth.

Current verified bug surface:
- `OrderCheckoutService.parseItems` accepts `item.price` from request and later persists it as `OrderItem.unitPrice`.
- `OrderController.createTakeawayOrder` overwrites `order.totalAmount` from client `paymentAmount` after checkout calculation.
- `CardController.startSession` uses the same client total override for session checkout.
- `OrderController.appendOrderItems` calls `completeCheckout(..., true)`, which already adds item subtotal, then adds client `paymentAmount` again.
- `ProductPriceService` already centralizes effective prices but needs a direct helper for service-type price selection.

Checkout money policy:
- Server total wins. Backend calculates `unitPrice`, `lineTotal`, `subtotalAmount`, and `totalAmount` from catalog/category pricing and service type.
- Ignore client `item.price` for persistence; keep it only as optional telemetry/debug input if needed.
- `paymentAmount` must equal the server-calculated order total for new checkout, or server-calculated addon subtotal for append-items.
- Non-cash/transfer mismatch returns 400. Do not silently normalize mismatched client payment totals.
- Cash uses `cashReceived` as tender amount: `cashReceived >= serverTotal` is valid, `cashReceived < serverTotal` returns 400.
- Append-items calculates `addonSubtotal` server-side, adds it to `order.totalAmount` exactly once, and creates one payment row with amount `addonSubtotal`.
- Frontend should refresh cart/order pricing from backend after a 400 mismatch, not retry with client-side prices.

## Related Code Files

- Modify: `backend/src/main/java/com/viepos/backend/services/OrderCheckoutService.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/OrderController.java`
- Modify: `backend/src/main/java/com/viepos/backend/controllers/CardController.java`
- Modify: `backend/src/main/java/com/viepos/backend/services/ProductPriceService.java` if helper missing
- Modify frontend only if response contract changes: `frontend/src/pages/PosSalesPage.tsx`
- Create/modify tests under `backend/src/test/java/...`

## Test Plan

- Add backend regression tests before implementation.
- Prefer controller/service tests that inspect saved `Order`, `OrderItem`, and `Payment` through repository mocks.
- Minimum cases:
  - tampered request sends `price: 1`, but saved unit price comes from catalog/category pricing.
  - new checkout with `paymentAmount < serverTotal` returns 400 and saves no undercharged payment.
  - new checkout with transfer/non-cash `paymentAmount > serverTotal` returns 400.
  - cash checkout with `cashReceived > serverTotal` succeeds and payment row amount remains server total.
  - append-items adds addon subtotal once to existing order total.
  - append-items payment row amount equals server-calculated addon subtotal, not client `paymentAmount`.

## Implementation Steps

1. Tests Before: tampered item `price: 1` persists catalog-derived unit price.
2. Tests Before: append-items total increases by addon subtotal exactly once.
3. Tests Before: `paymentAmount < serverTotal` returns 400.
4. Tests Before: `paymentAmount > serverTotal` returns 400 for transfer/non-cash.
5. Tests Before: cash `cashReceived > serverTotal` succeeds and persists tender separately.
6. Tests Before: append-items payment row amount equals server-calculated addon subtotal.
7. Refactor `parseItems` to parse product/service/quantity only; price resolved after product load.
8. Use `ProductPriceService` to resolve `TAKEAWAY`, `PACKAGE_4H/FOUR_HOURS`, `FULL_DAY/FULLTIME`.
9. Remove controller total overrides from client `paymentAmount`.
10. For payments, use server-calculated order/addon amount; compare cash received separately.
11. Regression Gate: checkout/order tests pass.

## Success Criteria

- [x] Client cannot undercharge by editing item price/paymentAmount.
- [x] Transfer/non-cash payment mismatch returns 400.
- [x] Cash over-tender is allowed through `cashReceived`; under-tender returns 400.
- [x] Existing order append no longer double-counts total.
- [x] Append-items creates payment amount equal to server-calculated addon subtotal.
- [x] Revenue stats derive from consistent order/payment rows.

## Evidence

- Red tests first:
  - `cd backend && bash ./mvnw -Dtest=OrderControllerCheckoutTotalTest test` initially failed on trusted client item price, payment mismatch acceptance, and append double-counting.
  - Re-review alias finding was converted into failing tests for `serviceType=FULLTIME`, `serviceType=FOUR_HOURS`, and card top-level `duration=PACKAGE_4H` / `FOUR_HOURS`.
- Final backend tests: `cd backend && bash ./mvnw test` passed 37 tests, 0 failures/errors.
- Code review:
  - First review found one blocking service-type alias gap; fixed with shared alias normalization.
  - Second review found one medium card-session duration alias gap; fixed with `OrderCheckoutService.resolveServiceType`.
  - Final narrow re-review found no blocking/important findings.
- Regression coverage added:
  - tampered `item.price` persists catalog/category price,
  - under/over transfer mismatch returns 400 before touched writes,
  - cash over-tender succeeds and under-tender fails,
  - append-items adds addon subtotal once and payment uses server addon subtotal,
  - card session checkout rejects underpay before creating order/card/session/payment rows,
  - `TAKEAWAY`, `FOUR_HOURS`/`PACKAGE_4H`, `FULL_DAY`/`FULLTIME` aliases price correctly.

## Risk Assessment

Legacy frontend may send stale price names/durations. Keep service type normalization backwards-compatible.

## Issue Update Notes

- GitHub issue #4 should be updated after tests pass and commit is pushed.
- Include evidence: backend test command, test count, code-review result, commit hash, and exact behavior fixed.
