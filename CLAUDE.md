# oricohen.co - Project Rules

Portfolio site for Ori Cohen. Live at https://oricohen.co — deployed via GitHub Pages.

## Stack
- Vanilla HTML/CSS/JS, no build step, no framework
- `src/tokens.css` - design token system (primitives + semantic + legacy aliases)
- `src/styles.css` - component styles
- `src/main.js` - all JS (window manager, canvas pan/zoom, mobile menu, etc.)
- `src/tokens.json` - design token export (reference only, not loaded at runtime)
- `index.html` - single-page portfolio (desktop + mobile)
- `cases/lux/index.html` - standalone LUX 2.0 case study
- `README.md`, `STYLE_GUIDE.md` - at repo root (the old `docs/` copy was removed)
- `tools/sync.sh` - commit and push helper
- `tools/install-autosync.sh` - optional launchd timer for sync.sh

## Syncing to GitHub
After finishing a task, run from the repo root:
```bash
bash tools/sync.sh "what changed"
```
It commits, rebases onto `origin/<branch>`, then pushes. No force push - the
rebase is what keeps the remote from diverging, which is the problem the old
workflow papered over with `push --force`.

Auth comes from the `gh` credential helper (`gh auth setup-git`). There is no
token in the remote URL. If a push fails, check `gh auth status` first.

### Working through a Cowork FUSE mount
File edits work normally. Git needs two things:
- File deletion must be enabled for the folder, or `git rm` fails with
  `Operation not permitted`.
- A crashed session can leave `.git/index.lock` behind. `tools/sync.sh` clears
  a stale lock automatically when no git process is running.

The sandbox has **no network route to github.com and no credentials**, so the
final `git push` always has to happen on the user's machine - either by running
`tools/sync.sh` in Terminal or via the launchd timer.

### The normal workflow (timer installed)
Ori asks for changes to be pushed from the chat. So:
1. Make the edits.
2. `git add` and `git commit` with a real, descriptive message. This works from
   the session as long as file deletion is enabled for the folder.
3. Stop there. Do **not** try to push and do not ask Ori to run a command.

A launchd agent runs `tools/sync.sh --push-only` every 60 seconds. It delivers
committed work and never creates a commit itself, so anything left uncommitted
stays local and off the live site. Tell Ori it will be live in about a minute.

Check the timer is actually running before relying on it:
```bash
launchctl list | grep portfolio-sync
tail -5 ~/Library/Logs/oricohen-portfolio-sync.log
```
If it is not loaded, fall back to asking Ori to run `bash tools/sync.sh`.

---

## Rules - never break these

### Formatting
- Never use em dash (-) or en dash. Always use hyphen (-).

### Typesetting and copy-editing (applies to all articles, case studies, and long-form text)
- **Line length**: target 50-75 characters (8-12 words) per line for optimal readability.
- **Widows and orphans**: never leave a single word or short line (fewer than 2-3 words) isolated at the top or bottom of a paragraph, page, or column.
- **Paragraph length**: 3-5 lines (40-80 words) on average; vary paragraph length deliberately - mix in occasional 1-2 line paragraphs for visual breathing room.
- **Sentence integrity**: never split a sentence so it ends with a period immediately followed by a single stray word from the next paragraph - keep sentence endings and paragraph starts visually intact.
- **Ragged edges**: when text is not justified, avoid line breaks that leave a noticeably short or long line compared to surrounding lines.
- **Orphaned subheadings**: never leave a subheading as the last line of a block with no body text beneath it.
- Apply these rules automatically to any article, blog post, case study, or long-form content - do not wait to be asked each time.

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
