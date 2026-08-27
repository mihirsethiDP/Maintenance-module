// ---------- Seed data ----------
// Plants + equipment + PPM slots come from seed-data.js (generated from All_Sites_PPM_Schedule.xlsx).
const SEED_PLANTS = (window.SEED_PLANTS_DATA || []).map((p, i) => ({
  id: p.id, name: p.name, location: p.location || '',
  notifications: defaultNotifConfig(
    i % 3 === 0 ? { maintenance:['email'], breakdown:['email','whatsapp','sms'], operational:[], overdue:['email','whatsapp'] }
    : i % 3 === 1 ? { maintenance:['email'], breakdown:['email','sms'], operational:[], overdue:['email'] }
    : { maintenance:[], breakdown:['email','whatsapp'], operational:[], overdue:['email','sms'] }
  ),
}));
function defaultNotifConfig(prefs = {}) {
  const make = (ch, recips) => ({ enabled: (ch||[]).length > 0, channels: ch || [], recipients: recips || (ch && ch.length ? ['U-1'] : []) });
  return {
    maintenance: make(prefs.maintenance, prefs.maintenanceTo),
    breakdown:   make(prefs.breakdown,   prefs.breakdownTo),
    operational: make(prefs.operational, prefs.operationalTo),
    overdue:     make(prefs.overdue,     prefs.overdueTo),
  };
}
const CHANNELS = ['email','sms','whatsapp','call'];

// roles: 'Superadmin' (owner) > 'Admin' (power user, manages engineers) > 'Engineer' (field access).
// password is a mock, plaintext, prototype-fallback credential only — real auth is Supabase.
const SEED_USERS = [
  { id: 'U-1', name: 'Mihir Sethi', role: 'Superadmin', email: 'mihir.sethi@digitalpaani.com', phone: '+91 90000 10000', password: 'admin123', status: 'active' },
];

// Equipment + PPM slots from seed-data.js (generated from All_Sites_PPM_Schedule.xlsx).
const SEED_EQUIPMENT = (window.SEED_EQUIPMENT_DATA || []).map(e => ({ ...e }));
const SEED_SLOTS = window.SEED_SLOTS_DATA || {};
const PPM_NOTES = {
  Pump:       { sched: 'Monthly PPM — vibration, leak and seal check.',  done: 'Bearings greased, alignment verified, no abnormalities.' },
  Blower:     { sched: 'Weekly PPM — oil and filter inspection.',         done: 'Oil level normal, intake filter cleaned.' },
  Filter:     { sched: 'Monthly PPM — media inspection / backwash check.', done: 'Backwash performed; differential pressure within limits.' },
  Centrifuge: { sched: 'Monthly PPM — bowl and scroll inspection.',       done: 'Bowl cleaned; vibration normal.' },
  'UV System':{ sched: 'Monthly PPM — lamp intensity and quartz sleeve.', done: 'Quartz sleeve cleaned; intensity within spec.' },
  Motor:      { sched: 'Monthly PPM — winding, bearing and insulation check.', done: 'Insulation resistance normal; bearings greased.' },
  Mixer:      { sched: 'Monthly PPM — gearbox oil and shaft check.',      done: 'Oil level normal; shaft seal intact.' },
  Screen:     { sched: 'Monthly PPM — mesh and rake inspection.',         done: 'Mesh cleaned; rake mechanism free.' },
  'Screw Press':{ sched: 'Monthly PPM — screw and drive inspection.',     done: 'Screw wear within limits; drive lubricated.' },
  Fan:        { sched: 'Monthly PPM — impeller and bearing check.',       done: 'Impeller balanced; bearings greased.' },
  Decanter:   { sched: 'Monthly PPM — bowl and scroll inspection.',       done: 'Bowl cleaned; vibration normal.' },
};
const PPM_DEFAULT = { sched: 'Scheduled PPM — inspection and servicing.', done: 'Inspected and serviced; operating normally.' };

// Checklist template fallbacks (mirrors supabase/10_checklists.sql seed).
// Real mode overrides these from the checklist_templates table.
const DEFAULT_CHECKLISTS = {
  Pump: [
    { text: 'Isolate power and lock out before starting', mandatory: true },
    { text: 'Check for leaks at seals and glands', mandatory: true },
    { text: 'Grease bearings / check lubrication', mandatory: true },
    { text: 'Check vibration and abnormal noise', mandatory: true },
    { text: 'Verify coupling alignment', mandatory: false },
    { text: 'Restore power and verify normal operation', mandatory: true },
  ],
  Blower: [
    { text: 'Isolate power and lock out before starting', mandatory: true },
    { text: 'Check oil level and top up if needed', mandatory: true },
    { text: 'Clean / replace intake air filter', mandatory: true },
    { text: 'Check vibration, temperature and noise', mandatory: true },
    { text: 'Restore power and verify airflow', mandatory: true },
  ],
  Other: [
    { text: 'Isolate equipment safely before working', mandatory: true },
    { text: 'Perform scheduled service as per manual', mandatory: true },
    { text: 'Restore and verify normal operation', mandatory: true },
  ],
};
let cloudChecklists = null;   // eq_type -> items[] (real mode)
function checklistFor(eqType) {
  if (cloudChecklists && cloudChecklists[eqType]) return cloudChecklists[eqType];
  return DEFAULT_CHECKLISTS[eqType] || DEFAULT_CHECKLISTS.Other;
}

// A small set of illustrative open work-orders so the Dashboard / Pending views show live activity.
function buildSeedOpenLogs(equipment) {
  const NOW = new Date(today() + 'T00:00:00');
  const d = (off) => { const x = new Date(NOW); x.setDate(x.getDate() + off); return dstr(x); };
  const TECHS = ['Mihir Sethi'];
  const specs = [
    { pi: 1,  kind:'Breakdown', off:-4, etr:3,  notes:'Bearing failure on drive end; replacement bearing awaited.' },
    { pi: 3,  kind:'Scheduled', off:-2, etr:1,  notes:'Scheduled overhaul — mechanical seal and wear ring replacement.' },
    { pi: 5,  kind:'Breakdown', off:-7, etr:-1, notes:'Motor winding burnt; sent for rewinding.' },
    { pi: 8,  kind:'Scheduled', off:-1, etr:2,  notes:'Belt tensioning and coupling alignment.' },
    { pi: 10, kind:'Breakdown', off:-3, etr:4,  notes:'High vibration; gearbox inspection in progress.' },
    { pi: 13, kind:'Scheduled', off:-2, etr:0,  notes:'Impeller inspection and greasing.' },
    { pi: 16, kind:'Breakdown', off:-6, etr:-2, notes:'Seal leak; unit isolated pending spares.' },
    { pi: 19, kind:'Scheduled', off:-1, etr:3,  notes:'Oil change and intake filter replacement.' },
  ];
  const logs = []; let seq = 0;
  specs.forEach(s => {
    const pid = 'PL-' + String(s.pi + 1).padStart(2,'0');
    const eq = equipment.find(e => e.plantId === pid && (e.type === 'Pump' || e.type === 'Blower'));
    if (!eq) return;
    eq.status = s.kind === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
    logs.push({ id:'L-OPEN-'+(++seq), equipmentId: eq.id, reason: s.kind, startDate: d(s.off), etr: d(s.etr), endDate: null, technician: TECHS[seq % TECHS.length], notes: s.notes, completionNotes: '' });
  });
  return logs;
}
function generatePastPPMLogs(slotsMap, equipmentList, idPrefix) {
  const SLOT_DAY = { W1: 4, W2: 11, W3: 18, W4: 25 };
  const TECHS = ['Mihir Sethi'];
  const NOW = new Date();
  const yearStart = new Date('2026-01-01T00:00:00');
  const fmt = (d) => dstr(d);
  const out = [];
  let seq = 0;
  const eqMap = Object.fromEntries(equipmentList.map(e => [e.id, e]));
  for (const [eqId, slot] of Object.entries(slotsMap)) {
    const eq = eqMap[eqId]; if (!eq) continue;
    const noteSet = PPM_NOTES[eq.type] || PPM_DEFAULT;
    const prefix = idPrefix || 'PPM';
    if (slot === 'weekly') {
      let d = new Date(yearStart); let i = 0;
      while (d <= NOW) {
        const ds = fmt(d);
        out.push({ id:`L-${prefix}-${++seq}-${eqId}`, equipmentId: eqId, reason:'Scheduled', startDate: ds, etr: ds, endDate: ds, technician: TECHS[i%TECHS.length], notes: noteSet.sched, completionNotes: noteSet.done });
        d = new Date(d); d.setDate(d.getDate() + 7); i++;
      }
    } else {
      const day = SLOT_DAY[slot];
      for (let m = 0; m < 12; m++) {
        const d = new Date(2026, m, day);
        if (d > NOW) break;
        const ds = fmt(d);
        out.push({ id:`L-${prefix}-${++seq}-${eqId}`, equipmentId: eqId, reason:'Scheduled', startDate: ds, etr: ds, endDate: ds, technician: TECHS[seq%TECHS.length], notes: noteSet.sched, completionNotes: noteSet.done });
      }
    }
  }
  return out;
}

// ---------- Storage ----------
const LS_EQ = 'mm.equipment.v6';
const LS_LOG = 'mm.logs.v6';
const LS_PLANT = 'mm.plants.v6';
const LS_USERS = 'mm.users.v4';
const LS_SESSION = 'mm.session.v1';
const LS_NOTIF = 'mm.notifs.v1';
const LS_OVERDUE_SEEN = 'mm.overdueSeen.v1';
const LS_INVITES = 'mm.invites.v1';
const LS_SLOTS = 'mm.slots.v2';

function seedIfNeeded() {
  // Real mode never touches the demo seeds — data comes exclusively from Supabase.
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) return;
  if (localStorage.getItem(LS_EQ)) return;
  const equipment = SEED_EQUIPMENT.map(e => ({ ...e }));   // clone so we can set statuses
  const slots = SEED_SLOTS;
  const openLogs = buildSeedOpenLogs(equipment);           // mutates statuses on a few units
  const historic = generatePastPPMLogs(slots, equipment, 'PPM');
  localStorage.setItem(LS_EQ,    JSON.stringify(equipment));
  localStorage.setItem(LS_SLOTS, JSON.stringify(slots));
  localStorage.setItem(LS_LOG,   JSON.stringify(historic.concat(openLogs)));
  localStorage.setItem(LS_PLANT, JSON.stringify(SEED_PLANTS));
}

// Cloud caches (real mode) — declared before load() which reads them.
let authUser = null;        // cached identity in real mode: {id,email,name,role,phone,status,plants}
let cloudUsers = null;      // real users hydrated from Supabase profiles (real mode)
let cloudAssignments = {};  // userId -> [plantId] (real mode)
let cloudQueue = null;      // background parts-research queue (admins, real mode)
let cloudTechnicians = null; // technician registry (real mode)
let cloudResearchUsage = null; // { day, calls } — AI research spent today
let cloudIssues = null;      // reported issues (real mode, SQL 35)
let cloudReports = null;     // co-signed service reports (real mode, SQL 35)
let cloudPlants = null, cloudEquipment = null, cloudLogs = null, cloudSlots = null, cloudParts = null, cloudLogParts = null;
let hydrateErrors = [];     // table names that failed to hydrate (drives the error banner)

function load() {
  // Real mode: state comes exclusively from the cloud caches (hydrateCloud).
  // Never fall back to demo seeds — a transient fetch failure must show an
  // error banner, not fabricated maintenance history.
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    return {
      equipment: cloudEquipment || [],
      logs:      cloudLogs      || [],
      plants:    cloudPlants    || [],
      users:     cloudUsers     || [],
      slots:     cloudSlots     || {},
      invites:   [],
    };
  }
  seedIfNeeded();
  if (!localStorage.getItem(LS_USERS)) localStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
  // A single corrupted key must never brick the boot — fall back to the seed.
  const readLS = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch { localStorage.removeItem(key); return fallback; }
  };
  return {
    equipment: readLS(LS_EQ, SEED_EQUIPMENT),
    logs:      readLS(LS_LOG, []),
    plants:    readLS(LS_PLANT, SEED_PLANTS),
    users:     readLS(LS_USERS, SEED_USERS),
    slots:     readLS(LS_SLOTS, {}),
    invites:   readLS(LS_INVITES, []),
  };
}
const saveEq    = e => localStorage.setItem(LS_EQ,    JSON.stringify(e));
const saveLog   = l => localStorage.setItem(LS_LOG,   JSON.stringify(l));
const saveSlots = s => localStorage.setItem(LS_SLOTS, JSON.stringify(s));
const savePlant = p => localStorage.setItem(LS_PLANT, JSON.stringify(p));
const saveUsers = u => localStorage.setItem(LS_USERS, JSON.stringify(u));
const saveInvites = i => localStorage.setItem(LS_INVITES, JSON.stringify(i));
function resetDemo() { [LS_EQ, LS_LOG, LS_PLANT, LS_USERS, LS_SLOTS, LS_NOTIF, LS_OVERDUE_SEEN, LS_INVITES].forEach(k => localStorage.removeItem(k)); route(); }

// ---------- Helpers ----------
// LOCAL date string (yyyy-mm-dd). Never use toISOString() for calendar dates —
// in IST (UTC+5:30) it shifts dates back a day between 00:00 and 05:30.
const dstr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => dstr(new Date());

// Banner shown when any cloud table failed to hydrate (real mode).
function renderHydrateBanner() {
  document.getElementById('hydrateBanner')?.remove();
  if (!SUPA || !currentUser()) return;
  if (window._offlineSince) {
    document.querySelector('header')?.insertAdjacentHTML('afterend', `
      <div id="hydrateBanner" class="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 flex items-center gap-3">
        <svg class="shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
        <span>Offline — showing data saved ${timeAgo(window._offlineSince)}. Browsing works; saving needs a connection.</span>
        <button onclick="retryHydrate()" class="ml-auto text-xs px-3 py-1 rounded-md border border-amber-300 bg-white hover:bg-amber-100 font-medium whitespace-nowrap">Reconnect</button>
      </div>`);
    return;
  }
  if (!hydrateErrors.length) return;
  document.querySelector('header')?.insertAdjacentHTML('afterend', `
    <div id="hydrateBanner" class="bg-red-50 border-b border-red-200 text-red-800 text-sm px-4 py-2 flex items-center gap-3">
      <span>Some data failed to load (${hydrateErrors.join(', ')}). What you see may be incomplete.</span>
      <button onclick="retryHydrate()" class="ml-auto text-xs px-3 py-1 rounded-md border border-red-300 bg-white hover:bg-red-100 font-medium">Retry</button>
    </div>`);
}
async function retryHydrate() {
  // Reconnecting from offline mode: refresh identity from the DB before data.
  if (SUPA && window._offlineSince) {
    try {
      const { data } = await SUPA.auth.getSession();
      if (data.session) await loadAuthProfile(data.session.user);
    } catch (e) {}
  }
  await hydrateCloud();
  // Still unreachable? Stay on the snapshot rather than an empty screen.
  if ((hydrateErrors.includes('equipment') || !cloudEquipment) && window._offlineSince == null) restoreSnapshot();
  route();
  if (!window._offlineSince && !hydrateErrors.length) toast('Back online — data refreshed.');
}

// Disable a form's submit button while an async save runs (prevents double-submit).
// SubmitEvent.submitter is missing on iOS Safari < 15.4 — remember the last
// submit button the user actually touched and fall back to it everywhere.
document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('button');
  if (b && b.form && b.type !== 'button') b.form._lastSubmitter = b;
}, true);
function submitterOf(ev) { return ev.submitter || (ev.target && ev.target._lastSubmitter) || null; }

// iOS (especially the installed home-screen app) has no download UI — the
// anchor-download trick silently does nothing. Share the file instead, or
// open it in a viewer tab; every export funnels through these two helpers.
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_MOBILE_UA = IS_IOS || /Android/i.test(navigator.userAgent);
async function saveBlob(blob, filename) {
  if (IS_IOS) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function savePdfDoc(doc, filename) {
  if (IS_IOS) { saveBlob(doc.output('blob'), filename); return; }
  doc.save(filename);
}
function saveWorkbook(wb, filename) {
  if (!IS_IOS) { XLSX.writeFile(wb, filename); return; }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

function lockSubmit(ev, label = 'Saving…') {
  const btn = submitterOf(ev) || ev.target.querySelector('button[type="submit"], button:not([type="button"])');
  if (!btn) return () => {};
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  return () => { btn.disabled = false; btn.textContent = orig; };
}
// ---------- In-app dialogs ----------
// Browser appAlert()/confirm() pop OS chrome ("site says...") that breaks the
// app feel, blocks JS, and can't be styled. These render inside the app.
function showAppDialog({ title, msg, buttons }) {
  return new Promise((resolve) => {
    // If a dialog is already up, cancel it properly — removing it without
    // resolving would leave its awaiting caller hung forever.
    const prev = document.getElementById('appDialog');
    if (prev) { prev._cancel?.(); prev.remove(); }
    const wrap = document.createElement('div');
    wrap.id = 'appDialog';
    wrap.className = 'fixed inset-0 z-[95] grid place-items-center p-4';
    wrap.innerHTML = `
      <div class="absolute inset-0 bg-black/40" data-dismiss style="-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)"></div>
      <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-5" role="alertdialog" aria-modal="true">
        <div class="font-semibold text-sm mb-1.5">${esc(title)}</div>
        <div class="text-sm text-slate-600 whitespace-pre-line max-h-[50vh] overflow-y-auto">${esc(msg)}</div>
        <div class="flex gap-2 justify-end pt-4" data-btns></div>
      </div>`;
    document.body.appendChild(wrap);
    const host = wrap.querySelector('[data-btns]');
    buttons.forEach(({ label, value, cls }) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = cls;
      b.onclick = () => { wrap.remove(); resolve(value); };
      host.appendChild(b);
    });
    wrap._cancel = () => resolve(false);
    wrap.querySelector('[data-dismiss]').addEventListener('click', () => { wrap.remove(); resolve(false); });
    setTimeout(() => host.lastElementChild?.focus(), 30);
  });
}
function appAlert(msg, title = 'Notice') {
  return showAppDialog({ title, msg, buttons: [
    { label: 'OK', value: true, cls: 'px-4 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium' },
  ] });
}
function appConfirm(msg, title = 'Please confirm') {
  return showAppDialog({ title, msg, buttons: [
    { label: 'Cancel', value: false, cls: 'px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-sm' },
    { label: 'Confirm', value: true, cls: 'px-4 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium' },
  ] });
}
function saveError(err) {
  const msg = String((err && err.message) || err);
  // Network-level failures (plant Wi-Fi, VPN blips) deserve a human message,
  // not "TypeError: Failed to fetch".
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    appAlert("Couldn't reach the server \u2014 check your internet connection and press the button again.\n\nYour entries are still in the form; nothing was lost.");
    return;
  }
  appAlert('Could not save. Please try again.\n\nDetails: ' + msg);
}
// Transient success toast (bottom-center, auto-dismisses).
function toast(msg) {
  document.getElementById('appToast')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="appToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-brand text-white text-sm px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      <span>${msg}</span>
    </div>`);
  setTimeout(() => document.getElementById('appToast')?.remove(), 3500);
}
// Escape user-authored text before injecting into innerHTML templates.
// Render-safe URL: only http(s) survives; javascript:/data: etc. become ''.
const safeUrl = u => /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '';
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Normalize a phone number to E.164 (e.g. +919000010000) — the format WhatsApp
// Business API and SMS providers require. Empty input is valid (no phone yet).
function normalizePhone(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return { ok: true, value: '' };
  const compact = trimmed.replace(/[\s\-().]/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) {
    return { ok: false, error: 'Enter a phone number with country code, e.g. +919000010000.' };
  }
  return { ok: true, value: compact };
}
const fmt = d => d ? d : '—';
const eqById = id => state.equipment.find(e => e.id === id);
const plantById = id => state.plants.find(p => p.id === id);
const plantName = id => plantById(id)?.name || '—';
const openLogFor = eqId => state.logs.find(l => l.equipmentId === eqId && !l.endDate);
function daysBetween(a, b) { if (!a || !b) return null; return Math.round((new Date(b) - new Date(a)) / 86400000); }
function isOverdue(log) { return log && !log.endDate && log.etr && new Date(log.etr) < new Date(today() + 'T00:00:00'); }

const statusBadge = s => {
  const cls = s === 'Operational' ? 'badge-op' : s === 'In Maintenance' ? 'badge-brand' : 'badge-bd';
  return `<span class="badge ${cls}">${s}</span>`;
};
const reasonBadge = r => `<span class="badge ${r === 'Breakdown' ? 'badge-bd' : 'badge-brand'}">${r}</span>`;
// The work order's human reference (WO-2026-0147). Historical work orders
// predate numbering and simply have none — show nothing rather than a
// placeholder that looks like a missing value.
function woRef(log, cls) {
  if (!log || !log.woNo) return '';
  return `<span class="font-mono text-[11px] text-slate-500 ${cls || ''}">${esc(log.woNo)}</span>`;
}
function ongoingStatusPill(log) {
  if (woStateOf(log) === 'submitted') return `<span class="badge badge-mt">Awaiting review</span>`;
  if (woStateOf(log) === 'returned')  return `<span class="badge badge-bd">Returned for fixes</span>`;
  if (log.endDate) return `<span class="badge badge-op">Completed</span>`;
  if (isOverdue(log)) return `<span class="badge badge-bd">Overdue</span>`;
  if (woStateOf(log) === 'open') return `<span class="badge badge-neutral">Not started</span>`;
  return `<span class="badge badge-brand">Ongoing</span>`;
}
function ecStatus(etr, endDate) {
  if (!etr) return { label: '—', cls: 'text-slate-500' };
  if (endDate) return { label: 'Completed', cls: 'text-green-700' };
  const d = daysBetween(today(), etr);
  if (d < 0)  return { label: `Overdue by ${-d}d`, cls: 'text-red-600 font-medium' };
  if (d === 0) return { label: 'Due today', cls: 'text-[#193458] font-medium' };
  return { label: `In ${d}d`, cls: 'text-[#193458]' };
}
function tagLink(e) {
  return `<a class="tag-chip" href="#/equipment/${e.id}" title="${esc(e.tag)}"><span class="tag-text">${esc(e.tag)}</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></a>`;
}

// ---------- State / routing / filters ----------
let state = load();
const ui = { plantFilter: 'all', typeFilter: 'all', eqStatusFilter: 'all', reviewOpen: null, reviewQuery: '', engineerTab: 'pending', visitFilter: 'all', visitFrom: '', visitTo: '', logPage: 1, _logSig: '', notifPlant: 'all', notifTime: 'all' };
const LOG_PAGE_SIZE = 50;
const EQ_TYPES = ['Pump','Blower','Motor','Mixer','Screen','Filter','Centrifuge','UV System','Screw Press','Decanter','Fan','Valve','NRV','Other'];
const isValveType = t => t === 'Valve' || t === 'NRV';
// Expected service life fallbacks (years) — mirrors type_config seed; the
// per-equipment value (from datasheet enrichment or manual entry) wins.
const TYPE_LIFE_DEFAULTS = { Pump:10, Blower:12, Motor:12, Mixer:10, Screen:15, Filter:12, Centrifuge:12, 'UV System':8, 'Screw Press':12, Decanter:12, Fan:10, Valve:5, NRV:5, Other:10 };
let cloudTypeLife = null;
function expectedLifeFor(e) {
  if (e.expectedLifeYears) return e.expectedLifeYears;
  if (cloudTypeLife && cloudTypeLife[e.type]) return cloudTypeLife[e.type];
  return TYPE_LIFE_DEFAULTS[e.type] || 10;
}

const routes = [
  { hash: '#/dashboard', label: 'Dashboard',          roles: ['Admin'] },
  { hash: '#/mywork',    label: 'My Work',            roles: ['Technician'] },
  { hash: '#/equipment', label: 'Equipment',          roles: ['Admin','Engineer','Technician'] },
  { hash: '#/log',       label: 'Maintenance Log',     roles: ['Admin','Engineer'] },
  { hash: '#/engineer',  label: 'Engineering Corner',  roles: ['Admin','Engineer'] },
  { hash: '#/review',    label: 'Review',             roles: ['Admin'] },
  { hash: '#/oversight', label: 'Oversight',          roles: ['Admin'] },
  { hash: '#/plants',    label: 'Plants',             roles: ['Admin'] },
  // Engineers see Team too, trimmed to the technicians they work with.
  { hash: '#/team',      label: 'Team',               roles: ['Admin','Engineer'] },
];

// ---------- Auth ----------
// Real mode: Supabase Auth (when supabase-config.js + the CDN client are present).
// Prototype mode: localStorage mock (fallback when Supabase isn't configured).
// Capture the auth-redirect hash (invite / password recovery) BEFORE the client consumes it.
const _initHash = location.hash || '';
let needsPasswordSet = /(?:^|[#&])type=(invite|recovery|signup)/.test(_initHash);
// Configured for a real backend? That is decided by supabase-config.js alone.
// SUPA additionally needs the CDN library, so the two can disagree -- and when
// they do, this is a real deployment whose auth library failed to load, NOT a
// prototype. Treating it as a prototype showed a fake sign-in screen on the
// live site. Kept as a separate flag so that case can be refused outright.
const SUPA_CONFIGURED = !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
const SUPA_LIB_MISSING = SUPA_CONFIGURED && !window.supabase;
const SUPA = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      // Plant Wi-Fi blips: retry a connection-level failure once, silently —
      // but only for reads. A dropped POST may have already been applied
      // server-side; retrying it could double-insert or trip guards.
      global: { fetch: (...args) => fetch(...args).catch(async (err) => {
        const method = (args[1] && args[1].method) || 'GET';
        if (method !== 'GET' && method !== 'HEAD') throw err;
        await new Promise(r => setTimeout(r, 1200));
        return fetch(...args);
      }) },
    })
  : null;
async function loadAuthProfile(u) {
  let name = (u.email || '').split('@')[0], role = 'Engineer', phone = '', status = 'active';
  try {
    const { data } = await SUPA.from('profiles').select('name,role,phone,status,ui_mode').eq('id', u.id).single();
    if (data) { name = data.name || name; role = data.role || role; phone = data.phone || ''; status = data.status || 'active'; var uiMode = data.ui_mode || 'simple'; }
  } catch (e) { console.warn('profile load failed', e); }
  let plants = [];
  try {
    const { data: pa } = await SUPA.from('plant_assignments').select('plant_id').eq('user_id', u.id);
    if (pa) plants = pa.map(x => x.plant_id);
  } catch (e) { console.warn('assignment load failed', e); }
  if (status !== 'active') {
    // Deactivated: end the session right here. (The DB already refuses their
    // requests — this is the polite front door.)
    try { await SUPA.auth.signOut(); } catch (e) {}
    authUser = null;
    window._deactivated = true;
    return;
  }
  authUser = { id: u.id, email: u.email, name, role, phone, status, plants, uiMode: typeof uiMode !== 'undefined' ? uiMode : 'simple' };
}

// ---- field mappers: DB (snake_case) <-> app (camelCase) ----
const eqFromDb  = r => ({ id: r.id, tag: r.tag, type: r.type, make: r.make || '', model: r.model || '', plantId: r.plant_id, location: r.location || '', installed: r.installed || '', status: r.status, slot: r.slot || null, expectedLifeYears: r.expected_life_years || null, lineageId: r.lineage_id || r.id, retiredAt: r.retired_at || null, replacedBy: r.replaced_by || null, addedOn: String(r.created_at || '').slice(0, 10) });
const eqToDb    = e => ({ id: e.id, tag: e.tag, type: e.type, make: e.make || '', model: e.model || '', plant_id: e.plantId, location: e.location || '', installed: e.installed || null, status: e.status, slot: e.slot || null });
const logFromDb = r => ({ id: r.id, equipmentId: r.equipment_id, reason: r.reason, startDate: r.start_date, etr: r.etr, endDate: r.end_date, technician: r.technician || '', notes: r.notes || '', completionNotes: r.completion_notes || '', woState: r.wo_state || (r.end_date ? 'done' : 'active'), priority: r.priority || 'Normal', checklist: r.checklist || null, affectedPartId: r.affected_part_id || null, severity: r.severity || null, assignedTo: r.assigned_to || null, woNo: r.wo_no || null, photosRequired: !!r.photos_required, reviewNote: r.review_note || null, submittedAt: r.submitted_at || null });
const logToDb   = l => ({ id: l.id, equipment_id: l.equipmentId, reason: l.reason, start_date: l.startDate, etr: l.etr || null, end_date: l.endDate || null, technician: l.technician || '', notes: l.notes || '', completion_notes: l.completionNotes || '', wo_state: l.woState || (l.endDate ? 'done' : 'active'), priority: l.priority || 'Normal' });

// Work-order state, tolerant of prototype logs that predate the column.
const woStateOf = l => l.woState || (l.endDate ? 'done' : 'active');
const priorityChip = p => (p === 'Critical') ? '<span class="badge badge-bd">Critical</span>'
  : (p === 'High') ? '<span class="badge badge-mt">High</span>' : '';

let cloudNotifs = null;   // activity feed rows from public.notifications (real mode)

// ---------- Offline snapshot (real mode) ----------
// Every successful sync is persisted; when the app boots (or hydrates) with no
// connection, the snapshot restores read-only browsing with clear provenance.
const SNAP_KEY = 'mm.snapshot.v1';
function saveSnapshot() {
  if (!SUPA || !authUser || !cloudEquipment) return;
  try {
    localStorage.setItem(SNAP_KEY, JSON.stringify({
      ts: Date.now(), user: authUser,
      plants: cloudPlants, equipment: cloudEquipment, logs: cloudLogs,
      parts: cloudParts, slots: cloudSlots, techs: cloudTechnicians,
      checklists: cloudChecklists, typeLife: cloudTypeLife,
      users: cloudUsers, assignments: cloudAssignments, queue: cloudQueue,
      logParts: cloudLogParts,
      notifs: (cloudNotifs || []).slice(0, 30),
    }));
  } catch (e) { /* quota — the snapshot is best-effort */ }
}
function restoreSnapshot() {
  try {
    const snap = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
    if (!snap || !Array.isArray(snap.equipment)) return false;
    // A snapshot only ever restores for the SAME signed-in user — role and
    // plant scoping travel inside the stored authUser. A different user's
    // stale snapshot is wiped on sight, not left readable on the device.
    if (!authUser || !snap.user) return false;
    if (snap.user.id !== authUser.id) {
      try { localStorage.removeItem(SNAP_KEY); } catch (e) {}
      return false;
    }
    authUser = snap.user;
    cloudPlants = snap.plants || []; cloudEquipment = snap.equipment || []; cloudLogs = snap.logs || [];
    cloudParts = snap.parts || []; cloudSlots = snap.slots || {}; cloudTechnicians = snap.techs || [];
    cloudChecklists = snap.checklists || null; cloudTypeLife = snap.typeLife || null;
    cloudUsers = snap.users || []; cloudAssignments = snap.assignments || {};
    cloudQueue = snap.queue || []; cloudNotifs = snap.notifs || [];
    cloudLogParts = snap.logParts || [];
    window._offlineSince = snap.ts;
    return true;
  } catch { return false; }
}

async function hydrateCloud() {
  if (!SUPA || !authUser) return;
  hydrateErrors = [];
  const fail = (name, err) => { hydrateErrors.push(name); console.warn(name + ' hydrate failed', err); };
  await Promise.all([
    SUPA.from('profiles').select('id,name,role,phone,status,email,ui_mode,email_digest,email_urgent')
      .then(({ data, error }) => {
        if (error) return fail('users', error);
        cloudUsers = (data || []).map(p => ({ id: p.id, name: p.name || (p.email||'').split('@')[0] || 'User', role: p.role, phone: p.phone || '', email: p.email || '', status: p.status || 'active', uiMode: p.ui_mode || 'simple',
          emailDigest: p.email_digest !== false, emailUrgent: p.email_urgent !== false }));
      }, e => fail('users', e)),
    SUPA.from('plant_assignments').select('user_id,plant_id')
      .then(({ data, error }) => {
        if (error) return fail('assignments', error);
        cloudAssignments = {};
        (data || []).forEach(a => { (cloudAssignments[a.user_id] = cloudAssignments[a.user_id] || []).push(a.plant_id); });
      }, e => fail('assignments', e)),
    SUPA.from('plants').select('*').order('id')
      .then(({ data, error }) => {
        if (error) return fail('plants', error);
        cloudPlants = (data || []).map(p => ({ id: p.id, name: p.name, location: p.location || '', notifications: p.notifications || defaultNotifConfig() }));
      }, e => fail('plants', e)),
    SUPA.from('equipment').select('*').order('id')
      .then(({ data, error }) => {
        if (error) return fail('equipment', error);
        cloudEquipment = (data || []).map(eqFromDb);
        cloudSlots = {};
        cloudEquipment.forEach(e => { if (e.slot) cloudSlots[e.id] = e.slot; });
      }, e => fail('equipment', e)),
    // Logs: PostgREST caps un-ranged selects at 1000 rows. Fetch ALL open
    // work-orders (must never drop out) + the most recent history, merged.
    Promise.all([
      SUPA.from('maintenance_logs').select('*').is('end_date', null),
      SUPA.from('maintenance_logs').select('*').order('start_date', { ascending: false }).limit(1000),
    ]).then(([open, recent]) => {
      if (open.error || recent.error) return fail('logs', open.error || recent.error);
      const byId = new Map();
      (open.data || []).concat(recent.data || []).forEach(r => byId.set(r.id, r));
      cloudLogs = [...byId.values()].map(logFromDb);
    }, e => fail('logs', e)),
    SUPA.from('notifications').select('*').order('ts', { ascending: false }).limit(100)
      .then(({ data, error }) => {
        if (error) return fail('notifications', error);
        cloudNotifs = data || [];
      }, e => fail('notifications', e)),
    SUPA.from('checklist_templates').select('eq_type,items')
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet — fall back to defaults silently
        cloudChecklists = {};
        (data || []).forEach(row => { cloudChecklists[row.eq_type] = row.items || []; });
      }, () => {}),
    SUPA.from('equipment_parts').select('*').order('criticality', { ascending: false })
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet
        cloudParts = data || [];
      }, () => {}),
    SUPA.from('type_config').select('eq_type,expected_life_years')
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet — fall back to constants
        cloudTypeLife = {};
        (data || []).forEach(row => { cloudTypeLife[row.eq_type] = row.expected_life_years; });
      }, () => {}),
    SUPA.from('maintenance_log_parts').select('*')
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet
        cloudLogParts = data || [];
      }, () => {}),
    SUPA.from('enrichment_queue').select('*').order('id')
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet (run supabase/14) — feature hides itself
        cloudQueue = data || [];
      }, () => {}),
    SUPA.from('technicians').select('*').order('name')
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet (run supabase/15)
        cloudTechnicians = data || [];
      }, () => {}),
    SUPA.from('wo_issues').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet (run supabase/35)
        cloudIssues = data || [];
      }, () => {}),
    SUPA.from('service_reports').select('*').order('visit_date', { ascending: false }).limit(300)
      .then(({ data, error }) => {
        if (error) return;   // table may not exist yet (run supabase/35)
        cloudReports = data || [];
      }, () => {}),
  ]);
  // Leave offline mode as soon as the core data is back — but only persist
  // the snapshot on a FULLY clean sync: a partial hydrate (logs failed, say)
  // would overwrite a complete snapshot with nulls.
  if (!hydrateErrors.includes('equipment') && cloudEquipment) window._offlineSince = null;
  if (!hydrateErrors.length && cloudEquipment) saveSnapshot();
  // Resume / kick the background parts-research runner (single-flight, admin-only).
  setTimeout(() => { try { runEnrichmentQueue(); } catch (e) { console.warn(e); } }, 1200);
}
// Part actions recorded on a completed work-order (real mode: junction table;
// prototype: stored directly on the log object).
function partActionsFor(log) {
  if (SUPA) return (cloudLogParts || []).filter(a => a.log_id === log.id);
  return (log.partActions || []).map(a => ({ log_id: log.id, part_id: a.part_id, part_name: a.name, action: a.action }));
}
function partsFor(eqId) { return (cloudParts || []).filter(p => p.equipment_id === eqId); }

// Equipment that participates in day-to-day views (retired valves are history).
function activeEquipment(list) { return (list || state.equipment).filter(e => e.status !== 'Retired'); }

// ---------- Health score (0–100, computed live, fully explainable) ----------
// Rotating equipment: age base − part-weighted breakdown deductions (age-
// amplified, recency-decayed) − overdue penalty + on-time-PPM recovery credit.
// Valves/NRV: age vs expected life + replacement churn at the same position.
const HEALTH_BANDS = [
  [80, 'Good',     'badge-op'],
  [60, 'Watch',    'badge-neutral'],
  [40, 'At Risk',  'badge-mt'],
  [ 0, 'Critical', 'badge-bd'],
];
function healthBand(score) { return HEALTH_BANDS.find(([min]) => score >= min); }
function healthBadge(score) {
  const [, label, cls] = healthBand(score);
  return `<span class="badge ${cls}" title="Health score">${score} · ${label}</span>`;
}
function healthScore(e) {
  const factors = [];
  const now = Date.now();
  const life = expectedLifeFor(e);
  const ageYears = e.installed ? Math.max(0, (now - new Date(e.installed + 'T00:00:00').getTime()) / 31557600000) : 0;
  let score = 100;

  // Age: gentle decline — up to −20 across expected life, capped at −30.
  const agePenalty = Math.round(Math.min(30, (ageYears / life) * 20));
  if (agePenalty > 0) { score -= agePenalty; factors.push({ label: `Age ${ageYears.toFixed(1)}y of ~${life}y expected life`, delta: -agePenalty }); }

  if (isValveType(e.type)) {
    // Position churn: prior generations at this position retired in the last 24 months.
    const cutoff = new Date(now - 24 * 30.44 * 86400000);
    const churn = state.equipment.filter(x =>
      x.lineageId === e.lineageId && x.id !== e.id && x.retiredAt &&
      new Date(x.retiredAt + 'T00:00:00') >= cutoff).length;
    if (churn > 0) {
      const p = Math.min(45, churn * 15);
      score -= p;
      factors.push({ label: `${churn} replacement${churn === 1 ? '' : 's'} at this position in 24 months`, delta: -p });
    }
  } else {
    const safeAge = Number.isFinite(ageYears) ? ageYears : 0;
    const ageMult = Math.min(2.5, 1 + safeAge / life);
    for (const l of state.logs) {
      if (l.equipmentId !== e.id || l.reason !== 'Breakdown') continue;
      const part = l.affectedPartId ? (cloudParts || []).find(p => p.id === l.affectedPartId) : null;
      const base = part ? part.criticality * 4
        : ({ Minor: 8, Major: 20, Critical: 36 }[l.severity] || 16);
      const refDate = new Date((l.endDate || l.startDate) + 'T00:00:00').getTime();
      const monthsSince = Math.max(0, (now - refDate) / (30.44 * 86400000));
      const decay = Math.pow(0.5, monthsSince / 12);
      // Cure: if the failed part has since been REPLACED, the old failure
      // mostly stops counting — the machine has a new part in that slot.
      const cured = part && part.last_replaced &&
        new Date(part.last_replaced + 'T00:00:00').getTime() >= refDate;
      const d = Math.round(Math.min(45, base * ageMult * decay * (cured ? 0.25 : 1)));
      if (d >= 1) {
        score -= d;
        const what = part ? esc(part.name) : (l.severity || 'breakdown');
        factors.push({ label: `Breakdown ${l.startDate} (${what})${cured ? ' — part since replaced' : ''}`, delta: -d });
      }
    }
    // Recovery: completed scheduled services in the last 12 months earn back points.
    const yearAgo = new Date(now - 365.25 * 86400000);
    const services = state.logs.filter(l => l.equipmentId === e.id && l.reason === 'Scheduled' &&
      l.endDate && new Date(l.endDate + 'T00:00:00') >= yearAgo).length;
    if (services > 0) {
      const credit = Math.min(10, services * 2);
      score += credit;
      factors.push({ label: `${services} on-time service${services === 1 ? '' : 's'} in 12 months`, delta: +credit });
    }
  }

  // Neglect right now: an overdue open work-order, or an overdue PPM slot.
  const open = openLogFor(e.id);
  if (open && isOverdue(open)) { score -= 10; factors.push({ label: 'Open work-order is overdue', delta: -10 }); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, band: healthBand(score)[1], factors };
}

// Plant IDs the current user may see: admins → all; engineers → assigned (real mode) or all (prototype).
function accessiblePlantIds() {
  const u = currentUser();
  if (!u || effRole(u) === 'Admin') return state.plants.map(p => p.id);
  // Technicians roam: they get sent wherever the work order takes them, so
  // they can look up any plant and any machine (QR scans must work anywhere).
  // What they can ACT on is scoped by assignment, in the database.
  if (u.role === 'Technician') return state.plants.map(p => p.id);
  if (SUPA) return (authUser && authUser.plants) ? authUser.plants.slice() : [];
  return state.plants.map(p => p.id); // prototype: engineers unrestricted
}
function canAccessPlant(pid) { return effRole(currentUser()) === 'Admin' || accessiblePlantIds().includes(pid); }

function currentUser() {
  if (SUPA) return authUser;
  const id = localStorage.getItem(LS_SESSION);
  return id ? (state.users || []).find(u => u.id === id) : null;
}
function isAdmin() { const u = currentUser(); return !!u && (u.role === 'Admin' || u.role === 'Superadmin'); }
// Per-user interface mode. 'simple' = record-keeping only: no health scores,
// parts, Review queue, or AI research — every visual/friction improvement
// stays. Stored on profiles.ui_mode (SQL 21); Superadmin-managed on Team.
// Prototype mode is always full (it's the development sandbox).
function isSimple() { return SUPA ? (authUser?.uiMode !== 'full') : false; }
function isSuperadmin() { const u = currentUser(); return !!u && u.role === 'Superadmin'; }
function loginWith(email, password) {   // prototype mode only
  const u = (state.users || []).find(x => x.email.toLowerCase() === String(email).toLowerCase().trim() && x.status === 'active');
  if (!u || u.password !== password) return false;
  localStorage.setItem(LS_SESSION, u.id);
  return true;
}
async function logout() {
  if (SUPA) { try { await SUPA.auth.signOut(); } catch (e) {} authUser = null; route(); return; }
  localStorage.removeItem(LS_SESSION); route();
}
// Superadmin and Admin share the same route access. Engineers are scoped to
// their plants; Technicians are scoped further, to the work assigned to them.
function effRole(user) {
  if (user && user.role === 'Engineer') return 'Engineer';
  if (user && user.role === 'Technician') return 'Technician';
  return 'Admin';
}
function isTechnician() { const u = currentUser(); return !!u && u.role === 'Technician'; }
function routeAllowed(hash, user) {
  const base = hash.startsWith('#/equipment/') ? '#/equipment' : hash;
  const r = routes.find(x => x.hash === base);
  if (!r) return true; // notifications panel etc. are not routes
  return r.roles.includes(effRole(user));
}
function homeHashFor(user) {
  const r = effRole(user);
  return r === 'Admin' ? '#/dashboard' : r === 'Technician' ? '#/mywork' : '#/equipment';
}

// The sign-in / set-password / accept-invite screens are full-screen and
// have no navigation. route() returns early into them, so it never reaches
// renderNav() -- each one clears the nav itself or the previous session's
// tabs (and its highlighted tab) linger behind the login form.
function clearNav() { const n = document.getElementById('nav'); if (n) n.innerHTML = ''; }
function renderNav() {
  const user = currentUser();
  if (!user) { clearNav(); return; }
  const cur = location.hash || homeHashFor(user);
  document.getElementById('nav').innerHTML = routes.filter(r => r.roles.includes(effRole(user)))
    .filter(r => r.hash !== '#/review' || (SUPA && !isSimple()))   // review queue: full mode only
    .map(r => {
    const active = cur === r.hash || (r.hash === '#/equipment' && cur.startsWith('#/equipment/'));
    const n = r.hash === '#/review' ? reviewAttentionCount() : 0;
    return `<a href="${r.hash}" class="px-3 py-1.5 rounded-lg ${active?'bg-white/15 text-white font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]':'text-white/65 hover:bg-white/10 hover:text-white'}">${r.label}${n ? `<span class="nav-badge">${n > 99 ? '99+' : n}</span>` : ''}</a>`;
  }).join('');
}

// ---------- Phone card layout support ----------
// On phones every .list-table renders as a stack of cards (see index.html):
// seven columns cannot fit 360px, and scrolling sideways pushed the one column
// you scan for -- the name -- off screen while a sticky action button kept a
// third of the width. As cards, each cell has to name its own column, since the
// header row is no longer on screen. Deriving those labels from the table's own
// <thead> covers every list page, and any table added later, with no per-page
// markup. Runs off a MutationObserver because each route branch returns
// straight out of its own render call, so there is no single post-render hook.
function labelListTables(root) {
  if (!root || !root.querySelectorAll) return;
  const tables = root.matches && root.matches('table.list-table')
    ? [root] : [...root.querySelectorAll('table.list-table')];
  tables.forEach(t => {
    const heads = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim());
    t.querySelectorAll('tbody tr').forEach(tr => {
      const cells = [...tr.children];
      // Empty-state rows span the whole card and take no label.
      if (cells.length === 1 && cells[0].hasAttribute('colspan')) { cells[0].classList.add('c-span'); return; }
      cells.forEach((td, i) => {
        if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || '');
        const txt = td.textContent.trim();
        if (i === 0) { td.classList.add('c-title'); return; }
        if (i === cells.length - 1 && td.querySelector('button')) { td.classList.add('c-action'); return; }
        if (!txt || txt === '—') { td.classList.add('c-hide'); return; }
        // Badge-only cell -> unlabeled chip; "Operational" explains itself.
        if (td.querySelector('.badge')) {
          const probe = td.cloneNode(true);
          probe.querySelectorAll('.badge').forEach(b => b.remove());
          if (!probe.textContent.trim()) { td.classList.add('c-chip'); return; }
        }
      });
    });
  });
}
// Observe childList only -- setting attributes must not retrigger this.
function startTableLabeller() {
  const view = document.getElementById('view');
  const modal = document.getElementById('modalBody');
  const obs = new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) labelListTables(n);
  });
  [view, modal].forEach(el => el && obs.observe(el, { childList: true, subtree: true }));
  [view, modal].forEach(el => el && labelListTables(el));
}

function route() {
  // A configured deployment with no auth library cannot sign anyone in. Say so
  // instead of degrading into the local prototype, which would offer demo
  // credentials that cannot work and write real work to localStorage.
  if (SUPA_LIB_MISSING) { renderAuthUnavailable(); return; }
  state = load();
  const user = currentUser();
  renderHeaderChrome();
  renderHydrateBanner();
  const h0 = location.hash || '';
  // Invite / password-recovery landing: the user has a session but must set a password.
  if (SUPA && needsPasswordSet && user) { renderSetPassword(); return; }
  // Prototype share-link invites don't exist in real mode (real invites arrive by email).
  if (h0.startsWith('#/accept/')) {
    if (SUPA) { location.hash = ''; renderLogin(); return; }
    renderAcceptInvite(h0.slice('#/accept/'.length)); return;
  }
  if (!user) { renderLogin(); return; }
  renderNav();
  let h = location.hash || homeHashFor(user);
  if (!routeAllowed(h, user)) { location.hash = homeHashFor(user); return; }
  if (window._renderedHash !== h) { window._renderedHash = h; window.scrollTo(0, 0); }
  sweepOverdue();
  // The status filter exists for KPI deep-links; it must never silently
  // follow the user back to Equipment later and hide rows (import bug).
  if (!h.startsWith('#/equipment')) ui.eqStatusFilter = 'all';
  if (h.startsWith('#/equipment/')) return renderEquipmentDetail(h.split('/')[2]);
  if (h === '#/equipment') return renderEquipment();
  if (h === '#/mywork')    return renderMyWork();
  if (h === '#/log')       return renderLog();
  if (h === '#/plants')    return renderPlants();
  if (h === '#/team')      return renderTeam();
  if (h === '#/engineer')  return renderEngineer();
  if (h === '#/review')    return renderReview();
  if (h === '#/oversight') return renderOversight();
  if (h === '#/dashboard') return renderDashboard();
  location.hash = homeHashFor(user);
}
window.addEventListener('hashchange', route);
startTableLabeller();
// Escape closes the topmost overlay (notification panel, then modal).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const dlg = document.getElementById('appDialog');
  if (dlg) { dlg.querySelector('[data-dismiss]').click(); return; }
  const panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); return; }
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) closeModal();
});
// Android back button / iOS swipe-back closes the top overlay instead of
// leaving the page (and losing a half-filled form) — standalone-PWA staple.
function pushOverlayState() {
  try { if (!history.state || !history.state.overlay) history.pushState({ overlay: true }, ''); } catch (e) {}
}
window.addEventListener('popstate', () => {
  const dlg = document.getElementById('appDialog');
  if (dlg) { dlg.querySelector('[data-dismiss]').click(); return; }
  const panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); return; }
  const pdf = document.getElementById('pdfPreview');
  if (pdf) { closePdfPreview(); return; }
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) closeModal();
});

// ---------- Login screen ----------
function renderLogin() {
  clearNav();
  document.getElementById('view').innerHTML = `
    <div class="min-h-[70vh] flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-2 justify-center mb-6">
          <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
          <div>
                        <div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div>
          </div>
        </div>
        <div class="login-card bg-white rounded-xl border border-slate-200/80 p-6 shadow-xl">
          <h1 class="text-lg font-semibold mb-1">Sign in</h1>
          <p class="text-xs text-slate-500 mb-4">Use your DigitalPaani account.</p>
          <form onsubmit="submitLogin(event)" class="space-y-3">
            <div>
              <label class="block text-xs text-slate-600 mb-1">Email</label>
              <input name="email" type="email" required autocomplete="username" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="you@digitalpaani.com" />
            </div>
            <div>
              <label class="block text-xs text-slate-600 mb-1">Password</label>
              <input name="password" type="password" required autocomplete="current-password" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="••••••••" />
            </div>
            <div id="loginError" class="${window._deactivated ? '' : 'hidden'} text-xs text-red-600">${window._deactivated ? 'This account has been deactivated. Contact your administrator.' : ''}</div>
            <button class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Sign in</button>
            ${SUPA ? `<button type="button" onclick="sendPasswordReset()" class="w-full text-center text-xs text-slate-500 hover:text-brand pt-1">Forgot password?</button>` : ''}
          </form>
        </div>
        ${SUPA ? `<p class="text-[10px] text-slate-400 text-center mt-3">Secured by Supabase Auth.</p>` : ''}
      </div>
    </div>`;
}
// Shown only when supabase-js failed to load on a configured deployment --
// usually a blocked CDN, captive portal, or a dead connection at a plant.
function renderAuthUnavailable() {
  clearNav();
  document.getElementById('view').innerHTML = `
    <div class="min-h-[70vh] flex items-center justify-center px-4">
      <div class="w-full max-w-sm text-center">
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3 text-amber-600 text-xl">!</div>
          <h1 class="text-lg font-semibold text-slate-800">Can't reach sign-in</h1>
          <p class="text-xs text-slate-500 mt-1.5 leading-relaxed">The sign-in service didn't load. This is almost always the
            network — a plant Wi-Fi portal, or no connection at all. Your data is safe on the server.</p>
          <button onclick="location.reload()" class="mt-4 w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Try again</button>
          <p class="text-[11px] text-slate-400 mt-3">If this keeps happening on a working connection, tell your administrator
            that <b>supabase-js</b> is being blocked.</p>
        </div>
      </div>
    </div>`;
}
// Invite / recovery landing — the user sets their password to activate their account.
function renderSetPassword() {
  clearNav();
  const u = currentUser();
  document.getElementById('view').innerHTML = `
    <div class="min-h-[70vh] flex items-center justify-center px-4"><div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
        <div><div class="font-semibold text-lg leading-tight">DigitalPaani</div><div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div></div>
      </div>
      <div class="login-card bg-white rounded-xl border border-slate-200/80 p-6 shadow-xl">
        <h1 class="text-lg font-semibold mb-1">Set your password</h1>
        <p class="text-xs text-slate-500 mb-4">Welcome${u && u.name ? ', ' + u.name : ''}! Choose a password to activate your DigitalPaani account.</p>
        <form onsubmit="submitSetPassword(event)" class="space-y-3">
          <div><label class="block text-xs text-slate-600 mb-1">New password <span class="text-red-500">*</span></label>
            <input name="password" type="password" required minlength="6" autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="At least 6 characters" /></div>
          <div><label class="block text-xs text-slate-600 mb-1">Confirm password <span class="text-red-500">*</span></label>
            <input name="confirm" type="password" required autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Re-enter password" /></div>
          <div id="spError" class="hidden text-xs text-red-600"></div>
          <button class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Set password &amp; continue</button>
        </form>
      </div>
    </div></div>`;
}
async function submitSetPassword(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const pw = f.get('password'), confirm = f.get('confirm');
  const err = document.getElementById('spError');
  if (pw !== confirm) { err.textContent = 'Passwords do not match.'; err.classList.remove('hidden'); return; }
  const { error } = await SUPA.auth.updateUser({ password: pw });
  if (error) { err.textContent = error.message; err.classList.remove('hidden'); return; }
  needsPasswordSet = false;
  history.replaceState(null, '', location.pathname + location.search);  // strip the token hash
  const { data: sess } = await SUPA.auth.getSession();
  if (sess && sess.session) {
    await loadAuthProfile(sess.session.user);
    await hydrateCloud();
    location.hash = homeHashFor(authUser);
  }
  route();
}
async function sendPasswordReset() {
  const email = (document.querySelector('input[name="email"]')?.value || '').trim();
  if (!email) { loginError('Type your email above first, then tap "Forgot password?" again.'); return; }
  let error;
  try { ({ error } = await SUPA.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); }
  catch (e) { error = e; }
  if (error) { loginError(error.message || 'Could not send the reset email — check your connection.'); return; }
  const el = document.getElementById('loginError');
  if (el) {
    el.textContent = `Reset link sent to ${email} — open it on this device to set a new password.`;
    el.className = 'text-xs text-green-700';
  }
}
function loginError(msg) {
  const el = document.getElementById('loginError');
  if (el) el.className = 'text-xs text-red-600';
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
async function submitLogin(ev) {
  ev.preventDefault();
  window._deactivated = false;   // stale banner must not greet the next person
  const f = new FormData(ev.target);
  const email = String(f.get('email')).trim(), password = f.get('password');
  if (SUPA) {
    const btn = ev.target.querySelector('button[type=submit], button:not([type])');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    const { data, error } = await SUPA.auth.signInWithPassword({ email, password });
    if (error) { loginError(error.message); if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; } return; }
    await loadAuthProfile(data.user);
    if (!authUser) { route(); return; }   // deactivated — bounced inside loadAuthProfile
    await hydrateCloud();
    location.hash = homeHashFor(authUser);
    route();
    return;
  }
  if (loginWith(email, password)) {
    location.hash = homeHashFor(currentUser());
    route();
  } else {
    loginError('Invalid email or password.');
  }
}

// ---------- Header chrome (user menu + notifications) ----------
function renderHeaderChrome() {
  const host = document.getElementById('headerRight');
  if (!host) return;
  const user = currentUser();
  // Show the Guide-me FAB only when signed in
  const fab = document.querySelector('.tour-fab'), fabLabel = document.querySelector('.tour-fab-label');
  [fab, fabLabel].forEach(el => { if (el) el.style.display = user ? '' : 'none'; });
  if (!user) { host.innerHTML = ''; return; }
  // Bell for everyone — feed content is role-scoped (admins: upcoming + due/overdue + activity;
  // engineers: due/overdue for their assigned plants).
  const unread = unreadNotifCount();
  const bell = `
    <button onclick="toggleNotifPanel()" class="relative p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white" title="Notifications" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      ${unread ? `<span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold grid place-items-center">${unread>9?'9+':unread}</span>` : ''}
    </button>`;
  host.innerHTML = `
    <span id="queuePillHost" class="hidden sm:inline-flex items-center">${queuePillHtml()}</span>
    ${bell}
    <div class="flex items-center gap-2 pl-1">
      <div class="text-right leading-tight hidden sm:block">
        <div class="text-xs font-medium text-white">${esc(user.name)}</div>
        <div class="text-[10px] text-white/60">${user.role}</div>
      </div>
      <div class="w-8 h-8 rounded-full bg-white/15 text-white grid place-items-center text-xs font-semibold ring-1 ring-white/20">${initials(user.name)}</div>
      <button onclick="logout()" class="text-xs text-white/60 hover:text-white px-2 py-1" title="Sign out">Sign out</button>
    </div>`;
}
function initials(name) { return name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

// ---------- Notifications (in-app "outbox" — records what would be delivered) ----------
function loadNotifs() { try { return JSON.parse(localStorage.getItem(LS_NOTIF) || '[]'); } catch { return []; } }
function saveNotifs(n) { localStorage.setItem(LS_NOTIF, JSON.stringify(n)); }
// Messages are stored/kept as PLAIN TEXT — the panel escapes at render time.
const NOTIF_MSG = {
  maintenance: (eq, p) => `${eq.tag} put into scheduled maintenance at ${p.name}.`,
  breakdown:   (eq, p) => `Breakdown reported — ${eq.tag} at ${p.name}.`,
  operational: (eq, p) => `${eq.tag} returned to service at ${p.name}.`,
  overdue:     (eq, p, log) => `Maintenance overdue — ${eq.tag} at ${p.name} (expected ${log?.etr || '—'}).`,
};
function pushEventNotification(eventKey, eq, log) {
  const plant = plantById(eq.plantId); if (!plant) return;
  // A stopped machine cannot wait for tomorrow's digest — mail the admins and
  // the engineers assigned to this plant now. Fire-and-forget: a mail problem
  // must never fail the work-order that was just saved.
  if (SUPA && eventKey === 'breakdown' && log && log.id) {
    SUPA.functions.invoke('send-notifications', { body: { mode: 'urgent', logId: log.id } })
      .catch(() => {});
  }
  // The in-app activity feed ALWAYS records events. The per-plant config only
  // controls delivery channels/recipients (Phase 3b) — not whether it's logged.
  const cfg = (plant.notifications && plant.notifications[eventKey]) || { channels: [], recipients: [] };
  const rec = {
    id: 'N-' + Date.now() + '-' + Math.floor(Math.random()*1e4),
    ts: new Date().toISOString(),
    event: eventKey, plantId: eq.plantId, eqId: eq.id,
    channels: cfg.channels.slice(), recipients: (cfg.recipients||[]).slice(),
    message: (NOTIF_MSG[eventKey] || (()=>'Maintenance event'))(eq, plant, log),
    read: false,
  };
  if (SUPA) {
    // Shared activity feed: every admin sees it, on any device.
    SUPA.from('notifications').insert({
      id: rec.id, ts: rec.ts, event: rec.event, plant_id: rec.plantId,
      equipment_id: rec.eqId, channels: rec.channels, recipients: rec.recipients,
      message: rec.message,
    }).then(({ error }) => {
      if (error) { console.warn('notification insert failed', error); return; }
      if (cloudNotifs) cloudNotifs.unshift({ id: rec.id, ts: rec.ts, event: rec.event, message: rec.message, channels: rec.channels, recipients: rec.recipients, plant_id: rec.plantId, equipment_id: rec.eqId });
      renderHeaderChrome();
    });
    return;
  }
  const notifs = loadNotifs();
  notifs.unshift(rec);
  saveNotifs(notifs.slice(0, 200));
}
function sweepOverdue() {
  // Real mode: overdue items are DERIVED in buildNotifFeed (per-user, no
  // storage). Writing them to the shared table from every device would spam it.
  if (SUPA) return;
  let seen; try { seen = JSON.parse(localStorage.getItem(LS_OVERDUE_SEEN) || '[]'); } catch { seen = []; }
  const seenSet = new Set(seen);
  let changed = false;
  state.logs.filter(l => !l.endDate && isOverdue(l)).forEach(l => {
    if (seenSet.has(l.id)) return;
    const eq = eqById(l.equipmentId); if (!eq) return;
    pushEventNotification('overdue', eq, l);
    seenSet.add(l.id); changed = true;
  });
  if (changed) localStorage.setItem(LS_OVERDUE_SEEN, JSON.stringify([...seenSet]));
}
// ---------- Derived notification feed (per-user, role-scoped) ----------
// Admins (Amit / Superadmin): due-today, overdue PPM, overdue work-orders,
// health alerts, and the activity outbox — across ALL plants.
// Engineers: due-today + overdue only, already scoped to their assigned plants
// by getUpcomingPPM / getOverduePPM / getPendingTasks.
function notifSeenKey() { const u = currentUser(); return 'mm.notifSeen.' + (u ? u.id : 'anon'); }
function loadSeenNotifs() { try { return new Set(JSON.parse(localStorage.getItem(notifSeenKey()) || '[]')); } catch { return new Set(); } }
function buildNotifFeed() {
  const u = currentUser(); if (!u) return [];
  const admin = effRole(u) === 'Admin';
  const todayStr = today();
  const feed = [];
  // Technicians' bell covers only THEIR assignments — plant-wide planning
  // noise (PPM slots, other people's jobs) belongs to engineers and admins.
  const techMe = isTechnician() ? currentUser()?.id : null;
  // Open / overdue work-orders
  getPendingTasks().forEach(({ l, e }) => {
    if (techMe && l.assignedTo !== techMe) return;
    if (isOverdue(l)) feed.push({ key: `wo-overdue-${l.id}`, group: 'overdue', date: l.etr, plantId: e.plantId, href: '#/equipment/' + e.id,
      message: `Work-order overdue — ${e.tag} at ${plantName(e.plantId)} (expected ${l.etr}).` });
    else if (woStateOf(l) === 'open') feed.push({ key: `wo-open-${l.id}`, group: 'due', date: l.etr || l.startDate, plantId: e.plantId, href: '#/equipment/' + e.id,
      message: `Scheduled task ready to start — ${e.tag} at ${plantName(e.plantId)}.` });
  });
  // Review traffic: engineers/admins see what awaits their verdict;
  // technicians see what came back to them.
  if (!techMe && SUPA) {
    getSubmittedWOs().forEach(({ l, e }) => {
      feed.push({ key: `wo-review-${l.id}`, group: 'due', date: l.endDate, plantId: e.plantId, href: '#/engineer',
        message: `Awaiting your review — ${e.tag} completed by ${l.technician || 'a technician'}.` });
    });
    getOpenIssues().forEach(({ i, e }) => {
      feed.push({ key: `issue-${i.id}`, group: 'due', date: String(i.created_at).slice(0, 10), plantId: e.plantId, href: '#/engineer',
        message: `Issue reported — ${e.tag} ${ISSUE_NEED_LABEL[i.need] || i.need} (${i.raised_name || 'unknown'}).` });
    });
    getSubmittedReports().forEach(r => {
      feed.push({ key: `sr-${r.id}`, group: 'due', date: r.visit_date, plantId: r.plant_id, href: '#/engineer',
        message: `Service report awaiting your signature — ${plantName(r.plant_id)}, ${r.visit_date} (${r.technician_name}).` });
    });
  }
  if (techMe) {
    (cloudReports || []).filter(r => r.technician_id === techMe && r.status === 'changes').forEach(r => {
      feed.push({ key: `sr-chg-${r.id}`, group: 'overdue', date: r.visit_date, plantId: r.plant_id, href: '#/mywork',
        message: `Report needs changes — ${plantName(r.plant_id)}, ${r.visit_date}.` });
    });
    state.logs.filter(l => l.assignedTo === techMe && woStateOf(l) === 'returned').forEach(l => {
      const e = eqById(l.equipmentId); if (!e) return;
      feed.push({ key: `wo-returned-${l.id}`, group: 'overdue', date: l.endDate, plantId: e.plantId, href: '#/mywork',
        message: `Sent back for fixes — ${e.tag}. See your engineer's note in My Work.` });
    });
  }
  if (!techMe) {
  // Overdue PPM (planned date passed, no completion this month)
  getOverduePPM().forEach(({ e, date }) => {
    const ds = dstr(date);
    feed.push({ key: `ppm-overdue-${e.id}-${ds}`, group: 'overdue', date: ds, plantId: e.plantId, href: '#/equipment/' + e.id,
      message: `PPM overdue — ${e.tag} at ${plantName(e.plantId)} (planned ${ds}).` });
  });
  // Due today + (admins only) upcoming within 7 days
  getUpcomingPPM(7).forEach(({ e, date }) => {
    const ds = dstr(date);
    // Only due-today rings here — the 7-day lookahead lives in Engineering
    // Corner's Upcoming tab (one owner per view; the bell never counted it).
    if (ds === todayStr) feed.push({ key: `ppm-due-${e.id}-${ds}`, group: 'due', date: ds, plantId: e.plantId, href: '#/equipment/' + e.id,
      message: `Maintenance due today — ${e.tag} at ${plantName(e.plantId)}.` });
  });
  }
  // Health alerts: equipment in the At Risk / Critical bands (scoped like
  // everything else — admins see all, engineers their assigned plants).
  if (SUPA && !isSimple() && !techMe) {
    const ids = accessiblePlantIds();
    activeEquipment().forEach(e => {
      if (!admin && !ids.includes(e.plantId)) return;
      const hs = healthScore(e);
      if (hs.score >= 60) return;
      feed.push({ key: `health-${e.id}-${hs.band}`, group: 'health', date: todayStr, plantId: e.plantId, href: '#/equipment/' + e.id,
        message: `Health ${hs.band.toLowerCase()} (${hs.score}/100) — ${e.tag} at ${plantName(e.plantId)}.` });
    });
  }
  // Activity (admins only): breakdowns, status changes — shared table in real
  // mode (cross-device), localStorage outbox in prototype mode.
  if (admin) {
    const activity = SUPA
      ? (cloudNotifs || []).map(n => ({ id: n.id, ts: n.ts, event: n.event, message: n.message, channels: n.channels || [], recipients: n.recipients || [], plantId: n.plant_id, eqId: n.equipment_id }))
      : loadNotifs();
    activity.forEach(n => {
      // Parts-research notifications belong to the full tool — a simple-mode
      // admin can't open Review, so the item would be a confusing dead link.
      if (n.event === 'import_review' && isSimple()) return;
      feed.push({ key: n.id, group: 'activity', date: n.ts, event: n.event, plantId: n.plantId,
        href: n.event === 'import_review' ? '#/review' : (n.eqId ? '#/equipment/' + n.eqId : null),
        message: n.message, channels: n.channels, recipients: n.recipients });
    });
  }
  // Fresh activity belongs right under "Due today" (newest first).
  const order = { overdue: 0, due: 1, health: 2, activity: 3 };
  return feed.sort((a, b) =>
    (order[a.group] - order[b.group]) ||
    (a.group === 'activity'
      ? String(b.date).localeCompare(String(a.date))   // activity: newest first
      : String(a.date).localeCompare(String(b.date)))); // schedule items: soonest first
}
// Badge counts every unseen item — the feed now only carries actionable
// groups (overdue / due today / health / activity).
function unreadNotifCount() {
  const seen = loadSeenNotifs();
  return buildNotifFeed().filter(n => !seen.has(n.key)).length;
}
// Panel filters (plant + time window)
function applyNotifFilters(feed) {
  let out = feed;
  if (ui.notifPlant !== 'all') out = out.filter(n => n.plantId === ui.notifPlant || !n.plantId);   // batch-level items (no plant) always show
  if (ui.notifTime !== 'all') {
    const days = { today: 0, '7d': 7, '30d': 30 }[ui.notifTime];
    const t = new Date(today() + 'T00:00:00');
    out = out.filter(n => {
      // Activity carries full ISO timestamps — compare LOCAL dates (IST-safe).
      const ds = n.group === 'activity' ? dstr(new Date(n.date)) : String(n.date).slice(0, 10);
      const d = new Date(ds + 'T00:00:00');
      const diff = Math.abs(Math.round((d - t) / 86400000));
      return ui.notifTime === 'today' ? diff === 0 : diff <= days;
    });
  }
  return out;
}
// Relative timestamps for the panel ("2h ago", "Yesterday", "12 Aug").
function timeAgo(ts) {
  const d = new Date(ts); if (isNaN(d)) return '';
  const sec = (Date.now() - d.getTime()) / 1000;
  if (sec < 60) return 'just now';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ago';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ago';
  if (sec < 7 * 86400) return Math.floor(sec / 86400) + 'd ago';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function notifWhen(n) {
  if (n.group === 'activity') return timeAgo(n.date);
  const ds = String(n.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return '';
  if (ds === today()) return 'Today';
  const diff = Math.round((new Date(ds + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return new Date(ds + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function markNotifSeen(key) {
  const seen = loadSeenNotifs(); seen.add(key);
  localStorage.setItem(notifSeenKey(), JSON.stringify([...seen].slice(-1000)));
}
function notifGo(href, key) {
  markNotifSeen(key);
  document.getElementById('notifPanel')?.remove();
  renderHeaderChrome();
  if (location.hash === href) route(); else location.hash = href;
}
const NOTIF_GROUPS = [
  // key, label, accent colour, icon background, icon path (24×24 stroke)
  ['overdue',  'Overdue',           '#dc2626', '#fef2f2', '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'],
  ['due',      'Due today',         '#b45309', '#fffbeb', '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'],
  ['health',   'Health alerts',     '#be123c', '#fff1f2', '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'],
  ['activity', 'Recent activity',   '#193458', '#f1f4f9', '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'],
];
function notifPanelBody() {
  const feed = applyNotifFilters(buildNotifFeed());
  const seen = loadSeenNotifs();
  const userName = id => (state.users.find(x => x.id === id)?.name || id);
  const chLabel = ch => ch === 'sms' ? 'SMS' : ch.charAt(0).toUpperCase() + ch.slice(1);
  const sections = NOTIF_GROUPS.map(([key, label, color, bg, icon]) => {
    const items = feed.filter(n => n.group === key);
    if (!items.length) return '';
    const rows = items.map(n => {
      const isSeen = seen.has(n.key);
      const meta = [notifWhen(n)];
      if (n.group === 'activity' && n.channels?.length) meta.push('via ' + esc(n.channels.map(chLabel).join(', ')));
      if (n.group === 'activity' && n.recipients?.length) meta.push('→ ' + esc(n.recipients.map(userName).join(', ')));
      return `
      <div class="notif-item ${isSeen ? '' : 'unseen'} ${n.href ? 'clickable' : ''}" ${n.href ? `onclick="notifGo('${n.href}', '${n.key}')"` : ''}>
        <div class="n-icon" style="background:${bg};color:${color}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </div>
        <div class="flex-1 min-w-0">
          <div class="n-msg">${esc(n.message)}</div>
          <div class="n-meta">${meta.filter(Boolean).join(' · ')}</div>
        </div>
        ${n.href ? '<svg class="n-go" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' : ''}
        ${isSeen ? '' : '<span class="n-unread"></span>'}
      </div>`;
    }).join('');
    return `<div>
      <div class="notif-group-h"><span class="g-dot" style="background:${color}"></span>${label}<span class="g-count">${items.length}</span></div>
      ${rows}</div>`;
  }).join('');
  const filtered = ui.notifPlant !== 'all' || ui.notifTime !== 'all';
  return sections || `
    <div class="notif-empty">
      <div class="ne-ring"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
      <div class="text-sm font-semibold text-slate-700">${filtered ? 'Nothing matches these filters' : 'All caught up'}</div>
      <div class="text-xs text-slate-500 mt-1">${filtered ? 'Try widening the plant or time window.' : 'Nothing due, overdue, or waiting on you.'}</div>
    </div>`;
}
function refreshNotifPanel() {
  const body = document.getElementById('notifPanelBody');
  if (body) body.innerHTML = notifPanelBody();
}
function toggleNotifPanel() {
  const existing = document.getElementById('notifPanel');
  if (existing) { existing.remove(); return; }
  const unread = unreadNotifCount();
  const plantOpts = ['<option value="all">All plants</option>'].concat(
    state.plants.filter(p => accessiblePlantIds().includes(p.id))
      .map(p => `<option value="${p.id}" ${ui.notifPlant===p.id?'selected':''}>${esc(p.name)}</option>`)
  ).join('');
  const seg = [['all','All'],['today','Today'],['7d','7d'],['30d','30d']]
    .map(([v,l]) => `<button type="button" class="${ui.notifTime===v?'on':''}" onclick="ui.notifTime='${v}'; [...this.parentElement.children].forEach(b=>b.classList.toggle('on', b===this)); refreshNotifPanel()">${l}</button>`).join('');
  pushOverlayState();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="notifPanel" class="fixed inset-0 z-[70]">
      <div class="absolute inset-0 notif-backdrop" onclick="document.getElementById('notifPanel').remove()"></div>
      <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white notif-sheet flex flex-col">
        <div class="notif-head px-5 py-3.5 flex items-center gap-2.5">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <div class="font-semibold text-[15px]">Notifications</div>
          ${unread ? `<span class="nh-count">${unread} new</span>` : ''}
          <div class="ml-auto flex items-center gap-1.5">
            ${unread ? '<button class="nh-action" onclick="markAllNotifsRead()">Mark all read</button>' : ''}
            <button onclick="document.getElementById('notifPanel').remove()" class="text-white/70 hover:text-white text-xl leading-none px-1.5" aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="px-4 py-2.5 border-b border-slate-200 flex items-center gap-2 bg-white flex-wrap">
          <select onchange="ui.notifPlant=this.value; refreshNotifPanel()" class="flex-1 min-w-[150px] border border-slate-300 rounded-md px-2 py-1.5 text-xs bg-white">${plantOpts}</select>
          <div class="notif-seg ml-auto">${seg}</div>
        </div>
        <div id="notifPanelBody" class="flex-1 overflow-y-auto">${notifPanelBody()}</div>
      </div>
    </div>`);
}
function markAllNotifsRead() {
  const seen = loadSeenNotifs();
  buildNotifFeed().forEach(n => seen.add(n.key));
  localStorage.setItem(notifSeenKey(), JSON.stringify([...seen].slice(-1000)));
  renderHeaderChrome();
  const panel = document.getElementById('notifPanel');
  if (panel) { panel.remove(); toggleNotifPanel(); }
}

// ---------- Reusable controls ----------
// Suggestive filter: a search box whose datalist offers the page's REAL values
// (tags, makes, plants, people) as type-ahead suggestions.
function suggestFilter({ id, listId, placeholder, options, oninput, width = 'w-44', value = '' }) {
  const opts = [...new Set(options.filter(Boolean).map(o => String(o).trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b)).slice(0, 300)
    .map(o => `<option value="${o.replace(/"/g, '&quot;')}"></option>`).join('');
  return `<input id="${id}" list="${listId}" autocomplete="off" placeholder="${placeholder}" value="${String(value).replace(/"/g, '&quot;')}"
      class="border border-slate-300 rounded-md px-3 py-1.5 text-sm ${width}" oninput="${oninput}" /><datalist id="${listId}">${opts}</datalist>`;
}
// Generic live row filter for any table body.
function filterRows(sel, q) {
  q = (q || '').toLowerCase();
  document.querySelectorAll(sel).forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}
function plantFilterControl() {
  const ids = accessiblePlantIds();
  const visible = state.plants.filter(p => ids.includes(p.id));
  const allLabel = effRole(currentUser()) === 'Admin' ? 'All plants' : 'All my plants';
  const opts = [`<option value="all">${allLabel}</option>`].concat(
    visible.map(p => `<option value="${p.id}" ${ui.plantFilter===p.id?'selected':''}>${p.name}</option>`)
  ).join('');
  return `<select onchange="ui.plantFilter=this.value; route()" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white">${opts}</select>`;
}
// Restrict to accessible plants first, then apply the chosen plant filter.
function applyPlantFilter(eq) {
  const ids = accessiblePlantIds();
  let scoped = (effRole(currentUser()) === 'Admin') ? eq : eq.filter(e => ids.includes(e.plantId));
  return ui.plantFilter === 'all' ? scoped : scoped.filter(e => e.plantId === ui.plantFilter);
}
function applyTypeFilter(eq)  { return ui.typeFilter  === 'all' ? eq : eq.filter(e => e.type      === ui.typeFilter);  }
function typeFilterControl() {
  const opts = ['<option value="all">All types</option>'].concat(
    EQ_TYPES.map(t => `<option value="${t}" ${ui.typeFilter===t?'selected':''}>${t}</option>`)
  ).join('');
  return `<select onchange="ui.typeFilter=this.value; route()" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white">${opts}</select>`;
}
function addEquipmentBtn() {
  // Admins everywhere; engineers at their own plants (enforced by RLS too).
  if (!isAdmin() && effRole(currentUser()) !== 'Engineer') return '';
  return `<button onclick="openAddEquipmentModal()" class="px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-800 text-sm font-medium inline-flex items-center gap-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
    Add Equipment
  </button>`;
}

// ---------- Dashboard ----------
function renderDashboard() {
  let eq = applyTypeFilter(applyPlantFilter(activeEquipment()));
  const total = eq.length;
  const op = eq.filter(e => e.status === 'Operational').length;
  const mt = eq.filter(e => e.status === 'In Maintenance').length;
  const bd = eq.filter(e => e.status === 'Broken Down').length;

  // The dashboard's one table: what's out of service right now. Full lists
  // live on the Equipment page — the KPI cards deep-link there, pre-filtered.
  const down = eq.filter(e => e.status !== 'Operational');

  const KPI_ICONS = {
    total: ['#f1f4f9', '#193458', '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'],
    op:    ['#f0fdf4', '#15803d', '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'],
    mt:    ['#fffbeb', '#b45309', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'],
    bd:    ['#fef2f2', '#b91c1c', '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'],
  };
  const KPI_DEST = { total: 'all', op: 'Operational', mt: 'In Maintenance', bd: 'Broken Down' };
  const card = (key, label, value, numCls) => {
    const [bg, color, icon] = KPI_ICONS[key] || KPI_ICONS.total;
    return `<button onclick="ui.eqStatusFilter='${KPI_DEST[key] || 'all'}'; location.hash='#/equipment'"
        title="Open in the Equipment list"
        class="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-brand transition flex items-start gap-3">
      <div class="flex-1 min-w-0">
        <div class="text-xs uppercase tracking-wide text-slate-500">${label}</div>
        <div class="text-3xl font-semibold mt-1 ${numCls||''}">${value}</div>
      </div>
      <div class="w-9 h-9 rounded-xl grid place-items-center shrink-0" style="background:${bg};color:${color}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
      </div>
    </button>`;
  };

  const downRows = down.map(e => {
    const log = openLogFor(e.id);
    const et = ecStatus(log?.etr, log?.endDate);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.location)}</div></td>
      <td><div class="cell-primary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${log ? log.reason : '—'}</div><div class="cell-muted">${log ? 'Tech: ' + esc(log.technician) : ''}</div></td>
      <td><div class="cell-primary">${fmt(log?.startDate)}</div><div class="cell-muted">Expected: ${fmt(log?.etr)}</div></td>
      <td><span class="${et.cls}">${et.label}</span></td>
      <td>${statusBadge(e.status)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="py-6 text-center text-slate-500">Everything is operational — nothing out of service right now.</td></tr>`;

  const heading = 'Currently out of service';

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <h1 class="text-2xl font-semibold" data-tour="dashboard-h1">Plant Maintenance Dashboard</h1>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        ${typeFilterControl()}
        ${addEquipmentBtn()}
      </div>
    </div>
    <p class="text-slate-500 mb-6">Live status across your plants. Click a card to open that list on the Equipment page.</p>

    <div data-tour="kpi-cards" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      ${card('total','Total Equipment', total, 'text-slate-800')}
      ${card('op','Operational',         op,    'text-green-700')}
      ${card('mt','In Maintenance',      mt,    'text-brand')}
      ${card('bd','Broken Down',         bd,    'text-red-600')}
    </div>

    <div data-tour="out-of-service" class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-200 flex items-center">
        <div class="font-semibold">${heading}</div>
        <div class="ml-auto text-sm text-slate-500">${down.length} equipment</div>
      </div>
      <div class="overflow-x-auto">
        <table class="list-table">
          <thead><tr>
            <th>Equipment</th><th>Plant</th><th>Type / Model</th><th>Reason</th>
            <th>Start / Expected Completion</th><th>Due</th><th>Status</th>
          </tr></thead>
          <tbody>${downRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Equipment list ----------
function renderEquipment() {
  const sf = ui.eqStatusFilter || 'all';
  let eq = applyTypeFilter(applyPlantFilter(activeEquipment()));
  if (sf !== 'all') eq = eq.filter(e => e.status === sf);
  const samePlant = ui.plantFilter !== 'all';
  const rows = eq.map(e => {
    const log = openLogFor(e.id);
    const openWo = openLogFor(e.id);
    const action = isTechnician()
      ? (openWo && openWo.assignedTo === currentUser()?.id
          ? `<a href="#/mywork" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium whitespace-nowrap inline-block">Open in My Work</a>`
          : `<span class="text-xs text-slate-400">—</span>`)
      : (openWo && woStateOf(openWo) === 'open')
      ? `<div class="inline-flex gap-1.5"><button class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap" onclick="startWorkOrder('${openWo.id}')">Start Work</button><button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium whitespace-nowrap" onclick="openCompleteModal('${e.id}')" title="Done on the spot — record start and completion in one go">Complete now</button></div>`
      : e.status === 'Operational'
        ? `<button title="Start work now — this takes the machine out of service and puts the job on someone's queue." class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium whitespace-nowrap" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
        : `<button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium whitespace-nowrap" onclick="openCompleteModal('${e.id}')">Mark Operational</button>`;
    const hs = SUPA && !isSimple() ? healthScore(e) : null;
    // On phones this row is rendered as a card, where each cell shows its own
    // label -- so a cell with no content must be dropped rather than print an
    // empty "Expected completion —" line.
    const etrEmpty = !(log && log.etr) ? ' c-hide' : '';
    return `<tr>
      <td data-label="Equipment" class="c-title"><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.location)}</div></td>
      <td data-label="Plant"${samePlant ? ' class="c-hide"' : ''}><div class="cell-primary">${esc(plantName(e.plantId))}</div></td>
      <td data-label="Type"><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div>${SUPA && !isSimple() && isAdmin() && !isValveType(e.type) && !partsFor(e.id).length ? '<div class="text-[10px] font-medium text-amber-600 mt-0.5">No parts recorded</div>' : ''}</td>
      <td data-label="Expected completion" class="c-etr${etrEmpty}"><div class="cell-primary">${log?.etr ? log.etr : '—'}</div><div class="cell-muted">${log ? log.reason : ''}</div></td>
      ${hs ? `<td data-label="Health" class="col-center">${healthBadge(hs.score)}</td>` : ''}
      <td data-label="Status" class="col-center">${statusBadge(e.status)}</td>
      <td class="col-center c-action">${action}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="${SUPA && !isSimple() ? 7 : 6}" class="py-6 text-center text-slate-500">${
    (sf !== 'all' || ui.typeFilter !== 'all')
      ? 'No equipment matches these filters — try clearing the status or type filter above.'
      : 'No equipment for this plant.'}</td></tr>`;

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-4 flex-wrap gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-semibold">Equipment</h1>
        <p class="text-slate-500 text-sm truncate">Click an equipment tag to view its full maintenance history.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        ${typeFilterControl()}
        <select onchange="ui.eqStatusFilter=this.value; renderEquipment()" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white">
          ${[['all','All statuses'],['Operational','Operational'],['In Maintenance','In Maintenance'],['Broken Down','Broken Down']]
            .map(([v, l]) => `<option value="${v}" ${sf === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        ${suggestFilter({ id: 'eqSearch', listId: 'eqSuggest', placeholder: 'Filter…',
          options: eq.flatMap(x => [x.tag, x.make, x.model, x.location]),
          oninput: 'filterEq(this.value)', width: 'w-40' })}
        ${addEquipmentBtn()}
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="list-table" id="eqTable">
          <thead><tr>
            <th>Equipment</th><th>Plant</th><th>Type / Model</th>
            <th>Expected Completion</th>${SUPA && !isSimple() ? '<th class="col-center">Health</th>' : ''}<th class="col-center">Status</th><th class="col-center">Action</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}
function filterEq(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#eqTable tbody tr').forEach(tr => {
    tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ---------- Equipment detail ----------
function renderEquipmentDetail(id) {
  const e = eqById(id);
  if (!e) { document.getElementById('view').innerHTML = `<p>Equipment not found. <a class="text-brand" href="#/equipment">Back</a></p>`; return; }
  if (!canAccessPlant(e.plantId)) {
    document.getElementById('view').innerHTML = `<div class="bg-white rounded-xl border border-slate-200 p-8 text-center"><div class="text-slate-800 font-semibold mb-1">No access</div><div class="text-slate-500 text-sm mb-4">This equipment belongs to a plant you're not assigned to.</div><a class="text-brand hover:underline text-sm" href="#/equipment">&larr; Back to equipment</a></div>`;
    return;
  }
  const logs = state.logs.filter(l => l.equipmentId === id).sort((a,b) => b.startDate.localeCompare(a.startDate));
  const open = logs.find(l => !l.endDate);

  const timeline = logs.map(l => `
    <div class="relative pl-6 pb-5 border-l-2 ${l.endDate ? 'border-slate-200' : (isOverdue(l) ? 'border-red-400' : 'border-brand')}">
      <div class="absolute -left-[7px] top-1 w-3 h-3 rounded-full ${l.endDate ? 'bg-slate-300' : (isOverdue(l) ? 'bg-red-400' : 'bg-brand')}"></div>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        ${reasonBadge(l.reason)}
        ${woRef(l)}
        <span class="text-slate-500">${l.startDate} → ${l.endDate || 'ongoing'}</span>
        ${l.endDate
          ? `<span class="text-xs text-slate-400">(${daysBetween(l.startDate, l.endDate)} day${daysBetween(l.startDate,l.endDate)===1?'':'s'})</span>`
          : `<span class="text-xs ${isOverdue(l)?'text-red-600 font-medium':'text-brand'}">Expected ${l.etr || '—'}</span>`}
      </div>
      <div class="text-sm text-slate-700 mt-1"><span class="font-medium">Reason:</span> ${esc(l.notes) || '—'}</div>
      ${l.completionNotes ? `<div class="text-sm text-slate-700 mt-1"><span class="font-medium">Completion notes:</span> ${esc(l.completionNotes)}</div>` : ''}
      ${(() => {
        const acts = isSimple() ? [] : partActionsFor(l);
        if (!acts.length) return '';
        const replaced = acts.filter(a => a.action === 'replaced').map(a => esc(a.part_name));
        const serviced = acts.filter(a => a.action === 'serviced').map(a => esc(a.part_name));
        return `<div class="text-xs mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          ${replaced.length ? `<span class="text-red-700"><span class="font-medium">Replaced:</span> ${replaced.join(', ')}</span>` : ''}
          ${serviced.length ? `<span class="text-slate-600"><span class="font-medium">Serviced:</span> ${serviced.join(', ')}</span>` : ''}
        </div>`;
      })()}
      ${Array.isArray(l.checklist) && l.checklist.length ? `
        <details class="mt-1">
          <summary class="text-xs text-brand cursor-pointer">Checklist: ${l.checklist.filter(c=>c.done).length}/${l.checklist.length} completed</summary>
          <ul class="mt-1 space-y-0.5">
            ${l.checklist.map(c => `<li class="text-xs ${c.done ? 'text-slate-600' : 'text-slate-400'}">${c.done ? '✓' : '○'} ${esc(c.text)}${c.mandatory ? ' *' : ''}</li>`).join('')}
          </ul>
        </details>` : ''}
      <div class="text-xs text-slate-500 mt-1">Technician: ${esc(l.technician)}</div>
    </div>
  `).join('') || `<div class="text-slate-500 text-sm">No maintenance history yet.</div>`;

  const retired = e.status === 'Retired';
  const detailOpenWo = openLogFor(e.id);
  // Technicians act from My Work; on the equipment page they get a link to
  // their own assignment (if any) rather than status-change controls.
  // For engineers/admins, an OPEN assigned work order also offers Reassign.
  let actionBtn = '';
  if (!retired && isTechnician()) {
    actionBtn = (detailOpenWo && detailOpenWo.assignedTo === currentUser()?.id)
      ? `<a href="#/mywork" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium inline-block">Open in My Work</a>` : '';
  } else if (!retired) {
    const reassign = (detailOpenWo && SUPA && technicianAccounts().length)
      ? `<button onclick="openReassignModal('${detailOpenWo.id}')" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium">Reassign</button>` : '';
    const main = (detailOpenWo && woStateOf(detailOpenWo) === 'open')
      ? `<span class="inline-flex gap-2"><button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium" onclick="startWorkOrder('${detailOpenWo.id}')">Start Work</button><button class="px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium" onclick="openCompleteModal('${e.id}')" title="Done on the spot — record start and completion in one go">Complete now</button></span>`
      : e.status === 'Operational'
        ? `<button title="Start work now — this takes the machine out of service and puts the job on someone's queue." class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
        : `<button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium" onclick="openCompleteModal('${e.id}')">Mark Operational</button>`;
    actionBtn = reassign + main;
  }
  const replaceBtn = (!retired && isValveType(e.type) && !isTechnician())
    ? `<button onclick="openReplaceValveModal('${e.id}')" class="px-3 py-1.5 rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 text-sm font-medium">Replace ${e.type}</button>` : '';

  const hs = SUPA && !retired && !isSimple() ? healthScore(e) : null;

  const retiredBanner = retired ? `
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3 mb-4 text-sm text-amber-800">
      Retired on <b>${e.retiredAt || '—'}</b>${e.replacedBy && eqById(e.replacedBy) ? ` — replaced by ${tagLink(eqById(e.replacedBy))}` : ''}. This record is kept for history.
    </div>` : '';

  // Valve position history: every generation at this position, oldest first.
  const lineage = isValveType(e.type)
    ? state.equipment.filter(x => x.lineageId === e.lineageId).sort((a, b) => String(a.installed).localeCompare(String(b.installed)))
    : [];
  const lineagePanel = lineage.length > 1 ? `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm">Position history <span class="text-slate-400 font-normal">(${lineage.length} generation${lineage.length===1?'':'s'})</span></div>
      <div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Tag</th><th>Make / Model</th><th>Installed</th><th>Retired</th><th>Status</th></tr></thead>
        <tbody>${lineage.map(g => `<tr class="${g.id === e.id ? 'bg-brand-50/40' : ''}">
          <td><div class="cell-primary">${g.id === e.id ? esc(g.tag) + ' <span class="text-[10px] text-slate-400">(this record)</span>' : tagLink(g)}</div></td>
          <td><div class="cell-muted">${esc(g.make)} ${esc(g.model)}</div></td>
          <td><div class="cell-primary">${g.installed || '—'}</div></td>
          <td><div class="cell-primary">${g.retiredAt || '—'}</div></td>
          <td>${statusBadge(g.status)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : '';

  document.getElementById('view').innerHTML = `
    <a href="#/equipment" class="text-sm text-brand hover:underline">&larr; Back to equipment</a>
    ${retiredBanner}
    <div class="bg-white rounded-xl border border-slate-200 p-6 ${retired ? '' : 'mt-3'} mb-6">
      <div class="flex items-start flex-wrap gap-3">
        <div>
          <div class="flex items-center gap-3"><h1 class="text-2xl font-semibold">${esc(e.tag)}</h1>${statusBadge(e.status)}${hs ? `${healthBadge(hs.score)}<button onclick="openHealthModal('${e.id}')" class="health-q w-[18px] h-[18px] rounded-full border border-slate-300 text-slate-500 hover:border-brand hover:text-brand text-[11px] font-semibold leading-none grid place-items-center" title="Why this score?" aria-label="Why this score?">?</button>` : ''}${SUPA && !retired && !isSimple() && isAdmin() && !isValveType(e.type) && !partsFor(e.id).length ? '<span class="badge badge-mt" title="Health scoring stays coarse until parts are recorded">No parts recorded</span>' : ''}</div>
          <div class="text-slate-500 text-sm mt-1">${e.type} · ${esc(e.make)} ${esc(e.model)} · ${esc(plantName(e.plantId))}</div>
        </div>
        <div data-tour="detail-actions" class="ml-auto flex gap-2 flex-wrap">
          ${!retired && isAdmin() ? `<button onclick="openEditEquipmentModal('${e.id}')" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium inline-flex items-center gap-1" title="Edit equipment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            Edit
          </button>` : ''}
          ${SUPA && !retired && !detailOpenWo ? `<button onclick="openIssueModal('${e.id}')" title="Log it for later — the machine keeps running and nobody is assigned yet. An engineer decides what happens next." class="px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-sm font-medium">Report issue</button>` : ''}
          ${exportDropdown(`'${e.id}'`, 'detail-export')}
          ${replaceBtn}
          ${actionBtn}
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div><div class="text-xs uppercase text-slate-500">Plant</div><div>${esc(plantName(e.plantId))}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Installed</div><div>${fmt(e.installed)}</div></div>
        ${isSimple() ? '' : `<div><div class="text-xs uppercase text-slate-500">Expected life</div><div>${expectedLifeFor(e)} yrs${e.expectedLifeYears ? '' : ' <span class="text-[10px] text-slate-400">(type default)</span>'}</div></div>`}
        ${open ? `<div><div class="text-xs uppercase text-slate-500">Expected Completion</div><div>${open.etr || '—'}</div></div>`
          : (() => {
              // No open job — the useful date is the next planned PPM, if any.
              const up = e.slot ? getUpcomingPPM(60).find(x => x.e.id === e.id) : null;
              return up ? `<div><div class="text-xs uppercase text-slate-500">Next PPM Due</div><div>${dstr(up.date)}</div></div>` : '';
            })()}
      </div>
    </div>

    ${eqIssuesStrip(e.id)}
    <h2 class="font-semibold mb-3">Maintenance history</h2>
    <div class="bg-white rounded-xl border border-slate-200 p-6 mb-6">${timeline}</div>

    ${lineagePanel}
    ${isValveType(e.type) || isSimple() ? '' : partsCard(e)}
  `;
}

// "Why this score" breakdown — opened from the small ? beside the header badge.
function openHealthModal(eqId) {
  const e = eqById(eqId); if (!e) return;
  const hs = healthScore(e);
  document.getElementById('modalTitle').textContent = 'Why this score';
  document.getElementById('modalBody').innerHTML = `
    <div class="text-sm space-y-3">
      <div class="flex items-center gap-2.5 flex-wrap">
        ${healthBadge(hs.score)}
        <span class="text-xs text-slate-500">${esc(e.tag)}</span>
      </div>
      <div>
        <div class="text-xs text-slate-500 mb-1.5">Starts at 100, then:</div>
        <div class="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
          ${hs.factors.length ? hs.factors.map(f => `
            <div class="flex items-center gap-2 text-xs">
              <span class="${f.delta < 0 ? 'text-red-600' : 'text-green-700'} font-mono w-10 text-right shrink-0">${f.delta > 0 ? '+' : ''}${f.delta}</span>
              <span class="text-slate-600">${f.label}</span>
            </div>`).join('') : '<div class="text-xs text-slate-400">No deductions — new or spotless record.</div>'}
        </div>
      </div>
      <div class="text-[11px] text-slate-400 border-t border-slate-100 pt-2">
        Bands: <span class="text-green-700 font-medium">Good ≥ 80</span> · <span class="text-amber-600 font-medium">Watch ≥ 60</span> · <span class="text-orange-600 font-medium">At Risk ≥ 40</span> · <span class="text-red-600 font-medium">Critical &lt; 40</span>.
        Breakdowns weigh by part criticality, fade with time, and are largely cured when the failed part is replaced.
      </div>
      <div class="flex justify-end pt-1">
        <button onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}

// ---------- Valve replacement (retire old, new tag, same position) ----------
function openReplaceValveModal(eqId) {
  const e = eqById(eqId); if (!e || !isValveType(e.type)) return;
  document.getElementById('modalTitle').textContent = `Replace ${e.type} — ${esc(e.tag)}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitReplaceValve(event, '${eqId}')" class="space-y-3 text-sm">
      <div class="p-2.5 rounded-md bg-amber-50 border border-amber-100 text-xs text-amber-800">
        <b>${esc(e.tag)}</b> will be retired (its history stays intact) and a new ${e.type} takes over this position — same plant and PPM schedule.
      </div>
      <div><label class="block text-xs text-slate-600 mb-1">New tag <span class="text-red-500">*</span></label>
        <input name="newTag" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. NRV-3B" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-600 mb-1">Make</label>
          <input name="make" value="${esc(e.make)}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        <div><label class="block text-xs text-slate-600 mb-1">Model</label>
          <input name="model" value="${esc(e.model)}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
      </div>
      <div><label class="block text-xs text-slate-600 mb-1">Installed on</label>
        <input type="date" name="installed" value="${today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Failure / replacement notes</label>
        <textarea name="notes" rows="3" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Why was it replaced — seized, passing, corroded…"></textarea></div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white">Retire &amp; replace</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitReplaceValve(ev, eqId) {
  ev.preventDefault();
  const e = eqById(eqId); if (!e) return;
  const f = new FormData(ev.target);
  const newId = 'EQ-' + String(Date.now()).slice(-8);
  if (SUPA) {
    const unlock = lockSubmit(ev, 'Replacing…');
    const { error } = await SUPA.rpc('replace_valve', {
      p_old: eqId, p_new_id: newId, p_new_tag: f.get('newTag').trim(),
      p_make: (f.get('make') || '').trim(), p_model: (f.get('model') || '').trim(),
      p_installed: f.get('installed') || today(), p_notes: (f.get('notes') || '').trim(),
    });
    if (error) { unlock(); saveError(error); return; }
    await hydrateCloud();
    closeModal();
    location.hash = '#/equipment/' + newId;
    route();
    pushEventNotification('breakdown', e, { etr: today() });
    toast(`${esc(e.tag)} retired — ${esc(f.get('newTag'))} is now in service at this position.`);
    return;
  }
  appAlert('Valve replacement requires the live database.');
}

// ---------- Parts & specifications (BOM) ----------
function partsCard(e) {
  if (!SUPA) return '';   // parts live in the database; not part of the offline prototype
  const parts = partsFor(e.id);
  const critBadge = c => c >= 8 ? 'badge-bd' : c >= 5 ? 'badge-mt' : 'badge-neutral';
  const rows = parts.map(p => `<tr>
      <td><div class="cell-primary">${esc(p.name)}</div>${p.source === 'ai' && safeUrl(p.source_url) ? `<div class="cell-muted"><a href="${esc(safeUrl(p.source_url))}" target="_blank" rel="noopener" class="text-brand hover:underline">source</a></div>` : ''}</td>
      <td><div class="cell-muted">${esc(p.spec) || '—'}</div></td>
      <td><div class="cell-primary">${p.qty}</div></td>
      ${isAdmin() ? `<td><span class="badge ${critBadge(p.criticality)}">${p.criticality}/10</span></td>` : ''}
      <td><div class="cell-primary">${p.last_serviced || '—'}</div><div class="cell-muted">${p.last_replaced ? 'replaced ' + p.last_replaced : 'never replaced'}</div></td>
      ${isAdmin() ? `<td class="col-center"><div class="flex gap-1.5 justify-center">
        <button onclick="openEditPartModal(${p.id})" class="text-xs px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Edit</button>
        <button onclick="deletePart(${p.id})" class="text-xs px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Remove</button>
      </div></td>` : ''}
    </tr>`).join('');
  return `
    <details class="parts-details bg-white rounded-xl border border-slate-200 overflow-hidden mb-6" ${isAdmin() && !parts.length ? 'open' : ''}>
      <summary class="px-5 py-3 cursor-pointer select-none flex items-center flex-wrap gap-2 hover:bg-slate-50/60">
        <svg class="parts-chevron shrink-0 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        <span class="font-semibold text-sm">Parts &amp; specifications</span>
        <span class="text-xs text-slate-400">${parts.length ? parts.length + ' part' + (parts.length === 1 ? '' : 's') : 'none recorded'}</span>
      </summary>
      <div class="border-t border-slate-200">
      ${isAdmin() ? `<div class="px-5 py-2.5 border-b border-slate-100 flex gap-2 justify-end bg-slate-50/40">
        <button onclick="openAddPartModal('${e.id}')" class="text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium">Add part</button>
        <button onclick="openEnrichModal('${e.id}')" class="text-xs px-2.5 py-1 rounded-md bg-brand hover:bg-brand-800 text-white font-medium">Auto-fill from web (AI)</button>
      </div>` : ''}
      ${parts.length ? `<div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Part</th><th>Specification</th><th>Qty</th>${isAdmin() ? '<th>Criticality</th>' : ''}<th>Last serviced</th>${isAdmin() ? '<th class="col-center">Action</th>' : ''}</tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`
      : `<div class="px-5 py-6 text-center text-sm text-slate-500">No parts recorded yet.${isAdmin() ? ' Add them manually or auto-fill from the manufacturer\'s datasheet.' : ''}</div>`}
      </div>
    </details>`;
}
function openPartFormModal(eqId, partId) {
  if (!isAdmin()) return;
  const part = partId ? (cloudParts || []).find(x => x.id === partId) : null;
  const q = v => String(v == null ? '' : v).replace(/"/g, '&quot;');
  document.getElementById('modalTitle').textContent = part ? `Edit ${part.name}` : 'Add part';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitPartForm(event, '${eqId}', ${partId || 'null'})" class="space-y-3 text-sm">
      <div><label class="block text-xs text-slate-600 mb-1">Part name <span class="text-red-500">*</span></label>
        <input name="name" required value="${part ? q(part.name) : ''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Ball bearing (drive end)" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Specification</label>
        <input name="spec" value="${part ? q(part.spec) : ''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. 6309-2Z, 45mm bore" /></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-600 mb-1">Quantity</label>
          <input name="qty" type="number" min="1" value="${part ? part.qty : 1}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        <div><label class="block text-xs text-slate-600 mb-1">Criticality (1–10)</label>
          <input name="criticality" type="number" min="1" max="10" value="${part ? part.criticality : 5}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
      </div>
      <div class="text-[11px] text-slate-500">Criticality drives the health score: 10 = failure stops the machine (motor), 1 = cosmetic/minor (filter pad). Engineers never see this number.</div>
      <div class="flex gap-2 justify-end pt-2 flex-wrap">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        ${part ? '' : '<button type="submit" name="action" value="again" class="px-3 py-1.5 rounded-md border border-brand bg-white text-brand hover:bg-brand-50">Save &amp; add another</button>'}
        <button type="submit" name="action" value="save" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">${part ? 'Save changes' : 'Add part'}</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
  setTimeout(() => document.querySelector('#modalBody input[name="name"]')?.focus(), 30);
}
function openAddPartModal(eqId) { openPartFormModal(eqId, null); }
function openEditPartModal(partId) {
  const part = (cloudParts || []).find(x => x.id === partId);
  if (part) openPartFormModal(part.equipment_id, partId);
}
async function submitPartForm(ev, eqId, partId) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA) return;
  const again = !partId && submitterOf(ev)?.value === 'again';
  const f = new FormData(ev.target);
  const unlock = lockSubmit(ev);
  const fields = {
    name: f.get('name').trim(), spec: (f.get('spec') || '').trim(),
    qty: parseInt(f.get('qty'), 10) || 1,
    criticality: Math.min(10, Math.max(1, parseInt(f.get('criticality'), 10) || 5)),
  };
  const { error } = partId
    ? await SUPA.from('equipment_parts').update(fields).eq('id', partId)
    : await SUPA.from('equipment_parts').insert({ equipment_id: eqId, source: 'manual', ...fields });
  if (error) { unlock(); saveError(error); return; }
  await hydrateCloud();
  route();
  if (again) { openPartFormModal(eqId, null); toast('Part added — next one.'); return; }
  closeModal();
  toast(partId ? 'Part updated.' : 'Part added.');
}
async function deletePart(partId) {
  if (!isAdmin() || !SUPA) return;
  if (!await appConfirm('Remove this part from the assembly?', 'Remove part')) return;
  const { error } = await SUPA.from('equipment_parts').delete().eq('id', partId);
  if (error) { saveError(error); return; }
  await hydrateCloud();
  route();
}

// ---------- AI enrichment (make/model → datasheet → draft BOM) ----------
window._enrich = null;   // { eqId, variant, draft }

function openEnrichModal(eqId) {
  if (!isAdmin() || !SUPA) return;
  const e = eqById(eqId); if (!e) return;
  if (!e.make || !e.model) {
    // No dead-end: open the edit form right here instead of describing where it is.
    toast('Add Make & Model first — the search uses exactly what you enter.');
    openEditEquipmentModal(eqId);
    return;
  }
  window._enrich = { eqId, variant: null, draft: null };
  document.getElementById('modalTitle').textContent = `Auto-fill — ${esc(e.tag)}`;
  enrichSetBody(`
    <div class="py-8 text-center">
      <div class="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 border-t-[#193458] animate-spin"></div>
      <div class="text-sm text-slate-600 mt-3">Searching manufacturer data for<br/><b>${esc(e.make)} ${esc(e.model)}</b>…</div>
      <div class="text-xs text-slate-400 mt-1">Usually takes 15–40 seconds.</div>
    </div>`);
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
  runEnrichment(eqId, null);
}
function enrichSetBody(html) { document.getElementById('modalBody').innerHTML = html; }

async function runEnrichment(eqId, variant) {
  const e = eqById(eqId); if (!e) return;
  const budget = await getResearchBudget();
  if (budget.left <= 0) {
    enrichSetBody(`
      <div class="space-y-3 text-sm">
        <div class="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
          Today's AI research budget (${budget.limit} calls) is used up — it resets tomorrow.
          Add this equipment's parts manually, or raise RESEARCH_DAILY_LIMIT if the spend is intended.
        </div>
        <div class="flex justify-end gap-2">
          <button onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button>
          <button onclick="closeModal(); openAddPartModal('${eqId}')" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add manually</button>
        </div>
      </div>`);
    return;
  }
  let data, error;
  try {
    ({ data, error } = await SUPA.functions.invoke('enrich-equipment', {
      body: { make: e.make, model: e.model, eqType: e.type, variant: variant || undefined },
    }));
  } catch (err) { error = err; }
  if (!error || error.name === 'FunctionsHttpError' || error.name === 'FunctionsRelayError') bumpResearchUsage();   // answered = spent
  if (error) {
    let msg = error.message || String(error);
    try { const j = await error.context.json(); if (j) msg = j.message || j.error || msg; } catch {}
    const budgetHit = /budget_exhausted/i.test(msg);
    const notConfigured = /not_configured|ANTHROPIC_API_KEY/i.test(msg);
    enrichSetBody(`
      <div class="space-y-3 text-sm">
        <div class="p-3 rounded-md ${notConfigured || budgetHit ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 border border-red-200 text-red-700'}">
          ${budgetHit
            ? 'Today\'s AI research budget is used up — it resets at midnight. Add the parts manually, or try again tomorrow.'
            : notConfigured
              ? 'AI enrichment isn\'t configured yet. Add your Anthropic API key in Supabase → Edge Functions → Secrets as <b>ANTHROPIC_API_KEY</b>, then try again.'
              : 'Search failed: ' + esc(msg)}
        </div>
        <div class="flex justify-end"><button onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button></div>
      </div>`);
    return;
  }
  if (data.status === 'ambiguous' && Array.isArray(data.options) && data.options.length) {
    enrichShowOptions(eqId, data.options);
  } else if (data.status === 'match' && data.data) {
    window._enrich.variant = variant;
    window._enrich.draft = data.data;
    enrichShowReview(eqId);
  } else {
    enrichSetBody(`
      <div class="space-y-3 text-sm">
        <div class="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
          No reliable manufacturer data found for this make and model. Double-check the spelling
          (nameplates help), or add the parts manually.
        </div>
        <div class="flex justify-end gap-2">
          <button onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button>
          <button onclick="closeModal(); openAddPartModal('${eqId}')" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add manually</button>
        </div>
      </div>`);
  }
}

function enrichShowOptions(eqId, options) {
  const e = eqById(eqId);
  enrichSetBody(`
    <form onsubmit="event.preventDefault(); enrichPickVariant('${eqId}')" class="space-y-3 text-sm">
      <div class="text-slate-700">Multiple variants of <b>${esc(e.make)} ${esc(e.model)}</b> exist — pick the exact one:</div>
      <div class="space-y-2 max-h-[40vh] overflow-y-auto">
        ${options.map((o, i) => `
          <label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="variant" value="${esc(o.variant)}" ${i === 0 ? 'checked' : ''} class="mt-0.5" />
            <div>
              <div class="font-medium text-slate-800">${esc(o.variant)}</div>
              ${o.detail ? `<div class="text-xs text-slate-500">${esc(o.detail)}</div>` : ''}
            </div>
          </label>`).join('')}
      </div>
      <div class="flex gap-2 justify-end pt-1">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Continue with this variant</button>
      </div>
    </form>`);
}
function enrichPickVariant(eqId) {
  const variant = document.querySelector('#modalBody input[name="variant"]:checked')?.value;
  if (!variant) return;
  enrichSetBody(`
    <div class="py-8 text-center">
      <div class="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 border-t-[#193458] animate-spin"></div>
      <div class="text-sm text-slate-600 mt-3">Fetching datasheet for the <b>${esc(variant)}</b> variant…</div>
    </div>`);
  runEnrichment(eqId, variant);
}

function enrichShowReview(eqId) {
  const e = eqById(eqId);
  const d = window._enrich.draft;
  const parts = Array.isArray(d.parts) ? d.parts : [];
  const sources = Array.isArray(d.sources) ? d.sources : [];
  enrichSetBody(`
    <form onsubmit="submitEnrichApprove(event, '${eqId}')" class="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
      <div class="p-2.5 rounded-md bg-brand-50 border border-brand-100 text-xs text-slate-700">
        Draft for <b>${esc(e.make)} ${esc(e.model)}${window._enrich.variant ? ' ' + esc(window._enrich.variant) : ''}</b>
        ${d.power ? ` · Power: <b>${esc(d.power)}</b>` : ''}
        ${parseInt(d.expected_life_years, 10) > 0 ? ` · Expected life: <b>${parseInt(d.expected_life_years, 10)} yrs</b>` : ''}
        — review before saving. Untick anything you don't want; adjust criticality freely.
      </div>
      ${parts.length ? `<div class="border border-slate-200 rounded-md divide-y divide-slate-100">
        ${parts.map((p, i) => `
          <div class="flex items-center gap-2 px-3 py-2">
            <input type="checkbox" name="inc-${i}" checked />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-slate-800">${esc(p.name)}</div>
              <div class="text-[11px] text-slate-500">${esc(p.spec) || 'no spec found'} · qty ${parseInt(p.qty, 10) || 1}</div>
            </div>
            <label class="text-[10px] text-slate-500">Crit
              <input type="number" name="crit-${i}" min="1" max="10" value="${Math.min(10, Math.max(1, p.criticality || 5))}" class="w-12 border border-slate-300 rounded px-1 py-0.5 text-xs ml-1" />
            </label>
          </div>`).join('')}
      </div>` : '<div class="p-3 text-center text-xs text-slate-500 border border-slate-200 rounded-md">The datasheet was found but no parts list could be extracted — add parts manually.</div>'}
      ${sources.filter(safeUrl).length ? `<div class="text-[11px] text-slate-500">Sources: ${sources.filter(safeUrl).slice(0,3).map(s => `<a href="${esc(s)}" target="_blank" rel="noopener" class="text-brand hover:underline break-all">${esc(s.replace(/^https?:\/\//,'').slice(0,50))}</a>`).join(' · ')}</div>` : ''}
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Discard</button>
        ${parts.length ? '<button type="submit" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Approve &amp; save</button>' : ''}
      </div>
    </form>`);
}
async function submitEnrichApprove(ev, eqId) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA || !window._enrich?.draft) return;
  const f = new FormData(ev.target);
  const d = window._enrich.draft;
  const src = safeUrl(Array.isArray(d.sources) && d.sources[0]) || '';
  const rows = (d.parts || [])
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => f.get('inc-' + i))
    .map(({ p, i }) => ({
      equipment_id: eqId, name: String(p.name).slice(0, 200), spec: String(p.spec || '').slice(0, 300),
      qty: Math.max(1, parseInt(p.qty, 10) || 1),
      criticality: Math.min(10, Math.max(1, parseInt(f.get('crit-' + i), 10) || 5)),
      source: 'ai', source_url: src,
    }));
  if (!rows.length) { appAlert('Nothing selected to save.'); return; }
  const unlock = lockSubmit(ev);
  const { error } = await SUPA.from('equipment_parts').insert(rows);
  if (error) { unlock(); saveError(error); return; }
  // A chosen variant refines the model — persist it (e.g. "WX-001" → "WX-001 4.2 kW").
  const eqPatch = {};
  if (window._enrich.variant) {
    const e = eqById(eqId);
    if (e && !e.model.includes(window._enrich.variant)) eqPatch.model = `${e.model} ${window._enrich.variant}`;
  }
  // Datasheet-sourced expected life feeds the health score's fallback chain.
  const lifeYears = parseInt(d.expected_life_years, 10);
  if (lifeYears > 0 && lifeYears < 60) eqPatch.expected_life_years = lifeYears;
  if (Object.keys(eqPatch).length) {
    await SUPA.from('equipment').update(eqPatch).eq('id', eqId);
  }
  await hydrateCloud();
  closeModal(); route();
  toast(`${rows.length} part${rows.length === 1 ? '' : 's'} saved from datasheet.`);
  window._enrich = null;
}

// ---------- My Work (technicians) ----------
// The technician's home: the work orders assigned to their account, split
// into open and completed. Everything they can act on lives here.
function renderMyWork() {
  const me = currentUser()?.id;
  const tab = ui.myWorkTab || 'open';
  const mine = state.logs.filter(l => l.assignedTo === me);
  // "Open" = anything still needing THEIR action: not yet completed, or
  // completed but sent back by the engineer for fixes.
  const open = mine.filter(l => !l.endDate || woStateOf(l) === 'returned')
    .sort((a, b) => String(a.etr || a.startDate).localeCompare(String(b.etr || b.startDate)));
  const done = mine.filter(l => l.endDate && woStateOf(l) !== 'returned')
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate))).slice(0, 100);

  const openRows = open.map(l => {
    const e = eqById(l.equipmentId); if (!e) return '';
    if (woStateOf(l) === 'returned') {
      return `<tr>
        <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div>${woRef(l, 'block mt-0.5')}</td>
        <td><div class="cell-primary">${esc(l.reason)}</div><div class="cell-muted">Engineer's note: ${esc(l.reviewNote || '')}</div></td>
        <td><div class="cell-primary">${l.endDate}</div><div class="cell-muted">Completed, sent back</div></td>
        <td class="col-center"><span class="badge badge-bd">Returned</span></td>
        <td class="col-center"><button class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap" onclick="openResubmitModal('${l.id}')">Fix &amp; resubmit</button></td>
      </tr>`;
    }
    const et = ecStatus(l.etr, null);
    const act = woStateOf(l) === 'open'
      ? `<div class="inline-flex gap-1.5"><button class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap" onclick="startWorkOrder('${l.id}')">Start Work</button><button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium whitespace-nowrap" onclick="openCompleteModal('${l.equipmentId}')" title="Done on the spot — record it in one go">Complete now</button></div>`
      : `<button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium whitespace-nowrap" onclick="openCompleteModal('${l.equipmentId}')">Mark Complete</button>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div>${woRef(l, 'block mt-0.5')}</td>
      <td><div class="cell-primary">${esc(l.reason)}</div><div class="cell-muted">${esc(l.notes || '')}</div></td>
      <td><div class="cell-primary">${l.etr || '—'}</div><div class="cell-muted">Started ${l.startDate}</div></td>
      <td class="col-center"><span class="${et.cls}">${et.label}</span></td>
      <td class="col-center">${act}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" class="py-8 text-center text-slate-500">Nothing assigned to you right now. New jobs appear here the moment an engineer assigns them.</td></tr>`;

  const doneRows = done.map(l => {
    const e = eqById(l.equipmentId); if (!e) return '';
    const chip = woStateOf(l) === 'submitted'
      ? '<span class="badge badge-mt">Awaiting review</span>'
      : '<span class="badge badge-op">Completed</span>';
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div>${woRef(l, 'block mt-0.5')}</td>
      <td><div class="cell-primary">${esc(l.reason)}</div><div class="cell-muted">${esc(l.completionNotes || '')}</div></td>
      <td><div class="cell-primary">${l.endDate}</div><div class="cell-muted">Started ${l.startDate}</div></td>
      <td class="col-center">${chip}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="py-8 text-center text-slate-500">No completed jobs yet — they collect here as you close them.</td></tr>`;

  const visits = SUPA ? myTechVisits(mine) : [];
  const tabBtn = (key, label, count) => `<button onclick="ui.myWorkTab='${key}'; route()"
      class="px-3.5 py-1.5 rounded-full text-sm font-medium border ${tab === key ? 'bg-brand text-white border-brand' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}">${label} (${count})</button>`;

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-semibold">My Work</h1>
        <p class="text-slate-500 text-sm">Jobs assigned to you. Start one when you begin, complete it when the machine is back in service.</p>
      </div>
    </div>
    <div class="flex gap-2 mt-3 mb-4 flex-wrap">${tabBtn('open', 'Open', open.length)}${tabBtn('done', 'Completed', done.length)}${SUPA ? tabBtn('reports', 'Reports', visits.length) : ''}</div>
    ${tab === 'reports' ? renderMyReportsTab(visits) : `<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        ${tab === 'open'
          ? `<table class="list-table"><thead><tr><th>Equipment</th><th>Task</th><th>Expected by</th><th class="col-center">Due status</th><th class="col-center">Action</th></tr></thead><tbody>${openRows}</tbody></table>`
          : `<table class="list-table"><thead><tr><th>Equipment</th><th>Work done</th><th>Completed</th><th class="col-center">Status</th></tr></thead><tbody>${doneRows}</tbody></table>`}
      </div>
    </div>`}`;
}

// ---------- Service reports (technician side) ----------
// One report per plant per visit day, compiled from that day's completed
// jobs. Signature order is enforced server-side: technician -> engineer ->
// client. Once the client signs, the report is locked for good.
function myTechVisits(mine) {
  const byKey = new Map();
  mine.filter(l => l.endDate).forEach(l => {
    const e = eqById(l.equipmentId); if (!e) return;
    const key = e.plantId + '|' + l.endDate;
    if (!byKey.has(key)) byKey.set(key, { plantId: e.plantId, date: l.endDate, jobs: [] });
    byKey.get(key).jobs.push(l);
  });
  return [...byKey.values()].map(v => ({
    ...v,
    // A report says "this work is done". While any job from the day is still
    // with the engineer (submitted) or sent back (returned), that is not yet
    // true -- the server refuses it too, so never offer the button.
    pending: v.jobs.filter(l => ['submitted', 'returned'].includes(woStateOf(l))).length,
  })).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
}
function reportForVisit(plantId, date) {
  return (cloudReports || []).find(r =>
    r.plant_id === plantId && r.visit_date === date && r.technician_id === currentUser()?.id);
}
function renderMyReportsTab(visits) {
  if (!visits.length) return `<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Complete some jobs first — each visit day becomes a report here, signed by you, your engineer, and the client.</div>`;
  const CHIP = {
    submitted:  '<span class="badge badge-mt">With your engineer</span>',
    changes:    '<span class="badge badge-bd">Needs changes</span>',
    eng_signed: '<span class="badge badge-brand">Ready for client signature</span>',
    signed:     '<span class="badge badge-op">Signed &amp; locked</span>',
  };
  const rows = visits.map(v => {
    const r = reportForVisit(v.plantId, v.date);
    const chip = r ? (CHIP[r.status] || '')
      : v.pending ? `<span class="badge badge-mt">${v.pending} job${v.pending === 1 ? '' : 's'} with your engineer</span>`
      : '<span class="badge badge-neutral">Not raised</span>';
    let act;
    if (r && r.status === 'eng_signed' && r.eng_sign?.compiled) {
      // The engineer compiled it — all that is left is the client.
      act = `<button onclick="openClientSignModal('${r.id}')" class="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium whitespace-nowrap">Client sign-off</button>`;
      return `<tr>
        <td><div class="cell-primary">${esc(plantName(v.plantId))}</div><div class="cell-secondary">${v.date}</div></td>
        <td><div class="cell-primary">${v.jobs.length} job${v.jobs.length === 1 ? '' : 's'}</div><div class="cell-muted">Report prepared by your engineer</div></td>
        <td class="col-center"><span class="badge badge-brand">Ready for client signature</span></td>
        <td class="col-center">${act}</td>
      </tr>`;
    }
    if (!r && v.pending) act = `<span class="text-[11px] text-slate-400">Waiting on review</span>`;
    else if (!r) act = `<button onclick="openReportCompose('${v.plantId}', '${v.date}')" class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap">Create &amp; sign</button>`;
    else if (r.status === 'changes') act = `<button onclick="openReportCompose('${v.plantId}', '${v.date}', '${r.id}')" class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap">Fix &amp; resubmit</button>`;
    else if (r.status === 'eng_signed') act = `<button onclick="openClientSignModal('${r.id}')" class="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium whitespace-nowrap">Client sign-off</button>`;
    else act = `<button onclick="openReportView('${r.id}')" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium whitespace-nowrap">View</button>`;
    return `<tr>
      <td><div class="cell-primary">${esc(plantName(v.plantId))}</div><div class="cell-secondary">${v.date}</div></td>
      <td><div class="cell-primary">${v.jobs.length} job${v.jobs.length === 1 ? '' : 's'}</div><div class="cell-muted">${v.jobs.slice(0, 3).map(l => esc(eqById(l.equipmentId)?.tag || '')).join(', ')}${v.jobs.length > 3 ? '…' : ''}</div></td>
      <td class="col-center">${chip}${r && r.status === 'changes' ? `<div class="text-[10px] text-red-600 mt-1">${esc(r.review_note || '')}</div>` : ''}</td>
      <td class="col-center">${act}</td>
    </tr>`;
  }).join('');
  return `<div class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="overflow-x-auto">
    <table class="list-table"><thead><tr><th>Visit</th><th>Work</th><th class="col-center">Report</th><th class="col-center">Action</th></tr></thead><tbody>${rows}</tbody></table>
  </div></div>`;
}
// techId defaults to the signed-in user (the technician raising their own
// report); engineers pass the technician whose visit they are compiling.
function buildReportContent(plantId, date, techId) {
  const tid = techId || currentUser()?.id;
  const tech = (state.users || []).find(u => u.id === tid);
  const jobs = state.logs
    .filter(l => l.assignedTo === tid && l.endDate === date && eqById(l.equipmentId)?.plantId === plantId)
    .map(l => ({ id: l.id, wo_no: l.woNo || null, tag: eqById(l.equipmentId)?.tag || l.equipmentId,
                 reason: l.reason, scope: l.notes || '', done: l.completionNotes || '', state: woStateOf(l) }));
  const issues = (cloudIssues || [])
    .filter(i => i.equipment_id && i.raised_by === tid && String(i.created_at).slice(0, 10) === date
                 && eqById(i.equipment_id)?.plantId === plantId)
    .map(i => ({ tag: eqById(i.equipment_id)?.tag || '', description: i.description, need: i.need }));
  return { plant_id: plantId, plant: plantName(plantId), visit_date: date,
           technician: tech?.name || '', jobs, issues };
}
function openReportCompose(plantId, date, existingId) {
  const content = buildReportContent(plantId, date, currentUser()?.id);
  const r = existingId ? (cloudReports || []).find(x => x.id === existingId) : null;
  document.getElementById('modalTitle').textContent = `Service report — ${esc(plantName(plantId))}, ${date}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitServiceReport(event, '${plantId}', '${date}', '${existingId || ''}')" class="space-y-3 text-sm">
      ${r && r.review_note ? `<div class="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900"><b>Engineer asked:</b> ${esc(r.review_note)}</div>` : ''}
      <div class="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-[38vh] overflow-y-auto">
        ${content.jobs.map(j => `<div class="px-3 py-2">
          <div class="text-xs font-medium text-slate-800">${esc(j.tag)} <span class="text-slate-400 font-normal">· ${esc(j.reason)}</span>${j.wo_no ? ` <span class="font-mono text-[10px] text-slate-400">${esc(j.wo_no)}</span>` : ''}</div>
          <div class="text-[11px] text-slate-500">${esc(j.done) || 'No completion notes.'}</div>
        </div>`).join('')}
        ${content.issues.length ? `<div class="px-3 py-2 bg-amber-50/50">
          <div class="text-[11px] font-medium text-amber-900">Issues reported this visit:</div>
          ${content.issues.map(i => `<div class="text-[11px] text-amber-800">• ${esc(i.tag)}: ${esc(i.description)} (${ISSUE_NEED_LABEL[i.need] || i.need})</div>`).join('')}
        </div>` : ''}
      </div>
      <p class="text-xs text-slate-500">This covers <b>every job you finished at ${esc(plantName(plantId))} on ${date}</b> — ${content.jobs.length} machine${content.jobs.length === 1 ? '' : 's'}, listed above. One report per plant per day.</p>
      <p class="text-xs text-slate-500">Submitting <b>signs this report as you</b> (${esc(currentUser()?.name || '')}) and sends it to your engineer. The client signs last, on your phone.</p>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Sign &amp; submit</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitServiceReport(ev, plantId, date, existingId) {
  ev.preventDefault();
  const unlock = lockSubmit(ev);
  const content = buildReportContent(plantId, date);
  const id = existingId || ('SR-' + String(Date.now()).slice(-8));
  const { error } = await SUPA.rpc('submit_service_report', {
    p_id: id, p_plant: plantId, p_date: date, p_content: content,
  });
  if (error) { unlock(); appAlert('Could not submit the report: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Report signed and sent to your engineer.');
}

// ---------- Client signature pad ----------
function openClientSignModal(reportId) {
  const r = (cloudReports || []).find(x => x.id === reportId); if (!r) return;
  document.getElementById('modalTitle').textContent = 'Client sign-off';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitClientSign(event, '${reportId}')" class="space-y-3 text-sm">
      <p class="text-xs text-slate-500">Hand the phone to the client. Their signature locks the report for
        <b>${esc(plantName(r.plant_id))}, ${r.visit_date}</b> — no edits after this, only amendments.</p>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Sign here</label>
        <canvas id="signPad" class="w-full border-2 border-dashed border-slate-300 rounded-md bg-white touch-none" height="160"></canvas>
        <button type="button" onclick="clearSignPad()" class="text-[11px] text-slate-500 hover:text-brand mt-1">Clear and retry</button>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
          <input name="cname" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Rajesh Kumar" /></div>
        <div><label class="block text-xs text-slate-600 mb-1">Designation</label>
          <input name="cdesig" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Plant In-charge" /></div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white">Sign &amp; lock report</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
  initSignPad();
}
function initSignPad() {
  const cv = document.getElementById('signPad'); if (!cv) return;
  cv.width = cv.offsetWidth; cv.height = 160;
  const ctx = cv.getContext('2d');
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#193458';
  let drawing = false; window._signPadDirty = false;
  const pos = ev => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  cv.onpointerdown = ev => { drawing = true; cv.setPointerCapture(ev.pointerId); ctx.beginPath(); ctx.moveTo(...pos(ev)); ev.preventDefault(); };
  cv.onpointermove = ev => { if (!drawing) return; ctx.lineTo(...pos(ev)); ctx.stroke(); window._signPadDirty = true; ev.preventDefault(); };
  cv.onpointerup = cv.onpointercancel = () => { drawing = false; };
}
function clearSignPad() {
  const cv = document.getElementById('signPad'); if (!cv) return;
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  window._signPadDirty = false;
}
async function submitClientSign(ev, reportId) {
  ev.preventDefault();
  if (!window._signPadDirty) { appAlert('The client needs to draw their signature first.'); return; }
  const f = new FormData(ev.target);
  const cv = document.getElementById('signPad');
  const unlock = lockSubmit(ev);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  const path = `${reportId}/client-sign-${Date.now()}.png`;
  const { error: upErr } = await SUPA.storage.from('wo-media').upload(path, blob, { contentType: 'image/png' });
  if (upErr) { unlock(); appAlert('Could not save the signature image: ' + upErr.message); return; }
  const { error } = await SUPA.rpc('client_sign_report', {
    p_id: reportId, p_name: f.get('cname'), p_designation: f.get('cdesig') || '', p_image_path: path,
  });
  if (error) { unlock(); appAlert('Could not record the signature: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Signed and locked. The report is final.');
}

// ---------- Report view (any role) ----------
async function engineerSignReport(reportId) {
  const { error } = await SUPA.rpc('engineer_review_report', { p_id: reportId, p_approve: true });
  if (error) { appAlert('Could not sign: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Co-signed — the technician can now collect the client signature.');
}
async function openReportChangesModal(reportId) {
  const note = await appPromptText('Request changes', 'What should the technician fix before you sign?', 'e.g. Job on Blower-2 is missing — add it and resubmit.');
  if (note === null) return;
  if (!note.trim()) { appAlert('A note is required.'); return; }
  const { error } = await SUPA.rpc('engineer_review_report', { p_id: reportId, p_approve: false, p_note: note.trim() });
  if (error) { appAlert('Could not send back: ' + error.message); return; }
  await hydrateCloud(); route();
  toast('Sent back to the technician.');
}
function openReportView(reportId) {
  const r = (cloudReports || []).find(x => x.id === reportId); if (!r) return;
  const c = r.content || {};
  const sig = (label, obj, extra) => obj ? `<div class="text-xs"><span class="text-slate-500">${label}:</span> <b>${esc(obj.name || '')}</b>${extra || ''} <span class="text-slate-400">· ${String(obj.ts || '').slice(0, 16).replace('T', ' ')}</span></div>` : '';
  document.getElementById('modalTitle').textContent = `Service report — ${esc(c.plant || r.plant_id)}, ${r.visit_date}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="space-y-3 text-sm">
      <div class="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-[36vh] overflow-y-auto">
        ${(c.jobs || []).map(j => `<div class="px-3 py-2">
          <div class="text-xs font-medium text-slate-800">${esc(j.tag)} <span class="text-slate-400 font-normal">· ${esc(j.reason)}</span>${j.wo_no ? ` <span class="font-mono text-[10px] text-slate-400">${esc(j.wo_no)}</span>` : ''}</div>
          <div class="text-[11px] text-slate-500">${esc(j.done) || 'No completion notes.'}</div>
        </div>`).join('')}
        ${(c.issues || []).length ? `<div class="px-3 py-2 bg-amber-50/50">
          ${(c.issues || []).map(i => `<div class="text-[11px] text-amber-800">• ${esc(i.tag)}: ${esc(i.description)}</div>`).join('')}
        </div>` : ''}
      </div>
      <div class="p-3 rounded-md bg-slate-50 border border-slate-200 space-y-1">
        <div class="text-xs"><span class="text-slate-500">Technician:</span> <b>${esc(r.technician_name)}</b>
          <span class="text-slate-400">· ${String(r.tech_signed_at || '').slice(0, 16).replace('T', ' ')}</span>
          ${r.eng_sign?.compiled ? '<span class="text-slate-400">(attested by work-order submission)</span>' : ''}</div>
        ${sig('Engineer', r.eng_sign)}
        ${sig('Client', r.client_sign, r.client_sign?.designation ? `, ${esc(r.client_sign.designation)}` : '')}
        <div id="clientSigImg"></div>
        <div class="text-[10px] text-slate-400 font-mono break-all pt-1">SHA-256 ${esc(r.content_hash)}</div>
      </div>
      <div class="flex gap-2 justify-end">
        <button onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
  if (r.client_sign?.image_path) {
    SUPA.storage.from('wo-media').createSignedUrl(r.client_sign.image_path, 3600).then(({ data }) => {
      const host = document.getElementById('clientSigImg');
      if (host && data?.signedUrl) host.innerHTML = `<img src="${data.signedUrl}" class="h-16 mt-1 border border-slate-200 rounded bg-white" alt="client signature" />`;
    });
  }
}

// A returned job: the technician fixes the record (note + more photos) and
// resubmits. The machine's status never changes — this is paperwork repair.
function openResubmitModal(logId) {
  window._woPhotos = [];
  const l = state.logs.find(x => x.id === logId); if (!l) return;
  const e = eqById(l.equipmentId);
  document.getElementById('modalTitle').textContent = `Fix & resubmit — ${e ? e.tag : logId}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitResubmit(event, '${logId}')" class="space-y-3 text-sm">
      <div class="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900">
        <b>Engineer's note:</b> ${esc(l.reviewNote || '')}
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion notes <span class="text-red-500">*</span></label>
        <textarea name="notes" rows="3" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">${esc(l.completionNotes || '')}</textarea>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Add photos <span class="text-slate-400">(existing ones stay attached)</span></label>
        <input type="file" id="woPhotoInput" accept="image/*" capture="environment" multiple class="hidden" onchange="onWoPhotosPicked(this)" />
        <div id="woPhotoStrip" class="flex gap-2 flex-wrap mb-1.5"></div>
        <button type="button" onclick="document.getElementById('woPhotoInput').click()" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Add photos</button>
        <span id="woPhotoCount" class="text-[11px] text-slate-400 ml-2"></span>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Resubmit for review</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitResubmit(ev, logId) {
  ev.preventDefault();
  const notes = new FormData(ev.target).get('notes') || '';
  const unlock = lockSubmit(ev);
  const upErr = await uploadWoPhotos(logId);
  if (upErr) { unlock(); appAlert('Could not save the photos — nothing was resubmitted. ' + upErr); return; }
  const { error } = await SUPA.rpc('resubmit_work_order', { p_log: logId, p_notes: notes });
  if (error) { unlock(); appAlert('Could not resubmit: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Resubmitted — your engineer will take another look.');
}

// ---------- Oversight (admins) ----------
// Answers "who is holding what up, and for how long". Everything here is
// derived from records the flows already create, so nothing new to maintain.
//
// Ageing is CALENDAR days, deliberately: a client waiting on a signed report
// does not care that Sunday intervened. Note that a job held up by parts on
// order ages exactly like a neglected one -- the on-hold state that would fix
// that is not built yet, so read long waits as "ask why", not "blame".
const AGE = { review: 2, returned: 2, issue: 7, clientSign: 14 };
const daysAgo = ts => ts ? Math.max(0, daysBetween(String(ts).slice(0, 10), today())) : 0;
function ageChip(days, threshold) {
  if (days < threshold) return `<span class="text-slate-500">${days}d</span>`;
  const bad = days >= threshold * 2;
  return `<span class="badge ${bad ? 'badge-bd' : 'badge-mt'}">${days}d</span>`;
}

function oversightData() {
  const logs = state.logs;
  const issues = (cloudIssues || []).filter(i => i.status === 'open');
  const reports = cloudReports || [];
  const eqPlant = id => eqById(id)?.plantId;

  // Engineers own plants, so their queue is everything at those plants.
  const engineers = (state.users || []).filter(u => u.role === 'Engineer' && u.status === 'active').map(u => {
    const plants = assignmentsFor(u.id);
    const at = l => plants.includes(eqPlant(l.equipmentId));
    const submitted = logs.filter(l => woStateOf(l) === 'submitted' && at(l));
    const returned  = logs.filter(l => woStateOf(l) === 'returned' && at(l));
    const theirIssues = issues.filter(i => plants.includes(eqPlant(i.equipment_id)));
    const theirReports = reports.filter(r => r.status === 'submitted' && plants.includes(r.plant_id));
    const openWo = logs.filter(l => !l.endDate && at(l));
    return {
      u, plants: plants.length,
      openWo: openWo.length,
      overdueWo: openWo.filter(isOverdue).length,
      toReview: submitted.length,
      toReviewOldest: Math.max(0, ...submitted.map(l => daysAgo(l.submittedAt || l.endDate))),
      returned: returned.length,
      returnedOldest: Math.max(0, ...returned.map(l => daysAgo(l.endDate))),
      issues: theirIssues.length,
      issuesOldest: Math.max(0, ...theirIssues.map(i => daysAgo(i.created_at))),
      reports: theirReports.length,
    };
  });

  // Technicians are judged on their own assignments, wherever they are.
  const technicians = (state.users || []).filter(u => u.role === 'Technician' && u.status === 'active').map(u => {
    const mine = logs.filter(l => l.assignedTo === u.id);
    const open = mine.filter(l => !l.endDate);
    const returned = mine.filter(l => woStateOf(l) === 'returned');
    const awaitingClient = reports.filter(r => r.technician_id === u.id && r.status === 'eng_signed');
    const cutoff = dstr(new Date(Date.now() - 30 * 864e5));
    return {
      u,
      open: open.length,
      overdue: open.filter(isOverdue).length,
      returned: returned.length,
      returnedOldest: Math.max(0, ...returned.map(l => daysAgo(l.endDate))),
      done30: mine.filter(l => l.endDate && l.endDate >= cutoff && woStateOf(l) === 'done').length,
      awaitingClient: awaitingClient.length,
      awaitingClientOldest: Math.max(0, ...awaitingClient.map(r => daysAgo(r.updated_at))),
    };
  });

  // The specific stuck items, so the page is actionable and not just a scoreboard.
  const stuck = [];
  logs.filter(l => woStateOf(l) === 'submitted').forEach(l => {
    const d = daysAgo(l.submittedAt || l.endDate);
    if (d >= AGE.review) stuck.push({ d, kind: 'Unreviewed work', who: 'engineers for ' + plantName(eqPlant(l.equipmentId)),
      what: (eqById(l.equipmentId)?.tag || '') + (l.woNo ? ' \u00b7 ' + l.woNo : ''), href: '#/engineer' });
  });
  logs.filter(l => woStateOf(l) === 'returned').forEach(l => {
    const d = daysAgo(l.endDate);
    if (d >= AGE.returned) stuck.push({ d, kind: 'Sent back, not resubmitted', who: l.technician || 'technician',
      what: (eqById(l.equipmentId)?.tag || '') + (l.woNo ? ' \u00b7 ' + l.woNo : ''), href: '#/engineer' });
  });
  issues.forEach(i => {
    const d = daysAgo(i.created_at);
    if (d >= AGE.issue) stuck.push({ d, kind: 'Issue not triaged', who: 'engineers for ' + plantName(eqPlant(i.equipment_id)),
      what: (eqById(i.equipment_id)?.tag || '') + ' \u2014 ' + (i.description || '').slice(0, 40), href: '#/engineer' });
  });
  reports.filter(r => r.status === 'submitted').forEach(r => {
    const d = daysAgo(r.updated_at);
    if (d >= AGE.review) stuck.push({ d, kind: 'Report unsigned by engineer', who: 'engineers for ' + plantName(r.plant_id),
      what: plantName(r.plant_id) + ' \u00b7 ' + r.visit_date, href: '#/engineer' });
  });
  reports.filter(r => r.status === 'eng_signed').forEach(r => {
    const d = daysAgo(r.updated_at);
    if (d >= AGE.clientSign) stuck.push({ d, kind: 'Client signature outstanding', who: r.technician_name || 'technician',
      what: plantName(r.plant_id) + ' \u00b7 ' + r.visit_date, href: '#/engineer' });
  });
  stuck.sort((a, b) => b.d - a.d);
  return { engineers, technicians, stuck };
}

function renderOversight() {
  if (!isAdmin()) { location.hash = homeHashFor(currentUser()); return; }
  if (!SUPA) {
    document.getElementById('view').innerHTML = `<h1 class="text-2xl font-semibold mb-2">Oversight</h1>
      <div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Oversight needs the live database — it reports on real assignments, reviews and reports.</div>`;
    return;
  }
  const { engineers, technicians, stuck } = oversightData();

  const kpi = (label, value, tone) => `<div class="bg-white rounded-xl border border-slate-200 p-4">
    <div class="text-xs uppercase tracking-wide text-slate-500">${label}</div>
    <div class="text-2xl font-semibold mt-0.5 ${value ? tone : 'text-slate-300'}">${value}</div>
  </div>`;

  const engRows = engineers.map(r => `<tr>
      <td><div class="cell-primary">${esc(r.u.name)}</div><div class="cell-muted">${r.plants} plant${r.plants === 1 ? '' : 's'}</div></td>
      <td class="col-center"><div class="cell-primary">${r.openWo}</div>${r.overdueWo ? `<div class="text-[11px] text-red-600">${r.overdueWo} overdue</div>` : ''}</td>
      <td class="col-center">${r.toReview ? `${r.toReview} ${ageChip(r.toReviewOldest, AGE.review)}` : '<span class="text-slate-300">\u2014</span>'}</td>
      <td class="col-center">${r.returned ? `${r.returned} ${ageChip(r.returnedOldest, AGE.returned)}` : '<span class="text-slate-300">\u2014</span>'}</td>
      <td class="col-center">${r.issues ? `${r.issues} ${ageChip(r.issuesOldest, AGE.issue)}` : '<span class="text-slate-300">\u2014</span>'}</td>
      <td class="col-center">${r.reports || '<span class="text-slate-300">\u2014</span>'}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="py-6 text-center text-slate-500">No active engineers.</td></tr>`;

  const techRows = technicians.map(r => `<tr>
      <td><div class="cell-primary">${esc(r.u.name)}</div><div class="cell-muted">any plant</div></td>
      <td class="col-center"><div class="cell-primary">${r.open}</div>${r.overdue ? `<div class="text-[11px] text-red-600">${r.overdue} overdue</div>` : ''}</td>
      <td class="col-center">${r.returned ? `${r.returned} ${ageChip(r.returnedOldest, AGE.returned)}` : '<span class="text-slate-300">\u2014</span>'}</td>
      <td class="col-center">${r.awaitingClient ? `${r.awaitingClient} ${ageChip(r.awaitingClientOldest, AGE.clientSign)}` : '<span class="text-slate-300">\u2014</span>'}</td>
      <td class="col-center"><span class="text-slate-600">${r.done30}</span></td>
    </tr>`).join('') || `<tr><td colspan="5" class="py-6 text-center text-slate-500">No technician accounts yet — invite one from Team.</td></tr>`;

  const stuckRows = stuck.slice(0, 40).map(x => `<tr>
      <td><div class="cell-primary">${esc(x.kind)}</div><div class="cell-muted">${esc(x.what)}</div></td>
      <td><div class="cell-muted">${esc(x.who)}</div></td>
      <td class="col-center">${ageChip(x.d, 1)}</td>
      <td class="col-center"><a href="${x.href}" class="text-xs px-2.5 py-1 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium inline-block">Open</a></td>
    </tr>`).join('');

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-semibold">Oversight</h1>
        <p class="text-slate-500 text-sm">Who is holding what up, and for how long. Ages are calendar days.</p>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-6">
      ${kpi('Unreviewed &gt; ' + AGE.review + 'd', stuck.filter(x => x.kind === 'Unreviewed work').length, 'text-amber-600')}
      ${kpi('Sent back &gt; ' + AGE.returned + 'd', stuck.filter(x => x.kind === 'Sent back, not resubmitted').length, 'text-amber-600')}
      ${kpi('Issues &gt; ' + AGE.issue + 'd', stuck.filter(x => x.kind === 'Issue not triaged').length, 'text-red-600')}
      ${kpi('Signatures &gt; ' + AGE.clientSign + 'd', stuck.filter(x => x.kind === 'Client signature outstanding').length, 'text-red-600')}
    </div>
    ${stuckRows ? `<h2 class="font-semibold text-sm mb-2">Stuck items (${stuck.length})</h2>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6"><div class="overflow-x-auto">
      <table class="list-table"><thead><tr><th>What</th><th>Waiting on</th><th class="col-center">Age</th><th class="col-center">Action</th></tr></thead>
      <tbody>${stuckRows}</tbody></table>
    </div></div>` : `<div class="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 mb-6">Nothing is stuck. Every review, issue and signature is inside its window.</div>`}

    <h2 class="font-semibold text-sm mb-2">Service engineers</h2>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6"><div class="overflow-x-auto">
      <table class="list-table"><thead><tr>
        <th>Engineer</th><th class="col-center">Open jobs</th><th class="col-center">To review</th>
        <th class="col-center">Sent back</th><th class="col-center">Open issues</th><th class="col-center">Reports to sign</th>
      </tr></thead><tbody>${engRows}</tbody></table>
    </div></div>

    <h2 class="font-semibold text-sm mb-2">Technicians</h2>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden"><div class="overflow-x-auto">
      <table class="list-table"><thead><tr>
        <th>Technician</th><th class="col-center">Assigned open</th><th class="col-center">Sent back</th>
        <th class="col-center">Client signature</th><th class="col-center">Closed (30d)</th>
      </tr></thead><tbody>${techRows}</tbody></table>
    </div></div>
    <p class="text-[11px] text-slate-400 mt-4">A job waiting on parts ages the same as a neglected one — long waits are a
      prompt to ask why, not proof of neglect.</p>`;
}

// ---------- Maintenance Log ----------
function renderLog() {
  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold" data-tour="log-h1">Maintenance Log</h1>
        <p class="text-slate-500 text-sm">Full history across all equipment.</p>
      </div>
      <div data-tour="log-actions" class="ml-auto flex items-center gap-2">
        <button onclick="openReportModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium">Report</button>
        ${exportDropdown('', 'log-export')}
      </div>
    </div>
    <div class="filter-strip flex items-center mb-4 gap-2 flex-nowrap overflow-x-auto pb-1">
      ${suggestFilter({ id: 'fSearch', listId: 'logSuggest', placeholder: 'Search…',
        options: (() => { const ids = accessiblePlantIds();
          return [...new Set(state.logs.map(l => eqById(l.equipmentId)).filter(Boolean)
            .filter(e => ids.includes(e.plantId)))].flatMap(e => [e.tag, e.make, e.model]); })(),
        oninput: 'renderLogRows()', width: 'w-48 flex-shrink-0' })}
      ${plantFilterControl()}
      <select id="fType" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white flex-shrink-0" onchange="renderLogRows()">
        <option value="">All types</option>${EQ_TYPES.map(t=>`<option>${t}</option>`).join('')}
      </select>
      <select id="fReason" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white flex-shrink-0" onchange="renderLogRows()">
        <option value="">All reasons</option><option>Scheduled</option><option>Breakdown</option>
      </select>
      <select id="fStatus" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white flex-shrink-0" onchange="renderLogRows()">
        <option value="">All statuses</option><option value="open">Ongoing</option><option value="closed">Completed</option>
      </select>
      <select id="fTech" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white flex-shrink-0" onchange="renderLogRows()">
        <option value="">All technicians</option>${[...new Set(state.logs.map(l => l.technician).filter(Boolean))].sort().map(t=>`<option>${esc(t)}</option>`).join('')}
      </select>
      <div class="inline-flex items-center gap-1 border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-600 flex-shrink-0">
        <span>From</span>
        <input type="date" id="fFrom" class="text-xs outline-none" onchange="renderLogRows()" />
        <span>To</span>
        <input type="date" id="fTo"   class="text-xs outline-none" onchange="renderLogRows()" />
        <button type="button" onclick="document.getElementById('fFrom').value=''; document.getElementById('fTo').value=''; renderLogRows()" class="text-slate-400 hover:text-slate-700 ml-1" title="Clear">&times;</button>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="list-table">
          <thead><tr>
            <th>Equipment</th><th>Plant</th><th>Reason</th><th>Start / End</th>
            <th>Duration</th><th>Technician</th><th>Notes</th><th>Status</th>
          </tr></thead>
          <tbody id="logRows"></tbody>
        </table>
      </div>
      <div id="logPager" class="flex items-center gap-3 px-5 py-3 border-t border-slate-200 text-sm text-slate-600"></div>
    </div>
  `;
  renderLogRows();
}

function logGoToPage(p) { ui.logPage = p; renderLogRows(); }

function getFilteredLogs() {
  const fType = document.getElementById('fType')?.value || '';
  const fReason = document.getElementById('fReason')?.value || '';
  const fStatus = document.getElementById('fStatus')?.value || '';
  const fSearch = (document.getElementById('fSearch')?.value || '').toLowerCase();
  const fFrom = document.getElementById('fFrom')?.value || '';
  const fTo   = document.getElementById('fTo')?.value   || '';
  const fTech = document.getElementById('fTech')?.value || '';
  return state.logs
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(({l, e}) => {
      if (!e) return false;
      if (effRole(currentUser()) !== 'Admin' && !accessiblePlantIds().includes(e.plantId)) return false;
      if (ui.plantFilter !== 'all' && e.plantId !== ui.plantFilter) return false;
      if (fType && e.type !== fType) return false;
      if (fReason && l.reason !== fReason) return false;
      if (fStatus === 'open' && l.endDate) return false;
      if (fStatus === 'closed' && !l.endDate) return false;
      if (fFrom && l.startDate < fFrom) return false;
      if (fTo   && l.startDate > fTo)   return false;
      if (fTech && l.technician !== fTech) return false;
      if (fSearch) {
        const blob = `${l.woNo || ''} ${e.tag} ${e.make} ${e.model} ${e.location} ${plantName(e.plantId)} ${l.notes} ${l.completionNotes||''} ${l.technician}`.toLowerCase();
        if (!blob.includes(fSearch)) return false;
      }
      return true;
    })
    .sort((a,b) => b.l.startDate.localeCompare(a.l.startDate));
}

function renderLogRows() {
  const data = getFilteredLogs();
  // Reset to page 1 whenever the filter set changes
  const sig = [ui.plantFilter, document.getElementById('fType')?.value, document.getElementById('fReason')?.value,
    document.getElementById('fStatus')?.value, document.getElementById('fSearch')?.value,
    document.getElementById('fFrom')?.value, document.getElementById('fTo')?.value, document.getElementById('fTech')?.value].join('|');
  if (sig !== ui._logSig) { ui.logPage = 1; ui._logSig = sig; }

  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  if (ui.logPage > pages) ui.logPage = pages;
  const start = (ui.logPage - 1) * LOG_PAGE_SIZE;
  const pageData = data.slice(start, start + LOG_PAGE_SIZE);

  const rows = pageData.map(({l, e}) => {
    const durDays = l.endDate ? daysBetween(l.startDate, l.endDate) : daysBetween(l.startDate, today());
    const overdue = isOverdue(l);
    const durHtml = l.endDate
      ? `<span class="text-slate-700">${durDays} day${durDays===1?'':'s'}</span>`
      : `<span class="font-medium ${overdue?'text-red-600':'text-brand'}">${durDays} day${durDays===1?'':'s'} (ongoing)</span>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.make)} ${esc(e.model)}</div>${woRef(l, 'block mt-0.5')}</td>
      <td><div class="cell-primary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${l.reason}</div><div class="cell-muted">${e.type} · ${esc(e.location)}</div></td>
      <td><div class="cell-primary">${l.startDate}</div><div class="cell-muted">${l.endDate ? 'End: ' + l.endDate : 'Expected: ' + (l.etr || '—')}</div></td>
      <td>${durHtml}</td>
      <td><div class="cell-primary">${esc(l.technician)}</div></td>
      <td class="max-w-xs"><div class="text-slate-600 line-clamp-2" title="${esc(l.notes)}">${esc(l.notes)}</div></td>
      <td>${ongoingStatusPill(l)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="py-6 text-center text-slate-500">${
    state.logs.length === 0
      ? 'No maintenance has been logged yet. Entries appear here when equipment is put in maintenance.'
      : 'No log entries match your filters.'
  }</td></tr>`;
  document.getElementById('logRows').innerHTML = rows;

  const pager = document.getElementById('logPager');
  if (pager) {
    if (total === 0) { pager.innerHTML = ''; }
    else {
      const from = start + 1, to = Math.min(start + LOG_PAGE_SIZE, total);
      const btn = (label, page, disabled) =>
        `<button ${disabled?'disabled':''} onclick="logGoToPage(${page})" class="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">${label}</button>`;
      pager.innerHTML = `
        <span>Showing <b>${from}–${to}</b> of <b>${total}</b></span>
        <div class="ml-auto flex items-center gap-2">
          ${btn('&larr; Prev', ui.logPage - 1, ui.logPage <= 1)}
          <span class="text-slate-500">Page ${ui.logPage} / ${pages}</span>
          ${btn('Next &rarr;', ui.logPage + 1, ui.logPage >= pages)}
        </div>`;
    }
  }
}

// ---------- Plants ----------
const NOTIF_EVENTS = [
  { key: 'maintenance', label: 'Put in Maintenance' },
  { key: 'breakdown',   label: 'Breakdown reported' },
  { key: 'operational', label: 'Marked Operational' },
  { key: 'overdue',     label: 'Overdue maintenance' },
];

function renderPlants() {
  const rows = state.plants.map(p => {
    const eqCount = state.equipment.filter(e => e.plantId === p.id).length;
    return `<tr>
      <td><div class="cell-primary">${esc(p.name)}</div><div class="cell-secondary">${esc(p.location)}</div></td>
      <td><div class="cell-primary">${eqCount}</div><div class="cell-muted">equipment</div></td>
      <td class="col-center">
        <div class="inline-flex gap-1.5 flex-wrap justify-center">
          <button onclick="generateQrSheet('${p.id}')" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium">QR Codes</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold" data-tour="plants-h1">Plants</h1>
        <p class="text-slate-500 text-sm mt-1">Per-plant notification settings and admin actions.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${suggestFilter({ id: 'plantSearch', listId: 'plantSuggest', placeholder: 'Find a plant…',
          options: state.plants.flatMap(x => [x.name, x.location]),
          oninput: "filterRows('#plantsTable tbody tr', this.value)", width: 'w-44' })}
        ${SUPA ? `<button onclick="openChecklistEditor()" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium">PPM Checklists</button>` : ''}
        <button onclick="openAddPlantModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Plant
        </button>
        <button onclick="openImportPPMModal()" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Import PPM
        </button>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mt-5">
      <div class="overflow-x-auto">
        <table class="list-table" id="plantsTable">
          <thead><tr><th>Plant</th><th>Equipment</th><th class="col-center">Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Add Plant (admin) ----------
function nextPlantId() {
  const max = state.plants.reduce((m, p) => { const n = parseInt(String(p.id).replace(/\D/g,''), 10); return isNaN(n) ? m : Math.max(m, n); }, 0);
  return 'PL-' + String(max + 1).padStart(2, '0');
}
function openAddPlantModal() {
  document.getElementById('modalTitle').textContent = 'Add Plant';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitAddPlant(event)" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Plant name <span class="text-red-500">*</span></label>
        <input name="name" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Skyline Residency STP" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Location <span class="text-slate-400">(optional)</span></label>
        <input name="location" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Pune, MH" />
      </div>
      <div class="text-xs text-slate-500">You can add equipment to this plant afterwards, or use <b>Import PPM</b> to bulk-load a schedule.</div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add plant</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitAddPlant(ev) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const plant = { id: nextPlantId(), name: f.get('name').trim(), location: (f.get('location')||'').trim(), notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','whatsapp','sms'], operational:[], overdue:['email','whatsapp'] }) };
  if (SUPA) {
    const unlock = lockSubmit(ev);
    const { error } = await SUPA.from('plants').insert({ id: plant.id, name: plant.name, location: plant.location, notifications: plant.notifications });
    if (error) { unlock(); saveError(error); return; }
    await hydrateCloud(); closeModal(); route(); return;
  }
  state.plants.push(plant);
  savePlant(state.plants);
  closeModal(); route();
}

// ---------- Team (admin) ----------
function nextUserId() {
  const max = state.users.reduce((m, u) => { const n = parseInt(String(u.id).replace(/\D/g,''), 10); return isNaN(n) ? m : Math.max(m, n); }, 0);
  return 'U-' + (max + 1);
}
function assignmentsFor(uid) {
  if (SUPA) return cloudAssignments[uid] || [];
  const u = state.users.find(x => x.id === uid);
  return (u && u.plantIds) ? u.plantIds : [];
}
function renderTeam() {
  // Engineers get a trimmed view: just the technicians they hand work to,
  // and the button to invite a new one. Managing people stays with admins.
  const engView = !isAdmin();
  const visibleUsers = engView ? state.users.filter(u => u.role === 'Technician') : state.users;
  const userRows = visibleUsers.map(u => {
    const roleBadge = (u.role === 'Admin' || u.role === 'Superadmin') ? 'badge-brand' : 'badge-neutral';
    const isSelf = currentUser()?.id === u.id;
    const isEng = u.role === 'Engineer';
    const isTech = u.role === 'Technician';
    const assigned = assignmentsFor(u.id);
    const plantsCell = isTech
      ? `<span class="text-xs text-slate-500">Any plant — scoped by work order</span>`
      : isEng
        ? (assigned.length
            ? `<div class="cell-primary">${assigned.length} plant${assigned.length===1?'':'s'}</div><div class="cell-muted truncate max-w-[220px]">${assigned.map(plantName).join(', ')}</div>`
            : `<span class="badge badge-mt">None assigned</span>`)
        : `<span class="text-xs text-slate-500">All plants</span>`;
    const actions = [];
    if (!engView) actions.push(`<button onclick="openEditUserModal('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Edit</button>`);
    if (isEng && !engView) {
      actions.push(`<button onclick="openAssignPlantsModal('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100">Assign plants</button>`);
      actions.push(`<button onclick="openScheduleModal('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Generate Schedule</button>`);
    }
    if (isSuperadmin() && !isSelf && u.role !== 'Superadmin')
      actions.push(`<select onchange="setUserRole('${u.id}', this.value)" class="text-xs border border-slate-300 rounded-md px-1.5 py-1 bg-white">
        <option value="Technician" ${u.role==='Technician'?'selected':''}>Technician</option>
        <option value="Engineer" ${u.role==='Engineer'?'selected':''}>Engineer</option>
        <option value="Admin" ${u.role==='Admin'?'selected':''}>Admin</option>
      </select>`);
    // Deactivate / reactivate (real mode): reversible, keeps all history, and
    // is enforced in the DB — a deactivated account loses data access, not
    // just its UI. Admins manage engineers; only the Superadmin manages Admins.
    // (Permanent deletion stays in Supabase Auth — it is rarely the right tool.)
    if (SUPA && !engView && !isSelf && u.role !== 'Superadmin' && (isSuperadmin() || isEng || isTech))
      actions.push(u.status === 'active'
        ? `<button onclick="setUserStatus('${u.id}', 'disabled')" class="text-xs px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Deactivate</button>`
        : `<button onclick="setUserStatus('${u.id}', 'active')" class="text-xs px-2.5 py-1 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100">Reactivate</button>`);
    if (!SUPA && !isSelf && u.role !== 'Superadmin' && (isSuperadmin() || u.role === 'Engineer'))
      actions.push(`<button onclick="removeUser('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Remove</button>`);
    return `<tr>
      <td>
        <div class="cell-primary">${esc(u.name)}${isSelf?' <span class="text-[10px] text-slate-400">(you)</span>':''}</div>
        <div class="cell-muted">${esc(u.email) || '—'}</div>
      </td>
      <td><span class="badge ${roleBadge}">${u.role}</span>${u.status !== 'active' ? ' <span class="badge badge-bd">Deactivated</span>' : ''}</td>
      <td>${plantsCell}</td>
      <td><div class="cell-muted">${esc(u.phone) || '—'}</div></td>
      <td class="col-center">${actions.length ? `<div class="inline-flex gap-1.5 flex-wrap justify-center">${actions.join('')}</div>` : '<span class="text-xs text-slate-400">—</span>'}</td>
    </tr>`;
  }).join('');

  // Prototype-only: real-mode invites go out by email (no shareable-link table).
  const pending = SUPA ? [] : (state.invites || []).filter(i => i.status === 'pending');
  const inviteRows = pending.map(i => `<tr>
      <td>
        <div class="cell-primary">${esc(i.name)}</div>
        <div class="cell-muted">${esc(i.email)}</div>
      </td>
      <td><span class="badge ${i.role === 'Admin' ? 'badge-brand' : 'badge-neutral'}">${esc(i.role)}</span></td>
      <td><div class="cell-muted">Invited ${new Date(i.ts).toLocaleDateString()}</div></td>
      <td><span class="badge badge-mt">Pending</span></td>
      <td class="col-center">
        <div class="inline-flex gap-1.5">
          <button onclick="showInviteLinkModal('${i.id}')" class="text-xs px-2.5 py-1 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100">Invite link</button>
          <button onclick="revokeInvite('${i.id}')" class="text-xs px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Revoke</button>
        </div>
      </td>
    </tr>`).join('');

  const pendingSection = pending.length ? `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mt-5">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm flex items-center">
        <span>Pending invites <span class="text-slate-400 font-normal">(${pending.length})</span></span>
        <span class="ml-auto text-xs text-slate-500 font-normal">Share the invite link — the person sets their own password to join.</span>
      </div>
      <div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Invitee</th><th>Role</th><th>Invited</th><th>Status</th><th class="col-center">Action</th></tr></thead>
        <tbody>${inviteRows}</tbody>
      </table></div>
    </div>` : '';

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold" data-tour="team-h1">Team</h1>
        <p class="text-slate-500 text-sm mt-1">${engView ? 'The technicians you assign work to. Invite new ones here.' : 'Manage who can access the tool and who performs maintenance.'}</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${suggestFilter({ id: 'teamSearch', listId: 'teamSuggest', placeholder: 'Find a person…',
          options: [...state.users.flatMap(u => [u.name, u.email]), ...technicianNames()],
          oninput: "filterRows('#usersTable tbody tr', this.value); filterRows('#techsTable tbody tr', this.value)", width: 'w-44' })}
        ${SUPA ? '' : `<button onclick="openAddTechnicianModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Technician
        </button>`}
        <button onclick="openInviteModal()" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
          ${engView ? 'Invite Technician' : 'Invite User'}
        </button>
      </div>
    </div>
    ${SUPA ? `<div class="mt-3 p-2.5 rounded-md bg-brand-50 border border-brand-100 text-xs text-brand">Invite users by email — they receive a link to set their own password and join with the role you pick. Assign plants below once they appear.</div>` : ''}
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm">${engView ? 'Technicians with logins' : 'Users'} <span class="text-slate-400 font-normal">(${visibleUsers.length})</span></div>
      <div class="overflow-x-auto">
        <table class="list-table" id="usersTable">
          <thead><tr><th>User</th><th>Role</th><th>Assigned plants</th><th>Phone</th><th class="col-center">Actions</th></tr></thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </div>
    ${techniciansSection()}
    ${pendingSection}`;
}

// Technician registry card on the Team page (real mode). Removal never
// touches history — names on past work-orders are snapshots.
function techniciansSection() {
  if (!SUPA) return '';
  const techs = cloudTechnicians || [];
  const jobCount = name => state.logs.filter(l => (l.technician || '').trim().toLowerCase() === name.toLowerCase()).length;
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mt-5">
      <div class="px-5 py-3 border-b border-slate-200 flex items-center gap-2 flex-wrap">
        <span class="font-semibold text-sm">Technicians <span class="text-slate-400 font-normal">(${techs.length})</span></span>
        <span class="text-xs text-slate-400 hidden sm:inline">field workers named on work-orders — new names are recorded automatically</span>
        <button onclick="openAddTechModal()" class="ml-auto text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium whitespace-nowrap">Add technician</button>
      </div>
      ${techs.length ? `<div class="overflow-x-auto"><table class="list-table" id="techsTable">
        <thead><tr><th>Name</th><th>Phone</th><th>Jobs on record</th><th>Added</th><th class="col-center">Action</th></tr></thead>
        <tbody>${techs.map(t => `<tr>
          <td><div class="cell-primary">${esc(t.name)}</div></td>
          <td><div class="cell-muted">${esc(t.phone) || '—'}</div></td>
          <td><div class="cell-muted">${jobCount(t.name)}</div></td>
          <td><div class="cell-muted">${t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</div></td>
          <td class="col-center">${isAdmin() ? `<button onclick="deleteTechnician(${t.id})" class="text-xs px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Remove</button>` : '<span class="text-xs text-slate-400">—</span>'}</td>
        </tr>`).join('')}</tbody>
      </table></div>`
      : `<div class="px-5 py-5 text-center text-xs text-slate-500">No technicians yet — they're recorded automatically the first time a name is used on a work-order.</div>`}
    </div>`;
}
function openAddTechModal() {
  if (!isAdmin() || !SUPA) return;
  document.getElementById('modalTitle').textContent = 'Add technician';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitAddTech(event)" class="space-y-3 text-sm">
      <div><label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
        <input name="name" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. A. Mehta" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Phone <span class="text-slate-400">(optional — used for WhatsApp/SMS later)</span></label>
        <input name="phone" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="+91 98765 43210" /></div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add technician</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitAddTech(ev) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA) return;
  const f = new FormData(ev.target);
  const name = (f.get('name') || '').trim();
  if (!name) return;
  if (technicianNames().some(t => t.toLowerCase() === name.toLowerCase())) {
    appAlert('A technician with this name is already on the list.'); return;
  }
  const unlock = lockSubmit(ev);
  const { data, error } = await SUPA.from('technicians')
    .insert({ name, phone: (f.get('phone') || '').trim(), created_by: authUser?.id || null }).select().single();
  if (error) {
    unlock();
    if (error.code === '23505') { appAlert('A technician with this name is already on the list.'); return; }
    saveError(error); return;
  }
  if (cloudTechnicians) { cloudTechnicians.push(data); cloudTechnicians.sort((a, b) => a.name.localeCompare(b.name)); }
  closeModal(); route();
  toast(`${esc(name)} added to the technician list.`);
}
async function deleteTechnician(id) {
  if (!isAdmin() || !SUPA) return;
  const t = (cloudTechnicians || []).find(x => x.id === id);
  if (!await appConfirm(`Remove ${t ? t.name : 'this technician'} from the list?\n\nPast work-orders keep the name — only future suggestions change.`, 'Remove technician')) return;
  const { error } = await SUPA.from('technicians').delete().eq('id', id);
  if (error) { saveError(error); return; }
  if (cloudTechnicians) cloudTechnicians = cloudTechnicians.filter(x => x.id !== id);
  route();
}

// Send one person a sample daily summary, so email delivery can be proven
// without waiting for 07:00. Superadmin only.
async function sendTestDigest(userId) {
  if (!SUPA || !isSuperadmin()) return;
  const u = state.users.find(x => x.id === userId);
  toast(`Sending a test summary to ${esc(u?.email || 'that address')}…`);
  let data, error;
  try { ({ data, error } = await SUPA.functions.invoke('send-notifications', { body: { mode: 'test', userId } })); }
  catch (err) { error = err; }
  if (error) {
    let msg = error.message || String(error);
    try { const j = await error.context.json(); if (j) msg = j.message || j.error || msg; } catch {}
    appAlert(/not_configured|SENDGRID_API_KEY/i.test(msg)
      ? 'Email isn\'t configured yet. Add SENDGRID_API_KEY (and MAIL_FROM) under Supabase → Edge Functions → Secrets, then deploy send-notifications.'
      : 'Could not send: ' + msg, 'Email test');
    return;
  }
  if (data && data.sent) {
    appAlert(`Sent to ${data.recipients.join(', ')}. If it does not arrive, check the spam folder and the sender domain.`, 'Test sent');
    return;
  }
  // The function reports exactly why it passed someone over — show that,
  // rather than making the admin guess.
  const NL = String.fromCharCode(10);
  const d = data && data.debug;
  const reason = (data && data.why && data.why.length)
    ? data.why.map(w => `${w.email}: ${w.reason}`).join(NL)
    : d
      // No per-person reason means nobody was even considered — the counts
      // say which lookup came back empty.
      ? `Nobody was matched. The function saw ${d.profilesRead} profile(s), `
        + `${d.withUsableEmail} with a usable email, and matched ${d.matchedTarget} recipient(s)`
        + `${d.requestedUserId ? ' for id ' + d.requestedUserId : ''}.`
        + `${d.profilesRead === 0 ? NL + NL + 'Reading profiles returned nothing — the function is very likely running an older deployment, or its service-role access is not working.' : ''}`
      : 'The function returned no recipients, no reason and no diagnostics — it is running an older deployment. Redeploy send-notifications.';
  appAlert('Nothing was sent.' + NL + NL + reason, 'Not sent');
}

// Deactivate / reactivate a user (real mode). The DB guard (SQL 20) enforces
// the hierarchy server-side; this is the friendly path to it.
async function setUserStatus(userId, status) {
  if (!isAdmin() || !SUPA) return;
  const u = state.users.find(x => x.id === userId); if (!u) return;
  const deactivating = status === 'disabled';
  if (deactivating && !await appConfirm(
    `Deactivate ${u.name}? They will lose access until reactivated — signed out on their next visit, and the database refuses their requests immediately. Everything they ever recorded stays untouched.`,
    'Deactivate user')) return;
  const { error } = await SUPA.from('profiles').update({ status }).eq('id', userId);
  if (error) { saveError(error); return; }
  await hydrateCloud(); route();
  toast(deactivating ? `${esc(u.name)} deactivated.` : `${esc(u.name)} reactivated — they can sign in again.`);
}

// ---------- Edit user contact details (admin) ----------
// Email is the Supabase Auth sign-in identity — it is NOT editable here (that
// requires supabase.auth.admin.updateUserById via a service-role Edge Function,
// which would also need re-verification). Name and phone live on `profiles`
// and are safe for an admin (or the user themself) to update directly.
// Phone is stored E.164-normalized — the format WhatsApp/SMS delivery needs
// once Phase 3b (real channel delivery) is wired up; email already drives
// invite emails today and will drive email notifications the same way.
function openEditUserModal(userId) {
  if (!isAdmin()) return;
  const u = state.users.find(x => x.id === userId); if (!u) return;
  document.getElementById('modalTitle').textContent = `Edit ${esc(u.name)}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitEditUser(event, '${userId}')" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
        <input name="name" required value="${esc(u.name)}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Full name" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Email</label>
        <input value="${esc(u.email)}" disabled class="w-full border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50 text-slate-500" />
        <div class="text-[11px] text-slate-400 mt-1">Sign-in identity — used for invitations today, and for email notifications once that's enabled. Changed in Supabase, not here.</div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Phone</label>
        <input name="phone" value="${esc(u.phone||'')}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="+919000010000" />
        <div class="text-[11px] text-slate-400 mt-1">Include the country code. Used for WhatsApp notifications once that's enabled.</div>
      </div>
      ${SUPA ? `<div>
        <label class="block text-xs text-slate-600 mb-1">Email notifications</label>
        <label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
          <input type="checkbox" name="emailDigest" ${u.emailDigest !== false ? 'checked' : ''} class="mt-0.5" />
          <span class="text-xs text-slate-700"><b>Daily summary</b> — one email each morning listing what is overdue,
            due today and scheduled. Nothing is sent on days with nothing outstanding.</span>
        </label>
        <label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer mt-1.5">
          <input type="checkbox" name="emailUrgent" ${u.emailUrgent !== false ? 'checked' : ''} class="mt-0.5" />
          <span class="text-xs text-slate-700"><b>Breakdown alerts</b> — emailed the moment a machine at their plants
            is reported broken down.</span>
        </label>
        ${emailScopeNote(u)}
        ${isSuperadmin() ? `<button type="button" onclick="sendTestDigest('${userId}')" class="mt-2 text-xs px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">Send a test summary now</button>` : ''}
      </div>` : ''}
      ${SUPA && isSuperadmin() ? `<div>
        <label class="block text-xs text-slate-600 mb-1">Interface</label>
        <select name="uiMode" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
          <option value="simple" ${u.uiMode !== 'full' ? 'selected' : ''}>Simple — record keeping only</option>
          <option value="full" ${u.uiMode === 'full' ? 'selected' : ''}>Full — health scores, parts, AI research</option>
        </select>
        <div class="text-[11px] text-slate-400 mt-1">Simple hides the smart layer; everything they record still feeds it if you switch them later.</div>
      </div>` : ''}
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Save</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
// Both email types are scoped to the plants a person can see. Ticking a box for
// an engineer with no assignments therefore sends nothing at all -- which looks
// identical to a broken mailer. Say it at the checkbox, not in a support call.
function emailScopeNote(u) {
  const seesEverything = u.role === 'Admin' || u.role === 'Superadmin';
  if (seesEverything) {
    return `<div class="text-[11px] text-slate-400 mt-1.5">Covers every plant, as ${esc(u.role === 'Superadmin' ? 'a Superadmin' : 'an Admin')}.</div>`;
  }
  const n = assignmentsFor(u.id).length;
  if (n) {
    return `<div class="text-[11px] text-slate-400 mt-1.5">Covers the ${n} plant${n === 1 ? '' : 's'} assigned to them — nothing outside that.</div>`;
  }
  return `<div class="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-1.5">
    <b>No plants assigned yet</b>, so these emails would have nothing to report and none would be sent.
    Use <b>Assign plants</b> on their row first for either setting to have an effect.</div>`;
}
async function submitEditUser(ev, userId) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const name = f.get('name').trim();
  if (!name) return;
  const phoneResult = normalizePhone(f.get('phone'));
  if (!phoneResult.ok) { appAlert(phoneResult.error); return; }
  const phone = phoneResult.value;

  if (SUPA) {
    const unlock = lockSubmit(ev);
    const patch = { name, phone };
    if (isSuperadmin() && f.get('uiMode')) patch.ui_mode = f.get('uiMode') === 'full' ? 'full' : 'simple';
    patch.email_digest = !!f.get('emailDigest');
    patch.email_urgent = !!f.get('emailUrgent');
    const { error } = await SUPA.from('profiles').update(patch).eq('id', userId);
    if (error) { unlock(); saveError(error); return; }
    if (authUser && authUser.id === userId) { authUser.name = name; authUser.phone = phone; }
    await hydrateCloud();
    closeModal(); route();
    toast('Contact details updated.');
    return;
  }
  const u = state.users.find(x => x.id === userId);
  if (u) { u.name = name; u.phone = phone; saveUsers(state.users); }
  closeModal(); route();
  toast('Contact details updated.');
}

// ---------- Invite workflow ----------
function b64urlEncode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str) {
  try {
    str = str.replace(/-/g,'+').replace(/_/g,'/');
    const bin = atob(str);
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
}
function inviteLinkFor(invite) {
  const token = b64urlEncode({ n: invite.name, e: invite.email, r: invite.role, id: invite.id, ts: invite.ts });
  return `${location.origin}${location.pathname}#/accept/${token}`;
}
function openInviteModal() {
  const engCaller = !isAdmin();   // engineers invite technicians only
  document.getElementById('modalTitle').textContent = engCaller ? 'Invite Technician' : 'Invite User';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitInvite(event)" class="space-y-3 text-sm">
      <div><label class="block text-xs text-slate-600 mb-1">Full name <span class="text-red-500">*</span></label>
        <input name="name" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Anita Desai" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Email <span class="text-red-500">*</span></label>
        <input name="email" type="email" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="name@digitalpaani.com" /></div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Role</label>
        <div class="grid gap-2">
          ${engCaller ? `<label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 bg-slate-50">
            <input type="radio" name="role" value="Technician" checked class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Technician</div><div class="text-[11px] text-slate-500">Sees My Work and can look up any plant. Completes the jobs you assign.</div></div>
          </label>` : `<label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="role" value="Engineer" checked class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Engineer</div><div class="text-[11px] text-slate-500">Owns sites: equipment, work orders, Engineering Corner.</div></div>
          </label>
          <label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="role" value="Technician" class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Technician</div><div class="text-[11px] text-slate-500">Sees My Work and can look up any plant. Completes assigned jobs.</div></div>
          </label>
          ${isSuperadmin() ? `<label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="role" value="Admin" class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Admin</div><div class="text-[11px] text-slate-500">Full access incl. plants, team, notifications.</div></div>
          </label>` : ''}`}
        </div>
        ${isSuperadmin() || engCaller ? '' : '<div class="text-[11px] text-slate-400 mt-1">Only the Superadmin can grant Admin access.</div>'}
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">${SUPA ? 'Send invite' : 'Create invite'}</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitInvite(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const email = f.get('email').trim().toLowerCase();
  const name = f.get('name').trim();
  const requestedRole = f.get('role') || 'Engineer';
  // Mirror of the server's ceiling: engineers invite technicians only;
  // Admin is Superadmin-granted; the Edge Function re-checks all of it.
  const role = !isAdmin() ? 'Technician'
    : requestedRole === 'Admin' ? (isSuperadmin() ? 'Admin' : 'Engineer')
    : requestedRole === 'Technician' ? 'Technician' : 'Engineer';

  if (SUPA) {
    // Real invite: Edge Function calls the admin API; Supabase emails the link.
    const btn = ev.target.querySelector('button[type=submit], button:not([type])');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const { data, error } = await SUPA.functions.invoke('invite-user', {
        body: { email, name, role, redirectTo: location.origin + location.pathname },
      });
      if (error) {
        // Non-2xx responses hide the real message inside error.context.
        let msg = error.message;
        try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      if (data && data.error) throw new Error(data.error);
      closeModal();
      appAlert(`Invitation email sent to ${email} as ${data.role || role}. They'll set their own password from the email link.`);
      await hydrateCloud(); route();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Send invite'; }
      appAlert('Could not send invite: ' + err.message);
    }
    return;
  }

  // Prototype fallback: shareable link flow.
  if (state.users.some(u => u.email.toLowerCase() === email)) { appAlert('A user with this email already exists.'); return; }
  if ((state.invites||[]).some(i => i.status === 'pending' && i.email.toLowerCase() === email)) { appAlert('An invite is already pending for this email.'); return; }
  const invite = {
    id: 'INV-' + Date.now() + '-' + Math.floor(Math.random()*1e4),
    name, email, role,
    ts: new Date().toISOString(), invitedBy: currentUser()?.id, status: 'pending',
  };
  state.invites = (state.invites || []).concat(invite);
  saveInvites(state.invites);
  showInviteLinkModal(invite.id);
}
function showInviteLinkModal(inviteId) {
  const invite = (state.invites || []).find(i => i.id === inviteId);
  if (!invite) return;
  const link = inviteLinkFor(invite);
  document.getElementById('modalTitle').textContent = 'Invite created';
  document.getElementById('modalBody').innerHTML = `
    <div class="space-y-3 text-sm">
      <div class="text-slate-700">Invite for <b>${esc(invite.name)}</b> (${esc(invite.email)}) as <b>${esc(invite.role)}</b>.</div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Invite link</label>
        <div class="flex gap-2">
          <input id="inviteLinkField" readonly value="${link}" class="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-xs bg-slate-50" onclick="this.select()" />
          <button onclick="copyInviteLink()" id="copyBtn" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-xs font-medium whitespace-nowrap">Copy</button>
        </div>
      </div>
      <div class="p-2.5 rounded-md bg-amber-50 border border-amber-100 text-[11px] text-amber-800">
        Prototype: share this link manually (WhatsApp, email, etc.). When the backend is live, this link would be emailed automatically. The invitee opens it and sets their own password — no password is set by you.
      </div>
      <div class="flex justify-end pt-1">
        <button onclick="closeModal(); route();" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Done</button>
      </div>
    </div>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function copyInviteLink() {
  const field = document.getElementById('inviteLinkField');
  const done = () => { const b = document.getElementById('copyBtn'); if (b){ b.textContent = 'Copied!'; setTimeout(()=>{ if(b) b.textContent='Copy'; }, 1500); } };
  if (navigator.clipboard) navigator.clipboard.writeText(field.value).then(done, () => { field.select(); document.execCommand('copy'); done(); });
  else { field.select(); document.execCommand('copy'); done(); }
}
async function revokeInvite(id) {
  if (!isAdmin()) return;
  const inv = (state.invites||[]).find(i => i.id === id);
  if (!inv || !await appConfirm(`Revoke the invite for ${inv.name}? The link will stop working.`, 'Revoke invite')) return;
  state.invites = state.invites.filter(i => i.id !== id);
  saveInvites(state.invites);
  route();
}

// ---------- Add Technician (admin) — created active immediately ----------
function openAddTechnicianModal() {
  if (!isAdmin()) return;
  document.getElementById('modalTitle').textContent = 'Add Technician';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitAddTechnician(event)" class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
          <input name="name" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Full name" /></div>
        <div><label class="block text-xs text-slate-600 mb-1">Phone</label>
          <input name="phone" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="+91 …" /></div>
      </div>
      <div><label class="block text-xs text-slate-600 mb-1">Email <span class="text-red-500">*</span></label>
        <input name="email" type="email" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="name@digitalpaani.com" /></div>
      <div class="text-xs text-slate-500">Technicians are added as active <b>Engineers</b> with default password <b>eng123</b>, and become selectable when logging maintenance.</div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add technician</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function submitAddTechnician(ev) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const email = f.get('email').trim().toLowerCase();
  if (state.users.some(u => u.email.toLowerCase() === email)) { appAlert('A user with this email already exists.'); return; }
  const phoneResult = normalizePhone(f.get('phone'));
  if (!phoneResult.ok) { appAlert(phoneResult.error); return; }
  state.users.push({ id: nextUserId(), name: f.get('name').trim(), email, role: 'Engineer', phone: phoneResult.value, password: 'eng123', status: 'active' });
  saveUsers(state.users);
  closeModal(); route();
}

// ---------- Accept invite (no session required) ----------
function renderAcceptInvite(token) {
  clearNav();
  const data = b64urlDecode(token);
  const wrap = (inner) => `<div class="min-h-[70vh] flex items-center justify-center px-4"><div class="w-full max-w-sm">
    <div class="flex items-center gap-2 justify-center mb-6">
      <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
      <div><div class="font-semibold text-lg leading-tight">DigitalPaani</div><div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div></div>
    </div>${inner}</div></div>`;
  const card = (inner) => `<div class="login-card bg-white rounded-xl border border-slate-200/80 p-6 shadow-xl">${inner}</div>`;

  if (!data || !data.e) {
    document.getElementById('view').innerHTML = wrap(card(`<h1 class="text-lg font-semibold mb-1">Invalid invite</h1>
      <p class="text-sm text-slate-500 mb-4">This invite link is invalid or malformed.</p>
      <a href="#/dashboard" onclick="location.hash='#/dashboard'" class="text-sm text-brand hover:underline">Go to sign in</a>`));
    return;
  }
  const existing = state.users.find(u => u.email.toLowerCase() === data.e.toLowerCase());
  if (existing && existing.status === 'active') {
    document.getElementById('view').innerHTML = wrap(card(`<h1 class="text-lg font-semibold mb-1">Already a member</h1>
      <p class="text-sm text-slate-500 mb-4">${esc(data.e)} already has an active account. Please sign in.</p>
      <button onclick="location.hash='#/dashboard'; route();" class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Go to sign in</button>`));
    return;
  }
  document.getElementById('view').innerHTML = wrap(card(`
    <h1 class="text-lg font-semibold mb-1">Accept your invite</h1>
    <p class="text-xs text-slate-500 mb-4">You've been invited to DigitalPaani Maintenance Ops. Set a password to activate your account.</p>
    <form onsubmit="submitAcceptInvite(event, '${token}')" class="space-y-3">
      <div><label class="block text-xs text-slate-600 mb-1">Name</label>
        <input value="${esc(data.n)}" disabled class="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Email</label>
        <input value="${esc(data.e)}" disabled class="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
      <div class="flex items-center gap-2 text-xs text-slate-600">Role: <span class="badge ${data.r === 'Admin' ? 'badge-brand' : 'badge-neutral'}">${esc(data.r) || 'Engineer'}</span></div>
      <div><label class="block text-xs text-slate-600 mb-1">Choose a password <span class="text-red-500">*</span></label>
        <input name="password" type="password" required minlength="6" autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="At least 6 characters" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Confirm password <span class="text-red-500">*</span></label>
        <input name="confirm" type="password" required autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="Re-enter password" /></div>
      <div id="acceptError" class="hidden text-xs text-red-600"></div>
      <button class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Activate account &amp; sign in</button>
    </form>`));
}
function submitAcceptInvite(ev, token) {
  ev.preventDefault();
  const data = b64urlDecode(token); if (!data) return;
  const f = new FormData(ev.target);
  const pw = f.get('password'), confirm = f.get('confirm');
  const err = document.getElementById('acceptError');
  if (pw !== confirm) { err.textContent = 'Passwords do not match.'; err.classList.remove('hidden'); return; }

  const email = data.e.toLowerCase();
  let user = state.users.find(u => u.email.toLowerCase() === email);
  if (user) {
    user.password = pw; user.status = 'active';
  } else {
    user = { id: nextUserId(), name: data.n || data.e, email: data.e, role: data.r || 'Engineer', phone: '', password: pw, status: 'active' };
    state.users.push(user);
  }
  saveUsers(state.users);
  // Mark the matching invite accepted (only present in the inviter's browser)
  if (state.invites) {
    const inv = state.invites.find(i => i.email.toLowerCase() === email && i.status === 'pending');
    if (inv) { inv.status = 'accepted'; saveInvites(state.invites); }
  }
  localStorage.setItem(LS_SESSION, user.id);
  location.hash = homeHashFor(user);
  route();
}
async function removeUser(id) {
  if (!isAdmin() || currentUser()?.id === id) return;
  const u = state.users.find(x => x.id === id);
  if (!u) return;
  // Superadmin can never be removed; only a Superadmin may remove an Admin.
  if (u.role === 'Superadmin') { appAlert('The Superadmin account cannot be removed.'); return; }
  if (u.role === 'Admin' && !isSuperadmin()) { appAlert('Only the Superadmin can remove an Admin.'); return; }
  if (!await appConfirm(`Remove ${u.name} from the team?`, 'Remove user')) return;
  if (SUPA) { appAlert('Delete the user in Supabase → Authentication → Users. This list reflects Supabase.'); return; }
  state.users = state.users.filter(x => x.id !== id);
  saveUsers(state.users);
  route();
}

// ---------- Assign plants to an engineer (admin) ----------
function openAssignPlantsModal(userId) {
  if (!isAdmin()) return;
  const u = state.users.find(x => x.id === userId); if (!u) return;
  const assigned = assignmentsFor(userId);
  const boxes = state.plants.map(p => `
    <label class="flex items-center gap-2 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
      <input type="checkbox" name="plant.${p.id}" ${assigned.includes(p.id)?'checked':''} />
      <span><span class="font-medium text-slate-800">${esc(p.name)}</span>${p.location?` <span class="text-slate-400">· ${esc(p.location)}</span>`:''}</span>
    </label>`).join('');
  document.getElementById('modalTitle').textContent = `Assign plants — ${u.name}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitAssignPlants(event, '${userId}')" class="space-y-3 text-sm">
      <div class="flex items-center gap-2">
        <div class="text-xs text-slate-500">Select the plants this engineer can access.</div>
        <div class="ml-auto flex gap-2">
          <button type="button" onclick="toggleAllPlants(true)" class="text-xs text-brand hover:underline">Select all</button>
          <button type="button" onclick="toggleAllPlants(false)" class="text-xs text-slate-500 hover:underline">Clear</button>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">${boxes}</div>
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Save assignments</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function toggleAllPlants(on) {
  document.querySelectorAll('#modalBody input[type="checkbox"]').forEach(cb => cb.checked = on);
}
async function submitAssignPlants(ev, userId) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const selected = state.plants.map(p => p.id).filter(id => f.get('plant.' + id));
  if (SUPA) {
    const unlock = lockSubmit(ev);
    // supabase-js returns {error} rather than throwing — check every step so a
    // failed re-insert can't silently wipe an engineer's access.
    const del = await SUPA.from('plant_assignments').delete().eq('user_id', userId);
    if (del.error) { unlock(); saveError(del.error); return; }
    if (selected.length) {
      const ins = await SUPA.from('plant_assignments').insert(selected.map(pid => ({ user_id: userId, plant_id: pid })));
      if (ins.error) { unlock(); saveError(new Error(ins.error.message + ' — assignments for this user may be incomplete; please re-open and save again.')); await hydrateCloud(); route(); return; }
    }
    await hydrateCloud();
    if (authUser && authUser.id === userId) authUser.plants = selected.slice();
  } else {
    const u = state.users.find(x => x.id === userId); if (u) u.plantIds = selected;
    saveUsers(state.users);
  }
  closeModal(); route();
}
async function setUserRole(userId, role) {
  if (!isSuperadmin()) { appAlert('Only the Superadmin can change roles.'); route(); return; }
  if (SUPA) {
    const { error } = await SUPA.from('profiles').update({ role }).eq('id', userId);
    if (error) { saveError(error); route(); return; }
    await hydrateCloud();
  } else {
    const u = state.users.find(x => x.id === userId); if (u) u.role = role; saveUsers(state.users);
  }
  route();
}

// ---------- Per-engineer schedule (admin generates, shares manually) ----------
function toggleScheduleCustom(preset) {
  document.getElementById('scheduleCustomDates')?.classList.toggle('hidden', preset !== 'custom');
}
function openScheduleModal(userId) {
  if (!isAdmin()) return;
  const u = state.users.find(x => x.id === userId); if (!u) return;
  const plantIds = assignmentsFor(userId);
  const plants = state.plants.filter(p => plantIds.includes(p.id));
  const plantSummary = plants.length
    ? `Covers ${plants.length} assigned plant${plants.length===1?'':'s'}: ${plants.map(p=>esc(p.name)).join(', ')}.`
    : `<span class="text-amber-700">This engineer has no plants assigned yet — the schedule will be empty. Assign plants first.</span>`;
  document.getElementById('modalTitle').textContent = `Generate Schedule — ${esc(u.name)}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitSchedule(event, '${userId}')" class="space-y-4 text-sm">
      <div class="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-600">${plantSummary}</div>
      <div>
        <div class="text-sm font-medium mb-2">Period</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label class="flex items-center justify-center gap-1.5 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="radio" name="preset" value="today" checked onchange="toggleScheduleCustom(this.value)" /> Today
          </label>
          <label class="flex items-center justify-center gap-1.5 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="radio" name="preset" value="7d" onchange="toggleScheduleCustom(this.value)" /> Next 7 days
          </label>
          <label class="flex items-center justify-center gap-1.5 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="radio" name="preset" value="30d" onchange="toggleScheduleCustom(this.value)" /> Next 30 days
          </label>
          <label class="flex items-center justify-center gap-1.5 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
            <input type="radio" name="preset" value="custom" onchange="toggleScheduleCustom(this.value)" /> Custom
          </label>
        </div>
        <div id="scheduleCustomDates" class="hidden grid grid-cols-2 gap-3 mt-2">
          <div><label class="block text-xs text-slate-600 mb-1">From</label><input type="date" name="customFrom" value="${today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
          <div><label class="block text-xs text-slate-600 mb-1">To</label><input type="date" name="customTo" value="${today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        </div>
      </div>
      <div class="text-xs text-slate-500">Includes any currently open or overdue work-orders (regardless of period) plus PPM tasks scheduled within the period.</div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" name="action" value="download" class="px-3 py-1.5 rounded-md border border-brand bg-white text-brand hover:bg-brand-50 text-sm font-medium">Download</button>
        <button type="submit" name="action" value="preview"  class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Preview</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function submitSchedule(ev, userId) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const preset = f.get('preset') || 'today';
  const todayStr = today();
  const addDays = (base, n) => { const d = new Date(base + 'T00:00:00'); d.setDate(d.getDate() + n); return dstr(d); };
  let from = todayStr, to = todayStr;
  if (preset === '7d') to = addDays(todayStr, 6);
  else if (preset === '30d') to = addDays(todayStr, 29);
  else if (preset === 'custom') { from = f.get('customFrom') || todayStr; to = f.get('customTo') || todayStr; }
  if (to < from) [from, to] = [to, from];

  const result = buildScheduleDoc(userId, from, to);
  if (!result) return;
  const action = submitterOf(ev)?.value || 'preview';
  closeModal();
  if (action === 'download') savePdfDoc(result.doc, result.filename);
  else openPdfPreview(result.doc, result.filename, `Schedule — ${result.userName}`);
}
function buildScheduleDoc(userId, from, to) {
  const u = state.users.find(x => x.id === userId); if (!u) return null;
  const plantIds = assignmentsFor(userId);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(25,52,88);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.text('Maintenance Schedule', 14, 14);
  doc.setFontSize(9);  doc.text(`Generated ${today()}`, W - 14, 14, { align: 'right' });
  doc.setTextColor(15,23,42);

  let y = 30;
  doc.setFontSize(10);
  doc.text(`Engineer:  ${u.name}`, 14, y); y += 6;
  doc.text(`Period:  ${from}  to  ${to}`, 14, y); y += 6;
  const plants = state.plants.filter(p => plantIds.includes(p.id));
  const plantLine = `Plants (${plants.length}):  ${plants.length ? plants.map(p=>p.name).join(', ') : '(none assigned)'}`;
  // Engineers can hold a dozen plants — wrap instead of running off the page.
  const plantLines = doc.splitTextToSize(plantLine, W - 28);
  doc.text(plantLines, 14, y);
  y += 5 * plantLines.length + 4;

  if (!plantIds.length) {
    doc.setFontSize(10); doc.setTextColor(120,120,120);
    doc.text('No plants are assigned to this engineer yet — nothing to schedule.', 14, y);
    return { doc, filename: `schedule-${u.name.replace(/[^a-zA-Z0-9]+/g,'-')}-${from}.pdf`, userName: u.name };
  }

  // Open / overdue work-orders — shown regardless of the selected period,
  // since this work is already active and the engineer needs to know about it.
  // Every row names its plant — an engineer covering several sites cannot act
  // on a task list that does not say where the machine is. Sorted by plant so
  // the work batches per site (the engineer's real constraint is travel).
  const byPlantThenDate = (a, b) =>
    plantName(a.e.plantId).localeCompare(plantName(b.e.plantId)) || String(a.sortKey).localeCompare(String(b.sortKey));
  const openRows = getPendingTasks(plantIds)
    .map(({ l, e }) => ({ e, l, sortKey: l.startDate }))
    .sort(byPlantThenDate)
    .map(({ l, e }) => [
      e.tag, plantName(e.plantId), l.reason, l.startDate, l.etr || '—',
      isOverdue(l) ? 'Overdue' : 'Open', l.notes || '—',
    ]);
  if (openRows.length) {
    doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Open & overdue work-orders', 14, y); y += 2;
    doc.autoTable({
      startY: y + 2,
      head: [['Equipment', 'Plant', 'Reason', 'Start', 'Expected', 'Status', 'Notes']],
      body: openRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [185,28,28], textColor: 255 },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 32 }, 2: { cellWidth: 17 },
                      3: { cellWidth: 18 }, 4: { cellWidth: 18 }, 5: { cellWidth: 15 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Overdue PPM (independent of the chosen period — it's already due)
  const overdueRows = getOverduePPM(plantIds)
    .map(({ e, date, slot }) => ({ e, slot, ds: dstr(date), sortKey: dstr(date) }))
    .sort(byPlantThenDate)
    .map(x => [x.e.tag, plantName(x.e.plantId), x.slot, x.ds, 'Overdue']);
  if (overdueRows.length) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Overdue PPM', 14, y); y += 2;
    doc.autoTable({
      startY: y + 2,
      head: [['Equipment', 'Plant', 'Schedule', 'Planned date', 'Status']],
      body: overdueRows,
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [185,28,28], textColor: 255 },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Upcoming PPM within the selected period
  const spanDays = Math.max(1, daysBetween(today(), to) + 1);
  const upcoming = getUpcomingPPM(spanDays, plantIds)
    .map(({ e, date, slot }) => ({ e, ds: dstr(date), slot, sortKey: dstr(date) }))
    .filter(x => x.ds >= from && x.ds <= to)
    .sort(byPlantThenDate);
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text(`Scheduled PPM (${from} to ${to})`, 14, y); y += 2;
  if (upcoming.length) {
    doc.autoTable({
      startY: y + 2,
      head: [['Equipment', 'Plant', 'Type', 'Schedule', 'Date']],
      body: upcoming.map(x => [x.e.tag, plantName(x.e.plantId), x.e.type, x.slot, x.ds]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [25,52,88], textColor: 255 },
      columnStyles: { 0: { cellWidth: 48 }, 1: { cellWidth: 38 } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text('No PPM tasks scheduled in this period.', 14, y + 4);
    doc.setTextColor(15,23,42);
  }

  return { doc, filename: `schedule-${u.name.replace(/[^a-zA-Z0-9]+/g,'-')}-${from}_to_${to}.pdf`, userName: u.name };
}

window._recipState = {};
function renderRecipPicker(eventKey) {
  const ids = window._recipState[eventKey] || [];
  const chips = ids.map(uid => {
    const u = state.users.find(x => x.id === uid); if (!u) return '';
    return `<span class="recip-chip">${esc(u.name)}<button type="button" onclick="removeRecipient('${eventKey}','${uid}')" aria-label="Remove ${esc(u.name)}">&times;</button></span>`;
  }).join('');
  return `
    <div class="recip-picker">
      <div class="picker-wrap" id="picker-wrap-${eventKey}">
        ${chips}
        <input type="text" class="picker-input" id="recip-input-${eventKey}"
          placeholder="${ids.length ? 'Add more…' : 'Type a name to add…'}"
          oninput="onRecipInput('${eventKey}', this.value)"
          onfocus="onRecipInput('${eventKey}', this.value)"
          onblur="setTimeout(()=>hideRecipDropdown('${eventKey}'), 150)" />
      </div>
      <div class="picker-dropdown hidden" id="recip-dd-${eventKey}"></div>
    </div>`;
}
function onRecipInput(eventKey, query) {
  const q = (query || '').trim().toLowerCase();
  const selected = window._recipState[eventKey] || [];
  const matches = state.users
    .filter(u => !selected.includes(u.id))
    .filter(u => !q || u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  const dd = document.getElementById(`recip-dd-${eventKey}`);
  if (!matches.length) {
    dd.innerHTML = `<div class="pd-empty">No matching users</div>`;
  } else {
    dd.innerHTML = matches.map(u => `
      <div onmousedown="event.preventDefault()" onclick="addRecipient('${eventKey}','${u.id}')">
        <span class="pd-name">${esc(u.name)}</span>
        <span class="pd-role">${u.role}</span>
      </div>`).join('');
  }
  dd.classList.remove('hidden');
}
function hideRecipDropdown(eventKey) {
  const dd = document.getElementById(`recip-dd-${eventKey}`);
  if (dd) dd.classList.add('hidden');
}
function addRecipient(eventKey, uid) {
  window._recipState[eventKey] = window._recipState[eventKey] || [];
  if (!window._recipState[eventKey].includes(uid)) window._recipState[eventKey].push(uid);
  refreshRecipPicker(eventKey);
  const inp = document.getElementById(`recip-input-${eventKey}`);
  if (inp) { inp.value = ''; inp.focus(); onRecipInput(eventKey, ''); }
}
function removeRecipient(eventKey, uid) {
  window._recipState[eventKey] = (window._recipState[eventKey] || []).filter(x => x !== uid);
  refreshRecipPicker(eventKey);
}
function refreshRecipPicker(eventKey) {
  const wrap = document.getElementById(`recip-wrap-host-${eventKey}`);
  if (wrap) wrap.innerHTML = renderRecipPicker(eventKey);
}

function openPlantNotifModal(plantId) {
  const p = plantById(plantId);
  // Initialize per-event recipient state
  window._recipState = {};
  NOTIF_EVENTS.forEach(ev => {
    window._recipState[ev.key] = (p.notifications[ev.key].recipients || []).slice();
  });

  const eventBlock = NOTIF_EVENTS.map(ev => {
    const cfg = p.notifications[ev.key];
    const channelBoxes = CHANNELS.map(ch => `
      <label class="inline-flex items-center gap-1.5 text-xs">
        <input type="checkbox" name="${ev.key}.${ch}" ${cfg.channels.includes(ch)?'checked':''} />
        <span class="capitalize">${ch === 'sms' ? 'SMS' : ch}</span>
      </label>`).join('');
    return `
      <div class="border border-slate-200 rounded-lg p-3 bg-white">
        <label class="flex items-center gap-2">
          <input type="checkbox" name="${ev.key}.enabled" ${cfg.enabled?'checked':''} />
          <span class="font-medium text-sm">${ev.label}</span>
        </label>
        <div class="mt-3 space-y-3">
          <div>
            <div class="text-xs text-slate-500 mb-1.5">Channels</div>
            <div class="flex flex-wrap gap-x-3 gap-y-1.5">${channelBoxes}</div>
          </div>
          <div>
            <div class="text-xs text-slate-500 mb-1.5">Recipients</div>
            <div id="recip-wrap-host-${ev.key}">${renderRecipPicker(ev.key)}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('modalTitle').textContent = `Notifications — ${p.name}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="savePlantNotif(event, '${plantId}')" class="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      <div class="text-xs text-slate-500">For each event, enable it, choose how to notify, and pick who should receive it.</div>
      <div class="space-y-2">${eventBlock}</div>
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Save</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}

async function savePlantNotif(ev, plantId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const p = plantById(plantId);
  NOTIF_EVENTS.forEach(evt => {
    p.notifications[evt.key].enabled    = !!f.get(`${evt.key}.enabled`);
    p.notifications[evt.key].channels   = CHANNELS.filter(ch => f.get(`${evt.key}.${ch}`));
    p.notifications[evt.key].recipients = (window._recipState[evt.key] || []).slice();
  });
  if (SUPA) {
    const unlock = lockSubmit(ev);
    const { error } = await SUPA.from('plants').update({ notifications: p.notifications }).eq('id', plantId);
    if (error) { unlock(); saveError(error); return; }
    await hydrateCloud(); closeModal(); route(); return;
  }
  savePlant(state.plants);
  closeModal();
  route();
}

// ---------- Exports ----------
function exportDropdown(eqArg, id) {
  return `<div class="relative inline-block">
    <button type="button" onclick="toggleExportMenu('${id}', event)" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium inline-flex items-center gap-1">
      Export
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div id="${id}" class="hidden absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-md shadow-lg z-10 overflow-hidden">
      <button type="button" onclick="closeExportMenus(); exportXLSX(${eqArg})" class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand">As Excel (.xlsx)</button>
      <button type="button" onclick="closeExportMenus(); exportPDF(${eqArg})"  class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 hover:text-brand">As PDF</button>
    </div>
  </div>`;
}
function toggleExportMenu(id, ev) {
  ev.stopPropagation();
  document.querySelectorAll('[id$="-export"]').forEach(m => { if (m.id !== id) m.classList.add('hidden'); });
  document.getElementById(id).classList.toggle('hidden');
}
function closeExportMenus() { document.querySelectorAll('[id$="-export"]').forEach(m => m.classList.add('hidden')); }
document.addEventListener('click', closeExportMenus);

function exportRows(eqId) {
  const source = eqId
    ? state.logs.filter(l => l.equipmentId === eqId).map(l => ({ l, e: eqById(eqId) })).sort((a,b) => b.l.startDate.localeCompare(a.l.startDate))
    : getFilteredLogs();
  return source.map(({l, e}) => ({
    Tag: e.tag, Plant: plantName(e.plantId), Type: e.type, Make: e.make, Model: e.model, Location: e.location,
    Reason: l.reason, Start: l.startDate, 'Expected Completion': l.etr || '', End: l.endDate || '',
    'Duration (days)': l.endDate ? daysBetween(l.startDate, l.endDate) : '',
    Status: l.endDate ? 'Completed' : (isOverdue(l) ? 'Overdue' : 'Ongoing'),
    Technician: l.technician, 'Reason / Notes': l.notes, 'Completion Notes': l.completionNotes || '',
  }));
}
function exportXLSX(eqId) {
  const rows = exportRows(eqId);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Log');
  const name = eqId ? `maintenance-log-${eqById(eqId).tag}-${today()}.xlsx` : `maintenance-log-${today()}.xlsx`;
  saveWorkbook(wb, name);
}
function exportPDF(eqId) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  const title = eqId ? `Maintenance Log — ${eqById(eqId).tag} (${eqById(eqId).make} ${eqById(eqId).model})` : 'Maintenance Log';
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated ${today()}`, 14, 20);
  const rows = exportRows(eqId);
  const cols = Object.keys(rows[0] || { Tag:'' });
  doc.autoTable({ head: [cols], body: rows.map(r => cols.map(c => r[c])), startY: 26, styles: { fontSize: 7 }, headStyles: { fillColor: [25,52,88] } });
  const name = eqId ? `maintenance-log-${eqById(eqId).tag}-${today()}.pdf` : `maintenance-log-${today()}.pdf`;
  savePdfDoc(doc, name);
}

// ---------- Engineering Corner ----------
const SLOT_DAY = { W1: 4, W2: 11, W3: 18, W4: 25 };

// All three accept an optional explicit plant-id list (for generating a
// schedule scoped to SOMEONE ELSE's assigned plants, e.g. an admin building
// a schedule for a specific engineer). Defaults to the current user's own
// accessible plants — every existing call site is unaffected.
function getPendingTasks(plantIds) {
  const admin = !plantIds && effRole(currentUser()) === 'Admin';
  const ids = plantIds || accessiblePlantIds();
  return state.logs
    .filter(l => !l.endDate)
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(x => x.e && (admin || ids.includes(x.e.plantId)))
    .sort((a,b) => a.l.startDate.localeCompare(b.l.startDate));
}

function getUpcomingPPM(days = 30, plantIds) {
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const horizon = new Date(now); horizon.setDate(horizon.getDate() + days);
  const admin = !plantIds && effRole(currentUser()) === 'Admin'; const ids = plantIds || accessiblePlantIds();
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e || (!admin && !ids.includes(e.plantId))) continue;
    if (e.status !== 'Operational') continue; // already under maintenance
    if (openLogFor(eqId)) continue;           // an open work-order already covers it
    if (slot === 'weekly') {
      let d = new Date('2026-01-01T00:00:00');
      while (d < now) { d.setDate(d.getDate() + 7); }
      while (d <= horizon) {
        out.push({ e, date: new Date(d), slot: 'Weekly' });
        d = new Date(d); d.setDate(d.getDate() + 7);
      }
    } else {
      const day = SLOT_DAY[slot];
      let m = now.getMonth(), y = now.getFullYear();
      for (let i = 0; i < 2; i++) {
        const d = new Date(y, m + i, day);
        if (d >= now && d <= horizon) out.push({ e, date: d, slot: `Monthly · ${slot}` });
      }
    }
  }
  return out.sort((a,b) => a.date - b.date);
}

// PPM slots before this date are never reported overdue — the schedule went
// live at launch; flagging months of pre-launch slots would flood day one.
// Nothing before this date can be "overdue" — the tool wasn't keeping records
// yet. Per-equipment, the floor is the LATER of this and the day the machine
// was added (equipment.created_at), so importing a plant never manufactures a
// backlog of maintenance nobody was asked to do — including future imports.
const PPM_BASELINE = '2026-07-19';
function ppmOverdueFloor(e) {
  return (e && e.addedOn && e.addedOn > PPM_BASELINE) ? e.addedOn : PPM_BASELINE;
}

function getOverduePPM(plantIds) {
  // PPM slots whose date is in the past but no completion log exists at-or-after that date in this month.
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const admin = !plantIds && effRole(currentUser()) === 'Admin'; const ids = plantIds || accessiblePlantIds();
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e || (!admin && !ids.includes(e.plantId))) continue;
    if (e.status !== 'Operational') continue; // already in maintenance — being handled
    if (openLogFor(eqId)) continue;           // an open work-order already covers it
    if (slot === 'weekly') continue; // weekly noise — skip from "overdue"
    const day = SLOT_DAY[slot];
    const m = now.getMonth(), y = now.getFullYear();
    const slotDate = new Date(y, m, day);
    if (slotDate >= now) continue; // not yet due
    const slotStr = dstr(slotDate);
    if (slotStr < ppmOverdueFloor(e)) continue; // before this machine existed here — not a backlog
    const monthPrefix = slotStr.slice(0,7);
    const done = state.logs.some(l => l.equipmentId === eqId && l.endDate && l.endDate.startsWith(monthPrefix));
    if (!done) out.push({ e, date: slotDate, slot: `Monthly · ${slot}` });
  }
  return out.sort((a,b) => a.date - b.date);
}

function getVisits() {
  // Group completed logs by endDate (= visit day), scoped to accessible plants.
  const admin = effRole(currentUser()) === 'Admin'; const ids = accessiblePlantIds();
  const map = new Map();
  for (const l of state.logs) {
    if (!l.endDate) continue;
    const e = eqById(l.equipmentId);
    if (!e || (!admin && !ids.includes(e.plantId))) continue;
    if (!map.has(l.endDate)) map.set(l.endDate, []);
    map.get(l.endDate).push(l);
  }
  const visits = [];
  for (const [date, logs] of map) {
    const eqIds = [...new Set(logs.map(l => l.equipmentId))];
    const equipment = eqIds.map(id => eqById(id)).filter(Boolean);
    const plants = [...new Set(equipment.map(e => e.plantId))].map(plantById).filter(Boolean);
    const technicians = [...new Set(logs.map(l => l.technician))];
    visits.push({ date, logs, equipment, plants, technicians });
  }
  return visits.sort((a,b) => b.date.localeCompare(a.date));
}

function renderEngineer() {
  const tab = ui.engineerTab;
  const tabBtn = (key, label, count) => `
    <button data-tour="tab-${key}" onclick="ui.engineerTab='${key}'; renderEngineer()"
      class="px-4 py-2 rounded-md text-sm font-medium border ${tab===key?'border-brand bg-brand text-white':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}">
      ${label} ${count!==undefined?`<span class="ml-1 text-xs ${tab===key?'opacity-80':'text-slate-500'}">(${count})</span>`:''}
    </button>`;

  const pending  = getPendingTasks();
  const overdue  = getOverduePPM();
  const upcoming = getUpcomingPPM(30);
  const visits   = getVisits();
  const toReview = getSubmittedWOs();

  let body = '';
  if (tab === 'pending') body = renderPendingTab(pending, overdue);
  else if (tab === 'upcoming') body = renderUpcomingTab(upcoming);
  else if (tab === 'wo-review') body = renderWoReviewTab(toReview);
  else body = renderVisitsTab(visits);

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <h1 class="text-2xl font-semibold" data-tour="engineer-h1">Engineering Corner</h1>
      <div class="ml-auto flex gap-2 flex-wrap">${plantFilterControl()}${typeFilterControl()}${suggestFilter({
        id: 'ecSearch', listId: 'ecSuggest', placeholder: 'Find equipment…',
        options: [...pending.map(x => x.e), ...overdue.map(x => x.e), ...upcoming.map(x => x.e)].flatMap(e => [e.tag, e.make, e.model]),
        oninput: "filterRows('#view .list-table tbody tr', this.value)", width: 'w-44' })}</div>
    </div>
    <p class="text-slate-500 mb-5">For site service engineers: see what's pending, what's coming up, and generate visit-wise sign-off reports.</p>
    <div class="flex gap-2 mb-5 flex-wrap">
      ${tabBtn('pending',  'Pending', pending.length + overdue.length)}
      ${tabBtn('upcoming', 'Upcoming PPM', upcoming.length)}
      ${SUPA ? tabBtn('wo-review', 'To review', toReview.length) : ''}
      ${tabBtn('visits',   'Visit Reports', visits.length)}
    </div>
    ${body}
  `;
}

// Work completed by technicians, awaiting the engineer's verdict.
function getSubmittedWOs() {
  if (!SUPA) return [];
  const ids = accessiblePlantIds();
  return state.logs
    .filter(l => woStateOf(l) === 'submitted')
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(({ e }) => e && ids.includes(e.plantId))
    .sort((a, b) => String(a.l.endDate).localeCompare(String(b.l.endDate)));
}
function getReturnedWOs() {
  if (!SUPA) return [];
  const ids = accessiblePlantIds();
  return state.logs
    .filter(l => woStateOf(l) === 'returned')
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(({ e }) => e && ids.includes(e.plantId));
}
function getOpenIssues() {
  if (!SUPA) return [];
  const ids = accessiblePlantIds();
  return (cloudIssues || [])
    .filter(i => i.status === 'open')
    .map(i => ({ i, e: eqById(i.equipment_id) }))
    .filter(({ e }) => e && ids.includes(e.plantId));
}
function getSubmittedReports() {
  if (!SUPA) return [];
  const ids = accessiblePlantIds();
  return (cloudReports || []).filter(r => r.status === 'submitted' && ids.includes(r.plant_id));
}
async function reassignWo(logId, toId) {
  if (!toId) return;
  const { error } = await SUPA.rpc('reassign_work_order', { p_log: logId, p_to: toId });
  if (error) { appAlert('Could not reassign: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Reassigned — it is on their My Work now.');
}
function openReassignModal(logId) {
  const l = state.logs.find(x => x.id === logId); if (!l) return;
  const e = eqById(l.equipmentId);
  const techs = technicianAccounts().filter(t => t.id !== l.assignedTo);
  document.getElementById('modalTitle').textContent = `Reassign — ${e ? e.tag : logId}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="event.preventDefault(); reassignWo('${logId}', this.querySelector('[name=to]').value)" class="space-y-3 text-sm">
      <p class="text-xs text-slate-500">Currently with <b>${esc(l.technician) || 'nobody'}</b>. The new person sees it in their My Work immediately; the job's history stays intact.</p>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Hand it to <span class="text-red-500">*</span></label>
        <select name="to" required class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
          <option value="">— choose —</option>
          ${techs.map(t => `<option value="${t.id}">${esc(t.name)} — ${openCountFor(t.id)} open</option>`).join('')}
        </select>
        ${techs.length ? '' : '<div class="text-[11px] text-amber-700 mt-1">No other technician accounts yet — invite one from Team, or complete the job yourself from the equipment page.</div>'}
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white" ${techs.length ? '' : 'disabled'}>Reassign</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function renderWoReviewTab(items) {
  const returned = getReturnedWOs();
  const issues = getOpenIssues();
  const reports = getSubmittedReports();
  if (!items.length && !returned.length && !issues.length && !reports.length && !visitsReadyForReport().length) {
    return `<div class="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">Nothing awaiting review. Technician-completed jobs, reported issues and service reports land here for your sign-off.</div>`;
  }
  const cards = items.map(({ l, e }) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4" data-review-log="${l.id}">
      <div class="flex items-start gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${tagLink(e)} <span class="text-slate-400 font-normal">· ${esc(plantName(e.plantId))}</span></div>
          <div class="text-xs text-slate-500 mt-0.5">${l.woNo ? esc(l.woNo) + ' · ' : ''}${esc(l.reason)} · completed ${l.endDate} by <b>${esc(l.technician) || 'unknown'}</b></div>
        </div>
        <span class="badge badge-mt">Awaiting review</span>
      </div>
      <div class="text-xs text-slate-700 mt-2 whitespace-pre-line">${esc(l.completionNotes) || '<span class="text-slate-400">No completion notes.</span>'}</div>
      <div class="flex gap-2 flex-wrap mt-2 wo-media-strip" data-log="${l.id}"><span class="text-[11px] text-slate-400">Loading photos…</span></div>
      <div class="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-100">
        <button onclick="openReturnWoModal('${l.id}')" class="text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium">Send back</button>
        <button onclick="reviewWo('${l.id}', true)" class="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium">Approve</button>
      </div>
    </div>`).join('');
  const returnedCards = returned.map(({ l, e }) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex items-start gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${tagLink(e)} <span class="text-slate-400 font-normal">· ${esc(plantName(e.plantId))}</span></div>
          <div class="text-xs text-slate-500 mt-0.5">${l.woNo ? esc(l.woNo) + ' · ' : ''}Returned to <b>${esc(l.technician) || 'unknown'}</b> — your note: ${esc(l.reviewNote || '')}</div>
        </div>
        <span class="badge badge-bd">Waiting on technician</span>
      </div>
      <div class="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-100">
        <button onclick="openReassignModal('${l.id}')" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium">Reassign</button>
        <button onclick="reviewWo('${l.id}', true)" class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium" title="Accept the record as it stands instead of waiting">Close as-is</button>
      </div>
    </div>`).join('');

  const needLabel = { service: 'needs servicing', repair: 'needs repair', replace: 'needs replacement' };
  const issueCards = issues.map(({ i, e }) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex items-start gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${tagLink(e)} <span class="text-slate-400 font-normal">· ${esc(plantName(e.plantId))}</span></div>
          <div class="text-xs text-slate-500 mt-0.5">Reported by <b>${esc(i.raised_name) || 'unknown'}</b> · ${new Date(i.created_at).toLocaleDateString()}</div>
        </div>
        <span class="badge badge-mt">${needLabel[i.need] || i.need}</span>
      </div>
      <div class="text-xs text-slate-700 mt-2 whitespace-pre-line">${esc(i.description)}</div>
      <div class="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-100 flex-wrap">
        <button onclick="dismissIssue(${i.id})" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 font-medium">Dismiss</button>
        <button onclick="triageIssue(${i.id}, 'handled')" class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium" title="Already dealt with — no follow-up needed">Handled</button>
        ${openLogFor(i.equipment_id) ? '' : `<button onclick="openMaintModal('${i.equipment_id}', ${i.id})" class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium">Schedule work</button>`}
      </div>
    </div>`).join('');

  const reportCards = reports.map(r => `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex items-start gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${esc(plantName(r.plant_id))} — ${r.visit_date}</div>
          <div class="text-xs text-slate-500 mt-0.5">Signed &amp; submitted by <b>${esc(r.technician_name)}</b> · ${(r.content?.jobs || []).length} job${(r.content?.jobs || []).length === 1 ? '' : 's'}</div>
        </div>
        <span class="badge badge-mt">Awaiting your signature</span>
      </div>
      <div class="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-100">
        <button onclick="openReportView('${r.id}')" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium">View</button>
        <button onclick="openReportChangesModal('${r.id}')" class="text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 font-medium">Request changes</button>
        <button onclick="engineerSignReport('${r.id}')" class="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium">Approve &amp; sign</button>
      </div>
    </div>`).join('');

  const readyVisits = visitsReadyForReport();
  const readyCards = readyVisits.map(v => `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="flex items-start gap-3 flex-wrap">
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-sm">${esc(plantName(v.plantId))} — ${v.date}</div>
          <div class="text-xs text-slate-500 mt-0.5">${v.jobs.length} approved job${v.jobs.length === 1 ? '' : 's'} by <b>${esc(v.techName)}</b> · no report yet</div>
        </div>
        <span class="badge badge-neutral">Report not raised</span>
      </div>
      <div class="flex gap-2 justify-end mt-3 pt-3 border-t border-slate-100">
        <button onclick="openCompileReportModal('${v.plantId}', '${v.date}', '${v.techId}')" class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium">Create &amp; sign report</button>
      </div>
    </div>`).join('');

  const section = (title, inner) => inner ? `<div><h2 class="font-semibold text-sm mb-2 mt-5 first:mt-0">${title}</h2><div class="grid gap-3">${inner}</div></div>` : '';
  queueMicrotask(() => fillWoMedia(items.map(x => x.l.id)));
  return section(`Completed work — awaiting review (${items.length})`, cards)
       + section(`Returned — waiting on the technician (${returned.length})`, returnedCards)
       + section(`Reported issues (${issues.length})`, issueCards)
       + section(`Service reports (${reports.length})`, reportCards)
       + section(`Visits ready for a report (${readyVisits.length})`, readyCards);
}
async function triageIssue(id, action, note, followLog) {
  const { error } = await SUPA.rpc('triage_issue', { p_id: id, p_action: action, p_note: note || null, p_follow_log: followLog || null });
  if (error) { appAlert('Could not update the issue: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast(action === 'scheduled' ? 'Issue linked to the new work order.' : action === 'handled' ? 'Marked handled.' : 'Dismissed.');
}
async function dismissIssue(id) {
  const reason = await appPromptText('Dismiss issue', 'Why is nothing being done? This is the record the next person reads.', 'e.g. Cosmetic only — housing scratch, no function impact.');
  if (reason === null) return;
  if (!reason.trim()) { appAlert('A reason is required to dismiss.'); return; }
  triageIssue(id, 'dismissed', reason.trim());
}
// Tiny prompt-modal (appAlert-style) returning the entered text or null.
function appPromptText(title, msg, placeholder) {
  return new Promise((resolve) => {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
      <form class="space-y-3 text-sm" id="promptForm">
        <p class="text-xs text-slate-500">${esc(msg)}</p>
        <textarea name="v" rows="3" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="${esc(placeholder || '')}"></textarea>
        <div class="flex gap-2 justify-end pt-1">
          <button type="button" data-x class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
          <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Confirm</button>
        </div>
      </form>`;
    const form = document.getElementById('promptForm');
    form.onsubmit = (ev) => { ev.preventDefault(); const v = new FormData(form).get('v'); closeModal(); resolve(String(v || '')); };
    form.querySelector('[data-x]').onclick = () => { closeModal(); resolve(null); };
    document.getElementById('modal').classList.remove('hidden');
    pushOverlayState();
  });
}
async function fillWoMedia(logIds) {
  const byLog = await mediaForLogs(logIds);
  logIds.forEach(id => {
    const strip = document.querySelector(`.wo-media-strip[data-log="${id}"]`);
    if (!strip) return;
    const urls = byLog[id] || [];
    strip.innerHTML = urls.length
      ? urls.map(u => `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" class="w-20 h-20 object-cover rounded-md border border-slate-200" alt="job photo" /></a>`).join('')
      : `<span class="text-[11px] text-slate-400">No photos attached.</span>`;
  });
}
// Visits whose every job is closed and which have no report yet — the
// engineer can compile and sign these without waiting for the technician.
function visitsReadyForReport() {
  if (!SUPA) return [];
  const ids = accessiblePlantIds();
  const byKey = new Map();
  state.logs.forEach(l => {
    if (!l.endDate || !l.assignedTo) return;
    const e = eqById(l.equipmentId);
    if (!e || !ids.includes(e.plantId)) return;
    const key = e.plantId + '|' + l.endDate + '|' + l.assignedTo;
    if (!byKey.has(key)) byKey.set(key, { plantId: e.plantId, date: l.endDate, techId: l.assignedTo, jobs: [] });
    byKey.get(key).jobs.push(l);
  });
  return [...byKey.values()]
    .filter(v => v.jobs.every(l => woStateOf(l) === 'done'))
    .filter(v => !(cloudReports || []).some(r =>
      r.plant_id === v.plantId && r.visit_date === v.date && r.technician_id === v.techId))
    .map(v => ({ ...v, techName: (state.users || []).find(u => u.id === v.techId)?.name || 'technician' }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
}
async function engineerCompileReport(plantId, date, techId) {
  const content = buildReportContent(plantId, date, techId);
  const id = 'SR-' + String(Date.now()).slice(-8);
  const { error } = await SUPA.rpc('engineer_create_report', {
    p_id: id, p_plant: plantId, p_date: date, p_tech: techId, p_content: content,
  });
  if (error) { appAlert('Could not create the report: ' + error.message); return false; }
  await hydrateCloud(); closeModal(); route();
  toast('Report created and signed by you — ready for the client signature on site.');
  return true;
}
function openCompileReportModal(plantId, date, techId) {
  const content = buildReportContent(plantId, date, techId);
  document.getElementById('modalTitle').textContent = `Service report — ${esc(plantName(plantId))}, ${date}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="event.preventDefault(); engineerCompileReport('${plantId}', '${date}', '${techId}')" class="space-y-3 text-sm">
      <div class="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-[36vh] overflow-y-auto">
        ${content.jobs.map(j => `<div class="px-3 py-2">
          <div class="text-xs font-medium text-slate-800">${esc(j.tag)} <span class="text-slate-400 font-normal">· ${esc(j.reason)}</span>${j.wo_no ? ` <span class="font-mono text-[10px] text-slate-400">${esc(j.wo_no)}</span>` : ''}</div>
          <div class="text-[11px] text-slate-500">${esc(j.done) || 'No completion notes.'}</div>
        </div>`).join('')}
        ${content.issues.length ? `<div class="px-3 py-2 bg-amber-50/50">
          ${content.issues.map(i => `<div class="text-[11px] text-amber-800">• ${esc(i.tag)}: ${esc(i.description)} (${ISSUE_NEED_LABEL[i.need] || i.need})</div>`).join('')}
        </div>` : ''}
      </div>
      <div class="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
        Covers <b>${content.jobs.length} machine${content.jobs.length === 1 ? '' : 's'}</b> ${esc(content.technician)} finished
        at ${esc(plantName(plantId))} on ${date} — all approved by you.
        <br />Creating it <b>signs it as you</b>. ${esc(content.technician)}'s work-order submissions are
        recorded as their attestation. The client signs last, on site.
      </div>
      <div class="flex gap-2 justify-end pt-1">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Not now</button>
        <button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white">Create &amp; sign</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}

async function reviewWo(logId, approve, note) {
  const before = state.logs.find(x => x.id === logId);
  const { error } = await SUPA.rpc('review_work_order', { p_log: logId, p_approve: approve, p_note: note || null });
  if (error) { appAlert('Could not save the review: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast(approve ? 'Approved and closed.' : 'Sent back to the technician with your note.');
  // If that approval completed a whole visit, offer its report now rather
  // than making the engineer come back after the technician raises one.
  if (!approve || !before) return;
  const e = eqById(before.equipmentId); if (!e) return;
  const ready = visitsReadyForReport().find(v =>
    v.plantId === e.plantId && v.date === before.endDate && v.techId === before.assignedTo);
  if (ready) openCompileReportModal(ready.plantId, ready.date, ready.techId);
}
function openReturnWoModal(logId) {
  const l = state.logs.find(x => x.id === logId); if (!l) return;
  document.getElementById('modalTitle').textContent = 'Send back for fixes';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="event.preventDefault(); reviewWo('${logId}', false, this.querySelector('[name=note]').value)" class="space-y-3 text-sm">
      <p class="text-xs text-slate-500">The job stays recorded and the machine stays in service — this sends the paperwork back to <b>${esc(l.technician) || 'the technician'}</b> to fix and resubmit.</p>
      <div>
        <label class="block text-xs text-slate-600 mb-1">What needs fixing <span class="text-red-500">*</span></label>
        <textarea name="note" rows="3" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Add a photo of the replaced seal, and note the test result."></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Send back</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}

function renderPendingTab(pending, overdue) {
  const fEq = e => (ui.plantFilter === 'all' || e.plantId === ui.plantFilter) && (ui.typeFilter === 'all' || e.type === ui.typeFilter);
  const fOpen    = pending.filter(({l, e}) => fEq(e) && woStateOf(l) === 'open');
  const fOngoing = pending.filter(({l, e}) => fEq(e) && woStateOf(l) !== 'open');
  const fOverdue = overdue.filter(({e}) => fEq(e));

  if (!fOpen.length && !fOngoing.length && !fOverdue.length) return `<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">Nothing pending — every equipment is operational and no PPM is overdue.</div>`;

  const openRows = fOpen.map(({l, e}) => {
    const et = ecStatus(l.etr, null);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${l.reason} ${priorityChip(l.priority)}</div><div class="cell-muted">${esc(l.notes).slice(0,60)}</div></td>
      <td><div class="cell-primary">${l.etr || l.startDate}</div><div class="cell-muted">Scheduled</div></td>
      <td><span class="${et.cls}">${et.label}</span></td>
      <td class="col-center"><div class="inline-flex gap-1.5"><button onclick="startWorkOrder('${l.id}')" class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap">Start Work</button><button onclick="openCompleteModal('${l.equipmentId}')" class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium whitespace-nowrap" title="Done on the spot — record start and completion in one go">Complete now</button></div></td>
    </tr>`;
  }).join('');

  const openSection = fOpen.length ? `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm flex items-center">
        <span>Scheduled tasks — ready to start <span class="text-slate-400 font-normal">(${fOpen.length})</span></span>
        <span class="ml-auto text-xs text-slate-500 font-normal">Generated from the PPM schedule</span>
      </div>
      <div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Equipment</th><th>Type / Model</th><th>Task</th><th>Due</th><th>Due status</th><th class="col-center">Action</th></tr></thead>
        <tbody>${openRows}</tbody>
      </table></div>
    </div>` : '';

  const ongoingRows = fOngoing.map(({l, e}) => {
    const et = ecStatus(l.etr, null);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${l.reason} ${priorityChip(l.priority)}</div><div class="cell-muted">Tech: ${esc(l.technician)}</div></td>
      <td><div class="cell-primary">${l.startDate}</div><div class="cell-muted">Expected: ${l.etr||'—'}</div></td>
      <td><span class="${et.cls}">${et.label}</span></td>
      <td class="col-center"><button onclick="openCompleteModal('${e.id}')" class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium">Mark Complete</button></td>
    </tr>`;
  }).join('');

  const todayD = new Date(today() + 'T00:00:00');
  const overdueRows = fOverdue.map(({e, date, slot}) => {
    const ds = dstr(date);
    const overdueBy = Math.round((todayD - date) / 86400000);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">Scheduled PPM</div><div class="cell-muted">${slot}</div></td>
      <td><div class="cell-primary">${ds}</div><div class="cell-muted">Planned date</div></td>
      <td><span class="badge badge-bd">Overdue by ${overdueBy}d</span></td>
      <td class="col-center"><button onclick="openMaintModal('${e.id}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Put in Maintenance</button></td>
    </tr>`;
  }).join('');

  const ongoingSection = fOngoing.length ? `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm">Ongoing maintenance <span class="text-slate-400 font-normal">(${fOngoing.length})</span></div>
      <div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Equipment</th><th>Type / Model</th><th>Reason</th><th>Start / Expected</th><th>Due status</th><th class="col-center">Action</th></tr></thead>
        <tbody>${ongoingRows}</tbody>
      </table></div>
    </div>` : '';

  const overdueSection = fOverdue.length ? `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm flex items-center">
        <span>Overdue PPM <span class="text-slate-400 font-normal">(${fOverdue.length})</span></span>
        <span class="ml-auto text-xs text-slate-500 font-normal">Scheduled service dates that have passed without completion</span>
      </div>
      <div class="overflow-x-auto"><table class="list-table">
        <thead><tr><th>Equipment</th><th>Type / Model</th><th>Task</th><th>Date</th><th>Status</th><th class="col-center">Action</th></tr></thead>
        <tbody>${overdueRows}</tbody>
      </table></div>
    </div>` : '';

  return openSection + ongoingSection + overdueSection;
}

// Start an auto-generated (open) work-order: flags the equipment and stamps
// the acting engineer as technician if none was set.
window._busyWO = window._busyWO || new Set();
async function startWorkOrder(logId) {
  if (window._busyWO.has(logId)) return;   // double-click guard
  window._busyWO.add(logId);
  try { await _startWorkOrderInner(logId); } finally { window._busyWO.delete(logId); }
}
async function _startWorkOrderInner(logId) {
  const log = state.logs.find(l => l.id === logId);
  if (!log || woStateOf(log) !== 'open') { appAlert('This work-order has already been started.'); return; }
  const eq = eqById(log.equipmentId);
  if (SUPA) {
    const { error } = await SUPA.rpc('start_work_order', { p_log: logId });
    if (error) { saveError(error); return; }
    await hydrateCloud();
    route();
    pushEventNotification(log.reason === 'Breakdown' ? 'breakdown' : 'maintenance', eqById(log.equipmentId), log);
    toast(`Work started — ${esc(eq?.tag || 'equipment')} is now in maintenance.`);
    return;
  }
  log.woState = 'active';
  log.startDate = today();
  if (!log.technician) log.technician = currentUser()?.name || '';
  if (eq) eq.status = log.reason === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
  saveLog(state.logs); saveEq(state.equipment);
  route();
  toast(`Work started — ${esc(eq?.tag || 'equipment')} is now in maintenance.`);
}

function renderUpcomingTab(upcoming) {
  const filtered = upcoming.filter(({e}) =>
    (ui.plantFilter === 'all' || e.plantId === ui.plantFilter) &&
    (ui.typeFilter  === 'all' || e.type    === ui.typeFilter)
  );
  if (!filtered.length) return `<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">No scheduled PPM tasks in the next 30 days for this filter.</div>`;
  const fmtD = (d) => dstr(d);
  const todayStr = today();
  const rows = filtered.map(({ e, date, slot }) => {
    const ds = fmtD(date);
    const isToday = ds === todayStr;
    const daysAway = Math.round((date - new Date(todayStr + 'T00:00:00')) / 86400000);
    const dueLabel = isToday ? `<span class="badge badge-mt">Due today</span>` : `<span class="badge badge-brand">In ${daysAway}d</span>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(plantName(e.plantId))}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${ds}</div><div class="cell-muted">${slot}</div></td>
      <td>${dueLabel}</td>
      <td class="col-center"><button onclick="openMaintModal('${e.id}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Put in Maintenance</button></td>
    </tr>`;
  }).join('');
  return `<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm flex items-center">
      <span>Upcoming PPM tasks — next 30 days</span>
      <span class="ml-auto text-xs text-slate-500 font-normal">From the planned PPM schedule</span>
    </div>
    <div class="overflow-x-auto"><table class="list-table">
      <thead><tr><th>Equipment</th><th>Type / Model</th><th>Scheduled</th><th>Status</th><th class="col-center">Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function computeVisitDateRange() {
  if (ui.visitFilter === 'all') return null;
  if (ui.visitFilter === 'custom') {
    return { from: ui.visitFrom || '', to: ui.visitTo || today() };
  }
  const todayStr = today();
  const todayD = new Date(todayStr + 'T23:59:59');
  let start;
  if (ui.visitFilter === 'today') {
    return { from: todayStr, to: todayStr };
  } else if (ui.visitFilter === '24h') {
    start = new Date(todayD.getTime() - 24*3600*1000);
  } else if (ui.visitFilter === '7d') {
    start = new Date(todayD.getTime() - 7*86400000);
  } else if (ui.visitFilter === '30d') {
    start = new Date(todayD.getTime() - 30*86400000);
  }
  return { from: dstr(start), to: todayStr };
}

function renderVisitsTab(visits) {
  // Date filter UI
  const presets = [
    ['all',    'All'],
    ['today',  'Today'],
    ['24h',    'Last 24 hours'],
    ['7d',     'Last 7 days'],
    ['30d',    'Last 30 days'],
    ['custom', 'Custom'],
  ];
  const pills = presets.map(([key, label]) => {
    const active = ui.visitFilter === key;
    return `<button onclick="ui.visitFilter='${key}'; renderEngineer()" class="text-xs px-3 py-1.5 rounded-full border ${active?'border-brand bg-brand text-white':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}">${label}</button>`;
  }).join('');
  const customPanel = ui.visitFilter === 'custom' ? `
    <div class="flex items-center gap-2 mt-3 text-xs">
      <span class="text-slate-600">From</span>
      <input type="date" value="${ui.visitFrom}" onchange="ui.visitFrom=this.value; renderEngineer()" class="border border-slate-300 rounded-md px-2 py-1" />
      <span class="text-slate-600">To</span>
      <input type="date" value="${ui.visitTo}" onchange="ui.visitTo=this.value; renderEngineer()" class="border border-slate-300 rounded-md px-2 py-1" />
    </div>` : '';

  // Date-range filtering of visits
  const range = computeVisitDateRange();
  let dateFiltered = visits;
  if (range) {
    dateFiltered = visits.filter(v =>
      (!range.from || v.date >= range.from) && (!range.to || v.date <= range.to)
    );
  }
  return renderVisitsTabInner(dateFiltered, pills, customPanel);
}
function renderVisitsTabInner(visits, pills, customPanel) {
  // Filter visits by plant/type using contained equipment
  const filtered = visits.map(v => {
    const eq = v.equipment.filter(e =>
      (ui.plantFilter === 'all' || e.plantId === ui.plantFilter) &&
      (ui.typeFilter  === 'all' || e.type    === ui.typeFilter)
    );
    const logs = v.logs.filter(l => eq.find(e => e.id === l.equipmentId));
    return { ...v, equipment: eq, logs };
  }).filter(v => v.equipment.length);

  const filterHeader = `<div class="bg-white rounded-xl border border-slate-200 p-4 mb-4">
    <div class="text-xs font-medium text-slate-600 mb-2">Filter by visit date</div>
    <div class="flex gap-2 flex-wrap">${pills}</div>
    ${customPanel}
  </div>`;

  if (!filtered.length) return filterHeader + `<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">No completed visits found for this filter.</div>`;

  const rows = filtered.map(v => {
    const plantNames = v.plants.map(p => p.name).join(', ');
    return `<tr>
      <td><div class="cell-primary">${v.date}</div><div class="cell-muted">${esc(v.technicians.join(', '))}</div></td>
      <td><div class="cell-primary">${v.equipment.length} equipment</div><div class="cell-muted">${v.logs.length} task${v.logs.length===1?'':'s'} completed</div></td>
      <td><div class="cell-primary">${plantNames}</div></td>
      <td><div class="text-xs text-slate-600 max-w-md truncate" title="${v.equipment.map(e=>e.tag).join(', ').replace(/"/g,'&quot;')}">${v.equipment.map(e=>e.tag).join(', ')}</div></td>
      <td class="col-center"><button onclick="openReportModal('${v.date}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Generate Report</button></td>
    </tr>`;
  }).join('');
  return filterHeader + `<div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm">Visit reports — grouped by completion date</div>
    <div class="overflow-x-auto"><table class="list-table">
      <thead><tr><th>Visit date</th><th>Coverage</th><th>Plant(s)</th><th>Equipment serviced</th><th class="col-center">Action</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function buildVisitReportDoc(date, preparedByIn, approvedByIn) {
  // Scope like the on-screen list: engineers only see their assigned plants,
  // and logs whose equipment was deleted can't be reported on.
  const ids = accessiblePlantIds();
  const logs = state.logs.filter(l => {
    if (l.endDate !== date) return false;
    const e = eqById(l.equipmentId);
    return !!e && ids.includes(e.plantId);
  });
  if (!logs.length) { appAlert('No completed tasks on this date.'); return null; }
  const equipment = [...new Set(logs.map(l => l.equipmentId))].map(eqById).filter(Boolean);
  const plants = [...new Set(equipment.map(e => e.plantId))].map(plantById).filter(Boolean);
  const technicians = [...new Set(logs.map(l => l.technician))];
  // Never fabricate signatories on a sign-off document — blank means "sign here".
  const preparedBy = preparedByIn || technicians[0] || '';
  const approvedBy = approvedByIn || '';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(25,52,88);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.text('Service Engineer Visit Report', 14, 14);
  doc.setFontSize(9);  doc.text(`Visit date: ${date}`, 14, 20);
  doc.text(`Generated ${today()}`, W - 14, 14, { align: 'right' });
  doc.setTextColor(15,23,42);

  let y = 34;
  doc.setFontSize(10);
  doc.text(`Plant(s):  ${plants.map(p => p.name).join(', ') || '—'}`, 14, y); y += 6;
  doc.text(`Engineer(s):  ${technicians.join(', ') || '—'}`, 14, y); y += 6;
  doc.text(`Equipment serviced:  ${equipment.length}`, 14, y); y += 6;
  doc.text(`Tasks completed:  ${logs.length}`, 14, y); y += 8;

  doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Tasks performed', 14, y); y += 2;
  doc.autoTable({
    startY: y + 2,
    head: [['Equipment', 'Plant', 'Reason', 'Start', 'Duration', 'Technician', 'Work performed']],
    body: logs.map(l => {
      const e = eqById(l.equipmentId);
      const p = plantById(e?.plantId);
      const dur = `${daysBetween(l.startDate, l.endDate)}d`;
      return [
        `${e.tag}\n${e.type} · ${e.make||''} ${e.model||''}`,
        p ? p.name : '—',
        l.reason,
        l.startDate,
        dur,
        l.technician,
        l.completionNotes || l.notes || '—'
      ];
    }),
    styles:    { fontSize: 7.5, cellPadding: 2, valign: 'top' },
    headStyles:{ fillColor: [25,52,88], textColor: 255 },
    columnStyles: { 6: { cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Sign-off block
  if (y > 230) { doc.addPage(); y = 24; }
  doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Sign-off', 14, y); y += 5;
  doc.setDrawColor(220,225,232); doc.line(14, y, W-14, y); y += 12;
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  const cW = (W - 28) / 2;
  const sig = (label, name, role, x) => {
    doc.setFont(undefined,'bold'); doc.text(label, x, y);
    doc.setFont(undefined,'normal');
    doc.setDrawColor(160,160,160); doc.line(x, y + 16, x + cW - 6, y + 16);
    doc.setFontSize(9); if (name) doc.text(name, x, y + 21);
    doc.setFontSize(7); doc.setTextColor(120,120,120);
    doc.text(role, x, y + 25);
    doc.text(`Date: ${date}`, x, y + 29);
    doc.setFontSize(9); doc.setTextColor(15,23,42);
  };
  sig('Prepared by', preparedBy, 'Service Engineer',       14);
  sig('Approved by', approvedBy, 'Plant Maintenance Lead', 14 + cW);

  doc.setFontSize(7); doc.setTextColor(140,140,140);
  doc.text('This visit report is system-generated from completed maintenance log entries.', 14, doc.internal.pageSize.getHeight() - 8);

  return { doc, filename: `visit-report-${date}.pdf` };
}

// ---------- Service Report ----------
// ONE report flow — service/visit reports were the same document reached two
// ways. Scope decides the layout: a date range across equipment, or a single
// visit day grouped by plant. Openable pre-scoped from the Visit Reports tab.
function openReportModal(visitDate) {
  const filtered = getFilteredLogs();
  const filteredEqIds = [...new Set(filtered.map(({l}) => l.equipmentId))];
  const plantIds = accessiblePlantIds();
  const allCount = activeEquipment().filter(e => plantIds.includes(e.plantId)).length;
  const sel = visitDate ? 'visit' : 'filtered';
  document.getElementById('modalTitle').textContent = 'Generate Report';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="generateReport(event)" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-sm">
      <div>
        <div class="text-sm font-medium mb-2">Scope</div>
        <div class="space-y-2">
          <label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="scope" value="filtered" ${sel === 'filtered' ? 'checked' : ''} class="mt-1" />
            <div>
              <div class="font-medium text-slate-800 text-sm">Current filters</div>
              <div class="text-xs text-slate-500">Uses the Maintenance Log filters as they are now · ${filteredEqIds.length} equipment · ${filtered.length} log entr${filtered.length === 1 ? 'y' : 'ies'}.</div>
            </div>
          </label>
          <label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="scope" value="all" class="mt-1" />
            <div>
              <div class="font-medium text-slate-800 text-sm">All equipment</div>
              <div class="text-xs text-slate-500">Everything you have access to · ${allCount} equipment.</div>
            </div>
          </label>
          <label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="scope" value="visit" ${sel === 'visit' ? 'checked' : ''} class="mt-1" />
            <div class="flex-1">
              <div class="font-medium text-slate-800 text-sm">Single visit (one day)</div>
              <div class="text-xs text-slate-500 mb-1.5">Everything completed on one date, grouped by plant — the sign-off document for a site visit.</div>
              <input type="date" name="visitDate" value="${visitDate || today()}" class="border border-slate-300 rounded-md px-2 py-1 text-xs"
                onclick="this.closest('label').querySelector('input[type=radio]').checked = true" />
            </div>
          </label>
        </div>
      </div>
      <div data-report-period>
        <div class="text-sm font-medium mb-1">Reporting period <span class="text-xs text-slate-500 font-normal">(optional — ignored for a single visit)</span></div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-slate-600 mb-1">From</label>
            <input type="date" name="from" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
          </div>
          <div>
            <label class="block text-xs text-slate-600 mb-1">To</label>
            <input type="date" name="to" class="w-full border border-slate-300 rounded-md px-2 py-1.5" value="${today()}" />
          </div>
        </div>
      </div>
      <div>
        <div class="text-sm font-medium mb-1">Sign-off</div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs text-slate-600 mb-1">Prepared by</label><input name="preparedBy" list="techList" autocomplete="off" placeholder="Service engineer" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />${techDatalist()}</div>
          <div><label class="block text-xs text-slate-600 mb-1">Approved by</label><input name="approvedBy" placeholder="Maintenance lead" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        </div>
      </div>
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" name="action" value="download" class="px-3 py-1.5 rounded-md border border-brand bg-white text-brand hover:bg-brand-50 text-sm font-medium">Download</button>
        <button type="submit" name="action" value="preview"  class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Preview</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function buildServiceReportDoc(args) {
  const { scope, from, to, preparedBy, approvedBy } = args;
  let ids;
  if (scope === 'filtered') {
    const filtered = getFilteredLogs();
    ids = [...new Set(filtered.map(({l}) => l.equipmentId))];
  } else {
    const plantIds = accessiblePlantIds();
    ids = activeEquipment().filter(e => plantIds.includes(e.plantId)).map(e => e.id);
  }
  if (!ids.length) return null;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  // Top header band
  doc.setFillColor(25,52,88);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.text('Maintenance Service Report', 14, 14);
  doc.setFontSize(9);  doc.text(`Generated ${today()}`, W - 14, 14, { align: 'right' });
  doc.setTextColor(15,23,42);

  let y = 30;
  doc.setFontSize(10);
  doc.text(`Scope:  ${scope === 'filtered' ? 'Filtered (current Maintenance Log filters)' : 'All equipment'}`, 14, y); y += 6;
  doc.text(`Period:  ${from || '—'}  to  ${to}`, 14, y); y += 6;
  doc.text(`Equipment count:  ${ids.length}`, 14, y); y += 6;
  if (preparedBy) { doc.text(`Prepared by:  ${preparedBy}`, 14, y); y += 6; }
  if (approvedBy) { doc.text(`Approved by:  ${approvedBy}`, 14, y); y += 6; }
  y += 2;

  // Per-equipment section
  ids.forEach((eqId, idx) => {
    const eq = eqById(eqId); if (!eq) return;
    const plant = plantById(eq.plantId);
    let logs = state.logs.filter(l => l.equipmentId === eqId);
    if (from) logs = logs.filter(l => l.startDate >= from);
    if (to)   logs = logs.filter(l => l.startDate <= to);
    logs.sort((a,b) => a.startDate.localeCompare(b.startDate));

    if (y > 248) { doc.addPage(); y = 20; }
    // Brand-colored equipment band — unmistakable
    doc.setFillColor(25,52,88);
    doc.rect(14, y, W - 28, 11, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(`${idx + 1}.  ${eq.tag}`, 18, y + 7.5);
    doc.setFont(undefined, 'normal'); doc.setFontSize(8);
    const meta = `${eq.type}  ·  ${eq.make || '—'} ${eq.model || ''}  ·  ${plant ? plant.name : ''}`;
    doc.text(meta, W - 18, y + 7.5, { align: 'right' });
    doc.setTextColor(15,23,42);
    y += 13;

    if (!logs.length) {
      doc.setFontSize(9); doc.setTextColor(120,120,120);
      doc.text('No maintenance activity in this period.', 18, y + 4);
      doc.setTextColor(15,23,42);
      y += 10;
    } else {
      doc.autoTable({
        startY: y,
        head: [['Equipment', 'Date', 'Reason', 'Duration', 'Technician', 'Work performed']],
        body: logs.map(l => [
          eq.tag,
          l.startDate + (l.endDate && l.endDate !== l.startDate ? ' → '+l.endDate : ''),
          l.reason,
          l.endDate ? `${daysBetween(l.startDate, l.endDate)}d` : 'ongoing',
          l.technician,
          l.completionNotes || l.notes || ''
        ]),
        styles: { fontSize: 8, cellPadding: 2, valign: 'top' },
        headStyles: { fillColor: [241,244,249], textColor: [25,52,88], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 5: { cellWidth: 55 } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  });

  // Sign-off block
  if (y > 240) { doc.addPage(); y = 20; }
  y += 6;
  doc.setDrawColor(200,200,200);
  doc.line(14, y, W - 14, y); y += 8;
  doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Sign-off', 14, y); y += 8;
  doc.setFont(undefined, 'normal'); doc.setFontSize(9);
  const colW = (W - 28) / 2;
  const sigBlock = (label, name, x) => {
    doc.text(label, x, y);
    doc.line(x, y + 14, x + colW - 4, y + 14);
    doc.setFontSize(8); doc.setTextColor(120,120,120);
    doc.text(name || '________________________', x, y + 19);
    doc.text('Signature & Date', x, y + 23);
    doc.setFontSize(9); doc.setTextColor(15,23,42);
  };
  sigBlock('Prepared by', preparedBy, 14);
  sigBlock('Approved by', approvedBy, 14 + colW);

  return { doc, filename: `service-report-${today()}.pdf` };
}

function generateReport(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const action = submitterOf(ev)?.value || 'preview';
  const scope = f.get('scope') || 'filtered';
  const preparedBy = f.get('preparedBy') || '';
  const approvedBy = f.get('approvedBy') || '';
  if (scope === 'visit') {
    const date = f.get('visitDate');
    if (!date) { appAlert('Pick the visit date.'); return; }
    const result = buildVisitReportDoc(date, preparedBy, approvedBy);
    if (!result) return;   // builder alerts when the day has no completed work
    closeModal();
    if (action === 'download') savePdfDoc(result.doc, result.filename);
    else openPdfPreview(result.doc, result.filename, 'Visit Report');
    return;
  }
  const args = { scope, from: f.get('from') || '', to: f.get('to') || today(), preparedBy, approvedBy };
  const result = buildServiceReportDoc(args);
  if (!result) { appAlert('No equipment matches the chosen scope.'); return; }
  closeModal();
  if (action === 'download') savePdfDoc(result.doc, result.filename);
  else openPdfPreview(result.doc, result.filename, 'Service Report');
}

// ---------- Checklist template editor (admin, real mode) ----------
function openChecklistEditor(selectedType) {
  if (!isAdmin()) return;
  const type = selectedType || EQ_TYPES[0];
  const items = checklistFor(type);
  const asText = items.map(it => (it.mandatory ? '* ' : '') + it.text).join('\n');
  const typeOpts = EQ_TYPES.map(t => `<option ${t === type ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('modalTitle').textContent = 'PPM Checklists';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitChecklistEditor(event)" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Equipment type</label>
        <select name="eqType" onchange="openChecklistEditor(this.value)" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">${typeOpts}</select>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Checklist items <span class="text-slate-400">(one per line — start a line with <b>*</b> to make it required)</span></label>
        <textarea name="items" rows="10" class="w-full border border-slate-300 rounded-md px-2 py-1.5 font-mono text-xs">${esc(asText)}</textarea>
      </div>
      <div class="text-[11px] text-slate-500">Engineers must tick every required item before they can close a work-order on this equipment type.</div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Close</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Save ${esc(type)} checklist</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitChecklistEditor(ev) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA) return;
  const f = new FormData(ev.target);
  const eqType = f.get('eqType');
  const items = String(f.get('items') || '').split('\n')
    .map(line => line.trim()).filter(Boolean)
    .map(line => line.startsWith('*')
      ? { text: line.replace(/^\*\s*/, ''), mandatory: true }
      : { text: line, mandatory: false });
  const unlock = lockSubmit(ev);
  const { error } = await SUPA.from('checklist_templates')
    .upsert({ eq_type: eqType, items, updated_at: new Date().toISOString() });
  if (error) { unlock(); saveError(error); return; }
  cloudChecklists = cloudChecklists || {};
  cloudChecklists[eqType] = items;
  closeModal();
  toast(`${eqType} checklist saved (${items.length} items).`);
}

// ---------- QR sticker sheets (per plant) ----------
// Stickers always deep-link to the PRODUCTION app, regardless of where the
// admin happens to generate them from (localhost, preview, etc.).
const APP_URL = 'https://mihirsethidp.github.io/Maintenance-module/';

// Draw one QR code as vector rects directly into the PDF (crisp at any print size).
function drawQrInPdf(doc, text, x, y, sizeMm) {
  const qr = qrcode(0, 'M');   // type 0 = auto-size, M = 15% error correction
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const cell = sizeMm / n;
  doc.setFillColor(15, 23, 42);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) doc.rect(x + c * cell, y + r * cell, cell, cell, 'F');
    }
  }
}

function generateQrSheet(plantId) {
  if (typeof qrcode === 'undefined') { appAlert('QR library not loaded — check your connection and refresh.'); return; }
  const plant = plantById(plantId); if (!plant) return;
  const eqs = activeEquipment().filter(e => e.plantId === plantId);
  if (!eqs.length) { appAlert('This plant has no equipment yet.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });   // A4: 210 x 297 mm
  const W = doc.internal.pageSize.getWidth();

  const COLS = 4, MARGIN = 12, HEADER_H = 24;
  const cellW = (W - MARGIN * 2) / COLS;      // ~46.5mm
  const qrSize = 32, cellH = 46;

  const pageHeader = () => {
    doc.setFillColor(25, 52, 88);
    doc.rect(0, 0, W, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(`Equipment QR Codes — ${plant.name}`, MARGIN, 10.5);
    doc.setFont(undefined, 'normal'); doc.setFontSize(8);
    doc.text(`Scan to view / report — ${today()}`, W - MARGIN, 10.5, { align: 'right' });
    doc.setTextColor(15, 23, 42);
  };
  pageHeader();

  const perPage = COLS * Math.floor((297 - HEADER_H - MARGIN) / cellH);
  eqs.forEach((e, i) => {
    const idx = i % perPage;
    if (i > 0 && idx === 0) { doc.addPage(); pageHeader(); }
    const col = idx % COLS, row = Math.floor(idx / COLS);
    const x = MARGIN + col * cellW, y = HEADER_H + row * cellH;
    // Light frame so the sheet cuts cleanly into stickers
    doc.setDrawColor(226, 232, 240);
    doc.rect(x + 1, y - 3, cellW - 2, cellH - 2);
    drawQrInPdf(doc, `${APP_URL}#/equipment/${e.id}`, x + (cellW - qrSize) / 2, y, qrSize);
    doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
    const tag = e.tag.length > 30 ? e.tag.slice(0, 29) + '…' : e.tag;
    doc.text(tag, x + cellW / 2, y + qrSize + 4, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(`${e.type} · ${plant.name}`.slice(0, 40), x + cellW / 2, y + qrSize + 7.5, { align: 'center' });
    doc.setTextColor(15, 23, 42);
  });

  const filename = `qr-codes-${plant.name.replace(/[^a-zA-Z0-9]+/g, '-')}-${today()}.pdf`;
  openPdfPreview(doc, filename, `QR Codes — ${plant.name}`);
}

// ---------- PDF preview ----------
function openPdfPreview(doc, filename, title) {
  // Android Chrome shows a blank iframe for blob PDFs; iOS renders only page 1.
  // On phones, hand the PDF to the platform viewer / share sheet instead.
  if (IS_MOBILE_UA) { savePdfDoc(doc, filename); return; }
  closePdfPreview();
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  window._pdfPreview = { url, filename, doc };
  document.body.insertAdjacentHTML('beforeend', `
    <div id="pdfPreview" class="fixed inset-0 z-[80] bg-slate-900/70 flex flex-col">
      <div class="flex items-center px-3 sm:px-5 py-3 bg-white border-b border-slate-200 shadow-sm flex-wrap gap-2">
        <div>
          <div class="font-semibold text-slate-800">${title}</div>
          <div class="text-xs text-slate-500">Preview · ${filename}</div>
        </div>
        <div class="ml-auto flex gap-2">
          <button onclick="downloadCurrentPdfPreview()" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button onclick="closePdfPreview()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium">Close</button>
        </div>
      </div>
      <iframe src="${url}" class="flex-1 bg-white" style="border:0;"></iframe>
    </div>
  `);
}
function downloadCurrentPdfPreview() {
  if (window._pdfPreview) savePdfDoc(window._pdfPreview.doc, window._pdfPreview.filename);
}
function closePdfPreview() {
  const el = document.getElementById('pdfPreview');
  if (el) el.remove();
  if (window._pdfPreview) { URL.revokeObjectURL(window._pdfPreview.url); window._pdfPreview = null; }
}

// ---------- Modals & mutations ----------
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function openMaintModal(eqId, fromIssueId) {
  if (isTechnician()) return;   // technicians complete work orders; engineers create them
  // Scheduling from a reported issue: prefill the scope and remember the link.
  window._fromIssueId = fromIssueId || null;
  const srcIssue = fromIssueId ? (cloudIssues || []).find(i => i.id === fromIssueId) : null;
  const e = eqById(eqId);
  document.getElementById('modalTitle').textContent = `Put ${e.tag} in maintenance`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitMaint(event, '${eqId}')" class="space-y-3 text-sm">
      <div class="p-2.5 rounded-md bg-brand-50 border border-brand-100 text-[11px] text-brand leading-relaxed">
        <b>This takes the machine out of service</b> and puts the job on someone's queue from today.
        Just noting something for later? Close this and use <b>Report issue</b> instead — the machine keeps running.
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Reason <span class="text-red-500">*</span></label>
          <select name="reason" required class="w-full border border-slate-300 rounded-md px-2 py-1.5"
            onchange="document.getElementById('bdDetails')?.classList.toggle('hidden', this.value !== 'Breakdown'); const nt = this.form.querySelector('[name=notes]'); if (nt) nt.required = this.value === 'Breakdown'; document.getElementById('notesReq')?.classList.toggle('hidden', this.value !== 'Breakdown'); document.getElementById('notesOpt')?.classList.toggle('hidden', this.value === 'Breakdown')">
            <option value="">Select…</option><option>Scheduled</option><option>Breakdown</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Priority</label>
          <select name="priority" class="w-full border border-slate-300 rounded-md px-2 py-1.5">
            <option>Normal</option><option>High</option><option>Critical</option>
          </select>
        </div>
      </div>
      ${isSimple() ? '' : `<div id="bdDetails" class="hidden grid grid-cols-2 gap-3">
        ${SUPA && partsFor(eqId).length ? `<div>
          <label class="block text-xs text-slate-600 mb-1">Affected part <span class="text-slate-400">(if known)</span></label>
          <select name="affectedPart" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
            <option value="">— not sure —</option>
            ${partsFor(eqId).map(p => `<option value="${p.id}">${esc(p.name)}${p.spec ? ' — ' + esc(p.spec) : ''}</option>`).join('')}
          </select>
        </div>` : ''}
        <div>
          <label class="block text-xs text-slate-600 mb-1">Failure severity</label>
          <select name="severity" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
            <option value="Major">Major</option><option value="Minor">Minor</option><option value="Critical">Critical</option>
          </select>
          <div class="text-[10px] text-slate-400 mt-0.5">Used for the health score${SUPA && partsFor(eqId).length ? ' when no part is selected' : ''}.</div>
        </div>
      </div>`}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Start date <span class="text-red-500">*</span></label>
          <input type="date" name="startDate" value="${today()}" required class="w-full border border-slate-300 rounded-md px-2 py-1.5"
            onchange="const et = this.form.querySelector('[name=etr]'); if (et) { et.min = this.value; if (et.value && et.value < this.value) et.value = this.value; }" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Expected completion <span class="text-red-500">*</span></label>
          <input type="date" name="etr" required value="${today()}" min="${today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
      </div>
      ${assignToControl()}
      ${SUPA ? `<label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
        <input type="checkbox" name="photosReq" class="mt-0.5" />
        <span class="text-xs text-slate-700"><b>Require photos on completion</b> — the job cannot be closed without
        at least one photo. Breakdowns require photos regardless.</span>
      </label>` : ''}
      <div>
        <label class="block text-xs text-slate-600 mb-1">Technician <span class="text-red-500">*</span></label>
        <input name="technician" required list="techList" autocomplete="off" value="${(currentUser()?.name || '').replace(/"/g, '&quot;')}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="${technicianNames().length ? 'Pick an existing technician or type a new name' : 'e.g. A. Mehta'}" />
        ${techDatalist()}
        <div class="text-[10px] text-slate-400 mt-0.5">New names are saved to the technician list and suggested next time.</div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Reason / scope of work
          <span id="notesReq" class="text-red-500 hidden">*</span>
          <span id="notesOpt" class="text-slate-400">(optional for scheduled work)</span>
        </label>
        <textarea name="notes" rows="3" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="What triggered this and what will be done — required for breakdowns.">${srcIssue ? esc('Reported issue: ' + srcIssue.description) : ''}</textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Confirm</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
// ---------- Work-order photos ----------
// Staged in memory as compressed JPEG blobs; uploaded to the wo-media bucket
// only when the completion actually submits. Phone camera files arrive at
// 5-12 MB; 1600px JPEG keeps the evidence and drops the megabytes.
const WO_PHOTO_MAX = 8;
async function compressPhoto(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  bmp.close?.();
  return await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.82));
}
async function onWoPhotosPicked(input) {
  const files = [...(input.files || [])];
  input.value = '';
  for (const file of files) {
    if ((window._woPhotos || []).length >= WO_PHOTO_MAX) { toast(`Up to ${WO_PHOTO_MAX} photos per job.`); break; }
    try {
      const blob = await compressPhoto(file);
      if (blob) window._woPhotos.push({ blob, url: URL.createObjectURL(blob) });
    } catch (e) { appAlert('That image could not be read — try another photo.'); }
  }
  renderWoPhotoStrip();
}
function removeWoPhoto(i) {
  URL.revokeObjectURL(window._woPhotos[i]?.url);
  window._woPhotos.splice(i, 1);
  renderWoPhotoStrip();
}
function renderWoPhotoStrip() {
  const strip = document.getElementById('woPhotoStrip');
  const count = document.getElementById('woPhotoCount');
  if (!strip) return;
  strip.innerHTML = (window._woPhotos || []).map((p, i) => `
    <div class="relative">
      <img src="${p.url}" class="w-16 h-16 object-cover rounded-md border border-slate-200" alt="photo ${i + 1}" />
      <button type="button" onclick="removeWoPhoto(${i})" aria-label="Remove photo"
        class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white text-[11px] leading-none grid place-items-center">×</button>
    </div>`).join('');
  if (count) count.textContent = window._woPhotos?.length ? `${window._woPhotos.length} of ${WO_PHOTO_MAX}` : '';
}
// Upload staged photos for a log. Returns null on success, or an error message.
async function uploadWoPhotos(logId) {
  const staged = window._woPhotos || [];
  if (!staged.length) return null;
  const rows = [];
  for (let i = 0; i < staged.length; i++) {
    const path = `${logId}/${Date.now()}_${i}.jpg`;
    const { error } = await SUPA.storage.from('wo-media').upload(path, staged[i].blob, { contentType: 'image/jpeg' });
    if (error) return 'photo upload failed: ' + error.message;
    rows.push({ log_id: logId, path });
  }
  const { error: mErr } = await SUPA.from('work_order_media').insert(rows);
  if (mErr) return 'photo record failed: ' + mErr.message;
  staged.forEach(p => URL.revokeObjectURL(p.url));
  window._woPhotos = [];
  return null;
}
async function mediaForLogs(logIds) {
  if (!SUPA || !logIds.length) return {};
  const { data } = await SUPA.from('work_order_media').select('log_id,path').in('log_id', logIds);
  const byLog = {};
  const paths = (data || []).map(m => m.path);
  if (!paths.length) return byLog;
  const { data: signed } = await SUPA.storage.from('wo-media').createSignedUrls(paths, 3600);
  (data || []).forEach((m, i) => {
    const u = signed?.[i]?.signedUrl;
    if (u) (byLog[m.log_id] = byLog[m.log_id] || []).push(u);
  });
  return byLog;
}

// Technician ACCOUNTS (people who log in) - distinct from the registry of
// typed names below. Assigning to an account puts the job on their My Work.
function technicianAccounts() {
  return (state.users || []).filter(u => u.role === 'Technician' && u.status === 'active');
}
function openCountFor(uid) {
  return state.logs.filter(l => l.assignedTo === uid && !l.endDate).length;
}
function assignToControl() {
  const techs = technicianAccounts();
  if (!SUPA || !techs.length) return '';
  return `<div>
    <label class="block text-xs text-slate-600 mb-1">Assign to</label>
    <select name="assignTo" onchange="onAssignPick(this)" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
      <option value="">No one with a login — just record a name below</option>
      ${techs.map(t => `<option value="${t.id}">${esc(t.name)} — ${openCountFor(t.id)} open job${openCountFor(t.id) === 1 ? '' : 's'}</option>`).join('')}
    </select>
    <div class="text-[10px] text-slate-400 mt-0.5">Assigned technicians see this job in <b>My Work</b> when they sign in.</div>
  </div>`;
}
function onAssignPick(sel) {
  const inp = sel.form.querySelector('[name=technician]');
  if (!inp) return;
  const t = technicianAccounts().find(x => x.id === sel.value);
  if (t) { inp.value = t.name; inp.readOnly = true; }
  else { inp.readOnly = false; }
}

// ---------- Issues ----------
const ISSUE_NEED_LABEL = { service: 'needs servicing', repair: 'needs repair', replace: 'needs replacement' };
function eqIssuesStrip(eqId) {
  const open = (cloudIssues || []).filter(i => i.equipment_id === eqId && i.status !== 'dismissed' && i.status !== 'handled');
  if (!open.length) return '';
  return `<div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
    <div class="text-xs font-semibold text-amber-900 mb-1.5">Open issues (${open.length})</div>
    ${open.map(i => `<div class="text-xs text-amber-900 flex gap-2 items-baseline py-0.5">
      <span class="badge badge-mt shrink-0">${ISSUE_NEED_LABEL[i.need] || i.need}</span>
      <span>${esc(i.description)} <span class="text-amber-700/70">— ${esc(i.raised_name) || 'unknown'}${i.status === 'scheduled' ? ' · work scheduled' : ''}</span></span>
    </div>`).join('')}
  </div>`;
}
function openIssueModal(eqId) {
  const e = eqById(eqId); if (!e) return;
  document.getElementById('modalTitle').textContent = `Report issue — ${e.tag}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitIssue(event, '${eqId}')" class="space-y-3 text-sm">
      <div class="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
        <b>This is a note, not a job.</b> The machine keeps running and nobody is assigned. An engineer will
        schedule the work, mark it handled, or dismiss it with a reason.
        ${isTechnician() ? '' : '<br />Need work done <b>now</b>? Close this and use <b>Put in Maintenance</b> instead — that takes the machine out of service.'}
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">What's wrong <span class="text-red-500">*</span></label>
        <textarea name="desc" rows="3" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Mechanical seal weeping, bearing noisy at high speed."></textarea>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">What it needs</label>
        <select name="need" class="w-full border border-slate-300 rounded-md px-2 py-1.5 bg-white">
          <option value="repair">Repair</option>
          <option value="service">Servicing</option>
          <option value="replace">Replacement</option>
        </select>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Report</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitIssue(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const unlock = lockSubmit(ev);
  const { error } = await SUPA.from('wo_issues').insert({
    equipment_id: eqId, description: (f.get('desc') || '').trim(),
    need: f.get('need') || 'repair', raised_name: currentUser()?.name || '',
  });
  if (error) { unlock(); appAlert('Could not save the issue: ' + error.message); return; }
  await hydrateCloud(); closeModal(); route();
  toast('Reported — the engineers will see it in their review queue.');
}

// ---------- Technician registry ----------
// Suggestions come from the registry (real mode) or from names already used
// in logs (prototype). New names typed on a work-order are saved automatically.
function technicianNames() {
  if (SUPA) return (cloudTechnicians || []).map(t => t.name);
  return [...new Set(state.logs.map(l => (l.technician || '').trim()).filter(Boolean))].sort();
}
function techDatalist() {
  return `<datalist id="techList">${technicianNames().map(t => `<option value="${t.replace(/"/g, '&quot;')}"></option>`).join('')}</datalist>`;
}
async function recordTechnician(name) {
  const n = (name || '').trim();
  if (!n || !SUPA || cloudTechnicians === null) return;
  if (technicianNames().some(t => t.toLowerCase() === n.toLowerCase())) return;
  const { data, error } = await SUPA.from('technicians')
    .insert({ name: n, created_by: authUser?.id || null }).select().single();
  if (error) { if (error.code !== '23505') console.warn('technician save failed', error); return; }
  cloudTechnicians.push(data);
  cloudTechnicians.sort((a, b) => a.name.localeCompare(b.name));
}
async function submitMaint(ev, eqId) {
  ev.preventDefault();
  if (openLogFor(eqId)) { appAlert('This equipment already has an open work-order. Complete it before starting a new one.'); return; }
  const f = new FormData(ev.target);
  const isBd = f.get('reason') === 'Breakdown';
  if (isBd && !(f.get('notes') || '').trim()) {
    appAlert('Describe the breakdown — what failed and what you observed. Required for breakdowns.');
    return;
  }
  if (f.get('etr') && f.get('startDate') && f.get('etr') < f.get('startDate')) {
    appAlert('Expected completion cannot be before the start date — the job would be born overdue.');
    return;
  }
  const log = {
    id: 'L-' + Date.now(), equipmentId: eqId,
    reason: f.get('reason'), startDate: f.get('startDate'), etr: f.get('etr'),
    endDate: null, technician: (f.get('technician') || '').trim(),
    notes: f.get('notes') || '', completionNotes: '',
    woState: 'active', priority: f.get('priority') || 'Normal',
    affectedPartId: isBd && f.get('affectedPart') ? parseInt(f.get('affectedPart'), 10) : null,
    severity: isBd ? (f.get('severity') || 'Major') : null,
  };
  const newStatus = log.reason === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
  const evKey = log.reason === 'Breakdown' ? 'breakdown' : 'maintenance';
  if (SUPA) {
    const unlock = lockSubmit(ev);
    // Atomic RPC: log insert + status change in one transaction, with a
    // DB-side guard against duplicate open work-orders. Falls back through
    // older signatures so a not-yet-migrated database still works.
    const assignTo = f.get('assignTo') || null;
    let { error } = await SUPA.rpc('log_maintenance_start', {
      p_id: log.id, p_eq: eqId, p_reason: log.reason, p_start: log.startDate,
      p_etr: log.etr || null, p_tech: log.technician, p_notes: log.notes,
      p_priority: log.priority, p_part_id: log.affectedPartId, p_severity: log.severity,
      p_assigned: assignTo, p_photos: f.get('photosReq') === 'on',
    });
    if (error && error.code === 'PGRST202') {
      // Photos migration (33) not applied yet — start without the flag.
      ({ error } = await SUPA.rpc('log_maintenance_start', {
        p_id: log.id, p_eq: eqId, p_reason: log.reason, p_start: log.startDate,
        p_etr: log.etr || null, p_tech: log.technician, p_notes: log.notes,
        p_priority: log.priority, p_part_id: log.affectedPartId, p_severity: log.severity,
        p_assigned: assignTo,
      }));
    }
    if (error && error.code === 'PGRST202') {
      // Technician migration (31) not applied yet — start without assignment.
      ({ error } = await SUPA.rpc('log_maintenance_start', {
        p_id: log.id, p_eq: eqId, p_reason: log.reason, p_start: log.startDate,
        p_etr: log.etr || null, p_tech: log.technician, p_notes: log.notes,
        p_priority: log.priority, p_part_id: log.affectedPartId, p_severity: log.severity,
      }));
    }
    if (error && error.code === 'PGRST202') {
      // Health migration (12) not applied yet — start without part/severity.
      ({ error } = await SUPA.rpc('log_maintenance_start', {
        p_id: log.id, p_eq: eqId, p_reason: log.reason, p_start: log.startDate,
        p_etr: log.etr || null, p_tech: log.technician, p_notes: log.notes,
        p_priority: log.priority,
      }));
    }
    if (error) { unlock(); saveError(error); return; }
    await recordTechnician(log.technician);
    // Created from a reported issue — link them and mark it scheduled.
    if (window._fromIssueId) {
      await SUPA.rpc('triage_issue', { p_id: window._fromIssueId, p_action: 'scheduled', p_note: null, p_follow_log: log.id })
        .then(({ error: e2 }) => { if (e2) console.warn('issue link failed', e2); });
      window._fromIssueId = null;
    }
    await hydrateCloud();
    closeModal(); route();
    const eq0 = eqById(eqId);
    pushEventNotification(evKey, eq0, log);
    toast(`Work-order created — ${esc(eq0?.tag || 'equipment')} is now ${newStatus.toLowerCase()}.`);
    return;
  }
  state.logs.unshift(log);
  const eq = eqById(eqId);
  eq.status = newStatus;
  saveLog(state.logs); saveEq(state.equipment);
  pushEventNotification(evKey, eq, log);
  closeModal(); route();
  toast(`Work-order created — ${esc(eq.tag)} is now ${newStatus.toLowerCase()}.`);
}

function openCompleteModal(eqId) {
  window._woPhotos = [];   // photos staged for THIS completion only
  const e = eqById(eqId);
  const log = openLogFor(eqId);
  const parts = SUPA && !isSimple() ? partsFor(eqId) : [];
  const failedPartId = log ? log.affectedPartId : null;
  const partsSection = parts.length ? `
      <div>
        <div class="text-xs text-slate-600 mb-1.5">Parts maintained <span class="text-slate-400">— what was done to each part in this job</span></div>
        <div class="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-[32vh] overflow-y-auto">
          ${parts.map(p => `
            <div class="px-3 py-2 ${p.id === failedPartId ? 'bg-red-50/60' : ''}">
              <div class="flex items-center gap-2 flex-wrap">
                <div class="flex-1 min-w-0">
                  <span class="text-xs font-medium text-slate-800">${esc(p.name)}</span>
                  ${p.id === failedPartId ? '<span class="badge badge-bd">failed</span>' : ''}
                  <div class="text-[10px] text-slate-400">${esc(p.spec) || ''}${p.last_replaced ? ' · replaced ' + p.last_replaced : ''}</div>
                </div>
                <div class="flex gap-2 text-[11px]">
                  <label class="inline-flex items-center gap-1 cursor-pointer"><input type="radio" name="pa-${p.id}" value="" ${p.id === failedPartId ? '' : 'checked'} /> —</label>
                  <label class="inline-flex items-center gap-1 cursor-pointer"><input type="radio" name="pa-${p.id}" value="serviced" /> Serviced</label>
                  <label class="inline-flex items-center gap-1 cursor-pointer"><input type="radio" name="pa-${p.id}" value="replaced" ${p.id === failedPartId ? 'checked' : ''} /> Replaced</label>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>` : '';
  const items = checklistFor(e.type);
  const checklistSection = items.length ? `
      <details class="border border-slate-200 rounded-md bg-slate-50/60">
        <summary class="px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer select-none hover:text-brand">
          Service guide — ${esc(e.type)} <span class="text-slate-400 font-normal">(${items.length} reference point${items.length === 1 ? '' : 's'})</span>
        </summary>
        <ul class="px-4 pb-2.5 pt-0.5 space-y-1 max-h-[26vh] overflow-y-auto">
          ${items.map(it => `<li class="text-xs text-slate-600 flex gap-1.5"><span class="text-brand">&bull;</span><span>${esc(it.text)}</span></li>`).join('')}
        </ul>
      </details>` : '';
  document.getElementById('modalTitle').textContent = (log && woStateOf(log) === 'open')
    ? `Complete work-order — ${e.tag}` : `Mark ${e.tag} operational`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitComplete(event, '${eqId}')" class="space-y-3 text-sm">
      ${log ? `<div class="p-3 rounded-md bg-brand-50 border border-brand-100 text-xs text-slate-700">
        ${log.woNo ? `<div class="font-mono text-[11px] text-brand mb-1">${esc(log.woNo)}</div>` : ''}
        <div><span class="font-medium">Reason:</span> ${log.reason}</div>
        <div><span class="font-medium">Started:</span> ${log.startDate} · <span class="font-medium">Expected:</span> ${log.etr}</div>
        <div class="mt-1"><span class="font-medium">Scope of work:</span> ${esc(log.notes)||'—'}</div>
      </div>` : ''}
      ${partsSection}
      ${checklistSection}
      ${SUPA && log ? `<details class="border border-amber-200 rounded-md bg-amber-50/50">
        <summary class="px-3 py-2 text-xs font-medium text-amber-900 cursor-pointer select-none">Found something needing attention? <span class="font-normal text-amber-700">(reports it to your engineer)</span></summary>
        <div class="px-3 pb-3 space-y-2">
          <textarea name="issueDesc" rows="2" class="w-full border border-amber-200 rounded-md px-2 py-1.5 text-xs" placeholder="What's wrong — e.g. Mechanical seal weeping, bearing noisy."></textarea>
          <select name="issueNeed" class="w-full border border-amber-200 rounded-md px-2 py-1.5 bg-white text-xs">
            <option value="repair">Needs repair</option>
            <option value="service">Needs servicing</option>
            <option value="replace">Needs replacement</option>
          </select>
        </div>
      </details>` : ''}
      ${SUPA ? `<div>
        <label class="block text-xs text-slate-600 mb-1">Photos ${log?.photosRequired ? '<span class="text-red-500">*</span> <span class="text-slate-400">(required for this job)</span>' : '<span class="text-slate-400">(optional — before/after, nameplates, damage)</span>'}</label>
        <input type="file" id="woPhotoInput" accept="image/*" capture="environment" multiple class="hidden" onchange="onWoPhotosPicked(this)" />
        <div id="woPhotoStrip" class="flex gap-2 flex-wrap mb-1.5"></div>
        <button type="button" onclick="document.getElementById('woPhotoInput').click()" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Add photos
        </button>
        <span id="woPhotoCount" class="text-[11px] text-slate-400 ml-2"></span>
      </div>` : ''}
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion date <span class="text-red-500">*</span></label>
        <input type="date" name="endDate" value="${today()}" required ${log && woStateOf(log) !== 'open' && log.startDate ? `min="${log.startDate}"` : ''} class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion notes ${log?.reason === 'Breakdown' ? '<span class="text-red-500">*</span>' : '<span class="text-slate-400">(optional)</span>'}</label>
        <div class="flex gap-1.5 flex-wrap mb-1.5">
          ${[['No abnormalities', 'Routine service completed — no abnormalities found.'],
             ['Tested OK', 'Serviced and tested OK.'],
             ['Cleaned & restored', 'Cleaned, inspected, and restored to service.']]
            .map(([l, t]) => `<button type="button" data-t="${t}" onclick="document.getElementById('cmpNotes').value = this.dataset.t" class="text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 hover:border-brand hover:text-brand">${l}</button>`).join('')}
        </div>
        <textarea id="cmpNotes" name="completionNotes" rows="3" ${log?.reason === 'Breakdown' ? 'required' : ''} class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="${log?.reason === 'Breakdown' ? 'What failed, what was done, test results — required for breakdowns.' : 'Anything worth noting — or tap a phrase above.'}"></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2 flex-wrap">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" name="action" value="confirm" class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white">Confirm</button>
        <button type="submit" name="action" value="confirm-report" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Confirm &amp; Generate Service Report</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitComplete(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const endDate = f.get('endDate');
  const completionNotes = f.get('completionNotes') || '';
  const wantReport = submitterOf(ev)?.value === 'confirm-report';
  const log = openLogFor(eqId);
  if (log && woStateOf(log) !== 'open' && log.startDate && endDate < log.startDate) {
    appAlert(`This job started on ${log.startDate} — it cannot be completed before that date.`);
    return;
  }

  // The checklist is a reference guide, not a gate — no per-item ticking required.
  const checklist = null;

  // Collect per-part actions — the substance of the maintenance job.
  const partActions = (SUPA ? partsFor(eqId) : [])
    .map(p => ({ part_id: p.id, name: p.name, action: f.get('pa-' + p.id) || '' }))
    .filter(a => a.action === 'serviced' || a.action === 'replaced');

  if (SUPA) {
    if (!log) {
      // No open work-order on record (e.g. logs failed to hydrate) — don't
      // strand the equipment: restore its status directly and move on.
      const unlock0 = lockSubmit(ev);
      const { error: stErr } = await SUPA.rpc('set_equipment_status', { eq_id: eqId, new_status: 'Operational' });
      if (stErr) { unlock0(); saveError(stErr); return; }
      await hydrateCloud(); closeModal(); route();
      toast(`${esc(eqById(eqId)?.tag || 'Equipment')} is back in service.`);
      return;
    }
    if (log.photosRequired && !(window._woPhotos || []).length) {
      appAlert('This job requires photos — add at least one before completing.');
      return;
    }
    const unlock = lockSubmit(ev);
    // Photos go up FIRST: they attach to the still-open log, so a failed
    // upload leaves the job open and retryable instead of closed and bare.
    const upErr = await uploadWoPhotos(log.id);
    if (upErr) { unlock(); appAlert('Could not save the photos — the job is still open. ' + upErr); return; }
    // Atomic RPC: closes the log, records part actions, stamps part history,
    // and returns the equipment to service — one transaction.
    let { error } = await SUPA.rpc('log_maintenance_complete', {
      p_log: log.id, p_end: endDate, p_notes: completionNotes, p_checklist: checklist,
      p_part_actions: partActions,
    });
    if (error && error.code === 'PGRST202') {
      // Parts-integration migration (13) not applied yet — fall back.
      ({ error } = await SUPA.rpc('log_maintenance_complete', { p_log: log.id, p_end: endDate, p_notes: completionNotes, p_checklist: checklist }));
      if (error && error.code === 'PGRST202') {
        ({ error } = await SUPA.rpc('log_maintenance_complete', { p_log: log.id, p_end: endDate, p_notes: completionNotes }));
      }
    }
    if (error) { unlock(); saveError(error); return; }
    // Quick-completed auto-generated tasks were never "started" — stamp the
    // acting user as technician, and replace the scheduled start_date with the
    // actual completion date so durations don't read as weeks of phantom work.
    const quickPatch = {};
    if (!log.technician) quickPatch.technician = currentUser()?.name || '';
    if (woStateOf(log) === 'open') quickPatch.start_date = endDate;
    if (Object.keys(quickPatch).length) {
      await SUPA.from('maintenance_logs').update(quickPatch).eq('id', log.id);
      if (quickPatch.technician) log.technician = quickPatch.technician;
      if (quickPatch.start_date) log.startDate = endDate;
    }
    // A reported issue rides along with the completion.
    const issueDesc = (f.get('issueDesc') || '').trim();
    if (issueDesc) {
      await SUPA.from('wo_issues').insert({
        equipment_id: eqId, log_id: log.id, description: issueDesc,
        need: f.get('issueNeed') || 'repair', raised_name: currentUser()?.name || '',
      }).then(({ error: iErr }) => { if (iErr) console.warn('issue save failed', iErr); });
    }
    const closedLog = { ...log, endDate, completionNotes, checklist, partActions };
    await hydrateCloud();
    closeModal(); route();
    pushEventNotification('operational', eqById(eqId), closedLog);
    toast(isTechnician()
      ? `${esc(eqById(eqId)?.tag || 'Equipment')} is back in service — submitted for your engineer's review.`
      : `${esc(eqById(eqId)?.tag || 'Equipment')} is back in service.`);
    if (wantReport) generateSingleServiceReport(eqId, closedLog);
    return;
  }
  if (log) { log.endDate = endDate; log.completionNotes = completionNotes; log.checklist = checklist; log.partActions = partActions; if (!log.technician) log.technician = currentUser()?.name || ''; if (woStateOf(log) === 'open') log.startDate = endDate; }
  const eq = eqById(eqId);
  eq.status = 'Operational';
  saveLog(state.logs); saveEq(state.equipment);
  pushEventNotification('operational', eq, log);
  closeModal(); route();
  toast(`${esc(eq.tag)} is back in service.`);
  if (wantReport && log) generateSingleServiceReport(eqId, log);
}

function generateSingleServiceReport(eqId, log) {
  const eq = eqById(eqId); if (!eq) return;
  const plant = plantById(eq.plantId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(25, 52, 88);
  doc.rect(0, 0, W, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.text('Maintenance Service Report', 14, 14);
  doc.setFontSize(9);  doc.text(`Report #SR-${eq.id}-${log.endDate.replace(/-/g,'')}`, 14, 20);
  doc.text(`Generated ${today()}`, W - 14, 14, { align: 'right' });
  doc.setTextColor(15, 23, 42);

  let y = 34;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Equipment summary', 14, y); y += 5;
  doc.setDrawColor(220,225,232); doc.line(14, y, W-14, y); y += 4;

  const kv = (k, v) => {
    doc.setFont(undefined,'bold'); doc.setFontSize(9); doc.text(k, 14, y);
    doc.setFont(undefined,'normal'); doc.text(String(v || '—'), 55, y);
    y += 6;
  };
  kv('Equipment',     eq.tag);
  kv('Equipment ID',  eq.id);
  kv('Type',          eq.type);
  kv('Make / Model',  `${eq.make || '—'} ${eq.model || ''}`.trim());
  kv('Plant',         plant ? `${plant.name} — ${plant.location}` : '—');
  kv('Installed on',  eq.installed);
  y += 4;

  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Maintenance details', 14, y); y += 3;
  doc.autoTable({
    startY: y + 2,
    head: [['Field', 'Value']],
    body: [
      ['Reason',           log.reason],
      ['Start date',       log.startDate],
      ['Expected return',  log.etr || '—'],
      ['Completion date',  log.endDate],
      ['Duration',         `${daysBetween(log.startDate, log.endDate)} day${daysBetween(log.startDate, log.endDate)===1?'':'s'}`],
      ['Technician',       log.technician || '—'],
      ['Reason / notes',   log.notes || '—'],
      ['Work performed',   log.completionNotes || '—'],
      ['Post-service status', 'Operational'],
    ],
    styles:    { fontSize: 9, cellPadding: 2.5, valign: 'top' },
    headStyles:{ fillColor: [25,52,88], textColor: 255 },
    columnStyles: { 0: { cellWidth: 42, fontStyle: 'bold', fillColor: [241,244,249] } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Service checklist (if one was completed with this work-order)
  if (Array.isArray(log.checklist) && log.checklist.length) {
    if (y > 240) { doc.addPage(); y = 24; }
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Service checklist', 14, y); y += 3;
    doc.autoTable({
      startY: y + 2,
      head: [['Item', 'Required', 'Done']],
      body: log.checklist.map(c => [c.text, c.mandatory ? 'Yes' : '—', c.done ? 'Yes' : 'No']),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25,52,88], textColor: 255 },
      columnStyles: { 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 18, halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Sign-off — never fabricate names; blank line means "sign here".
  if (y > 230) { doc.addPage(); y = 24; }
  doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Sign-off', 14, y); y += 5;
  doc.setDrawColor(220,225,232); doc.line(14, y, W-14, y); y += 12;
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  const cW = (W - 28) / 2;
  const sig = (label, name, role, x) => {
    doc.setFont(undefined,'bold'); doc.text(label, x, y);
    doc.setFont(undefined,'normal');
    doc.setDrawColor(160,160,160); doc.line(x, y + 16, x + cW - 6, y + 16);
    doc.setFontSize(9); if (name) doc.text(name, x, y + 21);
    doc.setFontSize(7); doc.setTextColor(120,120,120);
    doc.text(role, x, y + 25);
    doc.text(`Date: ${log.endDate}`, x, y + 29);
    doc.setFontSize(9); doc.setTextColor(15,23,42);
  };
  sig('Prepared by', log.technician || '', 'Technician', 14);
  sig('Approved by', '', 'Maintenance Lead', 14 + cW);

  // Footer
  doc.setFontSize(7); doc.setTextColor(140,140,140);
  doc.text('This is a system-generated service report. Signatures above attest to the work described.', 14, doc.internal.pageSize.getHeight() - 8);

  const filename = `service-report-${eq.tag.replace(/[^a-zA-Z0-9]+/g,'-')}-${log.endDate}.pdf`;
  openPdfPreview(doc, filename, `Service Report — ${eq.tag}`);
}

// Equipment name = Make + Model. Model is normally unique per plant; on a
// collision within the plant we suffix #2, #3, ... so every name stays unique.
function deriveTag(make, model, plantId, excludeId) {
  const base = `${(make || '').trim()} ${(model || '').trim()}`.replace(/\s+/g, ' ').trim();
  if (!base) return '';
  const taken = new Set(state.equipment.filter(x => x.plantId === plantId && x.id !== excludeId).map(x => x.tag));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} #${n}`)) n++;
  return `${base} #${n}`;
}
function updateEqNamePreview(form, excludeId) {
  const el = document.getElementById('eqNamePreview');
  if (!el || !form) return;
  const make = form.querySelector('[name="make"]')?.value || '';
  const model = form.querySelector('[name="model"]')?.value || '';
  const plantId = form.querySelector('[name="plantId"]')?.value || '';
  if (!make.trim() || !model.trim()) { el.textContent = '—'; return; }
  el.textContent = deriveTag(make, model, plantId, excludeId || null);
}
function openEquipmentFormModal(mode, eqId) {
  const isEdit = mode === 'edit';
  const e = isEdit ? eqById(eqId) : null;
  // Engineers only see their own plants as targets; the database enforces it.
  const eqFormPlants = isAdmin() ? state.plants : state.plants.filter(p => accessiblePlantIds().includes(p.id));
  const plantOpts = eqFormPlants.map(p => `<option value="${p.id}" ${e && e.plantId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  const typeOpts = EQ_TYPES.map(t => `<option ${e && e.type === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('modalTitle').textContent = isEdit ? `Edit ${e.tag}` : 'Add Equipment';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitEquipmentForm(event, '${mode}', '${eqId||''}')" class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Make <span class="text-red-500">*</span></label>
          <input name="make" required value="${e ? (e.make||'').replace(/"/g,'&quot;') : ''}" oninput="updateEqNamePreview(this.form, '${eqId||''}')" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Kirloskar" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Model <span class="text-red-500">*</span></label>
          <input name="model" required value="${e ? (e.model||'').replace(/"/g,'&quot;') : ''}" oninput="updateEqNamePreview(this.form, '${eqId||''}')" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. WX-001 4.2KW" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Type <span class="text-red-500">*</span></label>
          <select name="type" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
            <option value="">Select…</option>${typeOpts}
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Installed</label>
          <input type="date" name="installed" value="${e ? e.installed : today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Plant <span class="text-red-500">*</span></label>
        <select name="plantId" required onchange="updateEqNamePreview(this.form, '${eqId||''}')" class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Select…</option>${plantOpts}
        </select>
      </div>
      <div class="text-xs text-slate-600 bg-brand-50 border border-brand-100 rounded-md px-3 py-2">
        Name is generated from Make + Model:
        <span id="eqNamePreview" class="font-semibold text-brand">${e ? esc(e.tag) : '—'}</span>
        <div class="text-[10px] text-slate-400 mt-0.5">If the same make &amp; model already exists at this plant, a #2, #3… suffix keeps names unique.</div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">${isEdit ? 'Save changes' : 'Add'}</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
function openAddEquipmentModal() { openEquipmentFormModal('add'); }
function openEditEquipmentModal(eqId) { openEquipmentFormModal('edit', eqId); }
async function submitEquipmentForm(ev, mode, eqId) {
  ev.preventDefault();
  if (!isAdmin() && effRole(currentUser()) !== 'Engineer') return;
  const f = new FormData(ev.target);
  const make = (f.get('make') || '').trim(), model = (f.get('model') || '').trim();
  const tag = deriveTag(make, model, f.get('plantId'), mode === 'edit' ? eqId : null);
  if (!tag) { appAlert('Make and Model are required — the equipment name is generated from them.'); return; }
  if (mode === 'edit') {
    const cur = eqById(eqId); if (!cur) return;
    const patch = { tag, type: f.get('type'), make, model, plantId: f.get('plantId'), installed: f.get('installed') || cur.installed };
    // Equipment imported before make/model were known carries a duty name
    // ("Raw Sewage Pump"). First edit renames it to Make + Model — keep the
    // duty name as its Location so nothing is lost.
    if ((!cur.make || !cur.model) && cur.tag && cur.tag !== tag && !cur.location) patch.location = cur.tag;
    if (SUPA) {
      const unlock = lockSubmit(ev);
      const { error } = await SUPA.from('equipment').update(eqToDb({ ...cur, ...patch })).eq('id', eqId);
      if (error) { unlock(); saveError(error); return; }
      // Make & model just became known — release any waiting research row.
      const qRow = (cloudQueue || []).find(x => x.equipment_id === eqId && x.status === 'needs_info');
      if (qRow && make && model) await setQueueRow(qRow.id, { status: 'pending', error: null });
      await hydrateCloud(); closeModal(); route(); return;
    }
    Object.assign(cur, patch);
  } else {
    const newEq = {
      id: 'EQ-' + String(Date.now()).slice(-6), tag, type: f.get('type'),
      make, model,
      plantId: f.get('plantId'), location: '',
      installed: f.get('installed') || today(), status: 'Operational', slot: null,
    };
    const partsNudge = !isValveType(newEq.type);
    if (SUPA) {
      const unlock = lockSubmit(ev);
      const { error } = await SUPA.from('equipment').insert(eqToDb(newEq));
      if (error) { unlock(); saveError(error); return; }
      await hydrateCloud(); closeModal();
      // Land on the new equipment's page and go straight into parts research —
      // the search runs, variants are offered if the model has several, and
      // nothing saves without approval. (Budget-gated; Cancel keeps manual entry.)
      location.hash = '#/equipment/' + newEq.id;
      if (partsNudge && !isSimple()) {
        toast(`${esc(newEq.tag)} added — looking up its parts…`);
        setTimeout(() => {
          // Admin already navigated elsewhere? Don't ambush them with a modal.
          if (location.hash !== '#/equipment/' + newEq.id) return;
          try { openEnrichModal(newEq.id); } catch (err) {}
        }, 400);
      } else {
        toast(`${esc(newEq.tag)} added.`);
      }
      return;
    }
    state.equipment.push(newEq);
    saveEq(state.equipment);
    closeModal();
    location.hash = '#/equipment/' + newEq.id;
    toast(partsNudge ? `${esc(newEq.tag)} added — now record its parts.` : `${esc(newEq.tag)} added.`);
    return;
  }
  saveEq(state.equipment);
  closeModal(); route();
}

// ---------- PPM Import ----------
const FREQ_LEGEND = [
  ['D',  'Daily',        'every working day (logged weekly)'],
  ['W',  'Weekly',       'every week — sometimes used as "assigned week of the month"'],
  ['M',  'Monthly',      'once per month, on the assigned week (W1 / W2 / W3 / W4)'],
  ['Q',  'Quarterly',    'every 3 months (Jan / Apr / Jul / Oct)'],
  ['HY', 'Half-Yearly',  'every 6 months (Jan and Jul)'],
  ['Y',  'Yearly',       'once a year'],
];

async function openImportPPMModal() {
  window._importedRows = null;
  const budget = SUPA && !isSimple() ? await getResearchBudget() : null;
  window._importBudget = budget;
  const plantOpts = state.plants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  const legend = FREQ_LEGEND.map(([code, name, desc]) =>
    `<div class="flex items-baseline gap-2 text-xs"><span class="inline-block min-w-[28px] text-center font-semibold text-brand bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5">${code}</span><span class="font-medium text-slate-700">${name}</span><span class="text-slate-500">— ${desc}</span></div>`
  ).join('');

  document.getElementById('modalTitle').textContent = 'Import PPM schedule';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitImportPPM(event)" class="space-y-4 max-h-[78vh] overflow-y-auto pr-1 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Plant <span class="text-red-500">*</span></label>
        <select name="plantId" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Select a plant…</option>${plantOpts}
        </select>
        <div class="text-xs text-slate-500 mt-1">All equipment from this file will be added under the selected plant.</div>
      </div>

      <details class="bg-slate-50 border border-slate-200 rounded-lg p-3" open>
        <summary class="text-xs font-semibold text-slate-700 cursor-pointer">Frequency code reference</summary>
        <div class="mt-2 space-y-1.5">${legend}</div>
        <div class="text-[11px] text-slate-500 mt-2">The importer reads the staggered week markers (W1–W4) to schedule each piece of equipment. Daily items become weekly logs; weekly items occur every 7 days.</div>
      </details>

      <div>
        <label class="block text-xs text-slate-600 mb-1">PPM schedule file <span class="text-red-500">*</span></label>
        <input type="file" name="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required class="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-brand file:bg-brand-50 file:text-brand file:font-medium file:cursor-pointer" oninput="onPPMFileChosen(this)" />
        <div class="text-xs text-slate-500 mt-1">Expected layout: rows of equipment with columns <code>S.No · Name · Make · Capacity · Qty</code> followed by 52 weekly slot cells marked with frequency codes.</div>
      </div>

      ${SUPA && !isSimple() ? `<label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 bg-slate-50/60 cursor-pointer">
        <input type="checkbox" name="research" checked class="mt-0.5" />
        <span class="text-xs text-slate-600"><b>Queue AI parts research after import.</b>
          Roughly ₹7 per pump/blower/motor, capped at ${budget.limit} calls per day.
          <span id="researchBudgetNote" class="text-slate-500">${budget.left > 0
            ? `${budget.left} of ${budget.limit} research calls left today.`
            : `Today's research budget (${budget.limit}) is used up — these will queue now and research starts automatically tomorrow.`}</span>
        </span>
      </label>` : ''}

      <div id="ppmPreview" class="hidden"></div>

      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button id="ppmImportBtn" disabled class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white disabled:opacity-40 disabled:cursor-not-allowed">Import</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}

function onPPMFileChosen(input) {
  const file = input.files[0]; if (!file) return;
  const preview = document.getElementById('ppmPreview');
  const btn = document.getElementById('ppmImportBtn');
  preview.classList.remove('hidden');
  preview.innerHTML = `<div class="text-xs text-slate-500">Parsing…</div>`;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const rows = parsePPMWorkbook(ev.target.result);
      window._importedRows = rows;
      btn.disabled = rows.length === 0;
      const note = document.getElementById('researchBudgetNote');
      const b = window._importBudget;
      if (note && b) {
        const n = rows.filter(r => !isValveType(r.type)).length;
        note.textContent = n > b.left
          ? `${n} to research (~₹${n * 7} total) — ${b.left} will run today, the rest continue automatically on the following days.`
          : `${n} to research this import (~₹${n * 7}) · ${b.left} of ${b.limit} calls left today.`;
      }
      const byType = rows.reduce((m, r) => { m[r.type] = (m[r.type]||0)+1; return m; }, {});
      const summary = Object.entries(byType).map(([t,c]) => `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-50 text-brand border border-brand-100 font-medium">${esc(t)}<span class="text-brand-600">${c}</span></span>`).join('');
      const sample = rows.slice(0, 8).map(r => `<tr>
        <td class="py-1 px-2 font-medium">${esc(r.tag)}</td>
        <td class="py-1 px-2 text-slate-600">${esc(r.type)}</td>
        <td class="py-1 px-2 text-slate-600">${esc(r.make)||'—'}</td>
        <td class="py-1 px-2 text-slate-600">${esc(r.model)||'—'}</td>
        <td class="py-1 px-2"><span class="text-xs px-2 py-0.5 rounded-full border ${r.slot?'border-brand-100 bg-brand-50 text-brand':'border-slate-200 bg-slate-50 text-slate-500'} font-medium">${esc(r.slot)||'—'}</span></td>
      </tr>`).join('');
      preview.innerHTML = `
        <div class="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div class="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center text-xs">
            <span class="font-semibold text-slate-700">Detected ${rows.length} equipment</span>
            <span class="ml-auto flex flex-wrap gap-1.5">${summary}</span>
          </div>
          <table class="w-full text-xs">
            <thead class="text-slate-500 text-left bg-white">
              <tr><th class="py-2 px-2 font-medium">Name</th><th class="py-2 px-2 font-medium">Type</th><th class="py-2 px-2 font-medium">Make</th><th class="py-2 px-2 font-medium">Model</th><th class="py-2 px-2 font-medium">Slot</th></tr>
            </thead>
            <tbody class="divide-y divide-slate-100">${sample}</tbody>
          </table>
          ${rows.length > 8 ? `<div class="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">…and ${rows.length - 8} more</div>` : ''}
        </div>`;
    } catch (e) {
      preview.innerHTML = `<div class="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">Could not parse file: ${esc(e.message)}</div>`;
      btn.disabled = true;
      window._importedRows = null;
    }
  };
  reader.readAsArrayBuffer(file);
}

// Non-equipment / procedural rows we don't track as maintainable equipment
const PPM_EXCLUDE_RE = /test\b|\bcheck\b|monitoring|\blog\b|hardness|turbidity|chlorine|reading|sensor|detector|analys|flow ?meter|flowmeter|\bmeter\b|camera|cctv|tank cleaning|\bcleaning\b|settler|\bdiffuser\b|thickener|\bpanel\b|\bmcc\b|earthing|\bcable|wiring|transformer/i;
const PPM_TYPE_RE = [
  ['NRV',   /\bnrvs?\b|non.?return/i],
  ['Valve', /\bvalves?\b/i],
  ['Motor', /\bmotor\b/i],
  ['Pump', /pump/i],
  ['Blower', /blower|air ?lift/i],
  ['Mixer', /mixer|agitator|flocculator|flash mix/i],
  ['Screen', /screen/i],
  ['Screw Press', /screw press|filter press|belt press|\bpress\b/i],
  ['Centrifuge', /centrifuge/i],
  ['UV System', /\buv\b/i],
  ['Decanter', /decanter/i],
  ['Fan', /\bfan\b|exhaust|fresh air/i],
  ['Filter', /filter|softener|\bmgf\b|\bacf\b|\buf\b|\bro\b|membrane|ultra ?filt/i],
];
function classifyEquipmentName(name) {
  if (PPM_EXCLUDE_RE.test(name)) return null;      // procedural / instrument → skip
  for (const [t, re] of PPM_TYPE_RE) if (re.test(name)) return t;
  return 'Other';
}

function parsePPMWorkbook(arrayBuffer, sheetName) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[sheetName || wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Locate header row containing "Equipment Name"
  let headerIdx = -1, nameCol = -1;
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < rows[i].length; c++) {
      if (String(rows[i][c]).toLowerCase().trim() === 'equipment name') { headerIdx = i; nameCol = c; break; }
    }
    if (headerIdx !== -1) break;
  }
  if (headerIdx === -1) throw new Error('No header row containing "Equipment Name" found.');

  const snCol  = Math.max(0, nameCol - 1);
  const makeCol = nameCol + 1;
  const capCol  = nameCol + 2;
  const slotsStartCol = nameCol + 4;

  const out = [];
  for (let i = headerIdx + 2; i < rows.length; i++) { // skip header + W1..W5 sub-row
    const row = rows[i]; if (!row) continue;
    const snStr   = String(row[snCol] ?? '').trim();
    const nameStr = String(row[nameCol] ?? '').trim();
    // Only numbered rows are equipment; section headers (text in S.No col) are ignored —
    // we classify by the equipment NAME, which works for both type-based and process-stage layouts.
    if (!/^\d+(?:\.\d+)?$/.test(snStr) || !nameStr) continue;

    const type = classifyEquipmentName(nameStr);
    if (!type) continue;

    let markerCount = 0, firstMarkerCol = -1;
    for (let c = slotsStartCol; c < slotsStartCol + 52 && c < row.length; c++) {
      const v = String(row[c] || '').trim().toUpperCase();
      if (v === 'M' || v === 'W' || v === 'D' || v === 'Q' || v === 'HY' || v === 'Y') {
        markerCount++;
        if (firstMarkerCol === -1) firstMarkerCol = c;
      }
    }
    let slot = null;
    if (markerCount >= 40) slot = 'weekly';
    else if (firstMarkerCol !== -1) {
      const offset = firstMarkerCol - slotsStartCol;
      slot = offset <= 3 ? ['W1','W2','W3','W4'][offset] : 'W' + ((offset % 4) + 1);
    }
    const make  = String(row[makeCol] || '').trim().replace(/^[-—]+$/, '');
    const model = String(row[capCol]  || '').trim().replace(/^[-—]+$/, '');
    out.push({ tag: nameStr, type, make, model, slot });
  }
  return out;
}

async function submitImportPPM(ev) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const plantId = f.get('plantId');
  const rows = window._importedRows;
  if (!plantId || !rows || !rows.length) return;

  const base = Date.now();
  // Name = Make + Model wherever the sheet provides them (duty name moves to
  // Location); rows without make/model keep the duty name until Review fills
  // them in. Collisions get #2, #3... — checked against the plant AND this batch.
  const takenTags = new Set(state.equipment.filter(x => x.plantId === plantId).map(x => x.tag));
  const importTagFor = (r) => {
    const nm = (!r.make || !r.model) ? r.tag : `${r.make} ${r.model}`.replace(/\s+/g, ' ').trim();
    let tag = nm, n = 2;
    while (takenTags.has(tag)) tag = `${nm} #${n++}`;
    takenTags.add(tag);
    return tag;
  };
  // Same file imported twice? Every base name already exists at this plant.
  const existingBase = new Set(state.equipment.filter(x => x.plantId === plantId).map(x => x.tag));
  const dupCount = rows.filter(r => existingBase.has((!r.make || !r.model) ? r.tag : `${r.make} ${r.model}`.replace(/\s+/g, ' ').trim())).length;
  if (dupCount === rows.length && rows.length > 0 &&
      !(await appConfirm(`All ${rows.length} equipment in this file already exist at this plant — this looks like a re-import and would create duplicates.\n\nImport anyway?`, 'Possible re-import'))) return;
  const newEquipment = rows.map((r, idx) => ({
    id: `EQ-IMP-${base}-${idx}`,
    tag: importTagFor(r), type: r.type, make: r.make, model: r.model,
    plantId, location: (r.make && r.model) ? r.tag : '',
    installed: today(), status: 'Operational',
    slot: r.slot || null,
  }));

  if (SUPA) {
    const unlock = lockSubmit(ev, 'Importing…');
    const { error } = await SUPA.from('equipment').insert(newEquipment.map(eqToDb));
    if (error) { unlock(); saveError(error); return; }
    // Queue every non-valve for background parts research — the admin doesn't
    // review anything now; a notification arrives when the run completes.
    // Unticking the research box imports with no research (and no queue rows);
    // the amber "No parts recorded" hints remain as the manual to-do list.
    const wantResearch = !isSimple() && !!f.get('research');
    const qRows = (wantResearch ? newEquipment.filter(e => !isValveType(e.type)) : []).map(e => ({
      equipment_id: e.id,
      status: (e.make && e.model) ? 'pending' : 'needs_info',
      batch_id: 'B-' + base,
    }));
    let queued = 0, needInfo = 0;
    if (qRows.length) {
      const { error: qErr } = await SUPA.from('enrichment_queue').insert(qRows);
      if (qErr) console.warn('enqueue failed (is supabase/14_enrichment_queue.sql applied?)', qErr);
      else { queued = qRows.filter(r => r.status === 'pending').length; needInfo = qRows.length - queued; }
    }
    await hydrateCloud();   // also kicks the queue runner
    closeModal();
    // Show exactly what was just imported: the plant, with no leftover filters.
    ui.plantFilter = plantId; ui.typeFilter = 'all'; ui.eqStatusFilter = 'all';
    location.hash = '#/equipment'; route();
    toast(`Imported ${newEquipment.length} equipment.` +
      (queued ? ` Parts research started for ${queued} — you'll be notified when it's done.` : '') +
      (needInfo ? ` ${needInfo} need make & model — see Review.` : ''));
    return;
  }

  // Prototype: keep separate slots map + generate demo history
  const newSlots = {};
  newEquipment.forEach((e) => { if (e.slot) newSlots[e.id] = e.slot; });
  const newLogs = generatePastPPMLogs(newSlots, newEquipment, `IMP-${base}`);
  state.equipment = state.equipment.concat(newEquipment);
  state.slots = Object.assign({}, state.slots || {}, newSlots);
  state.logs = state.logs.concat(newLogs);
  let quotaNote = '';
  try { saveEq(state.equipment); saveSlots(state.slots); saveLog(state.logs); }
  catch (e) { quotaNote = String.fromCharCode(10) + String.fromCharCode(10) + 'Note: too large for browser storage — applied for this session only.'; }
  closeModal();
  appAlert(`Imported ${newEquipment.length} equipment with ${newLogs.length} historic PPM log entries.` + quotaNote);
  ui.plantFilter = plantId; ui.typeFilter = 'all'; ui.eqStatusFilter = 'all';
  location.hash = '#/equipment'; route();
}

// ---------- AI research budget (daily) ----------
// Hard daily cap on AI calls (background queue + manual Auto-fill), so one
// oversized import can never burn the API key — a 1,000-equipment sheet
// spreads across days instead. Rough cost: ₹5–10 per call. Change the limit
// here; usage persists in the research_usage table (SQL 19).
const RESEARCH_DAILY_LIMIT = 50;
async function getResearchBudget() {
  // Always refetch: other tabs (and the server-side counter) move this number.
  // The hard cap lives server-side (consume_research_call); this soft gate and
  // the on-screen numbers should still be as fresh as a query can make them.
  const day = today();
  try {
    const { data } = await SUPA.from('research_usage').select('day,calls').eq('day', day).maybeSingle();
    cloudResearchUsage = data || { day, calls: 0 };
  } catch (e) {
    if (!cloudResearchUsage || cloudResearchUsage.day !== day) cloudResearchUsage = { day, calls: 0 };
  }
  return { day, used: cloudResearchUsage.calls, limit: RESEARCH_DAILY_LIMIT,
           left: Math.max(0, RESEARCH_DAILY_LIMIT - cloudResearchUsage.calls) };
}
function bumpResearchUsage() {
  // Display-cache bump only. The AUTHORITATIVE increment happens inside the
  // enrich-equipment function (consume_research_call, SQL 22) — writing here
  // too would double-count or clobber the server's atomic counter.
  if (cloudResearchUsage) cloudResearchUsage.calls++;
}

// ---------- Background parts-research queue (admins, real mode) ----------
// PPM imports enqueue every non-valve equipment. This runner works through
// the queue while the admin does other things: make/model → web search →
// draft parts list. Results wait in the Review workspace; one notification
// fires when the run completes. Single-flight per browser tab.
let _queueActive = false;
let _queueNotConfigured = false;
let _queueBudgetHit = false;

function queueRows() { return cloudQueue || []; }
function reviewAttentionCount() {
  return queueRows().filter(q =>
    ['needs_info', 'ambiguous', 'ready', 'failed'].includes(q.status) && eqById(q.equipment_id)).length;
}
function queuePillHtml() {
  if (!_queueActive || isSimple()) return '';
  const left = queueRows().filter(q => q.status === 'pending' || q.status === 'running').length;
  return `<button class="queue-pill" onclick="location.hash='#/review'" title="Background parts research — open the review queue">
    <span class="qp-spin"></span>Researching parts · ${left} left</button>`;
}
function renderQueuePill() {
  const host = document.getElementById('queuePillHost');
  if (host) host.innerHTML = queuePillHtml();
  if (currentUser()) renderNav();   // keep the Review badge fresh
}
async function setQueueRow(id, patch) {
  patch.updated_at = new Date().toISOString();
  const { error } = await SUPA.from('enrichment_queue').update(patch).eq('id', id);
  if (error) { console.warn('queue update failed', error); return false; }
  const row = queueRows().find(q => q.id === id);
  if (row) Object.assign(row, patch);
  return true;
}
async function runEnrichmentQueue() {
  if (!SUPA || !authUser || !isAdmin() || isSimple() || _queueActive) return;
  if (!queueRows().some(q => q.status === 'pending' || q.status === 'running')) return;
  // If the equipment fetch failed (or came back empty while the queue has
  // rows), every eqById() lookup would miss and the whole queue would be
  // mass-skipped as "equipment no longer exists". Refuse to run instead.
  if (hydrateErrors.includes('equipment') || (!state.equipment.length && queueRows().length)) return;
  _queueActive = true; _queueNotConfigured = false;
  const budget = await getResearchBudget();
  _queueBudgetHit = budget.left <= 0;
  // A tab closed (or crashed) mid-research leaves rows stuck on 'running'.
  // Reclaim only STALE ones (>10 min old) — a fresh 'running' row belongs to
  // another live admin tab and must not be stolen.
  const staleCut = Date.now() - 10 * 60 * 1000;
  for (const stale of queueRows().filter(x => x.status === 'running' &&
      (!x.updated_at || new Date(x.updated_at).getTime() < staleCut))) {
    await setQueueRow(stale.id, { status: 'pending' });
  }
  renderQueuePill();
  let found = 0, attention = 0, processed = 0;
  // Hard cap: if a status write ever fails to persist, a row could stay
  // 'pending' forever — the guard (and the break-on-write-failure checks
  // below) make an infinite loop impossible.
  let guard = queueRows().length * 3 + 10;
  // Refresh the Review page as results land — but never wipe a form the
  // admin is typing into, or re-render under an open modal.
  const refreshReview = () => {
    if (location.hash !== '#/review') return;
    if (document.activeElement && document.activeElement.closest('#view form')) return;
    // Half-typed (but unfocused) make/model input also blocks the re-render.
    if ([...document.querySelectorAll('#view form input[type="text"], #view form input:not([type])')].some(i => i.value.trim())) return;
    // Open sections and the search query persist in `ui` and are restored by
    // renderReview, so a mid-run refresh no longer destroys the workspace.
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden')) return;
    route();
  };
  while (guard-- > 0) {
    const q = queueRows().find(x => x.status === 'pending');
    if (!q) break;
    const e = eqById(q.equipment_id);
    if (!e) { if (!await setQueueRow(q.id, { status: 'skipped', error: 'Equipment no longer exists.' })) break; continue; }
    if (!e.make || !e.model) { if (!await setQueueRow(q.id, { status: 'needs_info' })) break; continue; }
    // Today's budget spent? Leave everything pending — it resumes tomorrow.
    if (budget.left <= 0) { _queueBudgetHit = true; break; }
    // Atomic claim: only one tab wins the pending→running transition; the
    // loser sees 0 updated rows and moves on (no double API spend).
    const { data: claimed, error: claimErr } = await SUPA.from('enrichment_queue')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', q.id).eq('status', 'pending').select();
    if (claimErr) break;
    if (!claimed || !claimed.length) { q.status = 'running'; continue; }   // another tab has it
    q.status = 'running';
    refreshReview();
    let data, error;
    try {
      ({ data, error } = await SUPA.functions.invoke('enrich-equipment', {
        body: { make: e.make, model: e.model, eqType: e.type, variant: q.variant || undefined },
      }));
    } catch (err) { error = err; }
    // Only a real HTTP answer cost money — supabase-js sets .context on every
    // error shape, so match the answered error CLASSES, not the property.
    if (!error || error.name === 'FunctionsHttpError' || error.name === 'FunctionsRelayError') { budget.left--; bumpResearchUsage(); }
    if (error) {
      let msg = error.message || String(error);
      try { const j = await error.context.json(); if (j) msg = j.message || j.error || msg; } catch {}
      if (/budget_exhausted/i.test(msg)) {
        // The server-side daily cap refused — stop cleanly, resume tomorrow.
        _queueBudgetHit = true;
        await setQueueRow(q.id, { status: 'pending' });
        break;
      }
      if (/not_configured|ANTHROPIC_API_KEY|Failed to send a request/i.test(msg)) {
        // Infrastructure missing (key / function) — nothing else will succeed. Pause the run.
        _queueNotConfigured = true;
        await setQueueRow(q.id, { status: 'pending' });
        break;
      }
      if (!await setQueueRow(q.id, { status: 'failed', error: String(msg).slice(0, 300) })) break; attention++;
    } else if (data && data.status === 'ambiguous' && Array.isArray(data.options) && data.options.length) {
      if (!q.variant && data.options[0] && data.options[0].variant) {
        // Auto-pick the first (most likely) variant and research again with it.
        // The choice is flagged on the ready row; Review still shows it before
        // anything saves, and the manual picker remains for repeat-ambiguity.
        if (!await setQueueRow(q.id, { status: 'pending', variant: String(data.options[0].variant), variants: data.options })) break;
        refreshReview();
        continue;
      }
      if (!await setQueueRow(q.id, { status: 'ambiguous', variants: data.options })) break; attention++;
    } else if (data && data.status === 'match' && data.data) {
      if (!await setQueueRow(q.id, { status: 'ready', draft: data.data })) break; found++;
    } else {
      if (!await setQueueRow(q.id, { status: 'failed', error: 'No reliable manufacturer data found.' })) break; attention++;
    }
    processed++;
    renderQueuePill();
    refreshReview();
  }
  _queueActive = false;
  renderQueuePill();
  refreshReview();
  if (processed && !queueRows().some(x => x.status === 'pending'))
    queueCompleteNotification(found, attention);
}
function queueCompleteNotification(found, attention) {
  const msg = `Parts research complete — ${found} draft${found === 1 ? '' : 's'} ready to approve` +
    (attention ? `, ${attention} need${attention === 1 ? 's' : ''} your attention` : '') + '. Open Review.';
  const rec = { id: 'N-' + Date.now() + '-' + Math.floor(Math.random() * 1e4), ts: new Date().toISOString(),
    event: 'import_review', plant_id: null, equipment_id: null, channels: [], recipients: [], message: msg };
  SUPA.from('notifications').insert(rec).then(({ error }) => {
    if (error) { console.warn('notification insert failed', error); return; }
    if (cloudNotifs) cloudNotifs.unshift(rec);
    renderHeaderChrome();
    toast('Parts research complete — the review queue is ready.');
  });
}

// ---------- Review workspace (admin) ----------
// Flags worth a human glance before approving an AI draft wholesale.
function queueDraftFlags(q) {
  const d = q.draft || {};
  const parts = Array.isArray(d.parts) ? d.parts : [];
  const flags = [];
  if (!parts.length) flags.push('no parts extracted');
  else if (parts.length === 1) flags.push('only 1 part');
  if (parts.some(pt => !pt || !String(pt.name || '').trim())) flags.push('unnamed part');
  if (parts.some(pt => (parseInt(pt.criticality, 10) || 5) >= 8)) flags.push('high criticality suggested');
  if (!Array.isArray(d.sources) || !d.sources.filter(safeUrl).length) flags.push('no source');
  if (q.variant && Array.isArray(q.variants) && q.variants.length >= 1) flags.push(`variant auto-selected: ${q.variant}`);
  return flags;
}
// One-click approval of a ready draft exactly as suggested (all parts,
// AI criticalities). The modal path stays for line-by-line control.
async function quickApproveQueueRow(qid, silent) {
  if (!isAdmin() || !SUPA) return false;
  const q = queueRows().find(x => x.id === qid);
  const e = q && eqById(q.equipment_id);
  const d = q && q.draft;
  const parts = d && Array.isArray(d.parts) ? d.parts : [];
  if (!q || q.status !== 'ready' || !e || !parts.length) return false;
  if (!parts.some(pt => pt && String(pt.name || '').trim())) return false;   // nothing usable to save
  const src = safeUrl(Array.isArray(d.sources) && d.sources[0]) || '';
  const rows = parts.filter(pt => pt && String(pt.name || '').trim()).map(pt => ({
    equipment_id: e.id, name: String(pt.name).slice(0, 200), spec: String(pt.spec || '').slice(0, 300),
    qty: Math.max(1, parseInt(pt.qty, 10) || 1),
    criticality: Math.min(10, Math.max(1, parseInt(pt.criticality, 10) || 5)),
    source: 'ai', source_url: src,
  }));
  if (!await setQueueRow(qid, { status: 'done' })) return false;
  const { error } = await SUPA.from('equipment_parts').insert(rows);
  if (error) { await setQueueRow(qid, { status: 'ready' }); if (!silent) saveError(error); return false; }
  const eqPatch = {};
  if (q.variant && !e.model.includes(q.variant)) {
    eqPatch.model = `${e.model} ${q.variant}`;
    eqPatch.tag = deriveTag(e.make, eqPatch.model, e.plantId, e.id);
  }
  const lifeYears = parseInt(d.expected_life_years, 10);
  if (lifeYears > 0 && lifeYears < 60) eqPatch.expected_life_years = lifeYears;
  if (Object.keys(eqPatch).length) await SUPA.from('equipment').update(eqPatch).eq('id', e.id);
  if (!silent) {
    await hydrateCloud(); route();
    toast(`${rows.length} part${rows.length === 1 ? '' : 's'} saved for ${esc(e.tag)}.`);
  }
  return true;
}
// Bulk approval — plant-scoped when a plantId is given (the per-plant Quick
// approve button), otherwise everything ready.
async function bulkApproveReady(plantId) {
  if (!isAdmin() || !SUPA) return;
  const ready = queueRows().filter(q => {
    if (q.status !== 'ready') return false;
    const e = eqById(q.equipment_id);
    if (!e || (plantId && e.plantId !== plantId)) return false;
    return (q.draft?.parts || []).some(pt => pt && String(pt.name || '').trim());
  });
  if (!ready.length) return;
  const flagged = ready.map(q => ({ q, flags: queueDraftFlags(q) })).filter(x => x.flags.length);
  const NL = String.fromCharCode(10);
  let msg = `Approve AI part drafts for ${ready.length} equipment${plantId ? ` at ${plantName(plantId)}` : ''} exactly as suggested?`;
  if (flagged.length) {
    msg += NL + NL + `${flagged.length} carry flags worth a look first:` + NL +
      flagged.slice(0, 8).map(x => `• ${eqById(x.q.equipment_id).tag} — ${x.flags.join(', ')}`).join(NL) +
      (flagged.length > 8 ? NL + `…and ${flagged.length - 8} more` : '');
  }
  if (!await appConfirm(msg, plantId ? `Quick approve — ${plantName(plantId)}` : 'Approve all ready drafts')) return;
  let ok = 0;
  for (const q of ready) { if (await quickApproveQueueRow(q.id, true)) ok++; }
  await hydrateCloud(); route();
  toast(`Approved ${ok} of ${ready.length} equipment — parts are on their records.`);
}

function reviewRowHead(e, badge = '') {
  return `<div class="flex items-center gap-2 flex-wrap min-w-0">
    ${tagLink(e)}
    <span class="text-xs text-slate-500 whitespace-nowrap">${e.type}</span>
    ${e.make || e.model ? `<span class="text-xs text-slate-400 whitespace-nowrap">${esc(e.make)} ${esc(e.model)}</span>` : ''}
    ${badge}
  </div>`;
}

const REVIEW_STATUS_META = {
  needs_info: ['needs make & model', 'badge-mt'],
  ambiguous:  ['choose variant',     'badge-brand'],
  ready:      ['ready to approve',   'badge-op'],
  failed:     ['needs attention',    'badge-bd'],
  pending:    ['queued',             'badge-neutral'],
  running:    ['researching',        'badge-neutral'],
};

// One row per equipment, controls decided by its queue status.
function reviewRowFor({ q, e }) {
  const inputCls = 'border border-slate-300 rounded-md px-2 py-1.5 text-xs';
  const meta = REVIEW_STATUS_META[q.status] || [q.status, 'badge-neutral'];
  const badge = `<span class="badge ${meta[1]}">${meta[0]}</span>`;
  if (q.status === 'needs_info') return `
    <div class="review-row st-needs_info px-5 py-3">
      ${reviewRowHead(e, badge)}
      <form onsubmit="submitQueueInfo(event, ${q.id})" class="mt-2 flex items-center gap-2 flex-wrap">
        <input name="make" list="makesList" required placeholder="Make — e.g. Kirloskar" class="${inputCls} flex-1 min-w-[140px]" />
        <input name="model" required placeholder="Model — e.g. WX-001" class="${inputCls} flex-1 min-w-[140px]" />
        <button class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium whitespace-nowrap">Save &amp; research</button>
      </form>
      <div class="text-[10px] text-slate-400 mt-1.5">The equipment is renamed to Make + Model; its imported duty name moves to Location.</div>
    </div>`;
  if (q.status === 'ambiguous') return `
    <div class="review-row st-ambiguous px-5 py-3">
      ${reviewRowHead(e, badge)}
      <form onsubmit="queuePickVariant(event, ${q.id})" class="mt-2 space-y-1.5">
        ${(q.variants || []).map((o, i) => `
          <label class="flex items-start gap-2 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="variant" value="${esc(o.variant)}" ${i === 0 ? 'checked' : ''} class="mt-0.5" />
            <span class="text-xs"><span class="font-medium text-slate-800">${esc(o.variant)}</span>${o.detail ? `<span class="text-slate-500"> — ${esc(o.detail)}</span>` : ''}</span>
          </label>`).join('')}
        <div class="pt-1"><button class="text-xs px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white font-medium">Continue with this variant</button></div>
      </form>
    </div>`;
  if (q.status === 'ready') return `
    <div class="review-row st-ready px-5 py-3 flex items-center gap-3 flex-wrap">
      <div class="flex-1 min-w-0">${reviewRowHead(e, badge)}
        <div class="text-[11px] text-slate-500 mt-1">${(q.draft?.parts || []).length} part${(q.draft?.parts || []).length === 1 ? '' : 's'} drafted${q.draft?.power ? ' · ' + esc(q.draft.power) : ''}${parseInt(q.draft?.expected_life_years, 10) > 0 ? ' · life ~' + parseInt(q.draft.expected_life_years, 10) + ' yrs' : ''}</div>
        ${queueDraftFlags(q).length ? `<div class="flex gap-1 flex-wrap mt-1.5">${queueDraftFlags(q).map(fl => `<span class="badge badge-mt">${esc(fl)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="flex gap-2 flex-wrap">
        ${(q.draft?.parts || []).some(pt => pt && String(pt.name || '').trim()) ? `<button onclick="quickApproveQueueRow(${q.id}, false)" class="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium whitespace-nowrap" title="Save every drafted part exactly as suggested">Quick approve</button>` : ''}
        <button onclick="openQueueDraftModal(${q.id})" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium whitespace-nowrap">Review</button>
        <button onclick="skipQueueRow(${q.id})" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap">Skip</button>
      </div>
    </div>`;
  if (q.status === 'failed') return `
    <div class="review-row st-failed px-5 py-3 flex items-center gap-3 flex-wrap">
      <div class="flex-1 min-w-0">${reviewRowHead(e, badge)}
        <div class="text-[11px] text-red-600 mt-1">${esc(q.error || 'Search failed.')}</div>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button onclick="retryQueueRow(${q.id})" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium whitespace-nowrap">Retry</button>
        <a href="#/equipment/${e.id}" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap">Add manually</a>
        <button onclick="skipQueueRow(${q.id})" class="text-xs px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-nowrap">Dismiss</button>
      </div>
    </div>`;
  return `
    <div class="review-row st-${q.status} px-5 py-3 flex items-center gap-3">
      <div class="flex-1 min-w-0">${reviewRowHead(e, badge)}</div>
      <span class="text-[11px] text-slate-500 inline-flex items-center gap-1.5 whitespace-nowrap">${q.status === 'running' ? '<span class="qp-spin" style="display:inline-block"></span> researching…' : 'queued'}</span>
    </div>`;
}

function renderReview() {
  const user = currentUser();
  if (!SUPA || isSimple() || effRole(user) !== 'Admin') { location.hash = homeHashFor(user); return; }
  const rows = queueRows().map(q => ({ q, e: eqById(q.equipment_id) })).filter(x => x.e);
  const active = rows.filter(x => x.q.status !== 'done' && x.q.status !== 'skipped');
  const finished = rows.filter(x => x.q.status === 'done' || x.q.status === 'skipped');
  const makesList = `<datalist id="makesList">${[...new Set(state.equipment.map(e => e.make).filter(Boolean))].sort().map(m => `<option value="${m.replace(/"/g, '&quot;')}"></option>`).join('')}</datalist>`;

  // One dropdown per plant; equipment pending review inside, worst-first.
  const byPlant = {};
  active.forEach(x => { (byPlant[x.e.plantId] = byPlant[x.e.plantId] || []).push(x); });
  const plantIds = Object.keys(byPlant).sort((a, b) => plantName(a).localeCompare(plantName(b)));
  const ORDER = { needs_info: 0, ambiguous: 1, ready: 2, failed: 3, pending: 4, running: 5 };
  const chip = (n, label, cls) => n ? `<span class="badge ${cls}">${n} ${label}</span>` : '';

  const plantSections = plantIds.map(pid => {
    const items = byPlant[pid].sort((a, b) => (ORDER[a.q.status] ?? 9) - (ORDER[b.q.status] ?? 9));
    const count = st => items.filter(x => x.q.status === st).length;
    const readyCount = items.filter(x => x.q.status === 'ready' &&
      (x.q.draft?.parts || []).some(pt => pt && String(pt.name || '').trim())).length;
    return `
    <details class="parts-details bg-white rounded-xl border border-slate-200 overflow-hidden mb-4" ${(ui.reviewOpen ? !!ui.reviewOpen[pid] : plantIds.length === 1) ? 'open' : ''} ontoggle="reviewToggled('${pid}', this.open)">
      <summary class="px-5 py-3 cursor-pointer select-none flex items-center gap-2 flex-wrap hover:bg-slate-50/60">
        <svg class="parts-chevron shrink-0 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        <span class="font-semibold text-sm">${esc(plantName(pid))}</span>
        <span class="text-xs text-slate-400">${items.length} pending</span>
        ${chip(readyCount, 'ready', 'badge-op')}
        ${chip(count('needs_info'), 'need info', 'badge-mt')}
        ${chip(count('ambiguous'), 'variant', 'badge-brand')}
        ${chip(count('failed'), 'attention', 'badge-bd')}
        ${chip(count('pending') + count('running'), 'researching', 'badge-neutral')}
        ${readyCount ? `<button onclick="event.preventDefault(); event.stopPropagation(); bulkApproveReady('${pid}')" class="ml-auto text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium whitespace-nowrap" title="Approve every ready draft at this plant — flagged items are listed before anything saves">Quick approve (${readyCount})</button>` : ''}
      </summary>
      <div class="border-t border-slate-200 divide-y divide-slate-100">${items.map(reviewRowFor).join('')}</div>
    </details>`;
  }).join('');

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-4 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Parts review</h1>
        <p class="text-slate-500 text-sm">Background research on imported equipment, grouped by plant — approve drafts, resolve variants, fill in missing make &amp; model.</p>
      </div>
      <div class="ml-auto flex gap-2 items-center flex-wrap">
        ${_queueActive ? queuePillHtml() : ''}
        ${active.length ? suggestFilter({ id: 'reviewSearch', listId: 'reviewSuggest', placeholder: 'Find equipment…',
          options: active.flatMap(x => [x.e.tag, x.e.make, x.e.model, plantName(x.e.plantId)]),
          oninput: 'ui.reviewQuery = this.value; filterReview(this.value)', width: 'w-44', value: ui.reviewQuery }) : ''}
      </div>
    </div>
    ${_queueNotConfigured ? `<div class="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
      AI research isn't configured yet, so queued items are waiting. Add <b>ANTHROPIC_API_KEY</b> under Supabase → Edge Functions → Secrets (and deploy <b>enrich-equipment</b>), then reload.
    </div>` : ''}
    ${_queueBudgetHit ? `<div class="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
      Today's AI research budget (<b>${RESEARCH_DAILY_LIMIT}</b> calls) is used up. Queued equipment stays right
      here and research resumes automatically tomorrow — nothing is lost. Approving, skipping and manual
      entry all keep working.
    </div>` : ''}
    ${rows.length === 0 ? `
      <div class="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <div class="text-sm font-semibold text-slate-700">Nothing to review</div>
        <div class="text-xs text-slate-500 mt-1 max-w-md mx-auto">When you import a PPM schedule, every pump, blower and motor is queued here for automatic parts research. You'll get a notification when a run completes.</div>
      </div>`
    : plantSections || `
      <div class="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <div class="text-sm font-semibold text-slate-700">All reviewed</div>
        <div class="text-xs text-slate-500 mt-1">Nothing is waiting on you — everything is approved or dismissed.</div>
      </div>`}
    ${finished.length ? `<details class="bg-white rounded-xl border border-slate-200 px-5 py-3 mb-5">
      <summary class="text-sm font-semibold cursor-pointer select-none">Completed <span class="text-xs font-normal text-slate-400">(${finished.length})</span></summary>
      <div class="divide-y divide-slate-100 mt-2">
        ${finished.map(({ q, e }) => `<div class="py-2 flex items-center gap-2 text-xs">${tagLink(e)}<span class="text-slate-400">${q.status === 'done' ? 'parts approved' : 'skipped'}</span></div>`).join('')}
      </div>
    </details>` : ''}
    ${makesList}
  `;
  if (ui.reviewQuery) filterReview(ui.reviewQuery);
}
// Remember which plant sections the admin opened/closed — re-renders (runner
// refreshes, per-row actions) restore the exact workspace state.
function reviewToggled(pid, open) {
  ui.reviewOpen = ui.reviewOpen || {};
  ui.reviewOpen[pid] = open;
}
// Review search: hide non-matching rows, hide empty plants, open plants with
// hits. A query matching the PLANT (summary text) keeps its whole section.
function filterReview(q) {
  q = (q || '').toLowerCase();
  document.querySelectorAll('#view details.parts-details').forEach(d => {
    // textContent, not innerText: content inside a COLLAPSED section has
    // empty innerText and would never match.
    const plantMatch = q && d.querySelector('summary').textContent.toLowerCase().includes(q);
    let any = false;
    d.querySelectorAll('.review-row').forEach(r => {
      const show = !q || plantMatch || r.textContent.toLowerCase().includes(q);
      r.style.display = show ? '' : 'none';
      if (show) any = true;
    });
    d.style.display = (!q || any) ? '' : 'none';
    if (q && any) d.open = true;
  });
}
async function submitQueueInfo(ev, qid) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA) return;
  const q = queueRows().find(x => x.id === qid);
  const e = q && eqById(q.equipment_id); if (!e) return;
  const f = new FormData(ev.target);
  const make = (f.get('make') || '').trim(), model = (f.get('model') || '').trim();
  if (!make || !model) return;
  const unlock = lockSubmit(ev);
  // Name follows Make + Model; the imported duty name is preserved in Location.
  const newTag = deriveTag(make, model, e.plantId, e.id);
  const { error } = await SUPA.from('equipment')
    .update({ make, model, tag: newTag, location: e.location || e.tag }).eq('id', e.id);
  if (error) { unlock(); saveError(error); return; }
  await setQueueRow(qid, { status: 'pending', error: null });
  await hydrateCloud();   // kicks the runner
  route();
  toast(`${esc(newTag)} queued for parts research.`);
}
async function queuePickVariant(ev, qid) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const variant = ev.target.querySelector('input[name="variant"]:checked')?.value;
  if (!variant) return;
  lockSubmit(ev);
  await setQueueRow(qid, { status: 'pending', variant, variants: null });
  route();
  runEnrichmentQueue();
}
async function retryQueueRow(qid) {
  if (!isAdmin()) return;
  await setQueueRow(qid, { status: 'pending', error: null });
  route();
  runEnrichmentQueue();
}
async function skipQueueRow(qid) {
  if (!isAdmin()) return;
  await setQueueRow(qid, { status: 'skipped' });
  route();
}
function openQueueDraftModal(qid) {
  if (!isAdmin()) return;
  const q = queueRows().find(x => x.id === qid);
  const e = q && eqById(q.equipment_id);
  if (!q || !e || !q.draft) return;
  const d = q.draft, parts = Array.isArray(d.parts) ? d.parts : [];
  const sources = Array.isArray(d.sources) ? d.sources : [];
  document.getElementById('modalTitle').textContent = `Approve parts — ${e.tag}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitQueueApprove(event, ${qid})" class="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
      <div class="p-2.5 rounded-md bg-brand-50 border border-brand-100 text-xs text-slate-700">
        Draft for <b>${esc(e.make)} ${esc(e.model)}${q.variant ? ' ' + esc(q.variant) : ''}</b>
        ${d.power ? ` · Power: <b>${esc(d.power)}</b>` : ''}
        ${parseInt(d.expected_life_years, 10) > 0 ? ` · Expected life: <b>${parseInt(d.expected_life_years, 10)} yrs</b>` : ''}
        — untick anything you don't want; adjust criticality freely.
      </div>
      ${parts.length ? `<div class="border border-slate-200 rounded-md divide-y divide-slate-100">
        ${parts.map((pt, i) => `
          <div class="flex items-center gap-2 px-3 py-2">
            <input type="checkbox" name="inc-${i}" checked />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-slate-800">${esc(pt.name)}</div>
              <div class="text-[11px] text-slate-500">${esc(pt.spec) || 'no spec found'} · qty ${parseInt(pt.qty, 10) || 1}</div>
            </div>
            <label class="text-[10px] text-slate-500">Crit
              <input type="number" name="crit-${i}" min="1" max="10" value="${Math.min(10, Math.max(1, pt.criticality || 5))}" class="w-12 border border-slate-300 rounded px-1 py-0.5 text-xs ml-1" />
            </label>
          </div>`).join('')}
      </div>` : '<div class="p-3 text-center text-xs text-slate-500 border border-slate-200 rounded-md">The datasheet was found but no parts list could be extracted — add parts manually.</div>'}
      ${sources.filter(safeUrl).length ? `<div class="text-[11px] text-slate-500">Sources: ${sources.filter(safeUrl).slice(0, 3).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener" class="text-brand hover:underline break-all">${esc(u.replace(/^https?:\/\//, '').slice(0, 50))}</a>`).join(' · ')}</div>` : ''}
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        ${parts.length ? '<button type="submit" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Approve &amp; save</button>' : ''}
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  pushOverlayState();
}
async function submitQueueApprove(ev, qid) {
  ev.preventDefault();
  if (!isAdmin() || !SUPA) return;
  const q = queueRows().find(x => x.id === qid);
  const e = q && eqById(q.equipment_id);
  if (!q || !e || !q.draft) return;
  const f = new FormData(ev.target);
  const d = q.draft;
  const src = safeUrl(Array.isArray(d.sources) && d.sources[0]) || '';
  const partRows = (d.parts || [])
    .map((pt, i) => ({ pt, i }))
    .filter(({ pt, i }) => f.get('inc-' + i) && pt && String(pt.name || '').trim())
    .map(({ pt, i }) => ({
      equipment_id: e.id, name: String(pt.name).slice(0, 200), spec: String(pt.spec || '').slice(0, 300),
      qty: Math.max(1, parseInt(pt.qty, 10) || 1),
      criticality: Math.min(10, Math.max(1, parseInt(f.get('crit-' + i), 10) || 5)),
      source: 'ai', source_url: src,
    }));
  if (!partRows.length) { appAlert('Nothing selected to save.'); return; }
  const unlock = lockSubmit(ev);
  // Mark done FIRST so a re-submit can never double-insert the parts; revert
  // to 'ready' if the parts write then fails.
  if (!await setQueueRow(qid, { status: 'done' })) { unlock(); appAlert('Could not update the queue — try again.'); return; }
  const { error } = await SUPA.from('equipment_parts').insert(partRows);
  if (error) { await setQueueRow(qid, { status: 'ready' }); unlock(); saveError(error); return; }
  const eqPatch = {};
  if (q.variant && !e.model.includes(q.variant)) {
    eqPatch.model = `${e.model} ${q.variant}`;
    // The name follows Make + Model — keep it in sync with the refined model.
    eqPatch.tag = deriveTag(e.make, eqPatch.model, e.plantId, e.id);
  }
  const lifeYears = parseInt(d.expected_life_years, 10);
  if (lifeYears > 0 && lifeYears < 60) eqPatch.expected_life_years = lifeYears;
  if (Object.keys(eqPatch).length) await SUPA.from('equipment').update(eqPatch).eq('id', e.id);
  await hydrateCloud();
  closeModal(); route();
  toast(`${partRows.length} part${partRows.length === 1 ? '' : 's'} saved for ${esc(e.tag)}.`);
}

// ---------- Guide-me tour ----------
const TOUR_LANGS = [
  { code: 'en-US', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'es-ES', label: 'Español' },
];

const TOURS = {
  engineer: {
    label: { 'en-US': 'Engineer tour', 'hi-IN': 'Engineer का tour', 'es-ES': 'Tour para ingenieros' },
    sub:   { 'en-US': 'For service engineers on the field', 'hi-IN': 'Field पर service engineers के लिए', 'es-ES': 'Para ingenieros de servicio en campo' },
    steps: [
      { setup: () => { location.hash='#/engineer'; ui.engineerTab='pending'; route(); },
        target: '[data-tour="engineer-h1"]',
        title: { 'en-US':'Welcome, Engineer', 'hi-IN':'स्वागत है, Engineer', 'es-ES':'Bienvenido, Ingeniero' },
        body:  { 'en-US':"Welcome to the Engineering Corner. This is the workspace built for service engineers on the field.",
                 'hi-IN':"Engineering Corner में आपका स्वागत है। यह field पर काम करने वाले service engineers के लिए बनाया गया workspace है।",
                 'es-ES':"Bienvenido al rincón de ingeniería. Este es el espacio diseñado para los ingenieros de servicio en campo." } },
      { setup: () => { ui.engineerTab='pending'; route(); },
        target: '[data-tour="tab-pending"]',
        title: { 'en-US':'Pending tasks', 'hi-IN':'Pending tasks', 'es-ES':'Tareas pendientes' },
        body:  { 'en-US':"Pending shows what needs your attention today — ongoing maintenance plus any scheduled work that's now overdue.",
                 'hi-IN':"Pending tab में आज जो काम करने हैं वो सब हैं — चल रहा maintenance और कोई भी delayed scheduled काम।",
                 'es-ES':"Pendientes muestra lo urgente del día: mantenimiento en curso y tareas programadas atrasadas." } },
      { setup: () => { ui.engineerTab='upcoming'; route(); },
        target: '[data-tour="tab-upcoming"]',
        title: { 'en-US':'Upcoming PPM', 'hi-IN':'Upcoming PPM', 'es-ES':'Próximo PPM' },
        body:  { 'en-US':"Upcoming PPM lists scheduled service for the next thirty days, pulled from each plant's planned maintenance schedule.",
                 'hi-IN':"Upcoming PPM tab अगले तीस दिनों के scheduled tasks दिखाता है, हर plant के planned maintenance schedule से।",
                 'es-ES':"Próximo PPM lista el servicio planificado para los próximos treinta días, según el calendario de cada planta." } },
      { setup: () => { ui.engineerTab='upcoming'; route(); },
        target: 'table button[onclick^="openMaintModal"]',
        title: { 'en-US':'Start a task on site', 'hi-IN':'Site पर task शुरू करें', 'es-ES':'Iniciar una tarea en sitio' },
        body:  { 'en-US':"When you begin work on an equipment, click Put in Maintenance. Log the reason, expected return date, and notes — the equipment is now flagged across the system.",
                 'hi-IN':"किसी equipment पर काम शुरू करते समय Put in Maintenance पर click करें — reason, expected return date, और notes भरें। पूरे system में equipment flag हो जाएगा।",
                 'es-ES':"Cuando empiece a trabajar en un equipo, toque Poner en mantenimiento e ingrese el motivo, la fecha estimada de retorno y notas. El equipo queda marcado en todo el sistema." } },
      { setup: () => { ui.engineerTab='visits'; route(); },
        target: '[data-tour="tab-visits"]',
        title: { 'en-US':'Visit Reports', 'hi-IN':'Visit Reports', 'es-ES':'Reportes de visita' },
        body:  { 'en-US':"After a site visit, open Visit Reports. Pick a quick date filter, then Generate Report produces a sign-off PDF covering everything you completed that day.",
                 'hi-IN':"Site visit के बाद Visit Reports tab खोलें। quick date filter चुनें, फिर Generate Report से उस दिन के completed कामों का sign-off PDF बनेगा।",
                 'es-ES':"Tras una visita, abra Reportes de visita. Use un filtro rápido y Generar reporte crea un PDF de cierre con todo lo realizado ese día." } },
      { setup: () => { const mine = applyPlantFilter(state.equipment); const t = (mine.find(e => e.status !== 'Operational') || mine[0]); location.hash = '#/equipment/' + (t ? t.id : ''); route(); },
        target: '[data-tour="detail-actions"]',
        title: { 'en-US':"Close out the work", 'hi-IN':'काम complete करें', 'es-ES':'Cerrar el trabajo' },
        body:  { 'en-US':"From any equipment detail page you can mark it operational and instantly generate a single-event service report for sign-off. You're all set!",
                 'hi-IN':"किसी भी equipment detail page से उसे Operational mark करें और तुरंत single-event service report sign-off के लिए generate करें। बस इतना ही!",
                 'es-ES':"Desde la página de cualquier equipo puede marcarlo como Operativo y generar al instante un reporte de servicio para firma. ¡Listo!" } },
    ],
  },
  manager: {
    label: { 'en-US': 'Manager tour', 'hi-IN': 'Manager का tour', 'es-ES': 'Tour para gerentes' },
    sub:   { 'en-US': 'For plant and maintenance managers', 'hi-IN': 'Plant और maintenance managers के लिए', 'es-ES': 'Para gerentes de planta y mantenimiento' },
    steps: [
      { setup: () => { location.hash='#/dashboard'; route(); },
        target: '[data-tour="dashboard-h1"]',
        title: { 'en-US':"Welcome, Manager", 'hi-IN':'स्वागत है, Manager', 'es-ES':'Bienvenido, Gerente' },
        body:  { 'en-US':"Welcome. The Dashboard gives you a live pulse of every plant under your care.",
                 'hi-IN':"स्वागत है। Dashboard आपको हर plant की live status एक नज़र में दिखाता है।",
                 'es-ES':"Bienvenido. El panel ofrece una vista en vivo de cada planta bajo su responsabilidad." } },
      { setup: () => { route(); },
        target: '[data-tour="kpi-cards"]',
        title: { 'en-US':"Live KPI cards", 'hi-IN':'Live KPI cards', 'es-ES':'Tarjetas KPI en vivo' },
        body:  { 'en-US':"These cards show real-time equipment counts. Click any card to open that list on the Equipment page — for example, In Maintenance shows exactly what's down right now.",
                 'hi-IN':"ये cards real-time equipment counts दिखाते हैं। किसी भी card पर click करें — नीचे का table filter हो जाएगा। जैसे In Maintenance click करें तो अभी जो equipment down हैं वो दिखेंगे।",
                 'es-ES':"Estas tarjetas muestran conteos en vivo de equipos. Toque cualquiera para filtrar la tabla — por ejemplo, En mantenimiento muestra justo lo que está fuera de servicio." } },
      { setup: () => { route(); },
        target: '[data-tour="out-of-service"]',
        title: { 'en-US':"What's out of service", 'hi-IN':'क्या-क्या out of service है', 'es-ES':'Qué está fuera de servicio' },
        body:  { 'en-US':"Each row shows the equipment, the reason it's down, the expected return date, and how overdue it is. Click any equipment tag to drill into its full history.",
                 'hi-IN':"हर row में equipment, down होने का reason, expected return date, और कितना overdue है दिखता है। किसी भी equipment tag पर click करें — पूरी maintenance history खुलेगी।",
                 'es-ES':"Cada fila muestra el equipo, el motivo, la fecha estimada de retorno y cuánto se ha retrasado. Toque cualquier etiqueta para ver el historial completo." } },
      { setup: () => { location.hash='#/log'; route(); },
        target: '[data-tour="log-h1"]',
        title: { 'en-US':"Maintenance Log", 'hi-IN':'Maintenance Log', 'es-ES':'Registro de mantenimiento' },
        body:  { 'en-US':"The Maintenance Log is a complete audit trail across every plant. Filter by plant, type, reason, technician or date range to pinpoint what you need.",
                 'hi-IN':"Maintenance Log सब plants की complete audit trail है। plant, type, reason, technician, या date range से filter करें — जो चाहिए वो ढूंढ लें।",
                 'es-ES':"El registro de mantenimiento es la traza completa de todas las plantas. Filtre por planta, tipo, motivo, técnico o rango de fechas para encontrar lo que necesite." } },
      { setup: () => { route(); },
        target: '[data-tour="log-actions"]',
        title: { 'en-US':"Service reports & exports", 'hi-IN':'Service Reports और exports', 'es-ES':'Reportes y exportación' },
        body:  { 'en-US':"Generate consolidated Service Reports — filtered or full — for sign-off, and export the underlying log to Excel or PDF for reporting.",
                 'hi-IN':"Filtered या full Service Reports sign-off के लिए generate करें, और log को Excel या PDF में export करें reporting के लिए।",
                 'es-ES':"Genere reportes de servicio consolidados — filtrados o completos — para firma, y exporte el registro a Excel o PDF." } },
      { setup: () => { location.hash='#/plants'; route(); },
        target: '[data-tour="plants-h1"]',
        title: { 'en-US':"Plants & notifications", 'hi-IN':'Plants और notifications', 'es-ES':'Plantas y notificaciones' },
        body:  { 'en-US':"On the Plants page, configure who gets notified for which event and through which channel — Email, SMS, WhatsApp, or Call. You stay in control of every alert.",
                 'hi-IN':"Plants page पर configure करें — किसको कौन से event पर और किस channel से notify किया जाए: Email, SMS, WhatsApp, या Call। हर alert आपके control में।",
                 'es-ES':"En la página Plantas configure quién recibe cada notificación y por qué canal — Email, SMS, WhatsApp o llamada. Usted controla cada alerta." } },
    ],
  },
};

window._tour = { active: false, name: null, idx: 0, lang: 'en-US', chooserOpen: false };

function tourFAB() {
  return `<button class="tour-fab" onclick="toggleTourChooser()" aria-label="Guide me">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  </button><span class="tour-fab-label">Guide me</span>`;
}

function toggleTourChooser() {
  if (window._tour.active) { exitTour(); return; }
  window._tour.chooserOpen = !window._tour.chooserOpen;
  renderTourChooser();
}

function renderTourChooser() {
  const existing = document.getElementById('tour-chooser');
  if (existing) existing.remove();
  if (!window._tour.chooserOpen) return;
  const langOpts = TOUR_LANGS.map(l => `<option value="${l.code}" ${window._tour.lang===l.code?'selected':''}>${l.label}</option>`).join('');
  const lang = window._tour.lang;
  const html = `
    <div id="tour-chooser" class="tour-chooser">
      <h4>${ {'en-US':'Take a guided tour','hi-IN':'Guided tour लें','es-ES':'Hacer un tour guiado'}[lang] }</h4>
      <div class="ch-sub">${ {'en-US':'Pick a role and language.','hi-IN':'अपनी role और भाषा चुनें।','es-ES':'Elija un rol y un idioma.'}[lang] }</div>
      <label class="block text-[11px] text-slate-600 mb-1">${ {'en-US':'Language','hi-IN':'भाषा','es-ES':'Idioma'}[lang] }</label>
      <select onchange="window._tour.lang=this.value; renderTourChooser()">${langOpts}</select>
      <button class="ch-card" onclick="startTour('engineer')">
        <span style="font-size:20px">🛠️</span>
        <div>
          <div class="ch-card-title">${TOURS.engineer.label[lang]}</div>
          <div class="ch-card-sub">${TOURS.engineer.sub[lang]}</div>
        </div>
      </button>
      ${effRole(currentUser()) === 'Admin' ? `<button class="ch-card" onclick="startTour('manager')">
        <span style="font-size:20px">📊</span>
        <div>
          <div class="ch-card-title">${TOURS.manager.label[lang]}</div>
          <div class="ch-card-sub">${TOURS.manager.sub[lang]}</div>
        </div>
      </button>` : ''}
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function startTour(name) {
  window._tour.chooserOpen = false;
  document.getElementById('tour-chooser')?.remove();
  window._tour.active = true;
  window._tour.name = name;
  window._tour.idx = 0;
  showTourStep();
}

function showTourStep() {
  const tour = TOURS[window._tour.name];
  const step = tour.steps[window._tour.idx];
  if (step.setup) step.setup();
  setTimeout(() => paintTourStep(step, tour.steps.length), 220);
}

function paintTourStep(step, total) {
  document.querySelectorAll('.tour-backdrop, .tour-spotlight, .tour-card').forEach(el => el.remove());
  const target = document.querySelector(step.target);
  const lang = window._tour.lang;
  if (!target) {
    // Fallback to centered card if target missing
    document.body.insertAdjacentHTML('beforeend', `<div class="tour-backdrop" style="background:rgba(15,23,42,0.55)" onclick="exitTour()"></div>`);
    document.body.insertAdjacentHTML('beforeend', renderTourCard(step, total, null, lang));
    speakTour(step.body[lang], lang);
    return;
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    document.body.insertAdjacentHTML('beforeend', `<div class="tour-backdrop" onclick="exitTour()"></div>`);
    document.body.insertAdjacentHTML('beforeend', `<div class="tour-spotlight" id="tour-spot"></div>`);
    document.body.insertAdjacentHTML('beforeend', renderTourCard(step, total, rect, lang));
    const spot = document.getElementById('tour-spot');
    spot.style.top    = (rect.top - 6) + 'px';
    spot.style.left   = (rect.left - 6) + 'px';
    spot.style.width  = (rect.width + 12) + 'px';
    spot.style.height = (rect.height + 12) + 'px';
    positionTourCard(rect);
    speakTour(step.body[lang], lang);
  }, 280);
}

function positionTourCard(rect) {
  const card = document.querySelector('.tour-card');
  if (!card) return;
  const cw = card.offsetWidth || 360;
  const ch = card.offsetHeight || 200;
  const margin = 16;
  let top = rect.bottom + margin;
  if (top + ch > window.innerHeight - 16) top = Math.max(16, rect.top - ch - margin);
  let left = rect.left + (rect.width / 2) - (cw / 2);
  left = Math.max(16, Math.min(window.innerWidth - cw - 16, left));
  card.style.top = top + 'px';
  card.style.left = left + 'px';
}

function renderTourCard(step, total, rect, lang) {
  const idx = window._tour.idx;
  const isLast = idx === total - 1;
  const prevDisabled = idx === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : '';
  const labels = {
    'en-US': { step:'Step', of:'of', prev:'Back', next:'Next', finish:'Finish', exit:'Exit', replay:'Replay' },
    'hi-IN': { step:'Step', of:'/', prev:'पीछे', next:'आगे', finish:'समाप्त', exit:'बंद', replay:'दोबारा' },
    'es-ES': { step:'Paso', of:'de', prev:'Atrás', next:'Siguiente', finish:'Finalizar', exit:'Salir', replay:'Repetir' },
  }[lang];
  const progress = Math.round(((idx + 1) / total) * 100);
  return `<div class="tour-card">
    <div class="tour-step">${labels.step} ${idx + 1} ${labels.of} ${total}</div>
    <div class="tour-title">${step.title[lang]}</div>
    <div class="tour-body">${step.body[lang]}</div>
    <div class="tour-progress"><div style="width:${progress}%"></div></div>
    <div class="tour-controls">
      <button class="tour-btn tour-icon" onclick="replaySpeak()" title="${labels.replay}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      </button>
      <button class="tour-btn" onclick="exitTour()">${labels.exit}</button>
      <div class="spacer"></div>
      <button class="tour-btn" ${prevDisabled} onclick="prevTourStep()">${labels.prev}</button>
      <button class="tour-btn tour-btn-primary" onclick="${isLast?'exitTour()':'nextTourStep()'}">${isLast ? labels.finish : labels.next}</button>
    </div>
  </div>`;
}

function nextTourStep() {
  const total = TOURS[window._tour.name].steps.length;
  if (window._tour.idx >= total - 1) { exitTour(); return; }
  window._tour.idx++;
  showTourStep();
}
function prevTourStep() {
  if (window._tour.idx <= 0) return;
  window._tour.idx--;
  showTourStep();
}
function exitTour() {
  window._tour.active = false;
  window._tour.chooserOpen = false;
  document.querySelectorAll('.tour-backdrop, .tour-spotlight, .tour-card, #tour-chooser').forEach(el => el.remove());
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
function replaySpeak() {
  const step = TOURS[window._tour.name].steps[window._tour.idx];
  speakTour(step.body[window._tour.lang], window._tour.lang);
}
function speakTour(text, lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  // Try to pick a voice matching the language
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang === lang) || voices.find(v => v.lang && v.lang.startsWith(lang.split('-')[0]));
  if (match) u.voice = match;
  window.speechSynthesis.speak(u);
}
window.addEventListener('hashchange', () => { if (window._tour.active) { /* preserve tour */ } });

// Mount FAB after first render
function mountTourFAB() {
  if (document.querySelector('.tour-fab')) return;
  document.body.insertAdjacentHTML('beforeend', tourFAB());
}

// ---------- Boot ----------
async function boot() {
  if (SUPA) {
    // Free the quota used by old prototype seeds — real mode never reads them.
    [LS_EQ, LS_LOG, LS_PLANT, LS_USERS, LS_SLOTS, LS_INVITES, LS_NOTIF, LS_OVERDUE_SEEN]
      .forEach(k => localStorage.removeItem(k));
    try {
      const { data } = await SUPA.auth.getSession();
      if (data.session) {
        await loadAuthProfile(data.session.user);
        await hydrateCloud();
        // Core fetches all failed (no connection)? Restore the last snapshot
        // so the engineer can still browse equipment, tasks, and history.
        if ((hydrateErrors.includes('equipment') || !cloudEquipment) && restoreSnapshot()) {
          hydrateErrors = [];
        }
      }
    } catch (e) { console.warn('session restore failed', e); }
    // The moment the connection returns, resync and leave offline mode.
    // Re-load the profile from the DB first: the snapshot's role/plants are
    // client-side state and must never survive into an online session.
    window.addEventListener('online', async () => {
      if (!authUser || !window._offlineSince) return;
      try {
        const { data } = await SUPA.auth.getSession();
        if (data.session) await loadAuthProfile(data.session.user);
      } catch (e) {}
      await hydrateCloud();
      route();
      if (!window._offlineSince) toast('Back online — data refreshed.');
    });
    // React to sign-in / sign-out / token refresh across tabs
    SUPA.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') needsPasswordSet = true;
      if (event === 'SIGNED_OUT' || !session) {
        authUser = null; cloudUsers = null; cloudAssignments = {};
        window._offlineSince = null;
        try { localStorage.removeItem(SNAP_KEY); } catch (e) {}
      }
      else if (!authUser || authUser.id !== session.user.id) { await loadAuthProfile(session.user); await hydrateCloud(); }
      route();
    });
  }
  route();
  mountTourFAB();
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  // App shell + CDN libraries cache — the app itself boots without a network.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('sw register failed', e));
  }
}
boot();
