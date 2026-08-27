// DigitalPaani Maintenance Ops — invite-user Edge Function
// Admins invite anyone; service engineers invite the technicians they hire.
// Supabase emails the invite; the invitee sets their own password.
//
// Deploy:  supabase functions deploy invite-user
// (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);

    // Verify the caller and their role using their own JWT (RLS applies).
    const caller = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uerr } = await caller.auth.getUser();
    if (uerr || !user) return json({ error: "unauthorized" }, 401);

    const { data: prof } = await caller.from("profiles").select("role,status").eq("id", user.id).single();
    const callerRole = prof?.role;
    if (!["Admin", "Superadmin", "Engineer"].includes(callerRole ?? "")) {
      return json({ error: "forbidden" }, 403);
    }
    // A deactivated admin's JWT stays technically valid until it expires —
    // deactivation must close this door too, not just the database's.
    if ((prof?.status ?? "active") !== "active") return json({ error: "forbidden — account deactivated" }, 403);

    const { email, name, role, redirectTo } = await req.json();
    if (!email) return json({ error: "email required" }, 400);

    // Role ceiling by caller: Superadmin grants anything; Admin grants
    // Engineer or Technician; an Engineer can only ever invite a Technician.
    const requested = ["Admin", "Engineer", "Technician"].includes(role) ? role : "Engineer";
    const finalRole =
      callerRole === "Engineer" ? "Technician"
      : requested === "Admin" ? (callerRole === "Superadmin" ? "Admin" : "Engineer")
      : requested;

    // Service-role client performs the privileged invite; Supabase emails the link.
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name: name || "", role: finalRole },
      redirectTo: redirectTo || SUPABASE_URL,
    });
    if (error) return json({ error: error.message }, 400);

    // The profiles trigger always inserts role='Engineer' (it must never trust
    // client metadata). Set the real role here with the service client.
    if (data.user?.id) {
      await admin.from("profiles")
        .update({ role: finalRole, name: name || undefined })
        .eq("id", data.user.id);
      // A technician who was already a registry name (typed on past work
      // orders) gets linked, so their history follows them into the login.
      if (finalRole === "Technician" && name) {
        const { data: reg } = await admin.from("technicians")
          .select("id,user_id").ilike("name", name.trim()).limit(1).maybeSingle();
        if (reg && !reg.user_id) {
          await admin.from("technicians").update({ user_id: data.user.id }).eq("id", reg.id);
        } else if (!reg) {
          await admin.from("technicians").insert({ name: name.trim(), user_id: data.user.id, created_by: user.id });
        }
      }
    }

    return json({ ok: true, userId: data.user?.id, role: finalRole });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
