# DigitalPaani Maintenance Ops — Developer Guide

How the system is built, how to change it safely, and the traps that have
already bitten us once. Read this before touching anything.

---

## 1. Architecture in one screen

```
GitHub Pages (static)                      Supabase (project agkdhkolqisulbgwzktt)
┌─────────────────────────┐               ┌──────────────────────────────────────┐
│ index.html              │  supabase-js  │ Postgres + RLS  ← the security       │
│ app.js        (~7k loc) │ ────────────► │   boundary                           │
│ tailwind.css  (static)  │               │ SECURITY DEFINER RPCs + guard        │
│ sw.js  (PWA shell cache)│               │   triggers                           │
│ supabase-config.js      │               │ Storage: wo-media (private,          │
└─────────────────────────┘               │   signed URLs)                       │
   phone: PWA install +                   │ Edge Functions: send-notifications,  │
   IndexedDB outbox                       │   invite-user                        │
                                          │ pg_cron: daily digest 07:00 IST      │
                                          └──────────────────────────────────────┘
```

- **No build step for the app itself.** `app.js` is one file: template-string
  rendering, hash routing, global functions wired via `onclick`. There is no
  framework, no bundler, no npm install.
- **The client is untrusted.** Every rule that matters is enforced by RLS
  policies, SECURITY DEFINER RPCs, and guard triggers. The UI hides buttons as
  a courtesy; the database refuses as the law.

## 2. Repository map

| Path | What it is |
|---|---|
| `index.html` | Shell, script/style tags with cache-busting `?v=` params |
| `app.js` | The entire application |
| `tailwind.css` | **Generated** — never edit by hand (see §4) |
| `tailwind.config.js`, `tw-input.css` | Tailwind build inputs |
| `sw.js` | Service worker (`mm-shell-v3`); caches shell + fonts only |
| `supabase/NN_*.sql` | Numbered migrations, run manually in the SQL Editor, in order |
| `supabase/TEST_field_service_flow.sql` | The test harness (see §6) |
| `supabase/functions/` | Edge Functions (Deno) |
| `docs/build-role-guides.py` | Generates the three role-guide PDFs |
| `tools/check-css-fresh.py` | Guard: fails if tailwind.css is stale (see §4) |
| `BACKLOG.md` | The living backlog — update it with every ship, find, or decision |

## 3. The change workflow

1. Edit `app.js` (and `index.html` if structure changes).
2. If you added/removed any Tailwind class: rebuild CSS (§4).
3. Run `python tools/check-css-fresh.py` — must pass.
4. Bump the version params in `index.html`: `app.js?v=N+1`, and
   `tailwind.css?v=M+1` only if the CSS changed. **Without the bump, users
   keep the cached old file and your change silently doesn't ship.**
5. If schema/RPC changes: write the next-numbered `supabase/NN_*.sql`. Every
   migration ends with a self-verifying `select`. Migrations are run by hand
   in the Supabase SQL Editor — the file must be idempotent
   (`create or replace`, `if not exists`, `drop policy if exists` first).
6. Extend `TEST_field_service_flow.sql` if you touched the field loop, and run it.
7. If anything user-visible changed: update the role guides (§7) and `BACKLOG.md`.
8. Commit and push to `main` — GitHub Pages deploys automatically.
   Branch `stable-pre-technician-tier` is the long-term revert point.

## 4. CSS: static Tailwind, never the CDN

Tailwind ships as a **prebuilt static file**. History: the Play CDN was
poisoned once by a cached opaque response and every utility class died in
production. Do not reintroduce it.

Rebuild after any class change:

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i tw-input.css -o tailwind.css --minify
```

`tools/check-css-fresh.py` rebuilds to a temp file and diffs — it has caught
missing classes three times. Run it before every commit that touches `app.js`.

Service-worker rules that keep this safe: `sw.js` only caches responses with
`resp.ok` (opaque responses allowed for Google Fonts hosts only), and external
script tags carry `crossorigin="anonymous"`. Bump the cache name
(`mm-shell-vN`) when shell files change shape.

## 5. Database conventions

- **Roles:** `profiles.role` ∈ Superadmin/Admin/Engineer/Technician. Helpers:
  `my_role()`, `is_admin()`, `is_active()`, `has_plant_access()`. Technicians
  have **no plant assignments** — their read/write access derives from
  `maintenance_logs.assigned_to`.
- **Work-order state:** `wo_state ∈ open|active|submitted|returned|done`
  (check constraint). Numbers `WO-YYYY-NNNN` come from a trigger +
  `wo_counters`; never assign them client-side.
- **Writes go through RPCs.** Tables with lifecycle rules
  (`service_reports`, sensitive `profiles` transitions) have no direct
  insert/update policies — all writes are SECURITY DEFINER functions that
  validate, then act.
- **Guard triggers and the service-context bypass.** Guards start with
  `if auth.uid() is null then return ...` so the SQL Editor / cron (service
  context) can do maintenance. Rule: *maintenance utilities* may bypass;
  *app-facing RPCs must not* — they check
  `auth.uid() is not null and not is_admin()` style conditions deliberately.
- **Honest dates (migration 46):** completions can't be future-dated or more
  than 30 days back, can't predate the job's start; `completed_recorded_at`
  stamps when the row was actually saved.
- **Reports:** content hash uses the built-in `sha256(convert_to(...))` —
  **not pgcrypto** (`digest()` lives in the `extensions` schema and breaks
  under `set search_path = public`). A `signed` report is immutable and
  undeletable, trigger-enforced. Amendments use the partial unique index
  `... where status <> 'signed'` with a matching `ON CONFLICT` clause.
- **Storage:** bucket `wo-media` is private; the app renders signed URLs.
  SQL **cannot delete** `storage.objects` (Supabase's `protect_delete`
  trigger) — deletion happens via the Storage API; orphan sweep functions
  only *list* and the app deletes. Photo paths are deterministic
  (`{logId}/{n}.jpg` style) with a unique index, so offline replays can't
  duplicate.
- **Secrets:** pg_cron reads the function secret from `private_config`
  (RLS-locked, zero policies). Never inline secrets in a scheduled command.
- Watch: `sum(bigint)` returns `numeric` — cast `::bigint` when the function
  signature says bigint.

## 6. Testing

`supabase/TEST_field_service_flow.sql` is a 37-assertion harness covering the
full field loop: assignment boundaries, state machine, photos and waivers,
issues, holds, report signature order and locking, honest-date bounds,
deactivation handover, amendments.

- It impersonates users via
  `set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true)`.
- It ends with a deliberate `raise exception 'TEST RESULTS...'` so
  **everything rolls back** — safe to run against production data.
- Build result lines with `array_append(res, ...)`, not `res || 'text'`
  (the latter parses as an array literal and dies).
- Fixtures use relative dates (`today - 20`) — migration 46's bounds killed
  the old 200-day fixtures; keep fixtures inside real-world constraints.
- Run it after any change to the field loop. All 37 must pass.

Client-side verification: the app is exercised live in the browser (roles
impersonated by signing in as each account). No JS test framework exists —
the harness guards the rules that matter because the database is the boundary.

## 7. Role guides

`python docs/build-role-guides.py` regenerates all three PDFs (reportlab).
House rules:

- Regenerate with **every user-visible change** — a stale guide is a bug.
- Every button label quoted in a guide must exist **verbatim** in `app.js`
  (check with pypdf text extraction; remember the app writes `&amp;` in HTML).
- Plain language, same standard as the app (§9).

## 8. App-side conventions

- **Escaping:** every user-originated string interpolated into HTML goes
  through `esc()`. No exceptions — the PPM import preview XSS came from
  skipping this.
- **Data refresh:** `CLOUD_FETCHERS` maps named datasets to fetchers.
  `hydrateCloud(only)` refreshes a subset; `refreshLogRows(ids)` /
  `refreshEquipmentRows(ids)` refresh single rows. Hot paths (completing a
  job, review actions) use scoped refreshes; full hydrate is reserved for
  boot, reconnect, imports, and admin bulk operations.
- **Offline outbox:** IndexedDB `mm-outbox` stores queued field actions with
  photo Blobs. Replay re-fetches server state first and treats
  "already applied" as success. Only the technician field loop queues —
  don't extend it to admin actions without designing conflict handling.
- **Photos:** `compressPhoto` → max 1600px JPEG before upload. Keep it —
  free-tier storage is a product constraint.
- **effRole:** role checks go through `effRole`/`isTechnician`, not raw
  `profile.role` string comparisons scattered around.

## 9. House rules (non-negotiable)

1. **Plain language.** No UI/email/PDF word a plant operator would have to
   ask about. Test every new string: would Devid know what this means?
2. **Never declare done.** Update `BACKLOG.md` with every ship, find, or
   decision; end each delivery by naming the next item.
3. **Verify before fixing.** Confirm a suspected bug in code/data before
   changing anything — two past "obvious bugs" were already handled.
4. **Signed records are sacred.** Nothing may edit or delete a client-signed
   report, ever. Corrections are new documents.
5. **The database is the boundary.** A rule enforced only in `app.js` is not
   enforced.

## 10. Environment gotchas (each has bitten once)

- **Windows + git:** `.gitattributes` marks PDFs/images binary — required, or
  autocrlf corrupts them. New binary types must be added there.
- **Bash heredocs mangle backslashes** on this machine — write patch scripts
  with a real file write, not `python - <<'PY'` when the payload contains
  `\u` escapes. `app.js` contains literal `—` and `·` characters, not escapes.
- **SQL Editor shows only the last statement's result** — multi-check scripts
  must fold everything into one `union all` query.
- **Supabase Edge Functions:** redeploy after any change; "Verify JWT" is off
  for the cron-called function (it verifies its own secret instead).
- Cache busting is manual (`?v=`) — forgetting it is the #1 "my change didn't
  ship" cause.

## 11. Deploy & operations

- **Deploy:** push to `main` → GitHub Pages. No pipeline, no approvals.
- **Migrations:** pasted into the Supabase SQL Editor by the operator, in
  number order. Each file self-verifies at the bottom.
- **Cron:** `daily-email-digest` at 07:00 IST (`30 1 * * *` UTC) calls the
  `send-notifications` Edge Function with the secret from `private_config`.
  Debug via `cron.job_run_details` and `net._http_response`.
- **Email:** SendGrid, single verified sender; domain authentication is
  parked until engineers' emails switch on.
- **Storage health:** Oversight → Photo storage card; orphan clean-up has a
  24-hour guard so in-flight uploads are never swept.
