#!/usr/bin/env python3
"""Inspect a Figma variables export of unknown shape and report what is in it.

Deliberately makes no assumptions about the format. Token Sync, Variables
Exporter, DTCG and Figma's own REST shape all nest differently, so guessing a
schema and writing an adapter against the guess would just produce an adapter
that fails on the real file. This walks whatever arrives and reports:

  - the nesting shape, by depth
  - every key name it sees, with counts, so the value/type/mode keys surface
  - how many leaves look like colours, numbers, strings
  - how many leaves are ALIASES vs resolved values  <- the important number

Caveat on that last number: a slash path is counted as alias-looking, and
variable NAMES are also slash paths ("blue/25"), so a REST-shaped export
inflates the alias count with its own names. Read it alongside the key list
below it - what matters is whether alias references exist at all, not the
exact count. Zero is the finding worth acting on.

Run:  python3 tools/lux-variables.py <file.json>
"""
import json,sys,re,collections

ALIAS_HINTS=('VARIABLE_ALIAS','aliasName','alias','$alias')
HEX=re.compile(r'^#(?:[0-9a-fA-F]{3,8})$')

def looks_alias(v):
    if isinstance(v,str):
        # {group.name} or a slash path like colour/system/red-100
        return bool(re.fullmatch(r'\{[^}]+\}',v.strip())) or ('/' in v and not HEX.match(v))
    if isinstance(v,dict):
        return any(h in json.dumps(v)[:200] for h in ALIAS_HINTS)
    return False

def main(path):
    raw=open(path,encoding='utf-8').read()
    print(f'file: {path}  ({len(raw):,} bytes)')
    try: data=json.loads(raw)
    except Exception as e:
        print(f'  NOT VALID JSON: {e}'); return 1

    keys=collections.Counter(); depths=collections.Counter()
    leaves=collections.Counter(); aliases=0; resolved=0
    samples=collections.defaultdict(list)

    def walk(node,depth=0,path=()):
        nonlocal aliases,resolved
        depths[depth]+=1
        if isinstance(node,dict):
            for k,v in node.items():
                keys[k]+=1
                if len(samples[k])<3 and not isinstance(v,(dict,list)):
                    samples[k].append(v)
                walk(v,depth+1,path+(k,))
        elif isinstance(node,list):
            for v in node[:400]: walk(v,depth+1,path+('[]',))
        else:
            if isinstance(node,str):
                leaves['hex' if HEX.match(node) else 'string']+=1
            elif isinstance(node,bool): leaves['bool']+=1
            elif isinstance(node,(int,float)): leaves['number']+=1
            elif node is None: leaves['null']+=1
            if looks_alias(node): aliases+=1
            elif isinstance(node,str) and HEX.match(node): resolved+=1

    walk(data)
    print(f'\ntop level: {type(data).__name__}', end='')
    if isinstance(data,dict): print(f' with {len(data)} keys: {list(data)[:10]}')
    elif isinstance(data,list): print(f' of {len(data)} items')
    print(f'\nnesting depth: {dict(sorted(depths.items()))}')
    print(f'\nleaf kinds: {dict(leaves)}')
    print(f'\nALIASES vs RESOLVED: {aliases:,} alias-looking / {resolved:,} bare hex')
    if aliases==0:
        print('  !! No aliases found. If this is a resolved/flattened export the')
        print('     primitive -> semantic -> component chain is gone, which is the')
        print('     one thing the browser cannot reconstruct. Re-export with')
        print('     aliases preserved.')
    print(f'\nkeys seen ({len(keys)} distinct), most common first:')
    for k,n in keys.most_common(40):
        s=', '.join(repr(x)[:26] for x in samples[k][:2])
        print(f'  {n:>6}  {k:<28} {s}')
    return 0

if __name__=='__main__':
    if len(sys.argv)<2: print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
