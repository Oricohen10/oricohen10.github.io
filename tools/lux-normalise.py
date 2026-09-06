#!/usr/bin/env python3
"""Turn the Token Sync export into what the variables browser loads.

Input:  cases/lux/data/lux-variables.raw.json  (Tokens Studio shape)
Output: cases/lux/data/collections.json        (index + the small collections)
        cases/lux/data/component-tokens.json   (1,114 rows, fetched on demand)

The export is single-mode with aliases as {dot.path} references. The whole
point of keeping those references is the primitive -> semantic -> component
chain, so this resolves each one FULLY and records the hop count, which is
what the browser shows when you click a row.
"""
import json,os,sys,re,collections

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,'cases','lux','data','lux-variables.raw.json')
ALIAS=re.compile(r'^\{([^}]+)\}$')

def leaves(node,path=()):
    if isinstance(node,dict):
        if 'value' in node and 'type' in node:
            yield path,node; return
        for k,v in node.items(): yield from leaves(v,path+(k,))

def main():
    raw=json.load(open(SRC,encoding='utf-8'))
    order=raw.get('$metadata',{}).get('tokenSetOrder') or [k for k in raw if k!='$metadata']

    # Index: dotted path -> LIST of (collection, value, type).
    # A list, not a single entry, because 11 names exist in two collections at
    # once - chips.text.navy is defined in both Color Semantics and Component
    # Tokens. Keying on the path alone let the Component Tokens copy overwrite
    # the Color Semantics one, and then {chips.text.navy} inside Component
    # Tokens resolved to itself and looked like a reference cycle. It is not a
    # cycle in the library; it was this index flattening two namespaces.
    index=collections.defaultdict(list); per_coll=collections.OrderedDict()
    rank={c:i for i,c in enumerate(order)}
    for coll in order:
        rows=[]
        for path,leaf in leaves(raw[coll]):
            dotted='.'.join(path)
            rows.append({'path':list(path),'value':leaf['value'],'type':leaf['type']})
            index[dotted].append((coll,leaf['value'],leaf['type']))
        per_coll[coll]=rows
    dupes={p:[c for c,_,_ in v] for p,v in index.items() if len(v)>1}

    # resolve alias chains
    def resolve(v,from_coll,seen=None):
        """-> (final_value, chain). from_coll is the collection the alias sits
        in, so a name that exists in two collections resolves to the OTHER one
        rather than to itself - which is how Figma resolves it, since a
        variable cannot alias itself."""
        seen=seen or []
        m=ALIAS.match(v) if isinstance(v,str) else None
        if not m: return v,seen
        target=m.group(1)
        if target in seen:
            return None,seen+[target+' (CYCLE)']
        cands=index.get(target)
        if not cands:
            return None,seen+[target+' (MISSING)']
        pick=[c for c in cands if c[0]!=from_coll] or cands
        pick.sort(key=lambda c: rank.get(c[0],99))   # lower layer wins
        coll,tv,_=pick[0]
        return resolve(tv,coll,seen+[target])

    broken=[]; cycles=[]; hops=collections.Counter()
    for coll,rows in per_coll.items():
        for r in rows:
            final,chain=resolve(r['value'],coll)
            r['chain']=chain
            r['resolved']=final
            hops[len(chain)]+=1
            if chain and final is None:
                (cycles if 'CYCLE' in chain[-1] else broken).append((coll,'.'.join(r['path']),chain))

    print(f'collections: {len(per_coll)}   variables: {sum(len(r) for r in per_coll.values())}')
    if dupes:
        print(f'\nnames defined in more than one collection: {len(dupes)}')
        for p,cs in list(dupes.items())[:15]: print(f'  {p:<34} {cs}')
        print('  (resolved to the lower layer, never to itself - see resolve())')
    for c,rows in per_coll.items(): print(f'  {c:20} {len(rows):>5}')
    print(f'\nalias chain length (0 = a raw value):')
    for k in sorted(hops): print(f'  {k} hop{"s" if k!=1 else " "}: {hops[k]:>5}')
    print(f'\nbroken references: {len(broken)}')
    for c,p,ch in broken[:12]: print(f'  {c} / {p}  ->  {" -> ".join(ch)}')
    print(f'cycles: {len(cycles)}')
    for c,p,ch in cycles[:6]: print(f'  {c} / {p}  ->  {" -> ".join(ch)}')

    if broken or cycles:
        print('\nNot writing output while references are unresolved.')
        return 1

    # ── write ──────────────────────────────────────────────────────────────
    def pack(rows):
        return [{'p':r['path'],'v':r['value'],'t':r['type'],
                 'r':r['resolved'],'c':r['chain']} for r in rows]
    out=os.path.join(ROOT,'cases','lux','data')
    heavy='Component Tokens'
    idx={'order':list(per_coll.keys()),
         'counts':{c:len(r) for c,r in per_coll.items()},
         'deferred':[heavy],
         'collections':{c:pack(r) for c,r in per_coll.items() if c!=heavy}}
    json.dump(idx,open(os.path.join(out,'collections.json'),'w'),separators=(',',':'))
    json.dump({'name':heavy,'rows':pack(per_coll[heavy])},
              open(os.path.join(out,'component-tokens.json'),'w'),separators=(',',':'))
    for f in ('collections.json','component-tokens.json'):
        print(f'  wrote {f}  ({os.path.getsize(os.path.join(out,f)):,} bytes)')
    return 0

if __name__=='__main__': sys.exit(main())
