"""Contrast in :hover / :active / :focus-visible, which 1.4.3 also covers.
Pairs each state rule's colour with each state rule's background on the same
selector chain, plus the rest-state counterpart."""
import re,sys,os,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import contrast
from contrast import page_rules,page_token_overrides,SHEETS,ROOT
from cascade import varsub
from tokens import parse_color,ratio,over

STATES=('hover','active','focus','focus-visible')

# Selector chains whose state rule sets only the ink, where the fill comes from
# somewhere this CSS-only harness cannot join to it. Each one has to be measured
# by hand and recorded here, by name - the same discipline as RUNTIME_PATCHED in
# structure.py. Anything NOT on this list gets reported against the page colour
# with the assumption labelled, rather than dropped.
INK_ONLY_OK={
    # `.wcs .wc:hover` sets the glyph; the fill is on the .wc.cl/.mn/.mx
    # compounds. Measured: rgba(0,0,0,.78) is 7.03 / 12.57 / 9.61 on the
    # three traffic lights.
    '.wcs .wc',
}

def base_of(sel,theme):
    b=re.sub(r':(hover|active|focus-visible|focus)\b','',sel).strip()
    # A dark override keys to the SAME bucket as the light rule it overrides.
    # Keying `[data-theme="dark"] .btn-secondary:active` separately from
    # `.btn-secondary:active` is why this harness first reported four fixed
    # findings as still broken: the override existed, in another bucket.
    if theme=='dark': b=b.replace('[data-theme="dark"]','').strip()
    return b

def audit(page,theme):
    rules=page_rules(page); ov=page_token_overrides(page,theme)
    # index colour/background by base selector, per state
    fg=collections.defaultdict(dict); bg=collections.defaultdict(dict)
    for r in rules:
        if r.pseudo: continue
        req_dark='[data-theme="dark"]' in r.raw
        if req_dark and theme!='dark': continue
        if not req_dark and theme=='dark':
            pass  # base rule still applies in dark unless overridden
        st='rest'
        m=re.search(r':(hover|active|focus-visible|focus)\b',r.orig)
        if m: st=m.group(1)
        b=base_of(r.orig,theme)
        c=r.decls.get('color')
        if c:
            pc=parse_color(varsub(c,theme,ov))
            if pc: fg[b][st]=(pc,r.orig)   # later rule wins, same as the cascade
        for prop in ('background','background-color'):
            v=r.decls.get(prop)
            if not v: continue
            v=varsub(v,theme,ov)
            if 'gradient' in v:
                cols=[parse_color(x) for x in re.findall(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))',v)]
                cols=[c for c in cols if c and c[3]>0]
                if cols: bg[b][st]=(cols,r.orig)
                continue
            pv=parse_color(v.split()[0] if v.split() else v) or parse_color(v)
            if pv and pv[3]>0: bg[b][st]=([pv],r.orig)
    # viewer.html has a fixed dark palette and no document-level theme switch
    # (its data-theme attributes are on preview buttons), so the page colour is
    # --bg in both runs. Defaulting to white here invented failures.
    page_bg=parse_color('#141516' if 'viewer' in page else ('#ffffff' if theme=='light' else '#2c2c2c'))
    out=[]
    for b in set(list(fg)+list(bg)):
        for st in STATES:
            f = fg[b].get(st) or fg[b].get('rest')
            g = bg[b].get(st) or bg[b].get('rest')
            if not f: continue
            if st not in fg[b] and st not in bg[b]: continue   # nothing changes
            cands = g[0] if g else [page_bg]
            cands = [c[:3]+(1.0,) if c[3]>=1 else over(c,page_bg) for c in cands]
            worst = min(cands,key=lambda c: ratio(f[0],c))
            r = ratio(f[0],worst)
            if r < 4.5:
                # `if not g: continue` used to live here. It was written for
                # ONE case - `.wcs .wc:hover`, which sets only the ink while
                # the fill comes from the `.wc.cl/.mn/.mx` compounds this
                # harness cannot join - but it was unconditional, so it
                # swallowed EVERY state rule that changes only the colour.
                # Which is most of them. The check reported "0 findings" on a
                # page carrying a deliberately injected 1.1:1 hover.
                # Now: named exceptions are skipped by name, and everything
                # else is reported with the assumption spelled out, because a
                # flagged guess can be dismissed in a second and a silent drop
                # cannot be seen at all.
                if not g and b in INK_ONLY_OK: continue
                out.append((round(r,2),b,st,
                            '#%02x%02x%02x'%tuple(int(x) for x in f[0][:3]),
                            '#%02x%02x%02x'%tuple(int(x) for x in worst[:3]),
                            (g[1] if g else 'ASSUMED page bg - no background on this chain')))
    return sorted(out)

tot=0
for page in SHEETS:
    for theme in ('light','dark'):
        f=audit(page,theme)
        if not f: continue
        print(f'\n### {page} [{theme}]')
        for r,b,st,fgh,bgh,src in f:
            tot+=1
            print(f'  {r:5.2f}:1  {b}:{st}   {fgh} on {bgh}   (bg from `{src}`)')
print(f'\nstate findings: {tot}')
