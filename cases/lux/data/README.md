# cases/lux/data

Drop the Token Sync export in this folder. Any filename, any shape - the
inspector reads it and reports what it found:

```bash
python3 tools/lux-variables.py cases/lux/data/<your-file>.json
```

## What the browser needs from the export

Not a format, a set of facts. If they are in the file under any structure,
the adapter can get at them:

| needed | why |
|---|---|
| collection name | the left rail: Colors Primitives, Color Semantics, Component Tokens, Size Primitives, Size Semantics, Typography |
| group path | the nested tree: `blue`, `azure/light_mode`, `alpha` |
| variable name | the row: `25`, `50`, `100` |
| type | COLOR renders a swatch, FLOAT renders a number, STRING renders text |
| value **per mode** | primitives look single-mode, semantics have Light and Dark - the table needs one column per mode, however many there are |
| **aliases kept as references** | the one thing that must not be flattened. See below. |

## Aliases are the whole point

A resolved export gives `#F2F8FF` and throws away that the semantic token
*points at* `blue/25`. That reference IS the three-layer architecture the
case study argues for - 96 primitives feeding 251 semantics feeding 1,115
component tokens. Without it the panel is a list of hex codes and the claim
is unevidenced.

So: `{blue.25}` or `{"type":"VARIABLE_ALIAS","id":"..."}` or
`colour/system/red-100` - any of these is fine. A bare `#F2F8FF` where an
alias should be is not.

## It is a snapshot, not a feed

The page is static on GitHub Pages with no Figma credentials, and the
Variables REST API needs an Enterprise full seat, which this account does
not have. So the data is a committed export, refreshed by re-running the
plugin and re-running the adapter. The panel will say so rather than imply
it is live.
