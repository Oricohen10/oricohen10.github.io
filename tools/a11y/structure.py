import re,sys,os,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import dom
from dom import parse,q
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

PAGES=['index.html','cases/plugins/index.html','cases/myverint/index.html',
       'cases/lux/index.html','cases/lux/viewer.html','cases/copilot/index.html',
       'cases/agent-factory/index.html','cases/_template.html']

findings=collections.defaultdict(list)
def rep(page,sev,code,msg):
    findings[page].append((sev,code,msg))

# Selectors whose role/tabindex/keydown are applied at runtime. Verified in
# src/main.js: patchWindowControls() sets role=button, tabindex=0, an
# aria-label derived from the class, and an Enter/Space handler on every .wc.
# A static scan cannot see that, and 21 phantom findings drowned the real ones.
RUNTIME_PATCHED = {'wc'}

# An onclick that only stops propagation is event plumbing, not an activation
# handler - .vlbx-inner had one purely so a click inside the dialog would not
# reach the backdrop's close handler.
import re as _re
def is_activation(n):
    for k in ('onclick','onmousedown','onmouseup'):
        v=n.attrs.get(k)
        if v is None: continue
        body=_re.sub(r'\s+','',v)
        if body in ('event.stopPropagation()','event.stopPropagation();',
                    'return false','return false;'): continue
        return k
    return None

def js_filled(page,n):
    """True when JS writes this element's content, so an empty node in the
    source is not an empty node on screen."""
    i=n.attrs.get('id')
    if not i: return False
    src=open(os.path.join(ROOT,page),encoding='utf-8').read()
    ext=''
    for extra in ('src/main.js','cases/shared/case-study.js'):
        pth=os.path.join(ROOT,extra)
        if os.path.exists(pth): ext+=open(pth,encoding='utf-8').read()
    hay=src+ext
    return bool(_re.search(r'getElementById\([\'"]'+_re.escape(i)+r'[\'"]\)',hay))

def hidden_branch(n):
    """Ancestor with display:none in an inline style, or one of the two
    mutually exclusive shells. #app and #mv are swapped by a media query
    (#app{display:none} under 767px, #mv{display:flex}), and display:none
    removes a subtree from the accessibility tree - so the second <h1> is
    never exposed at the same time as the first."""
    for a in [n]+list(n.ancestors()):
        st=a.attrs.get('style','')
        if 'display:none' in st.replace(' ',''): return True
        if a.attrs.get('id') in ('mv','app'): return a.attrs.get('id')
    return False

def acc_name(n):
    """Rough accessible name."""
    for a in ('aria-label','alt','title'):
        if n.attrs.get(a,'').strip(): return n.attrs[a].strip()
    if n.attrs.get('aria-labelledby','').strip(): return '<idref>'
    t=n.all_text().strip()
    if t: return t
    # icon font <i class="ph ph-x"> gives no name
    return ''

for page in PAGES:
    p=os.path.join(ROOT,page)
    b=parse(p); root=b.root
    src=open(p,encoding='utf-8').read()

    # --- 1. document ---
    html=next(q(root,'html'),None)
    if html is None or not html.attrs.get('lang'):
        rep(page,'A','lang','<html> has no lang attribute')
    vp=[n for n in q(root,'meta') if n.attrs.get('name')=='viewport']
    for v in vp:
        cont=v.attrs.get('content','')
        if 'user-scalable=no' in cont.replace(' ',''):
            rep(page,'A','zoom','viewport blocks pinch zoom (1.4.4)')
        m=re.search(r'maximum-scale\s*=\s*([\d.]+)',cont)
        if m and float(m.group(1))<2:
            rep(page,'A','zoom',f'maximum-scale={m.group(1)} caps zoom below 200% (1.4.4)')
    if not vp: rep(page,'AA','zoom','no viewport meta')
    if not next(q(root,'title'),None): rep(page,'A','title','no <title>')

    # --- 2. headings ---
    hs=[n for n in root.walk() if re.fullmatch(r'h[1-6]',n.tag or '')]
    h1=[h for h in hs if h.tag=='h1']
    shells={hidden_branch(h) for h in h1}
    if len(h1)>1 and shells=={'app','mv'}:
        rep(page,'note','h1',
            f'{len(h1)} <h1> in the source (lines {[h.line for h in h1]}) but one '
            'per shell: #app and #mv are swapped by display:none, which removes '
            'the other from the accessibility tree. Not a duplicate.')
        h1=h1[:1]
    if len(h1)==0: rep(page,'AA','h1','no <h1> on the page')
    elif len(h1)>1: rep(page,'AA','h1',f'{len(h1)} <h1> elements (lines {[h.line for h in h1]})')
    prev=0
    for h in hs:
        lvl=int(h.tag[1])
        if prev and lvl>prev+1:
            rep(page,'AA','h-order',
                f'line {h.line}: h{prev} -> h{lvl} skips a level ("{h.all_text().strip()[:44]}")')
        prev=lvl
    for h in hs:
        if not h.all_text().strip() and not h.attrs.get('aria-label') and not js_filled(page,h):
            rep(page,'A','h-empty',f'line {h.line}: empty <{h.tag}>')

    # --- 3. images ---
    for n in q(root,'img'):
        if 'alt' not in n.attrs:
            rep(page,'A','img-alt',f'line {n.line}: <img> with no alt attr ({n.attrs.get("src","?")[:52]})')
        if not n.attrs.get('width') or not n.attrs.get('height'):
            rep(page,'perf','img-dim',f'line {n.line}: <img> missing width/height ({n.attrs.get("src","?")[:52]})')
    for n in q(root,'svg'):
        if n.attrs.get('aria-hidden') or n.attrs.get('role') or n.attrs.get('aria-label'):
            continue
        # aria-hidden INHERITS. An svg inside <span aria-hidden="true"> is
        # already out of the accessibility tree, and demanding the attribute
        # again on the child is noise - the kind that buries real findings.
        if any(a.attrs.get('aria-hidden')=='true' for a in n.ancestors()):
            continue
        rep(page,'AA','svg',f'line {n.line}: <svg> with no role/aria-hidden')

    # --- 4. duplicate + dangling ids ---
    ids=collections.Counter(n.attrs['id'] for n in root.walk() if n.attrs.get('id'))
    for i,ct in ids.items():
        if ct>1: rep(page,'A','dup-id',f'id="{i}" used {ct} times')
    for n in root.walk():
        for attr in ('aria-labelledby','aria-describedby','aria-controls','for','aria-owns'):
            v=n.attrs.get(attr,'').strip()
            if not v: continue
            for ref in v.split():
                if ref not in ids:
                    rep(page,'A','idref',f'line {n.line}: {attr}="{ref}" points at no element')

    # --- 4b. controls wired up in JS rather than with an inline handler ---
    # The checker used to look only for onclick="" attributes, which meant a
    # div bound with addEventListener was invisible to it. That is how 14 nav
    # items on cases/lux/docs.html - divs with a click listener, no role, no
    # tabindex, no keyboard - passed a clean audit.
    js_all=src
    for extra in ('src/main.js','cases/shared/case-study.js'):
        pth=os.path.join(ROOT,extra)
        if os.path.exists(pth): js_all+=open(pth,encoding='utf-8').read()
    # selectors this page binds a click to
    bound=set()
    for m in re.finditer(r"querySelectorAll?\(\s*[`'\"]([^`'\"]+)[`'\"]\s*\)"
                         r"(?:[^;]{0,200}?)addEventListener\(\s*['\"]click", js_all, re.S):
        bound.add(m.group(1))
    for m in re.finditer(r"addEventListener\(\s*['\"]click[^;]{0,400}?closest\(\s*['\"]([^'\"]+)", js_all, re.S):
        bound.add(m.group(1))
    for sel in bound:
        cls=re.findall(r'\.([\w-]+)',sel)
        if not cls: continue
        for n in root.walk():
            if n.tag in ('button','a','input','select','textarea','summary'): continue
            if not all(c in n.cls() for c in cls): continue
            if n.attrs.get('aria-hidden')=='true': continue
            if any(c in RUNTIME_PATCHED for c in n.cls()): continue
            role=n.attrs.get('role','')
            if role in ('button','tab','link','menuitem','option'): continue
            if 'tabindex' in n.attrs and role: continue
            rep(page,'A','js-click',
                f'line {n.line}: <{n.tag} class="{" ".join(n.cls())}"> gets a click '
                f'listener via "{sel}" but is not a button and has no role/tabindex')

    # --- 5. interactive ---
    for n in root.walk():
        if n.tag=='#root': continue
        handler = is_activation(n)
        clickable = handler is not None
        role=n.attrs.get('role','')
        if any(c in RUNTIME_PATCHED for c in n.cls()): clickable=False
        if n.attrs.get('aria-hidden')=='true': clickable=False
        if (clickable and handler=='onmousedown' and 'onclick' not in n.attrs
                and n.tag not in ('button','a','input','summary')):
            # Drag only. Not an activation control, so role/tabindex/Enter are
            # the wrong remedy; the question is 2.5.7, handled separately.
            rep(page,'note','drag',
                f'line {n.line}: <{n.tag} class="{" ".join(n.cls())}"> is drag-only '
                f'(2.5.7 wants a single-pointer alternative)')
            clickable=False
        if clickable and n.tag not in ('button','a','input','summary','select','textarea'):
            if role not in ('button','link','tab','menuitem','option','switch','checkbox','radio'):
                rep(page,'A','click-role',f'line {n.line}: <{n.tag}> has onclick but role="{role or "none"}"')
            if 'tabindex' not in n.attrs and not n.attrs.get('disabled'):
                rep(page,'A','click-tab',f'line {n.line}: <{n.tag}> onclick but not focusable (no tabindex)')
            if 'onkeydown' not in n.attrs and 'onkeyup' not in n.attrs and 'onkeypress' not in n.attrs:
                rep(page,'A','click-key',f'line {n.line}: <{n.tag}> onclick with no keyboard handler')
        ti=n.attrs.get('tabindex')
        if ti and ti.strip().lstrip('+').isdigit() and int(ti)>0:
            rep(page,'AA','tabindex',f'line {n.line}: tabindex="{ti}" (positive) breaks natural order')
        if n.attrs.get('aria-hidden')=='true':
            for d in n.walk():
                if d.tag in ('a','button','input','select','textarea') or d.attrs.get('tabindex'):
                    rep(page,'A','hidden-focus',
                        f'line {n.line}: aria-hidden container holds focusable <{d.tag}> (line {d.line})')
                    break

    # --- 6. accessible names on controls ---
    for n in root.walk():
        if n.tag in ('button',) or n.attrs.get('role')=='button':
            if not acc_name(n) and not js_filled(page,n):
                rep(page,'A','name',f'line {n.line}: <{n.tag}> control has no accessible name')
        if n.tag=='a':
            href=n.attrs.get('href')
            if href is None:
                rep(page,'A','a-href',f'line {n.line}: <a> with no href is not focusable')
            elif not acc_name(n):
                rep(page,'A','name',f'line {n.line}: <a href="{href[:30]}"> has no accessible name')
            if n.attrs.get('target')=='_blank':
                rel=n.attrs.get('rel','')
                nm=acc_name(n).lower()
                if 'noopener' not in rel:
                    rep(page,'perf','blank-rel',f'line {n.line}: target=_blank without rel=noopener')
                if 'new tab' not in nm and 'new window' not in nm and not n.attrs.get('aria-label'):
                    rep(page,'AAA','blank-warn',f'line {n.line}: opens a new tab with no warning in the name ("{nm[:30]}")')

    # --- 7. form controls ---
    for n in root.walk():
        if n.tag in ('input','select','textarea'):
            if n.attrs.get('type') in ('hidden','submit','button','reset'): continue
            labelled = n.attrs.get('aria-label') or n.attrs.get('aria-labelledby') or \
                       (n.attrs.get('id') and any(l.attrs.get('for')==n.attrs['id'] for l in q(root,'label')))
            if not labelled:
                rep(page,'A','input-label',f'line {n.line}: <{n.tag}> has no label')

    # --- 8. landmarks ---
    has_main = any(n.tag=='main' or n.attrs.get('role')=='main' for n in root.walk())
    if not has_main and page!='cases/lux/viewer.html':
        rep(page,'AA','main','no <main> landmark')
    # skip link
    body_first_a=None
    for n in root.walk():
        if n.tag=='a' and n.attrs.get('href','').startswith('#'):
            body_first_a=n; break
    if page in ('index.html',) and (not body_first_a or 'skip' not in acc_name(body_first_a).lower()):
        rep(page,'AA','skiplink','no skip-to-content link')

    # --- 9. dialogs ---
    for n in q(root,'div',cls='win'):
        for a in ('role','aria-modal','aria-label'):
            if not n.attrs.get(a):
                rep(page,'A','dialog',f'line {n.line}: .win missing {a}')

    # --- 10. media ---
    for n in root.walk():
        if n.tag=='video':
            if 'autoplay' in n.attrs and 'muted' not in n.attrs:
                rep(page,'A','autoplay',f'line {n.line}: autoplay video is not muted (1.4.2)')
            if not n.attrs.get('aria-label') and not n.attrs.get('title'):
                rep(page,'AA','vid-name',f'line {n.line}: <video> has no accessible name')
            if 'controls' not in n.attrs and 'loop' in n.attrs and 'autoplay' in n.attrs:
                pass  # decorative loop, exempt from 1.4.2 if silent; checked below
            if 'muted' not in n.attrs and 'controls' not in n.attrs:
                rep(page,'A','vid-ctrl',f'line {n.line}: <video> with sound and no controls')

    # --- 11. list structure ---
    for n in root.walk():
        if n.tag in ('ul','ol'):
            bad=[ch.tag for ch in n.children if ch.tag not in ('li','script','template')]
            if bad: rep(page,'A','list',f'line {n.line}: <{n.tag}> has non-li children: {set(bad)}')

    # --- 12. reduced motion ---
    if re.search(r'@keyframes',src) and 'prefers-reduced-motion' not in src:
        rep(page,'AAA','motion','page defines @keyframes with no prefers-reduced-motion guard')

order={'A':0,'AA':1,'AAA':2,'perf':3,'note':4}
total=0
for page in PAGES:
    f=sorted(set(findings[page]),key=lambda x:(order[x[0]],x[1]))
    total+=len(f)
    print(f'\n=== {page}  ({len(f)} findings) ===')
    for sev,code,msg in f:
        print(f'  [{sev:4}] {code:12} {msg}')
print(f'\nTOTAL {total}')
