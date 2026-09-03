#!/usr/bin/env bash
#
# bump-cache.sh - stamp a fresh ?v= on every shared subresource and iframe.
#
#   bash tools/bump-cache.sh
#
# Why this exists
# ---------------
# The case studies are loaded in IFRAMES from index.html, and they pull two
# shared files that live outside the page: src/tokens.css and
# cases/shared/case-study.css + .js. There is no build step, so nothing was
# fingerprinting those URLs, and GitHub Pages serves them with a
# cache lifetime of its own choosing.
#
# On its own that only delays a new feature. The dangerous case is moving CSS
# OUT of a page's inline <style> and INTO the shared sheet - which is exactly
# what happened when the ambient dot field was promoted from myverint to all
# five pages. The inline copy is cached with the HTML and went away
# immediately; the shared sheet that replaces it was still cached from before
# and had no .cs-field rule. Net effect for anyone holding the old stylesheet:
# a feature that used to work vanished, and the four pages that were supposed
# to gain it never showed it. Stale HTML in the iframes did the same for the
# carousel removal - the carousel was gone from the server and still on screen.
#
# So: any change to cases/shared/* or to a case study's markup needs a new
# stamp, or the change is invisible to anyone with a warm cache. That includes
# Ori, which is how this was found.
#
# Only subresource and iframe URLs get a query string. Canonical links, og:url
# and sitemap.xml are deliberately left alone - a query there would fragment
# the page's identity for search engines.
#
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 1

STAMP="$(date '+%Y%m%d%H%M')"

python3 - "$STAMP" <<'PY'
import re, sys, glob, os

stamp = sys.argv[1]
targets = sorted(glob.glob('cases/*/index.html')) + ['index.html', 'cases/lux/viewer.html']

# href/src of a shared stylesheet or the shared script, at any depth
SUBRES = re.compile(
    r'((?:href|src)=")((?:\.\./)*(?:src/tokens\.css|shared/case-study\.(?:css|js)))'
    r'(?:\?v=[^"]*)?(")')
# the iframe documents themselves
IFRAME = re.compile(
    r'(<iframe[^>]*\bsrc=")(cases/[\w-]+/(?:index|viewer)\.html)(?:\?v=[^"]*)?(")')

changed = 0
for f in targets:
    if not os.path.exists(f):
        continue
    src = open(f, encoding='utf-8').read()
    out = SUBRES.sub(lambda m: m.group(1) + m.group(2) + '?v=' + stamp + m.group(3), src)
    out = IFRAME.sub(lambda m: m.group(1) + m.group(2) + '?v=' + stamp + m.group(3), out)
    if out != src:
        open(f, 'w', encoding='utf-8').write(out)
        changed += 1

print('  stamped %d file(s) with ?v=%s' % (changed, stamp))
PY

printf '%s  cache stamp: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$STAMP"
