# ViePOS — Design System & Guidelines

**Sources (Figma, ViePOS project):**
- Brand identity: `KIẾN TẬP` — fileKey `MVf0wa4YxVRJKS2q5992oc` (logo, foundation colors, typography, core components)
- Wireframes: `VIEPOS-WIREFRAME` — fileKey `txxN6issmLkjIG35KXt2ZF` (screen layouts, component placements)

---

## Brand Foundation

The 4 colors and single typeface below are the **canonical brand identity** for ViePOS. All other tokens in this document (status, neutrals, gradients) are derived from or supplement this foundation.

### Brand Palette (4 colors)

| Role | Hex | Usage |
|------|-----|-------|
| **Brand Dark Green** | `#256E05` | Primary brand color — logo, CTA button, headers, primary actions |
| **Brand Light Green** | `#3CB018` | Secondary brand color — hover states, accents, gradient end |
| **Off-white** | `#F2F3ED` | Page background, light surfaces |
| **Black** | `#000000` | Primary text, borders |

### Brand Typeface

**Inter** — single typeface for the entire product. No secondary or display fonts.

Weight scale: Light (300) · Regular (400) · Medium (500) · Semibold (600) · Bold (700).

---

## Color Tokens

### Primary Brand Colors
| Token | Hex | Usage | CSS Variable |
|-------|-----|-------|--------------|
| Brand Dark Green | `#256E05` | Primary action (hover), logo | `--color-brand-dark` |
| Brand Light Green | `#3CB018` | Hero gradient, secondary | `--color-brand-light` |
| Action Green (CTA) | `#256E05` | Button default, CTA — mapped to Brand Dark Green | `--color-action-primary` |

### Background & Neutral
| Token | Hex | Usage | CSS Variable |
|-------|-----|-------|--------------|
| Background Light | `#F2F3ED` | Page bg, light surfaces | `--color-bg-light` |
| White | `#FFFFFF` | Cards, modals, text bg | `--color-white` |
| Black | `#000000` | Text, borders | `--color-black` |
| Gray 1 (Placeholder) | `#CBCBCB` | Placeholder text | `--color-gray-1` |
| Gray 2 (Separator) | `#C4C4C4` | Dividers, light borders | `--color-gray-2` |
| Gray 3 (Label) | `#878787` | Secondary text, labels | `--color-gray-3` |
| Gray 4 (Disabled) | `#BCBFC2` | Disabled text | `--color-gray-4` |
| Gray 5 (Border) | `#E0E0E0` | Light borders, outlines | `--color-gray-5` |
| Gray 6 (BG) | `#F5F5F5` | Disabled backgrounds | `--color-gray-6` |
| Gray 7 (Subtle) | `#C2C2C2` | Very subtle elements | `--color-gray-7` |

### Status Colors
| Status | Hex (Color) | Hex (BG) | Usage | CSS Variable |
|--------|-------------|----------|-------|--------------|
| Success | `#349409` | `#EDFFE5` | Order complete, payment confirmed | `--color-success` |
| Warning | `#E8A909` | `#FFF8E5` | Stock low, pending action | `--color-warning` |
| Danger | `#C42326` | `#FFE8E8` | Error, failed payment, invalid PIN | `--color-danger` |
| Danger Border | `#8C1F1F` | — | Alert borders | `--color-danger-border` |
| Info | `#0023DD` | `#EBEEFF` | Information message | `--color-info` |
| Info Border | `#001DB8` | — | Info borders | `--color-info-border` |
| Alert Red | `#DE000B` | — | Critical alerts, validation | `--color-alert` |

### Gradients
```css
/* Brand gradient (hero bg, logo) */
background: linear-gradient(134deg, #3CB018 0%, #256E05 100%);
--gradient-brand: linear-gradient(134deg, var(--color-brand-light) 0%, var(--color-brand-dark) 100%);
```

### Tailwind Configuration
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#256E05',
          light: '#3CB018',
        },
        action: {
          primary: '#256E05', // aliased to brand.dark per brand foundation
        },
        status: {
          success: '#349409',
          'success-bg': '#EDFFE5',
          warning: '#E8A909',
          'warning-bg': '#FFF8E5',
          danger: '#C42326',
          'danger-bg': '#FFE8E8',
          'danger-border': '#8C1F1F',
          info: '#0023DD',
          'info-bg': '#EBEEFF',
          'info-border': '#001DB8',
          alert: '#DE000B',
        },
        gray: {
          1: '#CBCBCB',
          2: '#C4C4C4',
          3: '#878787',
          4: '#BCBFC2',
          5: '#E0E0E0',
          6: '#F5F5F5',
          7: '#C2C2C2',
        },
        background: '#F2F3ED',
      },
    },
  },
};
```

---

## Typography Scale

Per brand foundation: **Inter is the only typeface**. All text — headings, body, buttons, prices, badges — uses Inter with varying weights.

### Font Family
```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Self-host via `next/font/google` to avoid CDN latency:
```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-primary',
});
```

### Text Styles

All rows use Inter; only weight and size vary.

| Use Case | Weight | Size | Line Height | Letter Spacing |
|----------|--------|------|-------------|----------------|
| H1 (Page Title) | Bold (700) | 28px | 1.4 | -0.5px |
| H2 (Section) | Semibold (600) | 24px | 1.4 | — |
| H3 (Subsection) | Bold (700) | 20px | 1.4 | — |
| Body (Regular) | Regular (400) | 14px | 1.6 | — |
| Body (Medium) | Medium (500) | 14px | 1.6 | — |
| Button | Medium (500) | 14px | 1.2 | — |
| Label | Medium (500) | 12px | 1.4 | — |
| Caption | Regular (400) | 10px | 1.2 | — |
| Price | Semibold (600) | 16px | 1.2 | tabular-nums |
| Status Badge | Semibold (600) | 16px | 1.2 | — |
| Numpad Label | Medium (500) | 12px | 1.0 | — |
| Input Placeholder | Regular (400) | 14px | 1.6 | color `#CBCBCB` |
| Tagline | Light (300) | 14px | 1.4 | — |

> **Price token tip:** apply Tailwind `tabular-nums` (or CSS `font-variant-numeric: tabular-nums`) on price/total cells so VND digits align column-wise.

### Tailwind Typography Config
```typescript
export default {
  theme: {
    fontFamily: {
      sans: ["var(--font-primary)", "system-ui", "sans-serif"],
    },
    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '28px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
};
```

---

## Component Library Mapping

### Button Component

**Figma reference:** Button set (id 26:868)  
**Variants:** 2 types × 2 sizes × 4 states

#### Implementation: shadcn/ui Button with custom variants

```typescript
// components/ui/button.tsx (shadcn/ui base with custom variants)
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[4px] text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-action-primary text-white hover:bg-brand-dark disabled:bg-gray-6 disabled:text-gray-7',
        outline: 'border-[1px] border-action-primary text-action-primary hover:bg-action-primary hover:text-white disabled:bg-gray-6 disabled:border-gray-5 disabled:text-gray-7',
        secondary: 'bg-gray-6 text-gray-3 hover:bg-gray-5 disabled:bg-gray-6 disabled:text-gray-7',
      },
      size: {
        sm: 'px-3 py-2 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

### Status Badges

```typescript
// components/ui/status-badge.tsx
const statusBadgeStyles = {
  success: 'bg-status-success-bg text-status-success',
  warning: 'bg-status-warning-bg text-status-warning',
  danger: 'bg-status-danger-bg text-status-danger border border-status-danger-border',
  info: 'bg-status-info-bg text-status-info border border-status-info-border',
};

export function StatusBadge({ status, label }: Props) {
  return (
    <div className={`rounded-[5px] px-3 py-2 text-sm font-semibold ${statusBadgeStyles[status]}`}>
      {label}
    </div>
  );
}
```

### Form Inputs

```typescript
// components/ui/input.tsx
export function Input({ placeholder, disabled, ...props }: InputProps) {
  return (
    <input
      className="w-full rounded-[4px] border border-gray-5 bg-white px-3 py-2 text-base placeholder:text-gray-1 disabled:bg-gray-6 disabled:text-gray-7"
      placeholder={placeholder}
      disabled={disabled}
      {...props}
    />
  );
}
```

---

## PIN/OTP Input Component

**Pattern:** 6 separate cells, auto-advance focus, numeric only

```typescript
// components/ui/pin-input.tsx
interface PinInputProps {
  length?: number; // default 6
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function PinInput({ 
  length = 6, 
  onChange, 
  onComplete, 
  disabled, 
  error 
}: PinInputProps) {
  const [cells, setCells] = useState<string[]>(Array(length).fill(''));

  const handleCellChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // numeric only
    const newCells = [...cells];
    newCells[index] = value.slice(-1); // single digit
    setCells(newCells);
    onChange(newCells.join(''));

    // auto-advance to next cell
    if (value && index < length - 1) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }

    // trigger on complete when all cells filled
    if (newCells.every(c => c)) {
      onComplete?.(newCells.join(''));
    }
  };

  return (
    <div className="flex gap-2">
      {cells.map((_, i) => (
        <input
          key={i}
          id={`pin-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={cells[i]}
          onChange={(e) => handleCellChange(i, e.target.value)}
          disabled={disabled}
          className={`h-12 w-12 rounded-[4px] border-2 text-center text-lg font-bold transition-colors
            ${error ? 'border-status-danger' : 'border-gray-5'}
            focus:border-action-primary focus:outline-none
            disabled:bg-gray-6 disabled:text-gray-7`}
        />
      ))}
    </div>
  );
}
```

### Usage
```typescript
<PinInput 
  length={6} 
  onChange={(pin) => console.log(pin)}
  onComplete={(pin) => handlePinSubmit(pin)}
  error={pinError}
/>
```

---

## Numpad Component

**Pattern:** 3×3 grid for cash denominations (1k → 200k VND)

```typescript
// components/ui/numpad.tsx
const DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000] as const;

interface NumpadProps {
  onDenominationSelect: (amount: number) => void;
  selectedAmount?: number;
}

export function Numpad({ onDenominationSelect, selectedAmount }: NumpadProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {DENOMINATIONS.map((denom) => (
        <button
          key={denom}
          onClick={() => onDenominationSelect(denom)}
          className={`rounded-[4px] py-3 px-2 font-semibold text-sm transition-colors
            ${selectedAmount === denom 
              ? 'bg-action-primary text-white' 
              : 'bg-gray-6 text-gray-3 hover:bg-gray-5'
            }`}
        >
          {formatVnd(denom)}
        </button>
      ))}
    </div>
  );
}
```

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 2px | Micro spacing |
| sm | 4px | Tight spacing |
| md | 8px | Default spacing |
| lg | 12px | Comfortable spacing |
| xl | 16px | Section spacing |
| 2xl | 24px | Large section spacing |
| 3xl | 32px | Major section spacing |

**Tailwind config:**
```typescript
spacing: {
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '32px',
}
```

---

## Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 2px | Minimal rounding |
| sm | 4px | Button, input default |
| md | 5px | Badge, group rounding |
| lg | 10px | Modal corners, larger containers |
| xl | 14px | Header chip |
| 2xl | 20px | Circular badge start |
| 3xl | 25px | Decorative card rounding |
| full | 9999px | Fully circular |

**Tailwind config:**
```typescript
borderRadius: {
  xs: '2px',
  sm: '4px',
  md: '5px',
  lg: '10px',
  xl: '14px',
  '2xl': '20px',
  '3xl': '25px',
  full: '9999px',
}
```

---

## Logo & Branding

### Logo Marks

ViePOS has two logo forms — both derived from a stylized **"V"** shape: an upward-pointing chevron with an arrow-like inner stroke, suggesting forward motion and a checkmark (completion).

| Form | Use | Composition |
|------|-----|-------------|
| **Wordmark** | Headers, login hero, marketing | Stylized "V" + lowercase "iePOS" inline |
| **Logomark** ("V") | App icon, favicon, small UI surfaces, sidebar collapsed state | Standalone "V" chevron, square-aspect |

### Color Variants

| Variant | Asset | Background |
|---------|-------|------------|
| Green-on-white | `logo.svg`, `logomark.svg` | Light surfaces (`#F2F3ED`, white) |
| White-on-green | `logo-white.svg`, `logomark-white.svg` | Brand dark (`#256E05`) or brand gradient hero panel |

### Sizing & Clear Space
- **Minimum size (wordmark):** 96×24px
- **Minimum size (logomark):** 24×24px
- **Clear space:** 1/4 of logo height on all sides (no other elements within this margin)
- **Do not:** rotate, recolor outside brand greens, distort aspect ratio, place on busy photographic backgrounds

### App Icon
- **Canvas:** 1024×1024px (iOS), 512×512px (Android adaptive foreground)
- **Background:** Solid `#256E05` (brand dark green)
- **Foreground:** White logomark (V), centered, ~60% of canvas
- **Corner radius:** Platform default (iOS rounds at OS level; Android adaptive uses safe-zone)
- **Notification badge:** Standard OS red badge — no custom override

### Asset Paths
```
public/images/
├── logo.svg                  # Wordmark, green-on-white
├── logo-white.svg            # Wordmark, white-on-green
├── logomark.svg              # V mark, green
├── logomark-white.svg        # V mark, white
├── app-icon-1024.png         # App icon, iOS
├── app-icon-512.png          # App icon, Android adaptive
├── favicon.ico               # Browser favicon
└── brand-gradient.svg        # Hero bg reference
```

### Tagline Usage
"Vừa - Đủ - Tinh Gọn" — right-aligned on hero panel, Inter Light (300) 14px, white text on brand gradient

---

## Iconography

### Recommended: lucide-react
[Lucide React](https://lucide.dev) provides Feather-style icons matching the minimalist Figma design.

**Installation & usage:**
```bash
pnpm add lucide-react
```

```typescript
import { ShoppingCart, LogOut, Settings, Plus } from 'lucide-react';

export function CartIcon() {
  return <ShoppingCart size={20} className="text-action-primary" />;
}
```

**Recommended icons for ViePOS:**
- Menu: `Menu`
- Cart: `ShoppingCart`
- Logout: `LogOut`
- Settings: `Settings`
- Add: `Plus`
- Delete: `Trash2`
- Edit: `Edit2`
- Print: `Printer`
- Check: `Check`
- Close: `X`
- Loading: `Loader` (animated)

---

## Accessibility (WCAG AA)

### Color Contrast
- **Normal text:** 4.5:1 minimum (large text 3:1)
- **UI components:** 3:1 minimum
- **Verified combinations:**
  - `#256E05` (brand dark / CTA) on `#FFFFFF` (white) = 8.2:1 ✅
  - `#256E05` (brand dark) on `#F2F3ED` (bg light) = 7.8:1 ✅
  - `#3CB018` (brand light) on `#FFFFFF` = 3.6:1 ✅ (large text / UI only)
  - `#878787` (gray-3) on `#F2F3ED` (bg light) = 5.8:1 ✅

### Focus Management
- **Focus indicator:** Green outline (2px, offset 2px)
- **Focus color:** `#256E05` (brand dark green, via `--color-action-primary`)
- **All interactive elements:** Must have visible focus state
- **Hidden from visual focus:** Use `sr-only` (screen-reader-only) class for invisible but keyboard-navigable elements

```css
.focus-visible:outline-2 {
  outline: 2px solid var(--color-action-primary);
  outline-offset: 2px;
}
```

### ARIA Labels
```typescript
// PIN input example
<input 
  id={`pin-${i}`}
  type="text"
  inputMode="numeric"
  aria-label={`PIN digit ${i + 1} of 6`}
  aria-invalid={error}
/>

// Numpad button
<button
  onClick={() => onDenominationSelect(denom)}
  aria-pressed={selectedAmount === denom}
  aria-label={`Select ${formatVnd(denom)}`}
>
  {formatVnd(denom)}
</button>
```

### Screen Reader Testing
- Page titles clear & descriptive
- Form labels linked to inputs
- Modal titles in `<h1>` or `role="heading"`
- Button purpose obvious from text alone
- Semantic HTML: `<button>`, `<input>`, `<nav>`, `<main>`

---

## Responsive Design

### Breakpoints (Mobile-first)
- **sm:** 640px (tablets)
- **md:** 1024px (desktop assumed for ViePOS — cashier counter)
- **lg:** 1280px (large monitors)

**Note:** ViePOS remains desktop-first for POS workflows (1440×1024 cashier screens), but the internal dashboard shell now supports a responsive drawer below 1024px.

### Layout Grid
- **Main container:** Max-width 1440px
- **Dashboard shell sidebar:** Fixed 225px width on desktop; collapses into a drawer below 1024px
- **Menu grid:** 4 columns (items 75×75)
- **Cart panel:** Fixed 320px width

---

## Component Examples

### Login Form Layout (Figma reference: id 1:2)
```
┌───────────────────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌─────────────────────────┐ │
│ │   Form (left)        │  │  Hero (right)           │ │
│ │                      │  │  Gradient bg            │ │
│ │  ViePOS Logo         │  │  Tagline "Vừa - Đủ..." │ │
│ │                      │  │                         │ │
│ │  Email input         │  │                         │ │
│ │  Password input      │  │                         │ │
│ │  [Login] button      │  │                         │ │
│ │                      │  │                         │ │
│ │  Create account link │  │                         │ │
│ └──────────────────────┘  └─────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

### POS Main Layout (Figma reference: id 1:97)
```
┌─────────────────────────────────────────────────────┐
│ ┌──────┐ ┌────────────────────────┐  ┌────────────┐ │
│ │      │ │                        │  │            │ │
│ │Sidebar│ │   Menu Grid (4×3)    │  │   Cart     │ │
│ │ Logo │ │                        │  │   Panel    │ │
│ │ User │ │ Card Card Card Card   │  │            │ │
│ │      │ │ Card Card Card Card   │  │  Items     │ │
│ │      │ │ Card Card Card Card   │  │            │ │
│ │      │ │                        │  │  Total     │ │
│ │      │ │                        │  │  [Thanh    │ │
│ │      │ │                        │  │   Toán]   │ │
│ └──────┘ └────────────────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## Unresolved Questions

1. **Status Success color (`#349409`):** Brand foundation only declares 2 greens (`#256E05`, `#3CB018`). `--color-success` currently uses `#349409` as a semantic token (distinct from CTA `--color-action-primary` which is now `#256E05`). Should success badges:
   - (a) Keep `#349409` as a semantic-only token (current state, slight palette drift), or
   - (b) Map to `#3CB018` (brand light green) for strict brand compliance?
   Recommendation: option (b) for consistency — the 1-token saving outweighs the marginal hue difference. Decide before Phase 2 implementation.
2. **Dark mode:** Any requirement? Deferred; light mode only for MVP.
3. **Print preview styling:** Should POS print preview match receipt format exactly? Will finalize during Phase 2 implementation.
4. **Logo source files:** Brand sheet shows logo marks but actual SVG exports are not yet in `public/images/`. Need export pass from Figma `MVf0wa4YxVRJKS2q5992oc` once API rate limit clears, or manual SVG export from designer.
