# Ori Cohen — Portfolio

Live at [oricohen.co](https://oricohen.co)

Product Design Team Lead & Art Director at Verint. This portfolio is built as a Figma-inspired desktop environment — floating windows, a zoomable canvas, dark mode, and a custom cursor.

---

## Stack

- Vanilla HTML/CSS/JS — no framework, no build step
- `tokens.css` — two-layer design token system (primitives + semantic)
- `styles.css` — component styles using the tokens
- `main.js` — all interaction logic (window manager, canvas pan/zoom, comments, game)
- Phosphor Icons via CDN
- GitHub Pages with custom domain

## Structure

```
/
├── index.html          # Main portfolio (desktop + mobile)
├── main.js             # All JS — window manager, canvas, comments, game
├── styles.css          # Component styles
├── tokens.css          # Design tokens (light + dark)
├── tokens.json         # Tokens as JSON for tooling
├── STYLE_GUIDE.md      # Token usage reference
├── robots.txt
├── sitemap.xml
├── CNAME               # Custom domain: oricohen.co
├── Assets/
│   ├── CV/             # Downloadable resume (.pdf)
│   └── Media/
│       └── general/    # og-image, profile photo
└── cases/
    └── lux/            # LUX 2.0 case study (standalone page)
```

## Running locally

No build step needed — open directly in a browser:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Design system

Tokens are defined in `tokens.css` in two layers:

1. **Primitives** — raw values (`--gray-50`, `--purple-500`)
2. **Semantic** — purpose-based aliases (`--surface-default`, `--text-primary`)
3. **Legacy aliases** — backwards-compatible names (`--wbg`, `--tx`) for gradual migration

Dark mode is handled entirely via `[data-theme="dark"]` overrides in `tokens.css`.
