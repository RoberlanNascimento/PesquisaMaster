---
name: Nocturne Editorial
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1b1c1c'
  surface-container: '#202020'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c3c6d1'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#303030'
  outline: '#8d919b'
  outline-variant: '#424750'
  surface-tint: '#a8c8ff'
  primary: '#b5cfff'
  on-primary: '#003061'
  primary-container: '#8ab4f8'
  on-primary-container: '#0d4582'
  inverse-primary: '#315f9d'
  secondary: '#8ed7a1'
  on-secondary: '#00391b'
  secondary-container: '#01552c'
  on-secondary-container: '#80c894'
  tertiary: '#ffbfb8'
  on-tertiary: '#4d2521'
  tertiary-container: '#e0a49d'
  on-tertiary-container: '#653934'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#114784'
  secondary-fixed: '#a9f3bc'
  secondary-fixed-dim: '#8ed7a1'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#00522a'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#f6b7b0'
  on-tertiary-fixed: '#33110e'
  on-tertiary-fixed-variant: '#673b36'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
  surface-base: '#131313'
  surface-card: '#202020'
  surface-elevated: '#2a2a2a'
  border-subtle: '#353535'
  border-focus: '#8ab4f8'
  text-primary: '#e5e2e1'
  text-muted: '#9aa0a6'
  success-pastel: '#81c995'
  success-pastel-tint: '#a8dab5'
  success-container: '#183724'
  on-success-container: '#a8dab5'
  error-pastel: '#f28b82'
  warning-amber: '#fdd663'
  warning-pastel: '#fde293'
  warning-pastel-tint: '#fef0c7'
  warning-container: '#3b2e08'
  on-warning-container: '#fde293'
typography:
  display-lg:
    fontFamily: Roboto Flex
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Roboto Flex
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Roboto Flex
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Roboto Flex
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Roboto Flex
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Roboto Flex
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Roboto Flex
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  caption:
    fontFamily: Roboto Flex
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is tailored for content-dense, editorial, and utility applications operating in an intentional, eye-strain-free dark mode. Drawing inspiration from modern editorial reading interfaces and high-utility platforms, the aesthetic balances deep charcoal surface stratification with luminous, low-fatigue chromatic highlights.

The visual direction combines Modern Utilitarianism with refined Editorial Craft. It eschews pure `#000000` pitch blacks in favor of graded charcoal layers, ensuring soft transitions and ergonomic focus during prolonged screen sessions. Interactive controls and system signals are rendered in crisp, pastel-infused accents—pairing cool cornflower primary tones with harmonious sage mint for positive feedback and secondary highlights—conveying precision, calm authority, and effortless legibility.

## Colors

The color palette is engineered specifically for dark mode ergonomics, avoiding visual vibration by leaning on layered charcoal foundations paired with luminous pastel indicators:

- **Surface Tiers:** Built on a deep charcoal continuum starting at Canvas Base (`#131313`), stepping to Surface Container Low (`#1B1B1C`), Default Card Surface (`#202020`), and High/Elevated layers (`#2A2A2A` to `#353535`).
- **Primary Chromatic Accent (`#8AB4F8`):** Google-grade cornflower blue serving as the core action color for primary buttons, active link text, selection indicators, and focus outlines.
- **Secondary & Success Mint (`#81C995` / `#A8DAB5`):** A soft, desaturated pastel green introduced alongside the charcoal foundation. It governs positive status badges, verified indicators, toggled active states, secondary accents, and subtle success feedback rings without breaking the calm dark tone.
- **Warning & Edit Pastel Yellow (`#FDE293` / `#FDD663`):** A luminous, low-fatigue pastel yellow paired with a deep amber-charcoal container (`#3B2E08`). It exclusively governs non-destructive alerts, attention indicators, calibration notices, and **Edit buttons (`✏️ Editar` / `Ajustar`)**, making modification actions immediately distinguishable from primary creation (`#8AB4F8`) and destructive deletion (`#F28B82`).
- **Error & Alert Tiers (`#F28B82` / `#FFB4AB`):** A softened salmon-rose tone for critical alerts and destructive actions.
- **Dividers & Hairlines (`#353535` / `#424750`):** Precise micro-borders defining card and input perimeters without visual harshness.

## Typography

The type system is powered uniformly by **Roboto Flex**, relying on its optical adaptability, structured letterforms, and high legibility across dense editorial configurations.

- **Headlines & Display:** Tighter tracking (`-0.015em` to `-0.02em`) creates a compact, authoritative editorial presence across titles and article headers.
- **Body Content:** Generous 1.5x line heights provide open, fatigue-free scanning across long paragraphs on dark backgrounds.
- **Labels & Captions:** Distinct mid-weights (`500`) paired with subtle tracking expansions ensure form inputs, pill chips, and metadata timestamps maintain strong clarity even when scaled down to 12px.

## Layout & Spacing

Layout geometry follows an 8pt grid with 4pt half-steps dedicated to fine internal component alignments:

- **Grid System:** 4-column responsive grid on mobile (< 600px), 8-column grid on tablet (600px–1024px), and 12-column layout on desktop (> 1024px) constrained to a maximum content width of 1280px.
- **Rhythm & Padding:** Outer margins scale dynamically from `1rem` on mobile to `2.5rem` on wide desktop viewports. Card internals strictly apply `space-md` (`1rem`) or `space-lg` (`1.5rem`), keeping structural density balanced and uniform.

## Elevation & Depth

Depth is established primarily through **tonal surface stepping** supplemented by fine hairline borders and delicate ambient light blooms:

- **Surface Level 0 (Base Canvas):** `#131313` flat, non-elevated backdrop.
- **Surface Level 1 (Cards, Feed Tiles, Sidebars):** `#202020` surface with a crisp 1px stroke in `#353535`.
- **Surface Level 2 (Floating Modals, Flyouts, Popovers):** `#2A2A2A` surface overlaid with an ambient shadow (`0 8px 24px rgba(0, 0, 0, 0.5)`) and bounded by a 1px border in `#424750`.
- **Accent Bloom & Focus Rings:** Interactive focus states project a 2px stroke in `#8AB4F8` accompanied by a soft halo (`box-shadow: 0 0 0 3px rgba(138, 180, 248, 0.25)`). Positive and confirmation elements utilize an equivalent halo tuned to pastel green (`box-shadow: 0 0 0 3px rgba(129, 201, 149, 0.25)`).

## Shapes

The geometric personality features balanced, contemporary curvature (`roundedness: 2`):

- **Cards, Panels, and Dialogs:** Standardized on 1rem / 16px corner radius (`rounded-lg`), providing soft boundaries that frame complex data streams smoothly.
- **Form Fields & Buttons:** Configured at 0.5rem / 8px to 0.75rem / 12px for an intentional, tactile balance.
- **Pills, Badges & Toggles:** Rendered with full corner rounding (pill style, 9999px) for search bars, tag indicators, interactive toggle tracks, and segmented filters.

## Components

### Buttons
- **Primary Action:** Solid background `#8AB4F8`, text color `#003061` (semibold), hover state `#A8C8FF`. Full or 12px radius, 44px height.
- **Secondary / Success Action:** Solid or translucent pastel green background `#81C995`, text `#0F381E` for filled states; or `#183724` background with `#81C995` border and `#A8DAB5` text for subtle highlight buttons.
- **Edit & Alert Action (Pastel Yellow):** Solid pastel yellow `#FDE293` (or `#FDD663`) with dark text `#332200` for high-emphasis alerts/locks, or container `#3B2E08` with `1px solid #FDE293` border and `#FDE293` text for row/drawer Edit buttons (`✏️ Editar`, `✏️ Ajustar`).
- **Ghost / Outlined:** Transparent surface with 1px border in `#353535`, text in `#E5E2E1`. On hover, background shifts to `#2A2A2A`.

### Form Fields & Inputs
- **Base State:** Background `#202020`, 1px border `#353535`, text `#E5E2E1`, placeholder `#9AA0A6`, height 48px, horizontal padding `1rem`, border-radius 12px.
- **Focused:** 1px border transitions to `#8AB4F8` with a diffused glow: `box-shadow: 0 0 0 3px rgba(138, 180, 248, 0.2)`.
- **Validated / Success:** 1px border switches to `#81C995` with halo `box-shadow: 0 0 0 3px rgba(129, 201, 149, 0.2)`.

### Switches & Toggles
- **Track (Inactive):** `#353535` pill track, 24px height, thumb in `#9AA0A6`.
- **Track (Active / Highlighted):** Switches to pastel green `#81C995` track, thumb in `#0F381E` or crisp `#FFFFFF` for clear affirmative feedback.

### Chips & Badges
- **Status / Category Chips:** Default dark pill in `#202020` with `#353535` border and `#C3C6D1` text.
- **Success & Secondary Badges:** Pill container filled with deep green tint `#183724`, text in `#A8DAB5`, bounded by a soft 1px border in `rgba(129, 201, 149, 0.3)`.
- **Alert & Warning Badges (Pastel Yellow):** Pill container filled with `#3B2E08`, text in `#FDE293`, bounded by a 1px border in `rgba(253, 226, 147, 0.45)`.

### Cards & Editorial Modules
- **Container:** Layered `#202020` fill, 1px continuous hairline in `#353535`, radius 16px (`rounded-lg`).
- **Accent Strip / Metadata:** Editorial tags in `#8AB4F8` or `#81C995` positioned above headlines; subtext and authors in `#9AA0A6`.

### Checkboxes & Radio Buttons
- **Unchecked:** `#202020` surface with 1.5px border in `#424750`.
- **Checked (Primary):** `#8AB4F8` fill with `#003061` checkmark.
- **Checked (Affirmative / Secondary):** Optional `#81C995` fill with `#0F381E` checkmark for success verification lists and confirmation tasks.

