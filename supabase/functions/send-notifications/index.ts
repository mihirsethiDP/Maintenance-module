// DigitalPaani Maintenance Ops — send-notifications Edge Function
//
// Two modes:
//   digest  — one summary email per person per day (cron, 07:00 IST).
//             Skips anyone with nothing to report, so quiet days cost nothing.
//   urgent  — a single breakdown alert, sent the moment it is reported,
//             to the admins plus the engineers assigned to that plant.
//
// Recipients are computed from role + plant assignments, so an engineer
// only ever sees their own sites. Every send is recorded in email_log with
// a unique (day, kind, user) key, so retries and double-fires can't
// double-send.
//
// Deploy:   supabase functions deploy send-notifications
// Secrets:  SENDGRID_API_KEY  (required — nothing sends without it)
//           MAIL_FROM         e.g. "DigitalPaani Maintenance <support@ecoinnovision.com>"
//                             The address must be a verified sender (or sit on
//                             an authenticated domain) in the SendGrid account.
//           MAIL_REPLY_TO     optional. These are no-reply notifications, so
//                             normally leave it unset; set it only if you ever
//                             want replies routed somewhere real.
//           APP_URL           e.g. "https://mihirsethidp.github.io/Maintenance-module/"
//           CRON_SECRET       shared with 27_email_cron.sql
//
// Swapping providers: only sendMail() talks to SendGrid. Point it at
// SES/Postmark/Resend and nothing else changes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const istToday = () =>
  new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// MAIL_FROM accepts either "Name <a@b.com>" or a bare address.
function parseFrom(raw: string) {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { email: raw.trim() };
}

async function sendMail(to: string, subject: string, html: string) {
  const key = Deno.env.get("SENDGRID_API_KEY");
  if (!key) throw new Error("not_configured: SENDGRID_API_KEY is not set");
  // No default sender: SendGrid rejects any FROM that is not a verified
  // identity, so guessing one buys a 403 that reads like a code fault. Say
  // plainly that the secret is missing instead.
  const fromRaw = Deno.env.get("MAIL_FROM");
  if (!fromRaw) throw new Error("not_configured: MAIL_FROM is not set (must be a SendGrid verified sender)");
  const from = parseFrom(fromRaw);
  // The verified sender may belong to another mailbox entirely (SendGrid only
  // checks the FROM identity). MAIL_REPLY_TO points replies somewhere useful.
  const replyToRaw = Deno.env.get("MAIL_REPLY_TO");
  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from,
      ...(replyToRaw ? { reply_to: parseFrom(replyToRaw) } : {}),
      subject,
      content: [{ type: "text/html", value: html }],
      // Tags these in the company's existing SendGrid stats, so this tool's
      // volume is separable from everything else the account sends.
      categories: ["maintenance-ops"],
    }),
  });
  // SendGrid answers 202 Accepted on success; resp.ok covers 200-299.
  if (!resp.ok) {
    const text = await resp.text();
    let detail = text.slice(0, 200);
    try { detail = JSON.parse(text).errors?.[0]?.message || detail; } catch { /* keep raw */ }
    throw new Error(`mail_failed ${resp.status}: ${detail}`);
  }
}

const APP = () => Deno.env.get("APP_URL") || "https://mihirsethidp.github.io/Maintenance-module/";

function shell(title: string, intro: string, sections: string, footer: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;color:#1e293b">
    <div style="background:#193458;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
      <div style="font-size:16px;font-weight:600">DigitalPaani Maintenance Ops</div>
      <div style="font-size:12px;opacity:.75">${esc(title)}</div>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px 20px">
      <p style="font-size:14px;margin:0 0 14px">${intro}</p>
      ${sections}
      <p style="margin:20px 0 0"><a href="${APP()}" style="background:#193458;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-size:13px;display:inline-block">Open the tool</a></p>
      <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;border-top:1px solid #eef2f7;padding-top:10px">
        <b style="color:#64748b">This mailbox is not monitored — please do not reply.</b><br/>${footer}
      </p>
    </div>
  </div>`;
}

function table(heading: string, color: string, rows: string[][]) {
  if (!rows.length) return "";
  return `<div style="margin:0 0 16px">
    <div style="font-size:13px;font-weight:600;color:${color};margin:0 0 6px">${esc(heading)} (${rows.length})</div>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px">
      ${rows.map((r) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eef2f7">${esc(r[0])}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eef2f7;color:#64748b">${esc(r[1])}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eef2f7;color:#64748b;white-space:nowrap">${esc(r[2])}</td>
      </tr>`).join("")}
    </table>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const isCron = !!CRON_SECRET && req.headers.get("x-cron-key") === CRON_SECRET;

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Callers: the cron, or a signed-in ACTIVE admin (test send / breakdown alert).
  let callerId: string | null = null;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await caller.from("profiles").select("role,status").eq("id", user.id).single();
    if ((prof?.status ?? "active") !== "active") return json({ error: "forbidden — account deactivated" }, 403);
    if (prof?.role !== "Admin" && prof?.role !== "Superadmin") return json({ error: "forbidden — admins only" }, 403);
    callerId = user.id;
  }

  if (!Deno.env.get("SENDGRID_API_KEY")) {
    return json({ error: "not_configured", message: "SENDGRID_API_KEY is not set — nothing was sent." }, 501);
  }

  const body = await req.json().catch(() => ({}));
  const mode: string = body.mode || "digest";
  const day = istToday();

  // ---- Who can see what -------------------------------------------------
  const { data: people, error: peopleErr } = await db.from("profiles")
    .select("id,name,email,role,status,email_digest,email_urgent,oversight_thresholds");
  if (peopleErr) {
    return json({ error: "db_error", message: "reading profiles: " + peopleErr.message }, 500);
  }
  const active = (people || []).filter((p) =>
    (p.status ?? "active") === "active" && p.email && p.email.includes("@"));

  const { data: assigns, error: assignErr } = await db.from("plant_assignments").select("user_id,plant_id");
  if (assignErr) {
    return json({ error: "db_error", message: "reading plant_assignments: " + assignErr.message }, 500);
  }
  const plantsOf = (userId: string, role: string, allPlantIds: string[]) =>
    (role === "Admin" || role === "Superadmin")
      ? allPlantIds
      : (assigns || []).filter((a) => a.user_id === userId).map((a) => a.plant_id);

  const { data: plants, error: plantErr } = await db.from("plants").select("id,name");
  if (plantErr) {
    return json({ error: "db_error", message: "reading plants: " + plantErr.message }, 500);
  }
  const allPlantIds = (plants || []).map((p) => p.id);
  const plantName = (id: string) => (plants || []).find((p) => p.id === id)?.name || id;

  const { data: equipment, error: eqErr } = await db.from("equipment")
    .select("id,tag,plant_id,status").limit(5000);
  if (eqErr) {
    return json({ error: "db_error", message: "reading equipment: " + eqErr.message }, 500);
  }
  const eqById = (id: string) => (equipment || []).find((e) => e.id === id);

  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  // A silent skip is useless when email won't send -- record the reason for
  // every recipient we pass over, and hand it back to the caller.
  const why: Array<{ email: string; reason: string }> = [];
  const skip = (email: string, reason: string) => { skipped.push(email); why.push({ email, reason }); };

  const record = async (kind: string, userId: string, email: string, subject: string,
                        status: string, detail?: string) => {
    await db.from("email_log").insert({ sent_on: day, kind, user_id: userId, email, subject, status, detail });
  };
  // Claim first: the unique (day, kind, user) index makes a duplicate insert
  // fail, which is exactly how we guarantee one email per person per day.
  // Returns null when claimed, otherwise the reason it could not be.
  const claim = async (kind: string, userId: string, email: string, subject: string) => {
    const { error } = await db.from("email_log")
      .insert({ sent_on: day, kind, user_id: userId, email, subject, status: "sending" });
    if (!error) return null;
    const msg = String(error.message || error);
    if (/duplicate key|unique/i.test(msg)) return "already_sent_today";
    if (/does not exist|relation .* does not exist|schema cache/i.test(msg)) {
      return "email_log table missing -- run supabase/26_email_notifications.sql";
    }
    return "could not write email_log: " + msg.slice(0, 160);
  };
  const finish = async (kind: string, userId: string, status: string, detail?: string) => {
    await db.from("email_log").update({ status, detail }).eq("sent_on", day).eq("kind", kind).eq("user_id", userId);
  };

  // ================= URGENT: one breakdown, straight away =================
  if (mode === "urgent") {
    const logId: string = body.logId;
    if (!logId) return json({ error: "logId required for urgent mode" }, 400);
    const { data: log } = await db.from("maintenance_logs")
      .select("id,equipment_id,reason,start_date,etr,technician,notes,severity,priority")
      .eq("id", logId).single();
    if (!log) return json({ error: "work-order not found" }, 404);
    const e = eqById(log.equipment_id);
    if (!e) return json({ error: "equipment not found" }, 404);

    const subject = `Breakdown: ${e.tag} at ${plantName(e.plant_id)}`;
    const html = shell(
      "Breakdown reported",
      `<b>${esc(e.tag)}</b> at <b>${esc(plantName(e.plant_id))}</b> has been reported as broken down.`,
      `<table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr><td style="padding:5px 0;color:#64748b;width:130px">Reported</td><td>${esc(log.start_date)}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b">Expected back</td><td>${esc(log.etr || "—")}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b">Severity</td><td>${esc(log.severity || "—")} · priority ${esc(log.priority || "Normal")}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b">Technician</td><td>${esc(log.technician || "—")}</td></tr>
        <tr><td style="padding:5px 0;color:#64748b;vertical-align:top">What happened</td><td>${esc(log.notes || "—")}</td></tr>
      </table>`,
      "You receive breakdown alerts because they cannot wait for the daily summary. An admin can turn them off for you on the Team page.",
    );

    for (const p of active) {
      if (!p.email_urgent) { skip(p.email, "breakdown alerts switched off"); continue; }
      const scope = plantsOf(p.id, p.role, allPlantIds);
      if (!scope.includes(e.plant_id)) { skip(p.email, "not assigned to this plant"); continue; }
      const kind = `urgent:${logId}`;
      const blocked = await claim(kind, p.id, p.email, subject);
      if (blocked) { skip(p.email, blocked); continue; }
      try { await sendMail(p.email, subject, html); await finish(kind, p.id, "sent"); sent.push(p.email); }
      catch (err) {
        await finish(kind, p.id, "failed", String(err).slice(0, 300));
        failed.push(p.email); why.push({ email: p.email, reason: String(err).slice(0, 200) });
      }
    }
    return json({ mode, day, sent: sent.length, skipped: skipped.length, failed: failed.length,
                  recipients: sent, why });
  }

  // ================= DIGEST: one summary per person per day ===============
  const { data: openLogs, error: logErr } = await db.from("maintenance_logs")
    .select("id,equipment_id,reason,start_date,etr,technician,wo_state,notes,hold_until")
    .is("end_date", null);
  if (logErr) {
    return json({ error: "db_error", message: "reading maintenance_logs: " + logErr.message }, 500);
  }

  // ---- Records the accountability section reports on. Each read is
  // OPTIONAL: a project that has not run the Phase 2/3 migrations yet must
  // still get its daily digest, so a failure here degrades the section
  // rather than the email.
  const { data: pendingLogs } = await db.from("maintenance_logs")
    .select("id,equipment_id,wo_no,technician,wo_state,end_date,submitted_at")
    .in("wo_state", ["submitted", "returned"]);
  const { data: openIssues } = await db.from("wo_issues")
    .select("id,equipment_id,description,created_at").eq("status", "open");
  const { data: liveReports } = await db.from("service_reports")
    .select("id,plant_id,visit_date,technician_name,status,updated_at")
    .in("status", ["submitted", "eng_signed"]);

  // Calendar days between an ISO timestamp and today, in IST terms.
  const ageDays = (ts: unknown) => {
    if (!ts) return 0;
    const then = Date.parse(String(ts).slice(0, 10) + "T00:00:00Z");
    const now = Date.parse(day + "T00:00:00Z");
    return Number.isFinite(then) ? Math.max(0, Math.round((now - then) / 864e5)) : 0;
  };
  // Defaults mirror the Oversight page; each admin's own saved clocks
  // (profiles.oversight_thresholds) override them, so the email agrees with
  // what that admin sees on screen.
  const AGE_DEFAULTS = { review: 2, returned: 2, issue: 7, clientSign: 14 };
  const ageFor = (p: Record<string, unknown>) => {
    const mine = (p.oversight_thresholds ?? {}) as Record<string, unknown>;
    const cfg: Record<string, number> = { ...AGE_DEFAULTS };
    for (const k of Object.keys(AGE_DEFAULTS)) {
      const v = parseInt(String(mine[k] ?? ""), 10);
      if (Number.isFinite(v)) cfg[k] = Math.min(90, Math.max(1, v));
    }
    return cfg;
  };

  // Build the admin-only "needs a nudge" rows, scoped per recipient below.
  const stuckFor = (scope: string[], AGE: Record<string, number>) => {
    const rows: string[][] = [];
    for (const l of pendingLogs || []) {
      const e = eqById(l.equipment_id as string);
      if (!e || !scope.includes(e.plant_id as string)) continue;
      const submitted = String(l.wo_state) === "submitted";
      const d = ageDays(submitted ? (l.submitted_at || l.end_date) : l.end_date);
      if (d < (submitted ? AGE.review : AGE.returned)) continue;
      rows.push([
        `${e.tag}${l.wo_no ? " \u00b7 " + l.wo_no : ""}`,
        submitted ? "awaiting engineer review" : `sent back to ${l.technician || "technician"}`,
        `${d}d`,
      ]);
    }
    for (const i of openIssues || []) {
      const e = eqById(i.equipment_id as string);
      if (!e || !scope.includes(e.plant_id as string)) continue;
      const d = ageDays(i.created_at);
      if (d < AGE.issue) continue;
      rows.push([`${e.tag} \u2014 ${String(i.description || "").slice(0, 40)}`, "issue reported, no decision yet", `${d}d`]);
    }
    for (const r of liveReports || []) {
      if (!scope.includes(String(r.plant_id))) continue;
      const d = ageDays(r.updated_at);
      const submitted = String(r.status) === "submitted";
      if (d < (submitted ? AGE.review : AGE.clientSign)) continue;
      rows.push([
        `${plantName(String(r.plant_id))} \u00b7 ${r.visit_date}`,
        submitted ? "report awaiting engineer signature" : `client signature outstanding (${r.technician_name || "technician"})`,
        `${d}d`,
      ]);
    }
    return rows.sort((a, b) => parseInt(b[2]) - parseInt(a[2])).slice(0, 15);
  };

  const targets = mode === "test" && body.userId
    ? active.filter((p) => p.id === body.userId)
    : active.filter((p) => p.email_digest);

  // A test aimed at somebody who never reaches the loop needs explaining.
  if (mode === "test" && body.userId && !targets.length) {
    const raw = (people || []).find((x) => x.id === body.userId);
    why.push({
      email: raw?.email || "(unknown)",
      reason: !raw ? "no profile row for that id"
        : !raw.email ? "no email address on their profile"
        : (raw.status ?? "active") !== "active" ? "account is deactivated"
        : "profile did not qualify",
    });
  }

  for (const p of targets) {
    const scope = plantsOf(p.id, p.role, allPlantIds);
    if (!scope.length) { skip(p.email, "no plants assigned"); continue; }

    const mine = (openLogs || []).filter((l) => {
      const e = eqById(l.equipment_id);
      return e && scope.includes(e.plant_id);
    });
    const row = (l: Record<string, unknown>) => {
      const e = eqById(l.equipment_id as string)!;
      return [e.tag as string, plantName(e.plant_id as string), String(l.etr || l.start_date || "")];
    };
    // A held job is honestly waiting on the world — not overdue, not noise —
    // until its check-back date passes. A plan scheduled for a future day is
    // not "ready" yet: far-future plans must not keep the daily email firing.
    const onHold = (l: Record<string, unknown>) => l.hold_until && String(l.hold_until) >= day;
    const overdue = mine.filter((l) => !onHold(l) && l.etr && String(l.etr) < day).map(row);
    const dueToday = mine.filter((l) => !onHold(l) && String(l.etr) === day).map(row);
    const ready = mine.filter((l) => !onHold(l) && l.wo_state === "open"
      && String(l.start_date) <= day && (!l.etr || String(l.etr) > day)).map(row);

    // Admins get the accountability section; engineers already see their own
    // queue in the tables above and do not need to be told about themselves.
    const isBoss = p.role === "Admin" || p.role === "Superadmin";
    const stuck = isBoss ? stuckFor(scope, ageFor(p)) : [];

    const nothingOutstanding = !overdue.length && !dueToday.length && !ready.length && !stuck.length;
    // The real digest stays silent on quiet days. A TEST must still arrive --
    // its job is to prove delivery, not to report work.
    if (nothingOutstanding && mode !== "test") { skip(p.email, "nothing outstanding today"); continue; }

    const isTest = mode === "test";
    const subject = isTest
      ? `Test — maintenance summary delivery works`
      : overdue.length
        ? `${overdue.length} overdue · ${dueToday.length} due today — maintenance summary`
        : (!dueToday.length && !ready.length && stuck.length)
          ? `${stuck.length} item${stuck.length === 1 ? "" : "s"} waiting on someone — maintenance summary`
          : `${dueToday.length} due today · ${ready.length} upcoming — maintenance summary`;

    const intro = isTest
      ? `This is a test send${p.name ? " for " + esc(p.name.split(" ")[0]) : ""}. If you are reading it, email delivery is working.` +
        (nothingOutstanding
          ? ` Right now there is no overdue, due-today or scheduled work across your ${scope.length} plant${scope.length === 1 ? "" : "s"}, so a real digest would stay silent — that is by design.`
          : ` Below is your live position across ${scope.length} plant${scope.length === 1 ? "" : "s"}.`)
      : `Good morning${p.name ? " " + esc(p.name.split(" ")[0]) : ""} — here is where your maintenance stands across ${scope.length} plant${scope.length === 1 ? "" : "s"}.`;

    const html = shell(
      isTest ? `Test send · ${day}` : `Daily summary · ${day}`,
      intro,
      table("Overdue", "#b91c1c", overdue) +
      table("Due today", "#b45309", dueToday) +
      table("Scheduled, not started", "#193458", ready) +
      table("Waiting on someone", "#7c3aed", stuck),
      isTest
        ? "Sent from the Team page by an administrator to check email delivery. Real digests arrive at 07:00 and only when there is something outstanding."
        : "One email a day, and none at all on days with nothing outstanding. An admin can turn this off for you on the Team page.",
    );

    const kind = mode === "test" ? `digest-test:${Date.now()}` : "digest";
    const blocked = await claim(kind, p.id, p.email, subject);
    if (blocked) { skip(p.email, blocked); continue; }
    try { await sendMail(p.email, subject, html); await finish(kind, p.id, "sent"); sent.push(p.email); }
    catch (err) {
      await finish(kind, p.id, "failed", String(err).slice(0, 300));
      failed.push(p.email); why.push({ email: p.email, reason: String(err).slice(0, 200) });
    }
  }

  return json({
    mode, day, sent: sent.length, skipped: skipped.length, failed: failed.length,
    recipients: sent, why,
    // Counts make an empty result self-explaining instead of mysterious.
    debug: {
      profilesRead: (people || []).length,
      withUsableEmail: active.length,
      requestedUserId: body.userId || null,
      matchedTarget: targets.length,
      plants: allPlantIds.length,
      equipment: (equipment || []).length,
      openWorkOrders: (openLogs || []).length,
    },
  });
});
