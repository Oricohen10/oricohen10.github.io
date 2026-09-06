# oricohen.co - Project Rules

Portfolio site for Ori Cohen. Live at https://oricohen.co - deployed via GitHub Pages.

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

## Case study rules (established Sept 2026 on cases/myverint)

These came out of rebuilding My Verint. They apply to every case study.
Where a rule is currently only implemented on myverint it says so.

### Structure
- **No carousel.** Media sits beside the claim it evidences. A carousel
  front-loads all the evidence before any of the argument, and almost
  nobody advances one - slides 2-4 are effectively invisible.
- **One judgement per section.** Promote the thing that matters, demote
  the rest. Three equal metrics or three equal cards is a refusal to
  decide, and it is what reads as generated.
- **Reflections are margin notes, not alerts.** `PROCESS` / `RESEARCH`
  style labels, not `01`/`02` - numbers imply a sequence these do not
  have. Never a filled circle with `!`; that is an error affordance.
- **Media modules may differ per project; the page grammar may not.**
  Type scale, spacing rhythm, section order, nav and lightbox stay
  identical. Only the media component changes with the artifact.

### Live bugs to fix when touching a case study
- ~~**`overflow-x:hidden` on html/body kills `position:sticky`.**~~ Fixed
  in `cases/shared/case-study.css` (Sept 2026), so all five pages now get
  it. The mechanism, for when it regresses: a browser cannot honour
  `overflow-x:hidden` with `overflow-y:visible`, so it computes
  `overflow-y` to `auto`, body becomes a scroll container, and sticky
  resolves against a content-height body and never engages. `clip`
  suppresses the same overflow without creating a scroll container.
- A sticky **grid item** also needs `height:fit-content` **and** a
  `max-height` cap. Without the cap it has no travel room the moment its
  content is taller than the viewport, and it scrolls away like a static
  block. Both now live in the shared `.sidebar` rule.
- **`.cs-body` caps at `max-width:1100px`** and myverint overrides to
  1280px. That is deliberate, not a bug to roll out: `.carousel-shell`
  caps at 1040, so a 1280 body leaves the carousel visibly inset, and
  widening the carousel renders the 1968px sources below the 2x they are
  cut for. Fold 1280 into the shared sheet only once the carousels are
  gone.
- **`.diff-item::before` paints a 4px accent bar.** If the card styling is
  removed, that bar stays and lands on top of whatever sits at `left:0`.
  Overriding a card means overriding its pseudo-elements too.

### The specificity trap
**Fixed at the cause (Sept 2026): the rule is `.cs-section > p` now**, so
it no longer reaches inside a module and a module paragraph needs one
class, not two. The mechanism, for when something similar appears:
`.cs-section p` as a descendant selector is **(0,1,1)** - one class plus
one type. A local rule of the form `.my-class` is **(0,1,0)** and **loses**,
silently, for `color`, `font-size`, `line-height` and `margin`. Only
properties the shared rule does not set (e.g. `font-weight`) get through,
which makes it look like the rule half-worked. Any local override on a
`<p>` inside `.cs-section` needs two classes: `.parent .child`.

### Ambient field
- One **fixed**, page-wide layer: dot lattice plus two drifting radial
  washes in the project accent. Not per-section - masking per section
  makes the texture pulse on and off at every boundary.
- **Light and dark are not the same treatment.** Glow is additive. On
  near-black there is headroom to add light, so accent dots read as
  luminosity; on white a dark dot subtracts light and reads as dirt.
  Light: neutral dots ~9%, accent washes 10%/8%. Dark: accent dots ~28%,
  washes 22%/17%.
- **Wash opacity is capped by contrast, not by taste.** Two overlapping
  washes at 10% put `--text-secondary` at 5.00:1. At 12% it is 4.49:1 and
  fails. Presence beyond that must come from **motion amplitude and size**,
  which cost nothing in contrast.

### The device frame
- Bezel colours are a **physical object**, not page chrome - they stay
  dark in both themes. A dark phone on a light page is correct.
- **Hide the Dynamic Island when the screen shows video.** The recordings
  already contain the real status bar; drawing our own gives two.
  `.has-video .sc-phone-island{display:none}`.

### Elevation
Shadows are **not symmetric between themes**. On white a shadow must be
short and faint or it reads as a grey smear; on near-black it needs depth
to register at all. Use a token per theme, never one shared value.
Reference: light `0 18px 40px rgba(18,18,19,.16)`, dark `0 48px 96px
rgba(0,0,0,.8)`.

### Media encoding
- Video: **H.264, CRF 26, `-preset slow`, `-movflags +faststart`, no audio
  track.** Verify with SSIM against the source; >0.99 is visually
  lossless. Do not guess a bitrate.
- **Do not ship WebM alongside MP4 without measuring.** Once H.264 is
  encoded properly, VP9 lost on every file here - the WebM was only
  winning because the MP4 was over-encoded at 350-500 kbps.
- Posters: **WebP q82.** Roughly 60% smaller than the JPEG equivalent.
- Source resolution should be ~2x the rendered CSS width. No larger.
- **Trim any fade-in from black before encoding, and cut the poster from
  the new frame 0.** Screen recordings from the phone open with a ~0.47s
  fade. That matters more than it sounds: once `src` is assigned the
  element has a current frame, so the browser paints that frame and
  **stops honouring the poster**. A video that is loaded but not playing
  therefore renders as a pure black rectangle, indistinguishable from a
  404 or a codec failure. Check frame 0's mean luma, do not eyeball it.
- Re-encoding from the already-compressed copy is a second generation.
  The first-generation sources are in the `old-portfolio` folder under
  `<Project>/videos/`. Encode from those and verify SSIM against the
  **trimmed** original, not the untrimmed one.

### Media loading
- Poster only at first paint. Active media on intersection. Everything
  else on `requestIdleCallback`. Entering a section should not cost the
  whole section's media.
- **Tab-to-media binding must be by id, never by index.** Bind
  `data-for="performance"` on the media and match on the attribute. Index
  arithmetic breaks silently the moment the tab order and the DOM order
  diverge - it paired Performance with the Schedule recording.
- A `hidden` panel never intersects, so switching tabs has to start its
  media explicitly.
- **Never call `load()` in the same tick as `play()`.** Assigning `src`
  already runs the resource selection algorithm; `load()` re-runs it and
  fires `abort`/`emptied`, so the `play()` promise rejects with
  `AbortError: The play() request was interrupted by a new load request`.
  An empty `.catch()` then swallows it and the video sits paused on frame
  0 forever, with no console error. Retry a rejected `play()` on
  `canplay` rather than ignoring it.
- Same trap in reverse: **`play()` then `pause()` in one tick** also
  rejects the promise, and a retry handler will fight the pause. Keep
  loading and playing as separate functions.
- Under `prefers-reduced-motion`, **do not assign `src` at all** - leave
  the poster on screen. Assigning it replaces a good still with frame 0,
  which is the black-rectangle bug above. A still frame is the correct
  reduced-motion treatment; a dead black rectangle is not.
- Only the visible video should be playing. Five 1020px decoders running
  behind `opacity:0` cost real battery for frames nobody sees. Pausing
  the hidden ones is not the same mistake as reloading them - it keeps
  `currentTime` and resumes a keyframe away.

### Motion
- Every decorative animation needs a `prefers-reduced-motion` guard, and
  reveals must resolve to their final state rather than staying at
  `opacity:0`.
- **A transformed ancestor breaks `position:sticky` in its subtree.**
  `.cs-reveal` sets `transform:translateY(0)` when visible - still a
  transform. Do not put `cs-reveal` on a section containing a sticky
  element.
- Crossfade between videos with **opacity only** - no pause, play or
  restart. Reloading on every switch adds decode latency.

### Dead-code scanning
Static filename scans **cannot see runtime-constructed paths**. A scan
flagged five in-use `.webm` files as dead because they were only reached
through `src.replace('.mp4','.webm')`. Check for string construction
before deleting any asset.

### Cache busting is not optional here
The case studies load in **iframes** from `index.html`, and they pull
`src/tokens.css` and `cases/shared/case-study.{css,js}` from outside the
page. There is no build step, so nothing fingerprints those URLs.

**After touching `cases/shared/*` or any case-study markup, run:**
```bash
bash tools/bump-cache.sh
```
before committing. `tools/sync.sh` also does it automatically when it is
the thing creating the commit, but Claude commits directly, so Claude has
to run it.

Skipping it does worse than delay a feature. **Moving CSS out of a page's
inline `<style>` and into the shared sheet is a regression for anyone with
a warm cache**: the inline copy ships with the HTML and disappears at
once, while the shared sheet that replaces it is still the old cached file
with no rule for the new class. That is how the ambient dot field vanished
from myverint - where it had been working - at the same moment the other
four pages failed to gain it. Stale iframe HTML did the same for the
carousel removal: gone from the server, still on screen.

Only subresource and iframe URLs get `?v=`. Canonical links, `og:url` and
`sitemap.xml` must stay clean - a query there splits the page's identity
for search engines.

### Checking your own work
Brace counts and tag balance prove nothing about correctness. Two bugs
shipped in `888dc57` were both **syntactically valid CSS**: a deleted
rule left its selector prefix dangling onto the next rule, and an
inserted rule split `.ai-step.active .ai-step-title` into an unqualified
`.ai-step-title`. Balanced braces, zero warnings, broken page.

**Tag balance is not structure.** A stray `</div>` in the middle of a
block closes an ancestor early and a later missing one closes it late, so
the total still balances and every counter reports zero. The plugins reel
shipped like that for three rounds: `.vs-caps` closed after the first
caption, so the other three captions were siblings of it rather than
children, `.vs-caps .vs-cap-p` never matched them, and they fell through
to the browser default - 16px, inherited black, no measure. Ori reported
it three times and each time the checks said the file was fine.

The check that catches it: **walk the tree and print the ancestor path of
the elements a selector depends on.** If a rule is `.a .b`, assert that
every `.b` actually has `.a` in its ancestor chain. Balance counters
cannot see this; a path walk cannot miss it.

What actually catches the CSS ones:
- Split the stylesheet **by cascade context** (base, then each `@media`)
  and flag any selector declared twice within one context. A media query
  repeating a base selector is correct; the same selector twice in one
  context almost never is.
- Flag any selector containing a newline. Both bugs produced one.
- **Strip comments before scanning.** A check for `overflow-x:hidden`
  matched the comment explaining why `hidden` was wrong. Same class of
  error as a grep for `carousel-slide` matching `carousel-slide-label`.
- Read the **deployed** file, not the local one, when the complaint is
  about the live site. `python3 -m http.server` sends no cache headers,
  so the browser may be showing stale HTML; add `?v=N` when testing.
- When media looks broken, measure the asset before touching the code:
  codec profile and `pix_fmt` via ffprobe, and frame 0's mean luma. The
  black-rectangle bug above looked exactly like a missing file.
- **A check that reports zero has to be shown finding something.** The state
  contrast pass returned "0 findings" and it was not clean, it was broken -
  it keyed dark overrides into a different bucket from the light rules they
  override, so nothing ever paired up. Raising the threshold to 7:1 still
  returned zero, which is what exposed it. Before believing a clean result,
  loosen the threshold until the check fires. If it never fires, it is not
  running.

---

## Accessibility

Run the audit. It needs no browser, no npm and no network:

```bash
python3 tools/a11y/run.py
```

Seven modules under `tools/a11y/`; `README.md` there explains each and lists
what it cannot see. Non-zero exit means something failed. As of Sept 2026 all
four checks pass on all eight pages in both themes.

### Colour is two roles, not one
The accent is **ink** on dark and **fill** on light, and conflating those
caused four separate faults in one pass:

- `--action-primary` was purple-600 in both themes. On dark that is 2.40:1 on
  the page, so it failed as a border or focus ring and failed anywhere it
  carried text. Every case study was already patching around it per page. It
  is purple-400 on dark now.
- Because dark accents are bright, **anything that fills with the accent needs
  `--text-on-accent`, never a hardcoded `#fff`.** White on the five project
  accents in dark runs 1.92:1 to 3.34:1. `#scroll-top` was invisible on two of
  five pages; three pages carried their own `{color:#1a1a1a}` patch.
- `--text-on-accent` is **not** `--text-inverse`. `--text-inverse` means "ink
  for a light surface" and flips with the theme. `--text-on-accent` flips
  because the accent's lightness flips. `.btn-primary` used `--tx-inv` and got
  near-black text on purple at 3.22:1.
- A button that fills from the **fixed** purple ramp rather than the accent
  token gets `var(--gray-0)`, because its surface does not flip either.

### Measure the label against the button, not the button against the page
The old comment on `.btn-primary` read "#6248E8 -> #4D35C8 on white -> WCAG
AA". Both numbers were real and neither was the pair that matters. White on
purple-500 is 4.20:1 and the label is 13px, so it had been failing all along.
White crosses 4.5:1 at purple-600; no stop in any state may go lighter.

### 1.4.3 applies to :hover and :active too
`.btn-secondary`, `.btn-tertiary` and lux's `.sb-cta` each had a dark `:hover`
rule and no dark `:active`, so pressing them in dark fell through to the light
value - purple-800 ink on a dark tint, 1.14:1. If a component has a dark
counterpart for one state it needs one for every state it defines.

And **never leave which ink wins to source order**: `.btn-tertiary:hover` and
`[data-theme="dark"] .btn-tertiary` are both (0,2,0), because an attribute
selector weighs the same as a class. State the colour on the dark state rule.

### Fixed-object colours do not flip
The traffic-light dots are a window motif, the same rule as the phone bezel:
all three fills are bright in both themes, so the glyph on them is dark in
both. The dark override set `rgba(255,255,255,.7)`, which is 1.43:1 on amber.

### Target size (2.5.8)
The `.wc` dots are 10x10 with a 6px gap. The hit area is now the full 16px
pitch by 24px tall via `::before` - 3.8x the area, no overlap, nothing visible
changed. Still 16px wide rather than 24: closing that needs the traffic lights
spaced further apart, which is a design decision, not a fix to make silently.

The `.wh` window headers are drag-only. Moving a window is not required to
read anything - windows open positioned and can be maximised from a button -
so 2.5.7's single-pointer alternative is covered without keyboard dragging.

### Runtime-patched elements
`patchWindowControls()` in `main.js` gives every `.wc` its role, tabindex,
keyboard handler and an aria-label **derived from the class**, so a new window
gets all four for free and twenty hand-written labels cannot drift. It runs on
`DOMContentLoaded`, not `load` - `load` waits for every video and font, and
until it fired none of those controls was reachable by keyboard.

Static scans cannot see any of this. `tools/a11y/structure.py` keeps an
explicit `RUNTIME_PATCHED` set; add to it rather than letting 21 phantom
findings bury the real ones.

### False positives worth remembering
- **Two `<h1>` in `index.html` is correct.** `#app` and `#mv` are swapped by
  `display:none`, which removes the other from the accessibility tree.
- **An empty heading filled by JS is not an empty heading.** `#pf-d-title` is
  written by `render(1)` on load.
- **`onclick="event.stopPropagation()"` is plumbing, not a control.**
- **`opacity:0` is a reveal rest state, not a contrast failure.** `.cs-reveal`
  animates to 1. Treating it as low contrast produced 120 findings at 1.00:1.
- The lux viewer has a fixed dark palette and no document theme switch - its
  `data-theme` attributes sit on preview buttons. Defaulting the page colour
  to white there invented failures.

### cases/_template.html
It taught a carousel and two lightboxes whose CSS **and** JS were deleted in
Sept 2026. Anyone starting from it built dead markup. The block is replaced
with a note on what to use instead; the rest of the file is current.

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
