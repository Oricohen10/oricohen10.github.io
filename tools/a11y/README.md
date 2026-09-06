# tools/a11y

A static accessibility and structure audit for this site. No browser, no npm,
no network - it parses the HTML into a real DOM, resolves the CSS cascade
against it, and measures. Run the whole thing:

```bash
python3 tools/a11y/run.py
```

Non-zero exit means something failed. Individual checks also run standalone.

| module | what it answers |
|---|---|
| `tokens.py` | resolves `var()` chains per theme; WCAG luminance and contrast maths |
| `dom.py` | builds a DOM with correct implicit-close handling, so ancestor paths are real |
| `cascade.py` | matches selectors against that DOM, sorts by specificity then order |
| `contrast.py` | every text node, both themes: colour vs the composited background behind it |
| `states.py` | the same for `:hover`, `:active`, `:focus`, which 1.4.3 also covers |
| `structure.py` | landmarks, heading order, names, labels, roles, keyboard, ids, media |
| `tree.py` | ancestor-path integrity - see below |
| `mobile.py` | arithmetic on fixed widths at 320-430px, excluding desktop-only shells |

## Why tree.py exists

A stray `</div>` in `cases/plugins` closed `.vs-caps` after the first caption,
so the other three captions were siblings of it rather than children.
`.vs-caps .vs-cap-p` matched one paragraph out of four and the rest fell
through to the browser default: 16px, inherited black, no measure.

**Tag balance reported 0 unclosed and 0 extra the entire time**, because an
early close and a late one cancel out. Brace counts, tag counters and a CSS
linter all passed. It took three rounds of "the typography is still wrong"
before anyone walked the tree.

`tree.py` walks it. For a rule `.a .b` it asserts that every `.b` has `.a` in
its ancestor chain, and it distinguishes the three ways that can fail:

- **BROKEN TREE** - some match, and the ones that missed are *siblings* of the
  container. That is the shape a stray close tag makes. This is the finding.
- **partial** - some match and the rest sit somewhere unrelated. Usually a real
  variant, worth a look.
- **dead** - none match. Usually just dead CSS.

State classes (`.on`, `.active`, anything JS toggles) and utility classes that
appear under many different parents are skipped: `.on .vs-item-n` matching 1 of
4 is what a selected state *is*, and flagging those buried the real finding
under nine false ones the first time this ran.

Verified against the original fault: re-inject the stray `</div>` and `tree.py`
reports `.vs-caps .vs-cap-p matches 2/5` with the three orphaned line numbers,
while the tag-balance check on the same file still says clean.

## What it cannot do

There is no browser here, so nothing below is measured - it is reasoned about
and stated as such in the report:

- rendered line lengths and reflow at a given width
- whether a focus ring is actually visible against real pixels
- computed layout, so target sizes come from the CSS box, not the painted one
- `:has()`, `:nth-child()` and `:not()` are treated as "may match", so a rule
  gated on one is never reported as a definite failure
