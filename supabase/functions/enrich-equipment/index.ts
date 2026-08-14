// DigitalPaani Maintenance Ops — enrich-equipment Edge Function
// Admin provides make + model (nameplate image optional; both feed the same
// pipeline). Claude searches manufacturer sources:
//   - multiple granular variants found (e.g. same model in 4.2KW and 5.5KW)
//       -> { status: "ambiguous", options: [...] }  (admin picks, call again with `variant`)
//   - exactly one confident match
//       -> { status: "match", data: { power, expected_life_years, parts[], sources[] } }
//   - nothing reliable -> { status: "not_found" }
//
// Deploy:   supabase functions deploy enrich-equipment
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//           (or Dashboard → Edge Functions → Secrets)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = (make: string, model: string, eqType: string, variant?: string) => `
You are an industrial equipment data specialist for a water/wastewater maintenance company in India.
Equipment: type "${eqType}", make "${make}", model "${model}"${variant ? `, confirmed variant "${variant}"` : ""}.

Search the web for the manufacturer's technical datasheet / catalogue for this exact equipment.

Respond with ONLY a JSON object (no prose, no markdown fences), using EXACTLY one of these shapes:

1. If you find MULTIPLE distinct variants of this make+model (different capacity, kW/HP rating, size, stage count) and no variant was specified:
{"status":"ambiguous","options":[{"variant":"<short distinguishing label e.g. 4.2 kW>","detail":"<one-line description>"}]}

2. If you identify EXACTLY ONE confident match (or the given variant):
{"status":"match","data":{
  "power":"<rating e.g. 4.2 kW, or empty string>",
  "expected_life_years":<number or null>,
  "parts":[{"name":"<part>","spec":"<specification e.g. bearing designation, size, material>","qty":<number>,"criticality":<1-10, 10 = failure stops the machine>}],
  "sources":["<url>", ...]
}}
List only parts you have real evidence for from the datasheet/manual (bearings, seals, impeller, motor, filters, belts, o-rings, wear parts). 3–12 parts. Do NOT invent specifications — if a part is standard for this equipment class but the exact spec is unknown, include the part with spec "".

3. If you cannot find reliable information for this make+model:
{"status":"not_found"}

Rules: never fabricate model variants or specs; prefer manufacturer domains; sources must be URLs you actually consulted.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!API_KEY) return json({ error: "not_configured", message: "ANTHROPIC_API_KEY secret is not set." }, 501);

  try {
    // Caller must be an authenticated Admin/Superadmin.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "missing authorization" }, 401);
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: prof } = await caller.from("profiles").select("role").eq("id", user.id).single();
    if (prof?.role !== "Admin" && prof?.role !== "Superadmin") return json({ error: "forbidden — admins only" }, 403);

    const { make, model, eqType, variant, imageBase64, imageMediaType } = await req.json();
    if (!make || !model) return json({ error: "make and model are required" }, 400);

    // Optional nameplate image rides along in the same pipeline (never overrides
    // the admin's make/model — it only adds evidence).
    const content: unknown[] = [];
    if (imageBase64) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: imageMediaType || "image/jpeg", data: imageBase64 },
      });
      content.push({ type: "text", text: "Nameplate photo of the equipment (supporting evidence only):" });
    }
    content.push({ type: "text", text: PROMPT(String(make), String(model), String(eqType || "equipment"), variant ? String(variant) : undefined) });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content }],
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return json({ error: "anthropic_error", message: errText.slice(0, 300) }, 502);
    }
    const result = await resp.json();

    // Take the final text block and parse the JSON out of it.
    const textBlocks = (result.content || []).filter((b: { type: string }) => b.type === "text");
    const raw = textBlocks.length ? textBlocks[textBlocks.length - 1].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return json({ status: "not_found", note: "unparseable model output" });
    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); } catch { return json({ status: "not_found", note: "invalid JSON from model" }); }
    if (!["ambiguous", "match", "not_found"].includes(parsed.status)) return json({ status: "not_found" });
    return json(parsed);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
