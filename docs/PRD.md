# DigitalPaani Maintenance Ops — Product Requirements

**Status:** Live and in production use · **Owner:** Mihir Sethi · **Last updated:** 2026-08-30

---

## 1. What this product is

A maintenance operations tool for companies that service industrial equipment
across many client sites — built first for DigitalPaani's water-treatment-plant
operations, designed from day one to be sellable as a standalone product to any
field-service organization.

It keeps a register of every machine across every plant, drives preventive and
breakdown maintenance through assigned work orders, records the work with
photos and co-signed service reports, and shows management exactly who is
holding what up.

**One sentence:** the system of record for field maintenance — what needs
doing, who did it, proof it was done, and accountability when it stalls.

## 2. The problem

Field maintenance across distributed sites runs on memory, phone calls, and
paper. The consequences:

- Preventive maintenance is skipped until machines break down.
- Nobody can prove what a technician actually did at a client site.
- Clients dispute service visits; there is no signed record.
- Problems technicians notice ("this bearing is going") die undocumented.
- Management discovers stalled work weeks late, if at all.
- Knowledge lives in one person's head and leaves with them.

## 3. Users and roles

Four roles, enforced in the database (not just the screen):

| Role | Who | What they do |
|---|---|---|
| **Technician** | Field staff (e.g. Devid) | Sees only **My Work**: executes assigned jobs, closes them with notes and photos, reports bad parts, raises service reports, collects the client's signature. Roams — no plant assignment; access derives from assigned jobs. Cannot create work orders. |
| **Engineer** | Site owners (e.g. Sunny, Swadesh) | Owns assigned plants: registers equipment, creates and assigns work orders, reviews technician work, decides on reported issues, places holds, co-signs reports, invites technicians. |
| **Admin** | Operations head (e.g. Amit) | Everything, everywhere: all plants, Dashboard, the Oversight accountability page, imports, team management, plus all engineer powers. |
| **Superadmin** | Tool owner | Admin powers plus granting the Admin role. |

Invitation ceiling: each role can only invite roles below it.

## 4. Core product principles

1. **The machine never waits on paperwork.** Completing a job returns the
   equipment to service immediately; review is about the record.
2. **Records are honest or they are worthless.** Completion dates are bounded
   (no future, max 30 days back); late entries are labelled "recorded N days
   after the work"; signed reports are immutable forever; corrections are new
   documents, never edits.
3. **Plain language.** No word on any screen, email, or PDF that a plant
   operator would have to ask about. ("Send back", not "reject"; "Check back
   on", not "ETA".)
4. **Accountability without nagging.** Stuck work surfaces automatically on
   Oversight and in the daily email, on clocks each admin tunes for
   themselves. Silence means all clear.
5. **The field is offline.** Every field action a technician takes must
   survive a dead network.
6. **Security lives in the database.** Row-level security and guard triggers
   are the boundary; the UI is a convenience on top.

## 5. Feature requirements (shipped)

### 5.1 Equipment and plants
- Plant and equipment register; equipment names auto-composed from Make + Model.
- Bulk import of a whole site's equipment + PPM schedule from a spreadsheet,
  with preview and duplicate detection.
- Printable QR stickers per machine; scanning opens that machine instantly.
- Status model: Operational / In Maintenance / Broken Down, with fleet KPI cards.
- Per-machine full history, issues strip, and PPM checklists.

### 5.2 Work orders
- Created by engineers/admins or generated automatically from the PPM schedule.
- Human-readable numbers (`WO-2026-0147`), assigned to a technician, with an
  optional (default for breakdowns: mandatory) photo-evidence requirement.
- Lifecycle: **open → active → submitted → returned → done**, with a
  one-step "Complete now" for small jobs.
- Photo evidence: client-side compression to ~1600px JPEG, uploaded to private
  storage, served by signed URL.
- Photo waiver: engineers can flip a job to "Photos: optional" (and back);
  waivers carry the waiver's identity and show at review.
- Reassignment (with open-load counts), engineer/admin overrides, and
  "Close as-is" for records a technician never fixed.

### 5.3 Review loop
- Completed technician work lands in the engineer's **To review** queue.
- Approve / Send back (with a note the technician sees at the top of My Work) /
  Reassign / Close as-is.
- Review cards show notes, the photo gallery, the "recorded N days after the
  work" chip, and any photo waiver.

### 5.4 Issues (found problems)
- Anyone can report a part needing **service, repair, or replacement** on any
  machine — during job close-out or standalone.
- Engineers decide: **Schedule work** (prefilled work order, linked back),
  **Handled**, or **Dismiss with a mandatory reason**.
- Open issues stay pinned to the machine and feed the service report, so the
  client sees what was found.

### 5.5 Holds
- A job honestly blocked on the world (vendor, shutdown window, site access,
  approval) is put **on hold** with a category and a **check-back date** —
  explicitly a "when I'll chase it" date, not a delivery promise.
- Holds pause the overdue clock; passed check-backs surface on Oversight;
  extension counts are visible (3+ extensions is flagged as a vendor problem).

### 5.6 Service reports
- One report per technician per plant per day: jobs, notes, photos, issues found.
- Three signatures in enforced order: **technician → engineer → client**
  (drawn on the technician's phone; name and title typed).
- Every signature stamps a SHA-256 fingerprint of the content. The client's
  signature **locks the report forever**.
- Engineer fast path: approving the last job of a visit offers
  "Create & sign report" in one press; missed prompts wait in
  **Visits ready for a report**.
- Rework loop: engineer can request changes before signing.
- **Amendments:** work approved after the client signed re-qualifies the day;
  the additional report covers only the new jobs and links to the original.

### 5.7 Oversight (admin accountability page)
- Counters and item lists for: unreviewed work, returned-and-untouched jobs,
  issues with no decision, outstanding client signatures, passed check-backs —
  oldest first, every row a link.
- Per-engineer and per-technician load, including 30-day close counts.
- **Adjust the clocks:** per-admin thresholds for what counts as "too long",
  used by this page *and* that admin's daily email.
- Photo-storage meter with one-tap orphan **Clean up** (24-hour safety guard).

### 5.8 Notifications
- In-app bell: overdue, due today, awaiting review, reported issues, awaiting
  signatures — every entry a link.
- Daily 07:00 IST email digest per opted-in user: overdue / due / scheduled
  plus a "Waiting on someone" section using the recipient's own clocks.
  Nothing outstanding → no email.
- Breakdown alerts sent the moment a machine is reported broken down.
- Email on/off is a per-person setting controlled by admins.

### 5.9 Offline (technician field loop)
- The app installs to the phone (PWA) and the shell is cached.
- Start, complete, resubmit, and report-issue queue locally (IndexedDB,
  photos included) when the network is dead, and replay safely on reconnect —
  replay re-checks server state so double-sends cannot corrupt records.
- An orange "Waiting for signal" chip shows what is queued; queued items can
  be inspected and discarded.

### 5.10 Team management
- Email invitations with role ceilings; per-person plant assignment
  (engineers only — technicians roam).
- Technician name registry: inviting a technician whose field name already
  exists links their pre-login history automatically.
- Schedule PDF generation per person and period.
- **Deactivation with handover:** an account with open assigned work cannot be
  deactivated until that work is reassigned or explicitly returned to the
  engineers — database-enforced. Mid-session deactivation signs the user out.

### 5.11 Role guides
- Three PDF guides (Technician / Engineer / Admin) generated from source and
  regenerated with every user-visible change; button labels verified verbatim
  against the app.

## 6. Non-goals (deliberately parked)

| Item | Why parked | Where the design lives |
|---|---|---|
| Cost tracking & approval thresholds | Deferred by decision ("not focusing on money now"); cost history intentionally starts at zero when built | Field Ops Blueprint artifact |
| Customer Hub push | The Hub has no API yet | Backlog |
| Health scores, parts lists | Switched off for simplicity; today's records feed them retroactively | In schema, disabled |
| SendGrid domain authentication | Needed only before engineers' emails switch on | Backlog |
| Native mobile apps | PWA covers the field need | — |

## 7. Success measures

- **Adoption:** every real job flows through the tool (no side-channel WhatsApp
  work orders).
- **Proof:** every client visit ends in a co-signed, locked report.
- **Early warning:** issues reported per week (found problems are wins, not noise).
- **Accountability:** Oversight stuck-item counts trend to zero; digest goes quiet.
- **Field truth:** the first real work week (starting 2026-09-01) is the
  acceptance test — friction reported by the technician is the top of the backlog.

## 8. Constraints

- Free-tier Supabase: 1 GB storage budget (hence compression, the storage
  meter, and orphan clean-up), pg_cron + Edge Functions for the digest.
- Static hosting (GitHub Pages): no server-side rendering; all authorization
  in the database.
- Users include non-native English speakers on low-end Android phones in
  plants with no signal: plain language, small payloads, offline-first field loop.
