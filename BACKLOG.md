# Maintenance Ops — living backlog

The standing answer to "what's next". Updated whenever anything ships, is
found, or is decided. Nothing is ever silently "done" — it moves to the
bottom table with its version.

## Next up (in order — the top item is what gets built when Mihir says go)

| # | Item | Why it matters | Size |
|---|------|----------------|------|
| — | (empty — next items come from the field, or from the next adversarial sweep) | | |

## Waiting on the world (not on code)

| Item | Blocked on |
|------|-----------|
| Airplane-mode test of the offline outbox | Devid's phone |
| Devid's first real work week — the field's verdict on everything | Time |
| Cost-approval loop (design lives in the Field Ops Blueprint artifact) | Mihir + Amit decision; issues carry no cost history by choice |
| Oversight threshold values | Mihir + Amit discussion (per-admin setting shipped) |
| Customer Hub push (Phase 5) | The Hub's API |
| SendGrid domain authentication (3 DNS records) | Before engineers' emails switch on |

## Recently shipped (latest first)

| Version | What |
|---------|------|
| readiness check | `supabase/CHECK_monday_readiness.sql` — read-only pre-flight for Devid's first field week (account state, his Monday work list, live-test leftovers, storage) |
| guides r3 | All three role guides regenerated to cover SQL 46–51: honest-date bounds + late-entry label, the photo waiver and its review trail, the Oversight Photo storage card, the deactivation handover, and amendment reports ("Report new work"). Every button label in the PDFs verified verbatim against app.js |
| SQL 51 | Signature images join the storage sweep: an SR-* file is an orphan when no report's client_sign references it (24h guard kept). And the "bell lag" backlog item was VERIFIED NON-EXISTENT — route() re-renders the header after every scoped save and activity entries echo locally at insert; closed without shipping a phantom fix |
| v=106 / SQL 50 | Amendment reports: a signed visit day accepts an additional report covering only the uncovered jobs; delta content, chained coverage, amendment chips at review and in the report view |
| v=105 / SQL 49 | Silent no-op fixed: compiling over a client-signed report now refuses in plain words; mid-session deactivation signs out politely; outbox survives IndexedDB being unavailable (form stays open, entries intact) |
| v=104 / SQL 48 | Photo requirement toggleable on open jobs by engineers/admins; waivers recorded and shown at review |
| v=103 / SQL 47 | Storage meter + one-tap orphan clean-up on Oversight (free-tier visibility) |
| v=102 / SQL 46 | Honest dates: server-side bounds (no future, 30-day backdate cap), completed_recorded_at stamp, "recorded N days after the work" chip at review |
| v=101 / SQL 45 | Offline outbox: the technician field loop queues on the phone and replays safely |
| v=100 / SQL 44 | Deactivation handover: open assigned work must be reassigned or explicitly unassigned; DB-enforced |
| v=99 | hydrateCloud → scoped refreshes: a completion costs 2 row-fetches, not 14 table-fetches |
| v=98 | Plain-language pass: triage/resubmit/attestation/etc. gone from every screen, email, PDF |
| v=96–97 | Per-admin Oversight clocks + design-QA fixes (contrast, tap targets, photo-retry edge) |
| ≤ v=95 | Phases 1–4: technician tier, photos+review, issues, signed reports, overrides, WO numbers, holds, Oversight |

## QA sweep — 2026-08-30 (post-technician-tier, v77→v107)

Layers run: extended SQL harness (Mihir to execute), escaping scan, jargon
scan, render sweep incl. never-before-rendered branches, contrast math on new
UI. Findings, all fixed: the harness itself had rotted (46's date bounds
refused its 200-day-old fixtures); one "resubmit" survived the plain-language
pass; the outbox chip was white-on-amber-500 at ~2.1:1. Verified clean:
escaping across all 25 new render functions (two candidates were false
positives), the amendment Reports-tab branch with delta content, zero JS
errors across all pages/roles. The harness now also asserts: honest-date
bounds, the photo waiver's identity trail, the deactivation guard, and the
full amendment cycle — including the first-ever execution of the
partial-index ON CONFLICT. **Executed by Mihir 2026-08-30: 37/37 PASS.**

## Standing verification debts

Claims made and never yet witnessed by a human:
- The review photo gallery rendering on an engineer's screen (path proven end-to-end; pixels unseen)
- The client signature pad submitting for real (mechanics verified; submit deliberately never fired)
- The offline outbox against a genuinely dead network
