# oricohen.co - Project Handoff

> This document contains everything a new Claude session needs to pick up
> this project from scratch. Read it in full before doing any work.

---

## 1. What This Is

Personal portfolio site for **Ori Cohen**, Senior Product Designer at Verint.
- **Live URL**: https://oricohen.co
- **GitHub repo**: https://github.com/Oricohen10/oricohen10.github.io
- **Deployed via**: GitHub Pages (custom domain, auto-deploys on push to `main`)
- **Owner email**: Ori.Cohen10@verint.com

---

## 2. Stack

Vanilla HTML/CSS/JS. No build step, no framework, no bundler.

```
oricohen10.github.io/
├── index.html               # Main SPA (desktop window UI + mobile page UI)
├── CNAME                    # "oricohen.co" — critical for custom domain
├── sitemap.xml              # 5 URLs, update lastmod when content changes
├── robots.txt
├── src/
│   ├── tokens.css           # Design token system (primitives + semantic)
│   ├── styles.css           # All component styles
│   ├── main.js              # All JS: window manager, canvas, mobile, etc.
│   └── tokens.json          # Token export for reference, NOT loaded at runtime
├── cases/
│   ├── shared/
│   │   ├── case-study.css   # Shared styles for all case study pages
│   │   └── case-study.js    # Shared JS: carousel, lightbox, back nav
│   ├── lux/index.html       # LUX 2.0 case study (standalone page)
│   ├── myverint/index.html  # My Verint case study
│   ├── plugins/index.html   # LUX Plugins case study
│   ├── copilot/index.html   # Verint Copilot case study
│   └── _template.html       # Template for new case studies
└── Assets/
    └── fonts/
        ├── VT323-Regular.woff2   # Terminal font (converted from TTF, 30KB)
        ├── VT323-Regular.ttf     # Original (kept as fallback)
        └── phosphor/
            ├── Phosphor.woff2    # Subsetted icon font (3KB, was 147KB)
            └── phosphor.css      # Subsetted icon CSS (2KB, was 76KB)
```

---

## 3. Git Workflow

### Workspace layout
The Cowork session mounts the repo at:
```
/sessions/.../mnt/oricohen10.github.io/   ← read/write files here
```
But git operations must go through a separate clone (FUSE lock issue):
```
/sessions/.../repo-work/                   ← run git commands here
```

### Syncing to GitHub
After finishing any task, run:
```bash
bash /sessions/blissful-adoring-thompson/mnt/oricohen10.github.io/.cowork-sync.sh
```
This script commits and pushes. However, **the remote frequently diverges** (the
auto-sync creates extra commits). When the push is rejected, force push:
```bash
git -C /sessions/blissful-adoring-thompson/repo-work push --force
```
The local branch is always authoritative. Force push is safe here.

### GitHub token
The remote URL includes a PAT for auth:
```
https://ghp_<TOKEN>@github.com/Oricohen10/oricohen10.github.io.git
```
If the token expires, update it:
```bash
git -C /sessions/.../repo-work remote set-url origin \
  https://ghp_NEWTOKEN@github.com/Oricohen10/oricohen10.github.io.git
```

---

## 4. Design Tokens (never hardcode these)

Defined in `src/tokens.css`, fallbacks in the inline `<style>` block in `index.html`.

| Use case | Variable | Value |
|---|---|---|
| Body text | `var(--tx)` | #121213 |
| Secondary text | `var(--tx2)` | #585b5e |
| Muted text | `var(--tx3)` | #6a6d70 |
| Brand/link text | `var(--tx-brand)` | #0664a8 |
| Primary action | `var(--figma)` | #6248E8 (purple, AA accessible) |
| Interactive blue | `var(--blue)` | borders/accents only - NEVER as text |
| Surface | `var(--wbg)` or `var(--frm)` | white |
| Canvas bg | `var(--canvas)` | #F5F5F5 |

**`--blue` (#18A0FB) fails contrast as text. Always use `--tx-brand` for blue text.**

CSS fallbacks in `index.html` inline style block must stay in sync with `tokens.css`:
- `--tx3: #6a6d70` (not #888 - that fails contrast)
- `--blue: #0882d4` (fallback only)

---

## 5. Rules - Never Break

### Copy/formatting
- **No em dash or en dash.** Always use a plain hyphen (-).
- **Line length**: 50-75 characters per line in long-form text.
- **No widows/orphans**: never leave 1-2 words isolated at paragraph start/end.
- **No orphaned subheadings**: subheadings must always have body text beneath them.

### Accessibility (WCAG AA required)
- **Every `.win` div** needs `role="dialog" aria-modal="true" aria-label="[name]"`
- **Every clickable `<div>`** (not button/a) needs:
  `role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')handler()"`
- **Color contrast minimum 4.5:1** on all text
- **Never add `user-scalable=no`** to viewport meta
- **All images** need `alt`, `width`, `height`

### Performance
- Compress new images before committing. PNG -> JPEG q85, photos -> WebP q82-85
- Always set `width` and `height` on `<img>` (prevents CLS)
- OG images target <50KB

### SEO
- Don't modify `sitemap.xml` without updating `lastmod`
- Don't remove JSON-LD blocks from `<head>` of any page
- Canonical URL must stay on every page

### .gitignore (never commit)
- `*.tmp`, `.~lock.*`
- `cases/lux/images/og-image.webp`
- `.cowork-sync.sh`

---

## 6. Architecture: How the Site Works

### Desktop mode (window manager)
The desktop UI is a canvas with draggable/resizable windows (`.win`).
- `openWin(id)` / `closeWin(id)` / `maximizeWin(id)` - window lifecycle
- `startDrag(event, id)` - drag handler on `.wh` (window header)
- `wZ` - global z-index counter, increments on window focus
- Windows stack via `cascadeX`/`cascadeY` (60px cascade offset)
- `centerFrame()` - centers the main portfolio frame on canvas
  - Called on `load` and on `resize` when staying in desktop mode
  - Canvas left 228px is reserved for the sidebar

### Mobile mode (page system)
On `window.innerWidth < 768`, the site switches to a multi-page SPA:
- `mvPageOpen(id)` - opens a page by adding `.open` class
- `mvPageClose(id)` - closes it
- Pages: `'home'`, `'portfolio'`, `'about'`, `'contact'`
- Hash nav: `index.html#projects` triggers `mvPageOpen('portfolio')` on load
  (used by case study "Back to projects" links)

### Breakpoint handling
```js
// In resize handler (main.js):
const now = window.innerWidth < 768 ? 'mobile' : 'desktop';
if (now === _lastBreakpoint) {
  if (now === 'desktop') centerFrame();  // re-center on desktop resize
  return;
}
// ... handle breakpoint crossing
```

### Canvas pan/zoom
- `panX`, `panY`, `zoom` - state vars
- Mouse wheel: zoom around cursor position
- Trackpad: two-finger pan
- `applyFrame()` - applies current pan/zoom to DOM

### Themes
- `data-theme="dark"` / `data-theme="light"` on `<html>`
- Toggled by `.theme-btn` / keyboard shortcut
- Synced into case study iframes via `postMessage`

---

## 7. Case Study Architecture

Each case study is a standalone HTML page loaded in an iframe inside a `.win`.

### Shared infrastructure (`cases/shared/`)
- `case-study.css` - layout, typography, carousel, lightbox
- `case-study.js` - carousel init, lightbox, mobile back nav, theme sync

### Carousel setup
Each case study page has a `<div id="carousel" data-total="N" data-lightbox="image|video|none">`.
`initCarousel()` in case-study.js injects: prev/next arrows, zoom button, counter, lightbox.

Slides: `<div class="carousel-slide" onclick="openLightbox(N)" title="Click to expand">`.
The init function patches these with `role="button"` / `tabindex` / keyboard handler.

### Mobile back nav
`case-study.js` modifies the `.back-nav` href on mobile:
```js
backNav.href = backNav.href.replace(/index\.html(#.*)?$/, 'index.html#projects');
```
This appends `#projects` so `main.js` auto-opens the portfolio page on return.

### Adding a new case study
1. Copy `cases/_template.html` to `cases/[name]/index.html`
2. Add `<link>` to `cases/shared/case-study.css` and `<script>` for case-study.js
3. Add `initCarousel()` call in a `<script>` block at bottom
4. Create a `.win` in `index.html` pointing to the iframe
5. Add thumbnail images (light + dark) as WebP to `cases/[name]/images/`
6. Add to `sitemap.xml` with `lastmod`
7. Add a `.pl-row` entry in the project list section of `index.html`

---

## 8. Font System

### Icons: Phosphor
- Font file: `Assets/fonts/phosphor/Phosphor.woff2` (3KB - subsetted)
- CSS: `Assets/fonts/phosphor/phosphor.css` (2KB - subsetted)
- Only 26 icons are included. If you need a new icon, you must:
  1. Add its CSS rule to `phosphor.css` (from the full Phosphor CSS)
  2. Re-run the WOFF2 subsetter with the new codepoint added
  (Or switch to the full files if subsetting is too complex)
- Usage: `<i class="ph ph-icon-name"></i>`
- Current icon list: `ph-arrow-down`, `ph-arrow-right`, `ph-arrow-up`, `ph-badge`,
  `ph-caret-down`, `ph-caret-right`, `ph-check`, `ph-download-simple`,
  `ph-envelope-simple`, `ph-file-arrow-down`, `ph-folder-open`, `ph-game-controller`,
  `ph-house`, `ph-house-simple`, `ph-linkedin-logo`, `ph-list`, `ph-moon`,
  `ph-paper-plane-tilt`, `ph-phone`, `ph-plus-circle`, `ph-share-network`,
  `ph-squares-four`, `ph-sun`, `ph-terminal-window`, `ph-user-circle`, `ph-x-square`

### Terminal: VT323
- `Assets/fonts/VT323-Regular.woff2` (30KB) - preferred
- `Assets/fonts/VT323-Regular.ttf` (146KB) - fallback
- Used in the terminal widget on desktop and mobile

---

## 9. Projects Status

| Project | Status | Window ID | Case Study |
|---|---|---|---|
| Verint Design System (LUX 2.0) | Full case study | `win-proj-lux` | `cases/lux/` |
| LUX Plugins | Full case study | `win-proj-plugins` | `cases/plugins/` |
| My Verint | Full case study | `win-proj-myverint` | `cases/myverint/` |
| Verint Copilot | Full case study | `win-proj-copilot` | `cases/copilot/` |
| Supervisor Hub | **Placeholder** | `win-proj-supervisor` | Not built yet |

**Supervisor Hub** is the only project without a case study. The window currently
shows an SVG placeholder illustration. When the case study is ready:
1. Create `cases/supervisor/index.html` (use `_template.html`)
2. Replace the placeholder `.win` content in `index.html` with an iframe
3. Add to sitemap

---

## 10. Quality Baseline (August 2026)

| Area | Score | Notes |
|---|---|---|
| Design | 8/10 | |
| Folder structure | 9/10 | |
| Accessibility | 10/10 | All clickable divs have role/keyboard, WCAG AA contrast |
| Performance | 9/10 | Fonts subsetted, images WebP, lazy loading |
| SEO | 9.5/10 | JSON-LD, canonical, sitemap, OG tags on all pages |
| **Overall** | **9.7/10** | |

### After any significant change, verify:
- Contrast ratios on new colors (4.5:1 minimum)
- `alt` + `width`/`height` on new images
- `role="button" tabindex="0" onkeydown` on new clickable divs
- `role="dialog" aria-modal="true" aria-label` on new `.win` divs
- `sitemap.xml` `lastmod` updated

---

## 11. What Was Built (session history summary)

### Performance (August 2026)
- Phosphor icon font subsetted: 76KB CSS + 147KB WOFF2 -> 2KB + 3KB (saved ~218KB)
- VT323 converted TTF -> WOFF2: 146KB -> 30KB (saved 116KB)
- All project thumbnails converted to WebP
- Lazy loading on all project thumbnails

### Fixes
- Desktop resize re-centers the frame (was only centering on breakpoint crossing)
- Mobile "Back to projects" in case studies now opens the portfolio page, not homepage
- Mobile terminal banner font size increased
- LUX case study carousel: second slide added (`lux-02.webp`, 1968x1108)

### Accessibility
- All `.carousel-slide` onclick divs patched with role/tabindex/keyboard (case-study.js)
- All 5 `.pl-row` project list items in index.html patched
- All 20 `.wc` window control buttons patched at load time (main.js)

### Infrastructure
- CNAME restored to repo root (was accidentally moved to `docs/`)
- `robots.txt` and `sitemap.xml` restored to repo root
- Git: force push workflow established for remote divergence

---

## 12. Key Code Patterns to Know

### Opening a window
```js
openWin('proj-lux');         // opens win#win-proj-lux
closeWin('proj-lux');        // closes it
maximizeWin('proj-lux');     // toggles maximize
```

### Mobile page navigation
```js
mvPageOpen('portfolio');     // opens the portfolio list page
mvPageOpen('home');
mvPageOpen('about');
mvPageOpen('contact');
```

### Centering the canvas frame
```js
centerFrame();               // re-centers the main frame on canvas
```

### Theme
```js
// Reading current theme
document.documentElement.getAttribute('data-theme') === 'dark'
```

### Accessible clickable div pattern
```html
<div onclick="handler()" role="button" tabindex="0"
     onkeydown="if(event.key==='Enter'||event.key===' ')handler()">
  Label
</div>
```

---

*Last updated: August 2026. Generated as handoff from Cowork session (Ori.Cohen10@verint.com).*
