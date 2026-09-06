import re,sys,os,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import cascade
from cascade import parse_css, resolve, varsub, matches
from tokens import parse_color, ratio, over, strip_comments
from dom import parse

ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SHEETS={
 'index.html':['src/tokens.css','src/styles.css'],
 'cases/plugins/index.html':['src/tokens.css','cases/shared/case-study.css'],
 'cases/myverint/index.html':['src/tokens.css','cases/shared/case-study.css'],
 'cases/lux/index.html':['src/tokens.css','cases/shared/case-study.css'],
 'cases/copilot/index.html':['src/tokens.css','cases/shared/case-study.css'],
 'cases/agent-factory/index.html':['src/tokens.css','cases/shared/case-study.css'],
 'cases/lux/viewer.html':['src/tokens.css'],
 'cases/lux/docs.html':['src/tokens.css'],
}

def page_rules(page):
    rules=[]
    for s in SHEETS.get(page,[]):
        rules+=parse_css(open(os.path.join(ROOT,s),encoding='utf-8').read())
    src=open(os.path.join(ROOT,page),encoding='utf-8').read()
    for m in re.finditer(r'<style[^>]*>(.*?)</style>',src,re.S):
        rules+=parse_css(m.group(1))
    # renumber order so later sheets win ties
    for i,r in enumerate(rules): r.order=i+1
    return rules

def page_token_overrides(page,theme):
    """Per-page :root / [data-theme=dark] token blocks (project accents)."""
    src=open(os.path.join(ROOT,page),encoding='utf-8').read()
    out={}
    for m in re.finditer(r'<style[^>]*>(.*?)</style>',src,re.S):
        css=strip_comments(m.group(1))
        for rm in re.finditer(r'([^{}]+)\{([^{}]*)\}',css):
            sel=rm.group(1).strip()
            dark='[data-theme="dark"]' in sel
            base=sel in (':root','html',':root, html','html, :root')
            if dark and theme!='dark': continue
            if not dark and not base: continue
            if dark and '[data-theme="dark"]'!=sel.strip(): 
                if sel.strip() not in ('[data-theme="dark"]',): continue
            for d in rm.group(2).split(';'):
                if ':' in d:
                    p,_,v=d.partition(':')
                    if p.strip().startswith('--'): out[p.strip()]=v.strip()
    return out

TEXTY={'p','h1','h2','h3','h4','h5','h6','span','a','li','td','th','button',
       'label','strong','em','small','div','figcaption','summary','dt','dd',
       'blockquote','code','pre','time','cite','legend','option','b','i'}

def font_px(node,rules,theme,ov,cache):
    n=node
    while n is not None and n.tag!='#root':
        d=cache.get(id(n))
        if d is None:
            d=resolve(n,rules,theme); cache[id(n)]=d
        fs=d.get('font-size')
        if fs:
            v=varsub(fs,theme,ov)
            m=re.match(r'([\d.]+)px',v.strip())
            if m: return float(m.group(1)), (d.get('font-weight'),n)
            m=re.match(r'([\d.]+)rem',v.strip())
            if m: return float(m.group(1))*16,(d.get('font-weight'),n)
        n=n.parent
    return 16.0,(None,None)

def font_weight(node,rules,theme,cache):
    n=node
    while n is not None and n.tag!='#root':
        d=cache.get(id(n)) or resolve(n,rules,theme)
        cache[id(n)]=d
        w=d.get('font-weight')
        if w:
            w=w.strip()
            if w in ('bold','bolder'): return 700
            if w.isdigit(): return int(w)
        if n.tag in ('strong','b','h1','h2','h3','h4','h5','h6'): return 700
        n=n.parent
    return 400

def resolved_color(node,rules,theme,ov,cache):
    n=node
    while n is not None and n.tag!='#root':
        d=cache.get(id(n))
        if d is None: d=resolve(n,rules,theme); cache[id(n)]=d
        cv=d.get('color')
        if cv and 'inherit' not in cv:
            c=parse_color(varsub(cv,theme,ov))
            if c: return c,n
        n=n.parent
    return ((18,18,19,1) if theme=='light' else (255,255,255,1)),None

def bg_stack(node,rules,theme,ov,cache):
    """Walk ancestors collecting painted backgrounds; return composited
    opaque colour plus the element that supplied the base."""
    layers=[]
    n=node
    while n is not None and n.tag!='#root':
        d=cache.get(id(n))
        if d is None: d=resolve(n,rules,theme); cache[id(n)]=d
        for prop in ('background-color','background'):
            bv=d.get(prop)
            if not bv: continue
            bv=varsub(bv,theme,ov)
            if 'gradient' in bv:
                cols=[parse_color(x) for x in re.findall(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))',bv)]
                cols=[c for c in cols if c and c[3]>0]
                if cols:
                    # A gradient is opaque wherever it paints. Take the stop
                    # that gives the WORST ratio against the text, which is
                    # the one closest in luminance - resolved by the caller.
                    layers.append(('grad',cols,n)); n=None; break
                continue
            c=parse_color(bv.split()[0] if bv.split() else bv) or parse_color(bv)
            if c is None: continue
            if c[3]==0: continue
            layers.append(('c',c,n))
            if c[3]>=1: n=None; break
        if n is None: break
        n=n.parent
    if not layers:
        base=(255,255,255,1) if theme=='light' else (26,26,26,1)
        layers.append(('c',base,None))
    # composite bottom-up
    grad=None
    for kind,val,el in layers:
        if kind=='grad': grad=(val,el)
    if layers[-1][0]!='c' or layers[-1][1][3]<1:
        layers.append(('c',(255,255,255,1) if theme=='light' else (26,26,26,1),None))
    out=None
    for kind,val,el in reversed(layers):
        if kind=='grad':
            continue
        if out is None: out=val[:3]+(1.0,)
        else: out=over(val,out)
    owner=next((el for k,v,el in layers if k=='c' and el is not None),None)
    if grad is not None:
        # gradient sits above whatever we composited; its stops are the bg
        stops=[c[:3]+(1.0,) if c[3]>=1 else over(c,out) for c in grad[0]]
        return stops,grad[1],grad
    return out,owner,grad

def audit(page,theme,min_ratio_note=True):
    rules=page_rules(page)
    ov=page_token_overrides(page,theme)
    b=parse(os.path.join(ROOT,page)); root=b.root
    cache={}
    out=[]
    for n in root.walk():
        if n.tag not in TEXTY: continue
        own=n.text.strip()
        if not own: continue
        if len(own)<1: continue
        d=cache.get(id(n)) or resolve(n,rules,theme); cache[id(n)]=d
        if d.get('display','').strip()=='none': continue
        anc_none=False
        m=n.parent
        while m is not None and m.tag!='#root':
            dd=cache.get(id(m)) or resolve(m,rules,theme); cache[id(m)]=dd
            if dd.get('display','').strip()=='none': anc_none=True; break
            m=m.parent
        if anc_none: continue
        fg,fgel=resolved_color(n,rules,theme,ov,cache)
        bg,bgel,grad=bg_stack(n,rules,theme,ov,cache)
        size,_=font_px(n,rules,theme,ov,cache)
        w=font_weight(n,rules,theme,cache)
        large = size>=24 or (size>=18.66 and w>=700)
        need = 3.0 if large else 4.5
        # opacity on the element or an ancestor multiplies alpha
        # opacity:0 is a hidden/reveal rest state, not a contrast condition -
        # .cs-reveal and the menus animate to 1. Only partial alpha counts.
        op=1.0; hidden=False; m=n
        while m is not None and m.tag!='#root':
            dd=cache.get(id(m)) or resolve(m,rules,theme); cache[id(m)]=dd
            o=dd.get('opacity')
            if o:
                try:
                    ov_=float(varsub(o,theme,ov))
                    if ov_==0: hidden=True
                    else: op*=ov_
                except ValueError: pass
            if dd.get('visibility','').strip()=='hidden': hidden=True
            m=m.parent
        if hidden: continue
        fg2=fg[:3]+(fg[3]*op,)
        if isinstance(bg,list):
            cand=min(bg,key=lambda b: ratio(fg2,b))
            r=ratio(fg2,cand); bg=cand
        else:
            r=ratio(fg2,bg)
        if r<need:
            out.append((round(r,2),need,round(size,1),w,own[:46].replace('\n',' '),
                        n.path()[-88:], fg2, bg, n.line, op))
    return sorted(out)

if __name__=='__main__':
    tot=0
    for page in SHEETS:
        for theme in ('light','dark'):
            f=audit(page,theme)
            if not f: 
                print(f'{page:34} {theme:5}  clean'); continue
            print(f'\n### {page}  [{theme}]  {len(f)} text nodes below threshold')
            seen=set()
            for r,need,size,w,txt,path,fg,bg,line,op in f:
                k=(path,round(r,2))
                if k in seen: continue
                seen.add(k)
                tot+=1
                fgh='#%02x%02x%02x'%tuple(int(x) for x in fg[:3])
                bgh='#%02x%02x%02x'%tuple(int(x) for x in bg[:3])
                print(f'  {r:5.2f}:1 (need {need}) {size:5.1f}px w{w} op{op:.2f} {fgh} on {bgh} L{line}')
                print(f'          "{txt}"')
                print(f'          {path}')
    print(f'\nTOTAL failing nodes: {tot}')
