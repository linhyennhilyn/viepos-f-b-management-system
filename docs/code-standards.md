# ViePOS — Code Standards & Guidelines

## TypeScript

### Strict Mode & Type Safety
- **tsconfig.json:** `strict: true` (no implicit any, strict nulls, strict function types)
- **No `any` type** except with explicit justification comment: `// TODO: type this when API response is documented`
- **Prefer explicit types over inference** for function signatures and exports
- **Type aliases for unions:** `type PaymentMethod = 'TIEN_MAT' | 'CHUYEN_KHOAN'`
- **Enums only for stable constants:** Use enum for roles/statuses; use union types for features

### Example (Good)
```typescript
interface CartItem {
  menuItemId: string;
  quantity: number;
  specialRequests?: string;
}

const addToCart = (item: CartItem): void => {
  // ...
};
```

---

## File & Folder Naming

### Convention: kebab-case for all files
- **Components:** `pin-input.tsx`, `menu-grid.tsx`, `cart-panel.tsx`
- **Utils:** `format-vnd.ts`, `calculate-change.ts`, `device-fingerprint.ts`
- **Services:** `auth-service.ts`, `payment-service.ts`, `realtime-service.ts`
- **Hooks:** `use-cart.ts`, `use-session.ts`, `use-realtime.ts`
- **Tests:** `pin-input.test.tsx`, `format-vnd.test.ts`

### Descriptive names are fine—clarity > brevity
- ✅ `calculate-change-from-payment.ts`
- ❌ `calc-chg.ts`

### Exceptions (language conventions)
- Prisma schemas: `schema.prisma` (Prisma standard)
- Config files: `.prettierrc.json`, `next.config.ts` (Next.js standard)
- Migration files: `000001_initial-schema.up.sql` (Flyway/Prisma convention)

---

## File Size & Modularization

### Target: Keep files under 200 lines of code (LOC)

**Why?** Easier context loading for LLMs, faster diffs, simpler testing, reduced cognitive load.

### Split strategy:
1. **Components >200 LOC:**
   - Separate logic hooks into `use-*.ts`
   - Extract sub-components into separate files
   - Move styling to CSS modules if complex

2. **Services >200 LOC:**
   - Separate database queries into repositories
   - Extract external API clients into dedicated files
   - Split business logic into domain-specific modules

3. **What NOT to split:**
   - Configuration files (config, schema, .env)
   - Single-export utilities
   - Small page files (<150 LOC)

### Example refactoring
**Before:** `menu-management.ts` (250 LOC)
```
├── menu-management.ts (query builder, cache layer, validation)
```

**After:** Split into focused modules
```
├── menu-repository.ts (database queries)
├── menu-cache.ts (Redis interaction)
├── menu-validator.ts (Zod schemas)
└── menu-service.ts (orchestration, <150 LOC)
```

---

## Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Components (React) | PascalCase | `MenuGrid`, `CartPanel`, `PinInput` |
| Component files | kebab-case | `menu-grid.tsx`, `cart-panel.tsx` |
| Utility functions | camelCase | `formatVnd()`, `calculateChange()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PIN_ATTEMPTS`, `CART_PERSIST_KEY` |
| Types/Interfaces | PascalCase | `CartItem`, `PaymentMethod`, `User` |
| Hooks | camelCase with `use` prefix | `useCart()`, `useSession()`, `useRealtime()` |
| Boolean vars | `is*` or `has*` prefix | `isLoading`, `hasError`, `canSubmit` |
| Database models (Prisma) | PascalCase (singular) | `User`, `MenuItem`, `Order`, `Table` |
| Database fields | camelCase | `menuItemId`, `specialRequests`, `createdAt` |
| tRPC procedures | camelCase | `router.auth.login()`, `router.orders.create()` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL`, `BETTER_AUTH_SECRET` |

---

## Component Structure

### One component per file
```
components/pos/menu-grid.tsx (MenuGrid component only)
components/pos/menu-item-card.tsx (MenuItemCard component only)
```

### Colocated tests
```
components/pos/menu-grid.tsx
components/pos/menu-grid.test.tsx (in same folder)
```

### Component template
```typescript
// components/pos/menu-grid.tsx
'use client';

import { useState } from 'react';
import type { MenuItem } from '@/lib/types';
import { MenuItemCard } from './menu-item-card';

interface MenuGridProps {
  items: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
  isLoading?: boolean;
}

export function MenuGrid({ items, onSelectItem, isLoading }: MenuGridProps) {
  const [filter, setFilter] = useState('');

  const filtered = items.filter(
    (item) => item.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="grid grid-cols-4 gap-4">
      {filtered.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          onClick={() => onSelectItem(item)}
          isDisabled={isLoading}
        />
      ))}
    </div>
  );
}
```

---

## Import Organization

### Order: External → Aliases → Relative
```typescript
// 1. React & external packages
import { useState, useCallback } from 'react';
import type { NextPage } from 'next';
import { useQuery } from '@tanstack/react-query';

// 2. Path aliases
import type { MenuItem } from '@/lib/types';
import { formatVnd } from '@/lib/utils/format-vnd';
import { MenuItemCard } from '@/components/pos/menu-item-card';
import { trpc } from '@/lib/api/trpc';

// 3. Relative imports (rarely needed in modular structure)
import { validatePrice } from './validators';
```

### Path aliases in `tsconfig.json`
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/server/*": ["server/*"],
      "@/app/*": ["app/*"]
    }
  }
}
```

---

## Naming: tRPC Procedures

### Structure
```typescript
// server/trpc/router.ts
export const appRouter = t.router({
  auth: t.router({
    login: t.procedure.input(LoginSchema).mutation(({ input }) => { ... }),
    logout: t.procedure.mutation(({ ctx }) => { ... }),
    verifyPin: t.procedure.input(VerifyPinSchema).mutation(({ input, ctx }) => { ... }),
  }),
  orders: t.router({
    create: t.procedure.input(CreateOrderSchema).mutation(({ input, ctx }) => { ... }),
    getById: t.procedure.input(z.string()).query(({ input, ctx }) => { ... }),
  }),
  // ...
});
```

### Usage
```typescript
const { data } = trpc.auth.login.useMutation();
const { data: order } = trpc.orders.getById.useQuery(orderId);
```

---

## Naming: Prisma Models & Fields

### Models (PascalCase, singular)
```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String
  role              Role      @default(STAFF)
  deviceFingerprint String?
  createdAt         DateTime  @default(now())

  orders            Order[]
  sessions          Session[]

  @@index([email])
}

model MenuItem {
  id                String    @id @default(cuid())
  name              String
  price             Int       // VND in cents (e.g., 25000 = 250.00 VND)
  imageUrl          String?
  category          String
  stock             Int       @default(-1)  // -1 = unlimited
  createdAt         DateTime  @default(now())

  orderItems        OrderItem[]

  @@index([category])
}

enum Role {
  MANAGER
  STAFF
}

enum PaymentMethod {
  TIEN_MAT
  CHUYEN_KHOAN
}

enum OrderStatus {
  PENDING
  COMPLETED
  SETTLED
}
```

### Fields (camelCase, explicit types)
- ✅ `createdAt`, `specialRequests`, `menuItemId`, `isActive`, `totalAmount`
- ❌ `created_at`, `special_requests`, `totalAmt`

---

## ESLint & Prettier Configuration

### `.eslintrc.json`
```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "react/react-in-jsx-scope": "off",
    "react/display-name": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### `.prettierrc.json`
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

---

## Git Workflow & Commit Messages

### Branch strategy
- **Main branch:** `main` (production-ready, protected)
- **Development branch:** `dev` (integration point for features)
- **Feature branches:** `feat/{feature-name}` (e.g., `feat/pin-login`)
- **Bugfix branches:** `fix/{bug-name}` (e.g., `fix/cart-persistence`)
- **Documentation:** `docs/{change}` (e.g., `docs/api-reference`)

### Conventional commit format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```
feat(auth): implement PIN login with device fingerprint
fix(cart): resolve localStorage persistence on browser refresh
docs(deployment): add Vercel + Neon setup guide
test(payment): add SePay webhook validation tests
refactor(menu): extract MenuItem queries into menu-repository.ts
```

**Rules:**
- Lowercase subject (no period)
- Imperative mood ("add" not "added")
- Keep subject <50 chars
- Reference issue in footer: `Closes #123` or `Resolves #456`
- NO AI references in messages

---

## Testing

### Unit tests (Vitest)
- **Location:** Colocated with source file or in `__tests__/` mirror
- **Naming:** `{file}.test.ts` or `{file}.test.tsx`
- **Framework:** Vitest + React Testing Library (for components)
- **Target:** >80% coverage for lib/ & server/services/

### Example unit test
```typescript
// lib/utils/format-vnd.test.ts
import { describe, it, expect } from 'vitest';
import { formatVnd } from './format-vnd';

describe('formatVnd', () => {
  it('formats VND currency with thousands separator', () => {
    expect(formatVnd(25000)).toBe('25.000 ₫');
    expect(formatVnd(1500000)).toBe('1.500.000 ₫');
  });

  it('handles zero', () => {
    expect(formatVnd(0)).toBe('0 ₫');
  });

  it('throws on negative input', () => {
    expect(() => formatVnd(-100)).toThrow();
  });
});
```

### E2E tests (Playwright)
- **Location:** `e2e/` directory
- **Naming:** `{flow}.spec.ts` (e.g., `auth.spec.ts`, `pos-sales.spec.ts`)
- **Focus:** Critical user flows (login → order → payment → receipt)

---

## Code Comments

### Comment only the WHY, not the WHAT
```typescript
// ✅ Good: explains intent
// Prevent stale cart data from being used after refresh (offline edge case)
const cart = localStorage.getItem(CART_KEY);

// ❌ Bad: states obvious code
// Get cart from localStorage
const cart = localStorage.getItem(CART_KEY);
```

### Avoid comments that reference plans, findings, or audits
- ❌ `// Per F13, use advisory lock for concurrent reassigns`
- ❌ `// Phase 1 TODO: optimize menu rendering`
- ✅ `// Use advisory lock to serialize concurrent reassigns (prevents race condition)`
- ✅ `// Cache menu items for 5 min to reduce DB hits`

### Comments OK to include
- **Explain trade-offs:** "Zod validation here instead of DB constraint to provide instant feedback"
- **Reference stable IDs:** "See RFC 7231 §6.3.1 for 200 status code" or "PostgreSQL SQLSTATE 23505"
- **Implementation notes:** "Special handling for VND: store as cents (multiply by 100)"

---

## Error Handling

### Consistent error response pattern
```typescript
// lib/utils/error-handler.ts
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export function createError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: Date.now(),
  };
}

// tRPC procedure
export const login = t.procedure
  .input(LoginSchema)
  .mutation(async ({ input }) => {
    try {
      const user = await db.user.findUnique({ where: { email: input.email } });
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Email not registered',
        });
      }
      // ...
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Login failed unexpectedly',
      });
    }
  });
```

---

## Validation & Schemas

### Use Zod for runtime validation
```typescript
// lib/utils/validators.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password too short'),
});

export const PinSchema = z
  .string()
  .length(6, 'PIN must be 6 digits')
  .regex(/^\d+$/, 'PIN must contain only digits');

export const CartItemSchema = z.object({
  menuItemId: z.string().cuid(),
  quantity: z.number().int().positive(),
  specialRequests: z.string().optional(),
});

export type Login = z.infer<typeof LoginSchema>;
```

---

## Constants & Config

### Centralize constants
```typescript
// lib/constants/payment-denominations.ts
export const CASH_DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000] as const;

// lib/constants/config.ts
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
export const CART_PERSIST_KEY = 'viepos:cart';
export const CART_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
export const QUICK_LOGIN_DURATION_DAYS = 7;
export const SESSION_TIMEOUT_MS = {
  MANAGER: 8 * 60 * 60 * 1000, // 8 hours
  STAFF: 4 * 60 * 60 * 1000, // 4 hours
} as const;
```

---

## Security Standards

### Passwords
- **Hashing:** bcrypt (via Better Auth, cost factor 12)
- **Min length:** 8 characters
- **Complexity:** Enforce for Quản Lý (uppercase, lowercase, number)

### PINs
- **6-digit numeric only**
- **Hash before storage** (bcrypt)
- **Rate limit:** 5 wrong attempts → 5 min lockout

### API Keys & Secrets
- **Never commit** `.env` or `.env.local`
- **Use `.env.example`** as template
- **Rotate** BETTER_AUTH_SECRET, SePay API key annually
- **Environment variable format:** `{SERVICE}_{KEY}` (e.g., `SEPAY_API_KEY`, `REDIS_URL`)

### HTTPS & Cookies
- **Production:** Force HTTPS (`next.config.ts` → `headers()` secure flag)
- **Session cookies:** HttpOnly, Secure, SameSite=Strict

### Data validation
- **Input validation:** Zod schemas on tRPC procedures
- **SQL injection:** Use Prisma parameterized queries (no raw SQL unless necessity)
- **XSS:** React JSX auto-escapes; use `dangerouslySetInnerHTML` only with sanitized HTML

---

## Unresolved Questions

None. Standards align with Next.js 15 + React 19 best practices and ViePOS architecture.
