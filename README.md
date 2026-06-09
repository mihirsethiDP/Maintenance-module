# Maintenance Mode

A static, client-side prototype of a **Maintenance Mode** UI for industrial equipment installed on plants — pumps, blowers, filters, centrifuges, UV systems. Built for plant managers and field service engineers.

**Live demo:** https://mihirsethidp.github.io/Maintenance-module/

## What's in it

- **Dashboard** — live KPI cards (Total / Operational / In Maintenance / Broken Down) that act as click-to-filter chips, plus an "out of service" table with overdue-status pills.
- **Equipment** — every asset across all plants. Filter by plant, type, or search. Inline action button (Put in Maintenance / Mark Operational).
- **Equipment detail** — per-asset card with full maintenance history timeline, Edit, Export (Excel / PDF), and current action.
- **Maintenance Log** — complete audit trail with plant / type / reason / status / technician / search / date-range filters. Service Report generator (Filtered or All scope) with **Preview** + **Download**. Excel / PDF export.
- **Engineering Corner** — service-engineer workspace:
  - **Pending** — ongoing maintenance and overdue PPM
  - **Upcoming PPM** — next 30 days of scheduled service from the planned PPM map
  - **Visit Reports** — completed work grouped by visit date with quick date filters (Today / Last 24h / Last 7d / Last 30d / Custom) and sign-off PDF generation
- **Plants** — per-plant **Notifications** modal with per-event recipient autocomplete (Email / SMS / WhatsApp / Call) and an admin **Import PPM** flow that ingests a planned-maintenance Excel and seeds equipment + slot map + historic logs.
- **Guide Me tour** — floating Help button bottom-right opens a guided tour for either Engineer or Manager role, with multi-lingual voice-over (English / हिन्दी / Español) via the Web Speech API.

## Tech

- Static HTML + Tailwind (CDN config with brand palette `#193458`) + vanilla JS — no build step
- SheetJS for Excel parse and export
- jsPDF + autotable for PDF generation
- `localStorage` for persistence; versioned keys reseed on schema changes

## Deploy

GitHub Pages from `main` / root. Files: `index.html`, `app.js`.

```powershell
git add .
git commit -m "your change"
git push
```

## Reset

Click "Reset demo data" in the header to wipe all `localStorage` and reseed.
