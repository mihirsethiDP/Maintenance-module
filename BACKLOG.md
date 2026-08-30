# Maintenance Ops — living backlog

The standing answer to "what's next". Updated whenever anything ships, is
found, or is decided. Nothing is ever silently "done" — it moves to the
bottom table with its version.

## Next up (in order — the top item is what gets built when Mihir says go)

| # | Item | Why it matters | Size |
|---|------|----------------|------|
| 1 | Amendment reports — a second report for a visit day whose report is already client-signed | Today the engineer gets a plain refusal (49); a late job on a signed day currently has no reportable home | Medium |
| 2 | Bell refresh on scoped saves | The bell can lag one action behind after a hot-path save; self-heals on full sync | Small |
| 3 | Sweep for orphaned `SR-*` signature images | The storage clean-up deliberately excludes them; a failed client-sign RPC after upload leaves a tiny PNG forever | Small |

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

## Standing verification debts

Claims made and never yet witnessed by a human:
- The review photo gallery rendering on an engineer's screen (path proven end-to-end; pixels unseen)
- The client signature pad submitting for real (mechanics verified; submit deliberately never fired)
- The offline outbox against a genuinely dead network
