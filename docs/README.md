# Documentation

## Role guides — the current set

Three PDFs, one per person who uses the tool. Share the one that matches the role:

| Guide | For | Pages |
|---|---|---|
| `DigitalPaani-Maintenance-Ops-Technician-Guide.pdf` | Field technicians (My Work, photos, reports, client signature) | 6 |
| `DigitalPaani-Maintenance-Ops-Engineer-Guide.pdf` | Service engineers (assigning, reviewing, co-signing, scheduling) | 6 |
| `DigitalPaani-Maintenance-Ops-Admin-Guide.pdf` | Administrators (Dashboard, Oversight, team, imports) | 6 |

The Quick reference on each guide's last page is designed to be printed and pinned up.

### Regenerating them

All three are generated from one script — edit the script, never the PDFs:

```bash
pip install reportlab
python docs/build-role-guides.py
```

It reads `logo.png` from the repo root and writes all three PDFs back into `docs/`.
Regenerate on **every user-visible change**, and check that every button label the
guides quote still exists verbatim in `app.js`.

## Superseded — do not share

These predate the technician tier (Aug 2026) and describe a tool where engineers did
the work themselves: no technician role, no My Work, no review loop, no co-signed
service reports, no scheduling. Kept only for history; `build-role-guides.py`
replaces both.

- `DigitalPaani-Maintenance-Ops-User-Guide.pdf` (+ `build-user-guide.py`)
- `DigitalPaani-Maintenance-Ops-Simple-Guide.pdf` (+ `build-simple-guide.py`)

## Product documents

- `PRD.md` — what the product is, who it serves, every shipped feature, what is parked
- `DEVELOPMENT.md` — architecture, the change workflow, database conventions, traps
