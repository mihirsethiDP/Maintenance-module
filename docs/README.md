# Documentation

## User guide

`DigitalPaani-Maintenance-Ops-User-Guide.pdf` — a 6-page how-to guide for engineers
and administrators. Share this with new users; the Quick reference (last page) is
designed to be printed and pinned up.

### Regenerating it

The PDF is generated from `build-user-guide.py`, so edit that script (not the PDF)
whenever the tool changes:

```bash
pip install reportlab
python docs/build-user-guide.py
```

It reads `logo.png` from the repo root and writes the PDF back into `docs/`.
