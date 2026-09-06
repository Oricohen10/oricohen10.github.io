#!/usr/bin/env python3
"""Static mobile check: what cannot fit, at the widths people actually use.

No browser here, so this does not measure layout. What it CAN do reliably is
arithmetic: for every rule that pins a width, work out the space actually
available at a given viewport once the page's own padding and any fixed
sibling column are subtracted, and flag anything that cannot fit. That is the
class of fault that produced the myverint module breaking at the default
window size - the numbers were knowable without rendering anything.
"""
import re,os,sys,glob,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from tokens import strip_comments
from cascade import parse_css
from dom import parse
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

WIDTHS=[320,360,390,430]          # iPhone SE .. Pro Max
PAGES=sorted(glob.glob(os.path.join(ROOT,'cases/*/*.html')))+[os.path.join(ROOT,'index.html')]
SHEETS={'index.html':['src/styles.css'],
        'default':['cases/shared/case-study.css']}

def media_max(ctx):
    m=re.search(r'max-width:\s*(\d+)',ctx or '')
    return int(m.group(1)) if m else None
def media_min(ctx):
    m=re.search(r'min-width:\s*(\d+)',ctx or '')
    return int(m.group(1)) if m else None

def applies(ctx,w):
    if not ctx or ctx=='base': return True
    if 'prefers' in ctx: return False
    mx,mn=media_max(ctx),media_min(ctx)
    if mx is not None and w>mx: return False
    if mn is not None and w<mn: return False
    return True

def main():
    bad=0
    for page in PAGES:
        rel=os.path.relpath(page,ROOT)
        src=open(page,encoding='utf-8').read()
        sheets=SHEETS.get(rel,SHEETS['default'])
        rules=[]
        for s in sheets:
            p=os.path.join(ROOT,s)
            if os.path.exists(p): rules+=parse_css(open(p,encoding='utf-8').read())
        for m in re.finditer(r'<style[^>]*>(.*?)</style>',src,re.S):
            rules+=parse_css(m.group(1))

        # classes actually on this page, so we only judge live rules - and NOT
        # the ones no phone can reach. index.html carries a whole desktop
        # shell that is display:none below 767px, plus windows that are
        # display:none until openWin() shows them and nothing calls openWin on
        # mobile, plus #modal-bg which the 767px block hides outright. Judging
        # those against a 320px viewport produced 8 findings and all 8 were
        # unreachable content.
        dom=parse(page)
        unreachable=set()
        for n in dom.root.walk():
            host=None
            for a in [n]+list(n.ancestors()):
                if a.attrs.get('id') in ('app','modal-bg') or 'win' in a.cls():
                    host=a; break
            if host is not None: unreachable.update(n.cls()+[n.attrs.get('id','')])
        present=set()
        for n in dom.root.walk(): present.update(n.cls())
        txt=re.sub(r'<style[^>]*>.*?</style>','',src,flags=re.S)
        for mm in re.finditer(r'class\s*=\s*["\'`]([^"\'`]*)',txt+src):
            present.update(re.findall(r'[\w-]+',mm.group(1)))

        findings=[]
        for w in WIDTHS:
            # page padding at this width, from the outermost container
            pad=0
            for r in rules:
                if not applies(r.media,w): continue
                if r.sel in ('.cs-body','.wrap','#app'):
                    pm=re.search(r'padding:\s*([^;]+)',r.decls.get('padding','') or '')
                    v=r.decls.get('padding')
                    if v:
                        parts=re.findall(r'(\d+)px',v)
                        if len(parts)>=2: pad=int(parts[1])*2
                        elif parts: pad=int(parts[0])*2
            avail=w-pad
            for r in rules:
                if not applies(r.media,w): continue
                cls=re.findall(r'\.([\w-]+)',r.sel)
                ids=re.findall(r'#([\w-]+)',r.sel)
                if cls and not any(c in present for c in cls): continue
                if (cls or ids) and all(x in unreachable for x in cls+ids): continue
                for prop in ('width','min-width','grid-template-columns','flex-basis'):
                    v=r.decls.get(prop)
                    if not v or 'var(' in v: continue
                    if prop=='grid-template-columns':
                        fixed=[int(x) for x in re.findall(r'(?<![\w-])(\d{2,4})px',v)]
                        need=sum(fixed)
                        if need and need>avail:
                            findings.append((w,r.sel,prop,v.strip()[:44],need,avail))
                    else:
                        mm=re.match(r'\s*(\d{2,4})px\s*$',v)
                        if mm and int(mm.group(1))>avail:
                            findings.append((w,r.sel,prop,v.strip(),int(mm.group(1)),avail))
        if findings:
            seen=set(); out=[]
            for f in findings:
                k=(f[1],f[2])
                if k in seen: continue
                seen.add(k); out.append(f)
            print('\n### %s'%rel)
            for w,sel,prop,v,need,avail in out:
                bad+=1
                print('  at %dpx  %-34s %s:%s  needs %dpx, has %dpx'%(w,sel[:34],prop,v,need,avail))
        else:
            print('%-34s no fixed width exceeds the viewport at 320-430px'%rel)
    print('\noverflow risks: %d'%bad)
    return 1 if bad else 0

if __name__=='__main__': sys.exit(main())
