#!/usr/bin/env python3
"""Run every check. Non-zero exit if anything fails."""
import subprocess,sys,os
HERE=os.path.dirname(os.path.abspath(__file__))
CHECKS=[('contrast','text contrast, both themes, at rest'),
        ('states','contrast in :hover / :active / :focus'),
        ('structure','landmarks, headings, names, roles, keyboard'),
        ('tree','ancestor-path integrity'),
        ('mobile','fixed widths against a 320-430px viewport')]
fail=0
for mod,desc in CHECKS:
    print(f'\n{"="*72}\n{mod}.py - {desc}\n{"="*72}')
    r=subprocess.run([sys.executable,os.path.join(HERE,mod+'.py')],
                     capture_output=True,text=True)
    print(r.stdout.rstrip())
    if r.stderr.strip(): print(r.stderr.rstrip(),file=sys.stderr)
    if r.returncode: fail+=1
print(f'\n{"="*72}\n{"FAILED: "+str(fail)+" check(s)" if fail else "all checks passed"}')
sys.exit(1 if fail else 0)
