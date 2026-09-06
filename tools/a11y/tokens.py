"""Resolve CSS custom properties per theme, and compute WCAG contrast."""
import re, os
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def strip_comments(s):
    return re.sub(r'/\*.*?\*/','',s,flags=re.S)

NAMED={'white':'#ffffff','black':'#000000','transparent':'rgba(0,0,0,0)',
       'red':'#ff0000','currentcolor':None,'inherit':None,'none':None}

def parse_color(v):
    """-> (r,g,b,a) floats 0-255 / 0-1, or None."""
    if v is None: return None
    v=v.strip().lower()
    if v in NAMED:
        n=NAMED[v]
        if n is None: return None
        v=n
    m=re.fullmatch(r'#([0-9a-f]{3,8})',v)
    if m:
        h=m.group(1)
        if len(h)==3: h=''.join(c*2 for c in h)+'ff'
        elif len(h)==4: h=''.join(c*2 for c in h)
        elif len(h)==6: h=h+'ff'
        elif len(h)!=8: return None
        return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),int(h[6:8],16)/255)
    m=re.fullmatch(r'rgba?\(([^)]*)\)',v)
    if m:
        parts=[p.strip() for p in re.split(r'[,\s/]+',m.group(1)) if p.strip()]
        try:
            r,g,b=[float(p.rstrip('%'))*(2.55 if p.endswith('%') else 1) for p in parts[:3]]
        except ValueError: return None
        a=1.0
        if len(parts)>3:
            p=parts[3]
            a=float(p.rstrip('%'))/(100 if p.endswith('%') else 1)
        return (r,g,b,a)
    return None

def over(fg,bg):
    """Composite fg (with alpha) over opaque bg. Both (r,g,b,a)."""
    a=fg[3]
    return tuple(fg[i]*a+bg[i]*(1-a) for i in range(3))+(1.0,)

def lin(c):
    c=c/255
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4

def lum(rgb):
    return .2126*lin(rgb[0])+.7152*lin(rgb[1])+.0722*lin(rgb[2])

def ratio(fg,bg):
    """fg/bg are (r,g,b,a); fg composited over bg first."""
    if fg[3]<1: fg=over(fg,bg)
    L1,L2=lum(fg),lum(bg)
    if L1<L2: L1,L2=L2,L1
    return (L1+.05)/(L2+.05)

# ---- token resolution -------------------------------------------------
def collect_decls(css, selector_pred):
    """Return {prop: value} for rules whose selector satisfies pred, later wins."""
    out={}
    css=strip_comments(css)
    # strip @media/@supports wrappers but keep inner rules (we only need
    # base-context token values; tokens are not redefined in media queries here)
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
        sel,body=m.group(1).strip(),m.group(2)
        if sel.startswith('@'): continue
        if not selector_pred(sel): continue
        for d in body.split(';'):
            if ':' not in d: continue
            p,_,val=d.partition(':')
            p=p.strip()
            if p.startswith('--'): out[p]=val.strip()
    return out

def build_theme(theme):
    css=open(os.path.join(ROOT,'src','tokens.css'),encoding='utf-8').read()
    def base(sel):
        parts=[s.strip() for s in sel.split(',')]
        return any(p in (':root','html') for p in parts)
    def dark(sel):
        return '[data-theme="dark"]' in sel and 'prefers-color-scheme' not in sel
    d=collect_decls(css,base)
    if theme=='dark':
        d.update(collect_decls(css,dark))
    # resolve var() chains
    def resolve(val,depth=0):
        if depth>12: return val
        def rep(m):
            name=m.group(1).strip(); fb=m.group(2)
            if name in d: return resolve(d[name],depth+1)
            return (fb or '').strip()
        return re.sub(r'var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)',rep,val)
    return {k:resolve(v) for k,v in d.items()}

LIGHT=build_theme('light'); DARK=build_theme('dark')

def tok(name,theme='light',page_overrides=None):
    t=dict(LIGHT if theme=='light' else DARK)
    if page_overrides: t.update(page_overrides)
    v=t.get(name)
    if v is None: return None
    for _ in range(8):
        if 'var(' not in v: break
        def rep(m):
            n=m.group(1).strip()
            return t.get(n, (m.group(2) or '').strip())
        v=re.sub(r'var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)',rep,v)
    return v.strip()

def c(name,theme='light',page_overrides=None):
    return parse_color(tok(name,theme,page_overrides))

def fmt(x):
    return f'{x:.2f}:1'
