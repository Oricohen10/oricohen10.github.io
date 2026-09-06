"""Minimal DOM builder with correct implicit-close handling, so ancestor
paths are real rather than inferred from tag balance."""
from html.parser import HTMLParser

VOID={'area','base','br','col','embed','hr','img','input','link','meta',
      'param','source','track','wbr'}
# elements that auto-close when a new one of certain types starts
AUTO={'li':{'li'},'p':{'p','div','ul','ol','table','section','h1','h2','h3','h4','h5','h6','blockquote','pre','figure','hr'},
      'option':{'option','optgroup'},'td':{'td','th','tr'},'th':{'td','th','tr'},
      'tr':{'tr'},'thead':{'tbody','tfoot'},'tbody':{'tbody','tfoot'}}

class Node:
    __slots__=('tag','attrs','children','parent','line','text')
    def __init__(self,tag,attrs=None,parent=None,line=0):
        self.tag=tag; self.attrs=attrs or {}; self.children=[]
        self.parent=parent; self.line=line; self.text=''
    def cls(self):
        return (self.attrs.get('class') or '').split()
    def path(self):
        out=[];n=self
        while n and n.tag!='#root':
            sel=n.tag
            cl=n.cls()
            if cl: sel+='.'+'.'.join(cl)
            out.append(sel); n=n.parent
        return ' > '.join(reversed(out))
    def ancestors(self):
        n=self.parent
        while n:
            yield n; n=n.parent
    def has_ancestor_class(self,c):
        return any(c in a.cls() for a in self.ancestors())
    def walk(self):
        yield self
        for ch in self.children:
            yield from ch.walk()
    def all_text(self):
        s=self.text
        for ch in self.children: s+=ch.all_text()
        return s

class Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root=Node('#root'); self.stack=[self.root]
        self.unclosed=[]; self.stray=[]
    def handle_starttag(self,tag,attrs):
        a={k:(v if v is not None else '') for k,v in attrs}
        # implicit close
        while len(self.stack)>1:
            top=self.stack[-1].tag
            if top in AUTO and tag in AUTO[top]:
                self.stack.pop()
            else: break
        n=Node(tag,a,self.stack[-1],self.getpos()[0])
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)
    def handle_startendtag(self,tag,attrs):
        a={k:(v if v is not None else '') for k,v in attrs}
        n=Node(tag,a,self.stack[-1],self.getpos()[0])
        self.stack[-1].children.append(n)
    def handle_endtag(self,tag):
        if tag in VOID: return
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                for j in range(len(self.stack)-1,i,-1):
                    self.unclosed.append((self.stack[j].tag,self.stack[j].line))
                del self.stack[i:]
                return
        self.stray.append((tag,self.getpos()[0]))
    def handle_data(self,d):
        if self.stack[-1] is not self.root:
            self.stack[-1].text+=d

def parse(path):
    b=Builder(); b.feed(open(path,encoding='utf-8').read()); return b

def q(root,tag=None,cls=None,pred=None):
    for n in root.walk():
        if n.tag=='#root': continue
        if tag and n.tag!=tag: continue
        if cls and cls not in n.cls(): continue
        if pred and not pred(n): continue
        yield n
