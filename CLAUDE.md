# oricohen.co - Project Rules

Portfolio site for Ori Cohen. Live at https://oricohen.co — deployed via GitHub Pages.

## Stack
- Vanilla HTML/CSS/JS, no build step, no framework
- `tokens.css` - design token system (primitives + semantic + legacy aliases)
- `styles.css` - component styles
- `main.js` - all JS (window manager, canvas pan/zoom, mobile menu, etc.)
- `index.html` - single-page portfolio (desktop + mobile)
- `cases/lux/index.html` - standalone LUX 2.0 case study

## Syncing to GitHub
Always run after finishing a task:
```bash
bash /sessions/blissful-adoring-thompson/mnt/oricohen10.github.io/.cowork-sync.sh
```
Git operations go through `/sessions/blissful-adoring-thompson/repo-work/` (not mnt directly - FUSE lock).

---

## Rules - never break these

### Formatting
- Never use em dash (-) or en dash. Always use hyphen (-).

### Design tokens - always use variables, never hardcode
| Use case | Variable | Value |
|----------|----------|-------|
| Body text | `var(--tx)` | #121213 |
| Secondary text | `var(--tx2)` | #585b5e |
| Muted text | `var(--tx3)` | #6a6d70 |
| Brand/link text | `var(--tx-brand)` | #0664a8 |
| Primary action | `var(--figma)` | #6248E8 (purple-600, AA accessible) |
| Interactive blue | `var(--blue)` | for borders/accents only, NOT text |
| Surface | `var(--wbg)` or `var(--frm)` | white |
| Canvas bg | `var(--canvas)` | #F5F5F5 |

### Accessibility - WCAG AA required
- **Never add `user-scalable=no`** to the viewport meta tag
- **Every `.win` div** must have `role="dialog" aria-modal="true" aria-label="[name]"`
- **Every clickable div** (not `<button>` or `<a>`) must have `role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')handler()"`
- **Color contrast minimum 4.5:1** for all text. Use `--tx-brand` (#0664a8) for blue text, never `var(--blue)` (#18A0FB) as text color
- **Images** must have `alt` text and `width`/`height` attributes
- **Menu toggles** must have `aria-expanded` updated on open/close

### Performance
- **New images**: compress before committing. PNG screenshots -> JPEG q85. Use WebP for photos.
- **Always set `width` and `height`** on `<img>` tags (prevents CLS)
- **OG images** target <50KB (currently cases/lux/images/og-image.jpg = 29KB)

### SEO
- **Don't modify** `sitemap.xml` entries without updating `lastmod`
- **Don't remove** the JSON-LD blocks in `<head>` of both index.html and cases/lux/index.html
- **Canonical URL** must stay on every page

### CSS token fallbacks (index.html inline `<style>`)
The inline style block in index.html contains fallback values loaded before tokens.css. Keep these in sync with tokens.css:
- `--tx3: #6a6d70` (not #888 - that fails contrast)
- `--blue: #0882d4` (fallback only - tokens.css overrides with blue-500)

### .gitignore - do not commit
- `*.tmp`
- `.~lock.*`
- `cases/lux/images/og-image.webp`
- `.cowork-sync.sh`

---

## Quality scores (baseline - July 2025)
| Area | Score |
|------|-------|
| Design | 8/10 |
| Folder structure | 9/10 |
| Accessibility | 10/10 |
| Performance | 9/10 |
| SEO | 9.5/10 |
| **Overall** | **9.7/10** |

After finishing a significant feature, do a quick sanity check: contrast ratios on any new colors, alt text on new images, role/keyboard on any new clickable divs.
