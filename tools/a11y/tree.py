"""Ancestor-path integrity: for every rule of the form `.a .b`, assert that
every element carrying `.b` really does have `.a` in its ancestor chain.

This exists because of a bug that cost three rounds. In cases/plugins a stray
</div> closed .vs-caps after the first caption, so the other three captions
were siblings of it rather than children. `.vs-caps .vs-cap-p` therefore
matched one paragraph out of four and the other three fell through to the
browser default - 16px, inherited black, no measure.

Tag balance was 0 unclosed / 0 extra the whole time, because an early close
and a late one cancel out. Brace counts, tag counters and a CSS linter all
passed. A tree walk is the only thing that sees it.

The signal to look for is a PARTIAL match: some elements with the class are
inside the ancestor and some are not. A rule matching nothing is usually just
dead CSS; a rule matching four out of five is a broken tree.
"""
import re,sys,os,collections
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from cascade import parse_css
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

def rules_for(page):
    out=[]
    for s in SHEETS.get(page,[]):
        out+=parse_css(open(os.path.join(ROOT,s),encoding='utf-8').read())
    src=open(os.path.join(ROOT,page),encoding='utf-8').read()
    for m in re.finditer(r'<style[^>]*>(.*?)</style>',src,re.S):
        out+=parse_css(m.group(1))
    return out

# Class names that mean "this element is in state X", not "this element is a
# container". `.on .vs-item-n` SHOULD match 1 of 4 - that is what a selected
# state is for. Treating those as broken trees buried the real finding under
# nine false ones the first time this ran.
STATE_WORDS={'on','active','open','closed','paused','playing','collapsed',
  'expanded','recording','show','shown','hidden','visible','invisible',
  'selected','current','loading','ready','error','done','disabled','dragging',
  'focus','hover','sticky','pinned','muted','dark','light','has-video','empty',
  'ready-state','share-copied','maximized','minimized','vid-active'}

def is_state(cls,js_text):
    if cls in STATE_WORDS: return True
    # anything JS adds or removes at runtime is a state, whatever it is called
    return bool(re.search(r"classList\.(add|remove|toggle|contains)\(\s*['\"]"
                          +re.escape(cls)+r"['\"]",js_text))

def check(page,verbose=False):
    b=parse(os.path.join(ROOT,page)); root=b.root
    js=open(os.path.join(ROOT,page),encoding='utf-8').read()
    for extra in ('src/main.js','cases/shared/case-study.js'):
        pth=os.path.join(ROOT,extra)
        if os.path.exists(pth): js+=open(pth,encoding='utf-8').read()

    by_class=collections.defaultdict(list)
    for n in root.walk():
        for c in n.cls(): by_class[c].append(n)

    findings=[]; checked=0; seen=set(); skipped=0
    for r in rules_for(page):
        sel=r.sel
        if any(ch in sel for ch in ('>','+','~',',','(')): continue
        parts=[p for p in sel.split() if p]
        if len(parts)<2: continue
        cls=[re.findall(r'\.([\w-]+)',p) for p in parts]
        if not all(cls): continue
        anc=cls[-2][-1]; desc=cls[-1][-1]
        if (anc,desc) in seen: continue
        seen.add((anc,desc))

        targets=by_class.get(desc) or []
        hosts=by_class.get(anc) or []
        if not targets or not hosts: continue

        if is_state(anc,js) or is_state(desc,js): skipped+=1; continue

        # A utility class - an icon font, a chip - legitimately appears under
        # many different containers. Scoping it is normal. The bug shape needs
        # a class that belongs to ONE container.
        parent_classes={tuple(sorted(n.parent.cls())) for n in targets if n.parent}
        if len(parent_classes)>2: skipped+=1; continue

        checked+=1
        inside=[n for n in targets if n.has_ancestor_class(anc)]
        outside=[n for n in targets if not n.has_ancestor_class(anc)]
        if not outside: continue
        if not inside:
            findings.append(('dead',anc,desc,0,len(targets),targets[:3]))
            continue

        # The signature of a stray close tag: the elements that fell out are
        # SIBLINGS of the container that should hold them. A genuine variant
        # elsewhere in the page would sit somewhere unrelated.
        host_parents={id(h.parent) for h in hosts if h.parent}
        orphan_siblings=[n for n in outside
                         if n.parent and id(n.parent) in host_parents
                         or (n.parent and n.parent.parent and id(n.parent.parent) in host_parents)]
        sev='BROKEN TREE' if orphan_siblings else 'partial'
        findings.append((sev,anc,desc,len(inside),len(targets),
                         (orphan_siblings or outside)[:3]))
    return checked,findings,skipped

if __name__=='__main__':
    bad=0
    for page in SHEETS:
        checked,f,skipped=check(page)
        broke=[x for x in f if x[0]=='BROKEN TREE']
        part =[x for x in f if x[0]=='partial']
        dead =[x for x in f if x[0]=='dead']
        status='OK' if not broke else f'{len(broke)} BROKEN TREE'
        print(f'{page:34} {checked:3} checked, {skipped:3} skipped (state/utility)   {status}')
        for kind,anc,desc,ins,tot,ex in broke:
            bad+=1
            print(f'    !! `.{anc} .{desc}` matches {ins}/{tot}, and the {tot-ins} that')
            print(f'       missed are SIBLINGS of .{anc} - the shape a stray </div> makes:')
            for n in ex: print(f'         line {n.line}: {n.path()[-96:]}')
        for kind,anc,desc,ins,tot,ex in part:
            print(f'    ?  `.{anc} .{desc}` matches {ins}/{tot}, the rest sit elsewhere '
                  f'(line {ex[0].line}) - probably a real variant')
        for kind,anc,desc,ins,tot,ex in dead:
            print(f'    -  `.{anc} .{desc}` matches 0/{tot} - dead CSS')
    print(f'\nbroken-tree findings: {bad}')
    sys.exit(1 if bad else 0)
