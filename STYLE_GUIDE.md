# Style Guide — oricohen.co
## Reference for any Claude session working on this portfolio

---

## Context

This is the portfolio of Ori Cohen, Product Design Team Lead at Verint.
It is a **Figma desktop shell simulation** — a macOS-style windowed environment with a canvas,
draggable windows, a bottom toolbar, and an embedded arcade game.

Default theme is **light mode**. Dark mode is toggled via toolbar.

**This is a designer's portfolio. Consistency is non-negotiable.**
No shortcuts. No approximations. If something does not match the spec below, fix it.

---

## Design Language

**Philosophy:** Figma desktop simulation. Clean surfaces, precise borders, no decoration for decoration's sake.
SF Pro font. Solid borders (not alpha). Compact radius. Zero letter-spacing on body text.

The palette is intentionally restrained — most UI is neutral gray, with two deliberate accent colors
(Figma blue `#18A0FB` and Figma purple `#7B61FF`) used sparingly for interactive states and brand moments.

---

## Font

```css
--f: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
```

- **macOS / iOS:** SF Pro (system default) — intended primary
- **Windows:** Segoe UI
- **Android / other:** Roboto / system sans-serif
- **No Google Fonts import needed.** SF Pro is a system font.

Remove the Inter import from `<head>` once migration is complete.

`--mono: Consolas, 'Courier New', monospace;` — used only in the terminal window.

---

## Design Tokens

### Light Mode (`:root`)

```css
:root {
  /* Surfaces */
  --canvas:  #EBEBEB;   /* macOS-style canvas / desktop background */
  --panel:   #FFFFFF;   /* window surface / raised panels */
  --inp:     #F0F0F0;   /* input backgrounds */
  --frm:     #FFFFFF;   /* form container */
  --wbg:     #FFFFFF;   /* window body */
  --whdr:    #F5F5F5;   /* window header */
  --mbox:    #FFFFFF;   /* modal box */

  /* Borders — always solid hex, never alpha */
  --bd:      #E0E0E0;   /* default border */
  --bd2:     #D0D0D0;   /* medium / hover border */
  --bd3:     #EBEBEB;   /* subtle / hairline border */
  --wbd:     #E8E8E8;   /* window border */
  --mbd:     #E0E0E0;   /* modal border */

  /* Text — sourced from Verint Color Semantics */
  --tx:      #121213;   /* primary text   (text.neutral.main)        */
  --tx2:     #585b5e;   /* secondary text (text.neutral.subtext)     */
  --tx3:     #6a6d70;   /* tertiary/hints  (text.neutral.placeholder) */
  --tx-brand:#0882d4;   /* brand/link text (text.brand.regular)      */
  --tx-dis:  #b0b6bb;   /* disabled text   (text.common.disabled)    */
  --tx-inv:  #f7f8f8;   /* inverse text    (text.common.inverse)     */

  /* Interaction */
  --hov:     #F0F0F0;   /* hover background */
  --act:     rgba(24,160,251,.08);  /* active / selected tint */

  /* Overlay */
  --mbg:     rgba(0,0,0,.25);     /* modal backdrop */
  --glass:   rgba(255,255,255,.88); /* glass pill (toolbar) */
  --glass-bd:#E8E8E8;               /* glass pill border — solid */

  /* Brand (Figma-inspired — do not change) */
  --blue:    #18A0FB;   /* Figma blue — links, focus rings */
  --figma:   #7B61FF;   /* Figma purple — primary CTA, active states */

  /* Radius scale */
  --r-xs:    2px;
  --r-sm:    4px;     /* chips, small badges */
  --r-md:    8px;     /* buttons, inputs, cards — DEFAULT */
  --r-lg:    12px;    /* windows, menus, modals */
  --r-xl:    16px;    /* large panels */
  --r-full:  9999px;  /* pills */

  /* Typography */
  --f:    -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  --mono: Consolas, 'Courier New', monospace;
}
```

### Dark Mode (`[data-theme="dark"]`)

```css
[data-theme="dark"] {
  /* Surfaces */
  --canvas:  #1E1E1E;
  --panel:   #2C2C2C;
  --inp:     #222222;
  --frm:     #252525;
  --wbg:     #2C2C2C;
  --whdr:    #323232;
  --mbox:    #2C2C2C;

  /* Borders — solid hex */
  --bd:      #3D3D3D;
  --bd2:     #4A4A4A;
  --bd3:     #333333;
  --wbd:     #3A3A3A;
  --mbd:     #3D3D3D;

  /* Text — dark mode inversions */
  --tx:      #f3f4f5;   /* near-white primary */
  --tx2:     #d0d3d6;   /* muted secondary    */
  --tx3:     #8d9296;   /* faint tertiary     */
  --tx-brand:#4daefb;   /* lighter blue       */
  --tx-dis:  #585b5e;   /* muted disabled     */
  --tx-inv:  #121213;   /* dark inverse       */

  /* Interaction */
  --hov:     rgba(255,255,255,.05);
  --act:     rgba(24,160,251,.12);

  /* Overlay */
  --mbg:     rgba(0,0,0,.60);
  --glass:   rgba(40,40,40,.90);
  --glass-bd:#4A4A4A;
}
```

---

## Text Tokens

Sourced from `tokens.json` (Verint Color Semantics). All resolved hex — no token references.

| Token | Light | Dark | Semantic origin | Usage |
|-------|-------|------|-----------------|-------|
| `--tx` / `--text-primary` | `#121213` | `#f3f4f5` | `text.neutral.main` | Headings, body copy |
| `--tx2` / `--text-secondary` | `#585b5e` | `#d0d3d6` | `text.neutral.subtext` | Labels, captions, window titles |
| `--tx3` / `--text-tertiary` | `#6a6d70` | `#8d9296` | `text.neutral.placeholder` | Hints, metadata, placeholders |
| `--tx-brand` / `--text-brand` | `#0882d4` | `#4daefb` | `text.brand.regular` | Brand/link text |
| `--tx-dis` / `--text-disabled` | `#b0b6bb` | `#585b5e` | `text.common.disabled` | Disabled state |
| `--tx-inv` / `--text-inverse` | `#f7f8f8` | `#121213` | `text.common.inverse` | Text on dark/colored surfaces |

**Source file:** `tokens.json` (project root) — extracted from `tokens.json` (Verint system upload).

---

## Typography Scale

| Use | Size | Weight | Notes |
|-----|------|--------|-------|
| Window title | `13px` | 600 | window header label |
| Body default | `13px` | 400 | main content text |
| Body small | `12px` | 400 | secondary content |
| Label / eyebrow | `10px` | 600 | uppercase, `letter-spacing: .08em` |
| Button | `13px` | 600 | — |
| Tag / chip | `10px` | 600 | — |
| Toolbar | `11px` | 500 | clock, zoom label |
| Terminal | `13px` | 400 | `--mono` font |

**Rules:**
- No letter-spacing on body text.
- Letter-spacing only on labels / eyebrows (`.08em`).
- Terminal uses `--mono`. Everything else uses `--f`.

---

## Radius Usage

| Token | Value | Used on |
|-------|-------|---------|
| `--r-sm` | 4px | chips, small tags |
| `--r-md` | 8px | buttons, inputs, toolbar buttons, cards |
| `--r-lg` | 12px | windows, menus, modals, site menu |
| `--r-xl` | 16px | large panels |
| `--r-full` | 9999px | pill badges, welcome badge |

Hardcoded radius values in components should be migrated to these tokens over time.

---

## Component Patterns

### Bottom Toolbar (`#bottombar`)
- Glass pill: `background: var(--glass); border: 1px solid var(--glass-bd); border-radius: 14px`
- Fixed bottom center: `position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%)`
- Toolbar buttons (`.bb-btn`): `32×32px, border-radius: var(--r-md), background: transparent`
- Active state: `background: var(--figma); color: #fff`
- Clock (`#tb-clock`): `11px / 500, color: var(--tx2), margin-right: 8px`

### Windows (`.win`)
- Header: `background: var(--whdr); border-bottom: 1px solid var(--wbd); height: 38px`
- Body: `background: var(--wbg)`
- Border: `1px solid var(--wbd); border-radius: var(--r-lg)`
- Shadow: `0 8px 40px rgba(0,0,0,.15)`

### Welcome Frame
- Badge: `--r-full, background: rgba(123,97,255,.07), border: 1px solid rgba(123,97,255,.22), color: var(--figma), 12px/500`
  - Green status dot (`.wf-bdot`): `#22C55E`, `pulse` animation
  - Text: sentence case, not uppercase. Content: "Open to new projects"

### Button System (`.btn`)
LUX-style: flat, no shadow, no lift. Color darkens through hover → pressed. Base class `.btn` + one variant.

| Class | Default bg/color | Hover | Pressed | Notes |
|-------|-----------------|-------|---------|-------|
| `.btn-primary` | `--purple-600` / `#fff` | `--purple-700` | `--purple-800` | WCAG AA ✓ 5.2:1 |
| `.btn-secondary` | transparent / `--purple-600` border | `--purple-50` tint | rgba tint | outlined |
| `.btn-tertiary` | transparent / `--purple-600` | `--purple-50` tint | rgba tint | ghost, no border |

**States:**
- **hover**: background darkens (one step deeper)
- **active/pressed**: even darker (two steps)
- **focus-visible**: `outline: 2px solid var(--purple-600); outline-offset: 2px`
- **disabled**: `opacity: .38; pointer-events: none`

**Contrast note:** `var(--purple-600)` = `#6248E8` gives 5.2:1 on white (WCAG AA ✓). Do NOT use `var(--figma)` = `#7B61FF` on white for text — it only gives 3.8:1 (fails AA for small text).

**`a.btn-secondary`** works identically — use for mailto/external links styled as buttons.

### Site Menu (`#site-menu`)
- `background: var(--panel); border: 1px solid var(--bd); border-radius: var(--r-lg)`
- Items: `height: 38px; border-radius: var(--r-md); font-size: 13px; font-weight: 500`
- Dividers: `1px solid var(--bd3)`

### Modal (`#modal-box`)
- `background: var(--mbox); border: 1px solid var(--mbd); border-radius: var(--r-lg)`
- `padding: 32px; width: 340px`

### Inputs (`#name-input`)
- `background: var(--inp); border: 1.5px solid var(--bd2); border-radius: var(--r-md)`
- Focus: `border-color: var(--blue)`
- `font-size: 14px; padding: 11px 13px`

### Terminal Window
- Background: `var(--tbg)`, font: `--mono`
- Token colors defined separately in `:root` and `[data-theme="dark"]` (see `--ttx`, `--tprompt`, etc.)

---

## Contrast Quest (Arcade Game)
The game has its own internal dark palette (`#080816` etc.) that is **theme-independent** — it always renders dark regardless of light/dark mode. Do not apply portfolio tokens inside the game wrapper.

---

## Border Rule

**Never use alpha borders** (`rgba(0,0,0,.1)`) for structural borders.
Use solid hex values from the token system.

Alpha borders are only acceptable for:
- Modal backdrops (`--mbg`)
- The `--hov` hover state (interaction overlay, not border)
- The `--act` selection tint

Reason: alpha borders shift appearance depending on the background surface behind them,
breaking consistency across panel/canvas/modal contexts.

---

## Accent Color Usage

| Token | Value | Use |
|-------|-------|-----|
| `--figma` | `#7B61FF` | Primary CTA, active nav buttons, brand badge, dividers |
| `--blue` | `#18A0FB` | Links, focus rings, resize handles, secondary accent |

These two colors are intentional and Figma-inspired. Do not replace with other blues.
Use sparingly — the UI is mostly neutral.

---

## What Consistency Means Here

- Same font stack everywhere: `var(--f)` or `var(--mono)` only
- Same CSS custom properties, same values — no hardcoded colors that bypass the token system
- Borders always solid hex via `var(--bd)`, `var(--bd2)`, `var(--bd3)`
- Radius via `var(--r-*)` tokens — not hardcoded px values
- If a value exists in `:root`, reference it via `var()`. Always.

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Everything — single-file portfolio |
| `CNAME` | Custom domain: `oricohen.co` |
| `STYLE_GUIDE.md` | This document |
