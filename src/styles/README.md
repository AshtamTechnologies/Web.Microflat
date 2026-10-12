# MicroFlat UI Design System & Token Architecture

> **"To change the look of the whole system, edit only `src/styles/tokens.css`."**

This directory houses the foundational design tokens and shared styling layer for the MicroFlat ERP application (React 19 + Vite + Tailwind CSS v4).

---

## 1. File Architecture & Responsibilities

| File | Role & Contents |
| :--- | :--- |
| [`tokens.css`](file:///d:/Ashtam%20Technologies/Microflat/Web.Microflat/src/styles/tokens.css) | **The single source of truth for all design values.** Raw hex colors, typography scale, spacing, radii, elevations, control dimensions, motion transitions, z-indices, component-specific variables, and dark theme overrides. **No other file should define raw hex/rgb colors or raw design measurements.** |
| [`common.css`](file:///d:/Ashtam%20Technologies/Microflat/Web.Microflat/src/styles/common.css) | **Standardized component classes (`.mf-*`).** Shared styles for inputs, labels, buttons, cards, tables, badges, modals, and headers driven 100% by tokens. |
| [`index.css`](file:///d:/Ashtam%20Technologies/Microflat/Web.Microflat/src/index.css) | **Tailwind CSS v4 entrypoint.** Inlines typography fonts (Inter, IBM Plex Mono), registers CSS variables into Tailwind's `@theme inline` block, defines global base styles, and maps aliases. |

---

## 2. Core Design Rules

1. **No Raw Colors Outside `tokens.css`:** Never hardcode `#1a56db`, `rgb(…)`, or raw Tailwind palettes (`bg-red-500`, `text-green-600`) in JSX or component styles. Use semantic token classes (`bg-primary`, `text-success`, `border-danger`, `bg-surface`, `text-text-muted`).
2. **No Arbitrary Font Size Utilities:** Do not use `text-[9.5px]`, `text-[10px]`, `text-[10.5px]`, or `text-[11px]`. Always use the standard typography scale:
   - `text-2xs` (11px, `0.6875rem`): Micro-labels, badge counts, dense metadata
   - `text-xs` (12px, `0.75rem`): Field hints, secondary badges, table meta
   - `text-sm` (14px, `0.875rem`): Body copy, table cells, form inputs
   - `text-base` (16px, `1rem`): Section headers, emphasized items
   - `text-lg` (18px) to `text-2xl` (24px): Page and modal titles
3. **Use Shared UI Components:** Pages must use components from `src/components/ui` (`Button`, `IconButton`, `Input`, `Select`, `SearchableSelect`, `DatePicker`, `Checkbox`, `Toggle`, `Badge`, `Card`, `Modal`, `TableContainer`, `PageHeader`, `FilterBar`, `FormGrid`) rather than raw unstyled HTML elements.
4. **Touch & Mobile Accessibility:** All clickable controls maintain a minimum touch target of 40–44px on coarse pointers (touch devices). Form inputs maintain a minimum mobile font size of 16px to prevent unwanted iOS auto-zoom.

---

## 3. How-To Guides

### How to Change the Brand Color
Open [`tokens.css`](file:///d:/Ashtam%20Technologies/Microflat/Web.Microflat/src/styles/tokens.css) and update the brand palette:
```css
:root {
  --brand-50:  #f0f8ff;
  --brand-100: #e0f2fe;
  --brand-500: #0076BA; /* Main brand / primary accent */
  --brand-600: #006097;
  --brand-700: #004c78;
  /* ... */
}
```
Because `--primary: var(--brand-500)` references this token, updating `--brand-500` instantly updates:
- Primary buttons and hover states
- Control focus rings and active borders
- Active sidebar navigation indicators
- Primary badges and toast icons
- Data charts (via `chartColors.js` dynamic CSS variable proxy)

### How to Change the App Font
Open [`tokens.css`](file:///d:/Ashtam%20Technologies/Microflat/Web.Microflat/src/styles/tokens.css) and update:
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```

### How to Add a New Design Token
1. **Define in `tokens.css`:**
   ```css
   :root {
     --sidebar-nav-height: 2.75rem;
   }

   /* If the token varies by theme, add an override in the .dark block: */
   .dark {
     --sidebar-nav-height: 2.75rem;
   }
   ```
2. **Register in `index.css` (Optional for Tailwind utility access):**
   ```css
   @theme inline {
     --height-sidebar-nav: var(--sidebar-nav-height);
   }
   ```
3. **Use in JSX or CSS:**
   ```jsx
   <div className="h-sidebar-nav">...</div>
   ```

---

## 4. Dark Mode Support

MicroFlat features automatic dark mode powered by the `useDarkMode` hook, which applies the `.dark` class to the root `<html>` element.

The `.dark { ... }` block in `tokens.css` overrides surface and semantic tokens:
- `--bg`: Dark base canvas (`#0b0f19`)
- `--surface`: Dark cards & popovers (`#111827`)
- `--surface-raised`: Elevated dialogs & floating menus (`#1f2937`)
- `--border`: Subdued borders (`#1f2937`)
- `--text`: High-contrast body copy (`#e5e7eb`)
- `--heading`: Clean white headings (`#f9fafb`)
- `--field-bg`, `--field-border`: Form controls with appropriate contrast
- Status tint backgrounds (`--success-bg`, `--warning-bg`, `--danger-bg`, `--info-bg`) use alpha-adjusted dark tones for WCAG AA compliance.
