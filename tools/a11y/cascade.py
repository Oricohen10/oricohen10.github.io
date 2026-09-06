"""Approximate but real CSS cascade over the parsed DOM: matches
tag/.class/#id/[attr] compounds joined by descendant or child combinators,
sorts by specificity + order, resolves var(), then walks ancestors for the
nearest painted background.  Enough to measure contrast without a browser."""
import re,sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from tokens import parse_color, ratio, over, strip_comments, LIGHT, DARK
from dom import parse

STATE=re.compile(r':(hover|active|focus|focus-visible|focus-within|target|visited)\b')
PSEUDO_EL=re.compile(r'::?(before|after|placeholder|selection|marker|first-line|first-letter|-webkit-[\w-]+)\b')

class Rule:
    __slots__=('sel','decls','spec','order','state','pseudo','media','raw','orig')
    def __init__(self,sel,decls,order,media,raw):
        self.raw=raw; self.media=media; self.order=order; self.decls=decls
        self.orig=sel
        self.state=bool(STATE.search(sel))
        self.pseudo=PSEUDO_EL.search(sel)
        s=PSEUDO_EL.sub('',sel)
        s=STATE.sub('',s)
        self.sel=s.strip()
        self.spec=specificity(self.sel)

def specificity(sel):
    a=len(re.findall(r'#[\w-]+',sel))
    b=len(re.findall(r'\.[\w-]+',sel))+len(re.findall(r'\[[^\]]+\]',sel))+len(re.findall(r':(?!:)[a-z-]+',sel))
    c=len(re.findall(r'(?:^|[\s>+~])([a-z][a-z0-9]*)',sel))
    return (a,b,c)

def split_top(s,ch):
    out=[];d=0;cur=''
    for c in s:
        if c=='(':d+=1
        elif c==')':d-=1
        if c==ch and d==0: out.append(cur);cur=''
        else: cur+=c
    out.append(cur); return out

def _blocks(text,pos=0,end=None):
    """Yield (prelude, body_text) for every brace block at this level."""
    if end is None: end=len(text)
    i=pos
    while i<end:
        j=text.find('{',i)
        if j==-1 or j>=end: return
        d=0;k=j
        while k<end:
            if text[k]=='{': d+=1
            elif text[k]=='}':
                d-=1
                if d==0: break
            k+=1
        if k>=end: return
        yield text[i:j].strip(), j+1, k
        i=k+1

def parse_css(text,media_ctx='base'):
    rules=[]; text=strip_comments(text); order=[0]
    def walk(a,b,ctx):
        for prelude,bs,be in _blocks(text,a,b):
            if prelude.startswith('@'):
                kw=re.match(r'@([\w-]+)',prelude).group(1).lower()
                if kw in ('media','supports','layer','container','scope'):
                    walk(bs,be,prelude if kw in ('media','supports','container') else ctx)
                # @keyframes / @font-face / @property: no cascade contribution
                continue
            body=text[bs:be]
            # nested rules are not used in this codebase; treat body as decls
            decls={}
            for d in split_top(body,';'):
                if '{' in d or '}' in d: continue
                if ':' not in d: continue
                p,_,v=d.partition(':')
                p=p.strip().lower(); v=v.strip()
                if p: decls[p]=v
            if not decls: continue
            for sel in split_top(prelude,','):
                sel=sel.strip()
                if not sel: continue
                order[0]+=1
                rules.append(Rule(sel,decls,order[0],ctx,prelude))
    walk(0,len(text),media_ctx)
    return rules

# ---- matching -----------------------------------------------------------
def compound_matches(node,comp):
    if node.tag=='#root': return False
    comp=comp.strip()
    if not comp: return False
    # tag
    m=re.match(r'^([a-z][a-z0-9]*|\*)',comp)
    if m and m.group(1)!='*' and node.tag!=m.group(1): return False
    for c in re.findall(r'\.([\w-]+)',comp):
        if c not in node.cls(): return False
    for i in re.findall(r'#([\w-]+)',comp):
        if node.attrs.get('id')!=i: return False
    for a in re.findall(r'\[([^\]]+)\]',comp):
        am=re.match(r'([\w-]+)\s*(?:([~^$*|]?)=\s*["\']?([^"\']*)["\']?)?$',a.strip())
        if not am: return False
        name,op,val=am.group(1),am.group(2),am.group(3)
        if name not in node.attrs: return False
        if val is not None and am.group(0).find('=')!=-1:
            av=node.attrs[name]
            if op=='' and av!=val: return False
            if op=='*' and val not in av: return False
            if op=='^' and not av.startswith(val): return False
            if op=='$' and not av.endswith(val): return False
            if op=='~' and val not in av.split(): return False
    for p in re.findall(r':(?!:)([a-z-]+)(?:\(([^)]*)\))?',comp):
        name,arg=p
        if name in ('root',):
            if node.tag!='html': return False
        elif name=='first-child':
            if not node.parent or node.parent.children.index(node)!=0: return False
        elif name=='last-child':
            if not node.parent or node.parent.children[-1] is not node: return False
        elif name in ('disabled','checked','required','readonly'):
            # real attribute states: match only when the attribute is present
            if name not in node.attrs: return False
        elif name=='placeholder-shown':
            if 'placeholder' not in node.attrs: return False
        elif name=='empty':
            if node.children or node.text.strip(): return False
        elif name in ('not','is','where','has','nth-child','nth-of-type',
                      'first-of-type','last-of-type','only-child','only-of-type',
                      'lang','dir','nth-last-child','defined'):
            return None   # unsupported -> "maybe"
    return True

def matches(node,sel):
    """Match a complex selector against node. None = indeterminate."""
    parts=re.split(r'\s*([>+~])\s*|\s+',sel.strip())
    parts=[p for p in parts if p]
    if not parts: return False
    maybe=False
    # walk right to left
    idx=len(parts)-1
    r=compound_matches(node,parts[idx])
    if r is None: maybe=True; r=True
    if not r: return False
    idx-=1
    cur=node
    while idx>=0:
        comb=' '
        if parts[idx] in ('>','+','~'):
            comb=parts[idx]; idx-=1
            if idx<0: break
        comp=parts[idx]
        if comb=='>':
            cur=cur.parent
            if cur is None: return False
            r=compound_matches(cur,comp)
            if r is None: maybe=True; r=True
            if not r: return False
        elif comb in ('+','~'):
            if not cur.parent: return False
            sibs=cur.parent.children
            k=sibs.index(cur)
            pool=[sibs[k-1]] if comb=='+' and k>0 else sibs[:k]
            ok=False
            for s in reversed(pool):
                rr=compound_matches(s,comp)
                if rr is None: maybe=True; rr=True
                if rr: cur=s; ok=True; break
            if not ok: return False
        else:
            a=cur.parent; ok=False
            while a is not None:
                rr=compound_matches(a,comp)
                if rr is None: maybe=True; rr=True
                if rr: cur=a; ok=True; break
                a=a.parent
            if not ok: return False
        idx-=1
    return None if maybe else True

INHERITED={'color','font-size','font-weight','font-family','line-height',
           'text-align','letter-spacing','visibility','text-transform'}

def resolve(node,rules,theme,include_state=None,pseudo=None):
    """Return {prop:value} for node in the given theme."""
    got={}
    best={}
    for r in rules:
        if r.pseudo and (pseudo is None or r.pseudo.group(1)!=pseudo): continue
        if not r.pseudo and pseudo is not None: pass
        if r.state and r.state!=bool(include_state): continue
        if r.state and include_state and include_state not in r.raw: continue
        # theme gate: rules that require [data-theme="dark"] only apply in dark
        req_dark='[data-theme="dark"]' in r.sel
        if req_dark and theme!='dark': continue
        if 'prefers-color-scheme' in r.media: continue
        sel=r.sel.replace('[data-theme="dark"]','').strip()
        if sel in ('',':root','html','html body','body'):
            targets=('html','body')
            if node.tag not in targets and sel not in (':root','html','body',''): continue
            if node.tag not in ('html','body') : continue
        m=matches(node,sel if sel else 'html')
        if m is False: continue
        key=(r.spec,r.order)
        for p,v in r.decls.items():
            imp='!important' in v
            k=((1 if imp else 0),)+r.spec+(r.order,)
            if p not in best or k>best[p][0]:
                best[p]=(k,v.replace('!important','').strip())
    for p,(k,v) in best.items(): got[p]=v
    # inline style wins
    st=node.attrs.get('style','')
    for d in split_top(st,';'):
        if ':' in d:
            p,_,v=d.partition(':'); got[p.strip().lower()]=v.strip()
    return got

def varsub(v,theme,extra=None):
    t=dict(LIGHT if theme=='light' else DARK)
    if extra: t.update(extra)
    for _ in range(10):
        if v is None or 'var(' not in v: break
        def rep(m):
            n=m.group(1).strip()
            return t.get(n,(m.group(2) or '').strip())
        v=re.sub(r'var\(\s*(--[\w-]+)\s*(?:,([^()]*(?:\([^()]*\)[^()]*)*))?\)',rep,v)
    return v
