# -*- coding: utf-8 -*-
"""Is tailwind.css up to date with the classes app.js and index.html actually use?

tailwind.css is a BUILD ARTIFACT committed to the repo (the Play CDN compiler
was removed because a poisoned service-worker cache entry killed every utility
class on plant Wi-Fi). The failure mode that replaced it is quieter: add a class
in app.js, forget to rebuild, and that one class silently does nothing in
production. It happened - w-16/h-16/object-cover shipped missing, so photo
thumbnails rendered at full size.

This rebuilds into a temp file and compares. Run it before committing any change
to app.js or index.html:

    python tools/check-css-fresh.py

Exit 0 = fresh. Exit 1 = stale, rebuild with:

    npx tailwindcss@3.4.17 -c tailwind.config.js -i tw-input.css -o tailwind.css --minify
"""
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILT = os.path.join(ROOT, 'tailwind.css')

if not os.path.exists(BUILT):
    print('FAIL: tailwind.css is missing entirely.')
    sys.exit(1)

tmp = os.path.join(tempfile.gettempdir(), 'tailwind-check.css')
cmd = ['npx', '-y', 'tailwindcss@3.4.17', '-c', 'tailwind.config.js',
       '-i', 'tw-input.css', '-o', tmp, '--minify']
proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, shell=(os.name == 'nt'))
if not os.path.exists(tmp):
    print('FAIL: could not run the Tailwind build.')
    print(proc.stderr[-800:])
    sys.exit(1)

fresh = open(tmp, encoding='utf-8').read()
current = open(BUILT, encoding='utf-8').read()

if fresh == current:
    print('OK: tailwind.css matches the source (%d bytes).' % len(current))
    sys.exit(0)

print('STALE: tailwind.css does not match what the source needs.')
print('  committed: %d bytes' % len(current))
print('  rebuilt:   %d bytes' % len(fresh))
# Name the classes that are missing, since that is what actually breaks.
import re
sel = re.compile(r'\.((?:\\.|[A-Za-z0-9_\-\[\]/:%.])+)(?=[\s,{:>+~\[])')
missing = sorted(set(sel.findall(fresh)) - set(sel.findall(current)))
if missing:
    print('  classes present in a fresh build but MISSING from the committed file:')
    for c in missing[:40]:
        print('    .' + c)
    if len(missing) > 40:
        print('    ... and %d more' % (len(missing) - 40))
print('\nRebuild with:')
print('  npx tailwindcss@3.4.17 -c tailwind.config.js -i tw-input.css -o tailwind.css --minify')
sys.exit(1)
