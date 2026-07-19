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

// A small set of illustrative open work-orders so the Dashboard / Pending views show live activity.
function buildSeedOpenLogs(equipment) {
  const NOW = new Date(today());
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
  const yearStart = new Date('2026-01-01');
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
let cloudPlants = null, cloudEquipment = null, cloudLogs = null, cloudSlots = null;
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
  return {
    equipment: JSON.parse(localStorage.getItem(LS_EQ)),
    logs:      JSON.parse(localStorage.getItem(LS_LOG)),
    plants:    JSON.parse(localStorage.getItem(LS_PLANT)),
    users:     JSON.parse(localStorage.getItem(LS_USERS)),
    slots:     JSON.parse(localStorage.getItem(LS_SLOTS)),
    invites:   JSON.parse(localStorage.getItem(LS_INVITES) || '[]'),
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
  if (!SUPA || !currentUser() || !hydrateErrors.length) return;
  document.querySelector('header')?.insertAdjacentHTML('afterend', `
    <div id="hydrateBanner" class="bg-red-50 border-b border-red-200 text-red-800 text-sm px-4 py-2 flex items-center gap-3">
      <span>Some data failed to load (${hydrateErrors.join(', ')}). What you see may be incomplete.</span>
      <button onclick="retryHydrate()" class="ml-auto text-xs px-3 py-1 rounded-md border border-red-300 bg-white hover:bg-red-100 font-medium">Retry</button>
    </div>`);
}
async function retryHydrate() { await hydrateCloud(); route(); }

// Disable a form's submit button while an async save runs (prevents double-submit).
function lockSubmit(ev, label = 'Saving…') {
  const btn = ev.submitter || ev.target.querySelector('button[type="submit"], button:not([type="button"])');
  if (!btn) return () => {};
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  return () => { btn.disabled = false; btn.textContent = orig; };
}
function saveError(err) {
  alert('Could not save. Please try again.\n\nDetails: ' + ((err && err.message) || err));
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
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmt = d => d ? d : '—';
const eqById = id => state.equipment.find(e => e.id === id);
const plantById = id => state.plants.find(p => p.id === id);
const plantName = id => plantById(id)?.name || '—';
const openLogFor = eqId => state.logs.find(l => l.equipmentId === eqId && !l.endDate);
function daysBetween(a, b) { if (!a || !b) return null; return Math.round((new Date(b) - new Date(a)) / 86400000); }
function isOverdue(log) { return log && !log.endDate && log.etr && new Date(log.etr) < new Date(today()); }

const statusBadge = s => {
  const cls = s === 'Operational' ? 'badge-op' : s === 'In Maintenance' ? 'badge-brand' : 'badge-bd';
  return `<span class="badge ${cls}">${s}</span>`;
};
const reasonBadge = r => `<span class="badge ${r === 'Breakdown' ? 'badge-bd' : 'badge-brand'}">${r}</span>`;
function ongoingStatusPill(log) {
  if (log.endDate) return `<span class="badge badge-op">Completed</span>`;
  if (isOverdue(log)) return `<span class="badge badge-bd">Overdue</span>`;
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
  return `<a class="tag-chip" href="#/equipment/${e.id}">${esc(e.tag)}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></a>`;
}

// ---------- State / routing / filters ----------
let state = load();
const ui = { plantFilter: 'all', typeFilter: 'all', dashStatusFilter: 'all', engineerTab: 'pending', visitFilter: 'all', visitFrom: '', visitTo: '', logPage: 1, _logSig: '', notifPlant: 'all', notifTime: 'all' };
const LOG_PAGE_SIZE = 50;
const EQ_TYPES = ['Pump','Blower','Motor','Mixer','Screen','Filter','Centrifuge','UV System','Screw Press','Decanter','Fan','Other'];

const routes = [
  { hash: '#/dashboard', label: 'Dashboard',          roles: ['Admin'] },
  { hash: '#/equipment', label: 'Equipment',          roles: ['Admin','Engineer'] },
  { hash: '#/log',       label: 'Maintenance Log',     roles: ['Admin','Engineer'] },
  { hash: '#/engineer',  label: 'Engineering Corner',  roles: ['Admin','Engineer'] },
  { hash: '#/plants',    label: 'Plants',             roles: ['Admin'] },
  { hash: '#/team',      label: 'Team',               roles: ['Admin'] },
];

// ---------- Auth ----------
// Real mode: Supabase Auth (when supabase-config.js + the CDN client are present).
// Prototype mode: localStorage mock (fallback when Supabase isn't configured).
// Capture the auth-redirect hash (invite / password recovery) BEFORE the client consumes it.
const _initHash = location.hash || '';
let needsPasswordSet = /(?:^|[#&])type=(invite|recovery|signup)/.test(_initHash);
const SUPA = (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY)
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;
async function loadAuthProfile(u) {
  let name = (u.email || '').split('@')[0], role = 'Engineer', phone = '', status = 'active';
  try {
    const { data } = await SUPA.from('profiles').select('name,role,phone,status').eq('id', u.id).single();
    if (data) { name = data.name || name; role = data.role || role; phone = data.phone || ''; status = data.status || 'active'; }
  } catch (e) { console.warn('profile load failed', e); }
  let plants = [];
  try {
    const { data: pa } = await SUPA.from('plant_assignments').select('plant_id').eq('user_id', u.id);
    if (pa) plants = pa.map(x => x.plant_id);
  } catch (e) { console.warn('assignment load failed', e); }
  authUser = { id: u.id, email: u.email, name, role, phone, status, plants };
}

// ---- field mappers: DB (snake_case) <-> app (camelCase) ----
const eqFromDb  = r => ({ id: r.id, tag: r.tag, type: r.type, make: r.make || '', model: r.model || '', plantId: r.plant_id, location: r.location || '', installed: r.installed || '', status: r.status, slot: r.slot || null });
const eqToDb    = e => ({ id: e.id, tag: e.tag, type: e.type, make: e.make || '', model: e.model || '', plant_id: e.plantId, location: e.location || '', installed: e.installed || null, status: e.status, slot: e.slot || null });
const logFromDb = r => ({ id: r.id, equipmentId: r.equipment_id, reason: r.reason, startDate: r.start_date, etr: r.etr, endDate: r.end_date, technician: r.technician || '', notes: r.notes || '', completionNotes: r.completion_notes || '' });
const logToDb   = l => ({ id: l.id, equipment_id: l.equipmentId, reason: l.reason, start_date: l.startDate, etr: l.etr || null, end_date: l.endDate || null, technician: l.technician || '', notes: l.notes || '', completion_notes: l.completionNotes || '' });

let cloudNotifs = null;   // activity feed rows from public.notifications (real mode)

async function hydrateCloud() {
  if (!SUPA || !authUser) return;
  hydrateErrors = [];
  const fail = (name, err) => { hydrateErrors.push(name); console.warn(name + ' hydrate failed', err); };
  await Promise.all([
    SUPA.from('profiles').select('id,name,role,phone,status,email')
      .then(({ data, error }) => {
        if (error) return fail('users', error);
        cloudUsers = (data || []).map(p => ({ id: p.id, name: p.name || (p.email||'').split('@')[0] || 'User', role: p.role, phone: p.phone || '', email: p.email || '', status: p.status || 'active' }));
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
  ]);
}

// Plant IDs the current user may see: admins → all; engineers → assigned (real mode) or all (prototype).
function accessiblePlantIds() {
  const u = currentUser();
  if (!u || effRole(u) === 'Admin') return state.plants.map(p => p.id);
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
// Superadmin and Admin share the same route access; only Engineer is restricted.
function effRole(user) { return user && user.role === 'Engineer' ? 'Engineer' : 'Admin'; }
function routeAllowed(hash, user) {
  const base = hash.startsWith('#/equipment/') ? '#/equipment' : hash;
  const r = routes.find(x => x.hash === base);
  if (!r) return true; // notifications panel etc. are not routes
  return r.roles.includes(effRole(user));
}
function homeHashFor(user) { return effRole(user) === 'Admin' ? '#/dashboard' : '#/equipment'; }

function renderNav() {
  const user = currentUser();
  if (!user) { document.getElementById('nav').innerHTML = ''; return; }
  const cur = location.hash || homeHashFor(user);
  document.getElementById('nav').innerHTML = routes.filter(r => r.roles.includes(effRole(user))).map(r => {
    const active = cur === r.hash || (r.hash === '#/equipment' && cur.startsWith('#/equipment/'));
    return `<a href="${r.hash}" class="px-3 py-1.5 rounded-md ${active?'bg-brand-50 text-brand font-medium':'text-slate-600 hover:bg-slate-100'}">${r.label}</a>`;
  }).join('');
}

function route() {
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
  sweepOverdue();
  if (h.startsWith('#/equipment/')) return renderEquipmentDetail(h.split('/')[2]);
  if (h === '#/equipment') return renderEquipment();
  if (h === '#/log')       return renderLog();
  if (h === '#/plants')    return renderPlants();
  if (h === '#/team')      return renderTeam();
  if (h === '#/engineer')  return renderEngineer();
  if (h === '#/dashboard') return renderDashboard();
  location.hash = homeHashFor(user);
}
window.addEventListener('hashchange', route);

// ---------- Login screen ----------
function renderLogin() {
  document.getElementById('view').innerHTML = `
    <div class="min-h-[70vh] flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-2 justify-center mb-6">
          <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
          <div>
                        <div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
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
            <div id="loginError" class="hidden text-xs text-red-600"></div>
            <button class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Sign in</button>
          </form>
          ${SUPA ? '' : `<div class="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            <div class="font-medium text-slate-600 mb-1">Demo accounts</div>
            <button onclick="fillLogin('mihir.sethi@digitalpaani.com','admin123')" class="block text-left hover:text-brand">Admin — mihir.sethi@digitalpaani.com / admin123</button>
            <button onclick="fillLogin('amehta@digitalpaani.com','eng123')" class="block text-left hover:text-brand">Engineer — amehta@digitalpaani.com / eng123</button>
          </div>`}
        </div>
        <p class="text-[10px] text-slate-400 text-center mt-3">${SUPA ? 'Secured by Supabase Auth.' : 'Prototype sign-in — not real authentication. See backend plan for production.'}</p>
      </div>
    </div>`;
}
// Invite / recovery landing — the user sets their password to activate their account.
function renderSetPassword() {
  const u = currentUser();
  document.getElementById('view').innerHTML = `
    <div class="min-h-[70vh] flex items-center justify-center px-4"><div class="w-full max-w-sm">
      <div class="flex items-center gap-2 justify-center mb-6">
        <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
        <div><div class="font-semibold text-lg leading-tight">DigitalPaani</div><div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div></div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
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
function fillLogin(email, pw) {
  const f = document.querySelector('#view form');
  if (f) { f.email.value = email; f.password.value = pw; }
}
function loginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
async function submitLogin(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const email = String(f.get('email')).trim(), password = f.get('password');
  if (SUPA) {
    const btn = ev.target.querySelector('button[type=submit], button:not([type])');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
    const { data, error } = await SUPA.auth.signInWithPassword({ email, password });
    if (error) { loginError(error.message); if (btn) { btn.disabled = false; btn.textContent = 'Sign in'; } return; }
    await loadAuthProfile(data.user);
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
    <button onclick="toggleNotifPanel()" class="relative p-2 rounded-md hover:bg-slate-100 text-slate-600" title="Notifications" aria-label="Notifications">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      ${unread ? `<span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold grid place-items-center">${unread>9?'9+':unread}</span>` : ''}
    </button>`;
  host.innerHTML = `
    ${bell}
    <div class="flex items-center gap-2 pl-1">
      <div class="text-right leading-tight hidden sm:block">
        <div class="text-xs font-medium text-slate-800">${user.name}</div>
        <div class="text-[10px] text-slate-500">${user.role}</div>
      </div>
      <div class="w-8 h-8 rounded-full bg-brand-50 text-brand grid place-items-center text-xs font-semibold">${initials(user.name)}</div>
      <button onclick="logout()" class="text-xs text-slate-500 hover:text-slate-800 px-2 py-1" title="Sign out">Sign out</button>
    </div>`;
}
function initials(name) { return name.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase(); }

// ---------- Notifications (in-app "outbox" — records what would be delivered) ----------
function loadNotifs() { try { return JSON.parse(localStorage.getItem(LS_NOTIF) || '[]'); } catch { return []; } }
function saveNotifs(n) { localStorage.setItem(LS_NOTIF, JSON.stringify(n)); }
const NOTIF_MSG = {
  maintenance: (eq, p) => `${esc(eq.tag)} put into scheduled maintenance at ${esc(p.name)}.`,
  breakdown:   (eq, p) => `Breakdown reported — ${esc(eq.tag)} at ${esc(p.name)}.`,
  operational: (eq, p) => `${esc(eq.tag)} returned to service at ${esc(p.name)}.`,
  overdue:     (eq, p, log) => `Maintenance overdue — ${esc(eq.tag)} at ${esc(p.name)} (expected ${esc(log?.etr) || '—'}).`,
};
function pushEventNotification(eventKey, eq, log) {
  const plant = plantById(eq.plantId); if (!plant) return;
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
      if (cloudNotifs) cloudNotifs.unshift({ id: rec.id, ts: rec.ts, event: rec.event, message: rec.message, channels: rec.channels, recipients: rec.recipients });
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
// Admins (Amit / Superadmin): upcoming maintenance (next 7 days) for ALL plants,
// plus due-today, overdue PPM, overdue work-orders, and the activity outbox.
// Engineers: due-today + overdue only, already scoped to their assigned plants
// by getUpcomingPPM / getOverduePPM / getPendingTasks.
function notifSeenKey() { const u = currentUser(); return 'mm.notifSeen.' + (u ? u.id : 'anon'); }
function loadSeenNotifs() { try { return new Set(JSON.parse(localStorage.getItem(notifSeenKey()) || '[]')); } catch { return new Set(); } }
function buildNotifFeed() {
  const u = currentUser(); if (!u) return [];
  const admin = effRole(u) === 'Admin';
  const todayStr = today();
  const feed = [];
  // Overdue open work-orders
  getPendingTasks().forEach(({ l, e }) => {
    if (isOverdue(l)) feed.push({ key: `wo-overdue-${l.id}`, group: 'overdue', date: l.etr, plantId: e.plantId,
      message: `Work-order overdue — ${esc(e.tag)} at ${esc(plantName(e.plantId))} (expected ${l.etr}).` });
  });
  // Overdue PPM (planned date passed, no completion this month)
  getOverduePPM().forEach(({ e, date }) => {
    const ds = dstr(date);
    feed.push({ key: `ppm-overdue-${e.id}-${ds}`, group: 'overdue', date: ds, plantId: e.plantId,
      message: `PPM overdue — ${esc(e.tag)} at ${esc(plantName(e.plantId))} (planned ${ds}).` });
  });
  // Due today + (admins only) upcoming within 7 days
  getUpcomingPPM(7).forEach(({ e, date }) => {
    const ds = dstr(date);
    if (ds === todayStr) feed.push({ key: `ppm-due-${e.id}-${ds}`, group: 'due', date: ds, plantId: e.plantId,
      message: `Maintenance due today — ${esc(e.tag)} at ${esc(plantName(e.plantId))}.` });
    else if (admin) feed.push({ key: `ppm-up-${e.id}-${ds}`, group: 'upcoming', date: ds, plantId: e.plantId,
      message: `Upcoming — ${esc(e.tag)} at ${esc(plantName(e.plantId))} on ${ds}.` });
  });
  // Activity (admins only): breakdowns, status changes — shared table in real
  // mode (cross-device), localStorage outbox in prototype mode.
  if (admin) {
    const activity = SUPA
      ? (cloudNotifs || []).map(n => ({ id: n.id, ts: n.ts, event: n.event, message: n.message, channels: n.channels || [], recipients: n.recipients || [], plantId: n.plant_id }))
      : loadNotifs();
    activity.forEach(n => feed.push({ key: n.id, group: 'activity', date: n.ts, event: n.event, plantId: n.plantId,
      message: n.message, channels: n.channels, recipients: n.recipients }));
  }
  // Fresh activity belongs right under "Due today" (newest first);
  // the 7-day lookahead sits last so it never buries real events.
  const order = { overdue: 0, due: 1, activity: 2, upcoming: 3 };
  return feed.sort((a, b) =>
    (order[a.group] - order[b.group]) ||
    (a.group === 'activity'
      ? String(b.date).localeCompare(String(a.date))   // activity: newest first
      : String(a.date).localeCompare(String(b.date)))); // schedule items: soonest first
}
// Badge counts unseen actionable items + activity. Only the 7-day "upcoming"
// lookahead is excluded — merely-scheduled PPM shouldn't ring the bell.
function unreadNotifCount() {
  const seen = loadSeenNotifs();
  return buildNotifFeed().filter(n => n.group !== 'upcoming' && !seen.has(n.key)).length;
}
// Panel filters (plant + time window)
function applyNotifFilters(feed) {
  let out = feed;
  if (ui.notifPlant !== 'all') out = out.filter(n => n.plantId === ui.notifPlant);
  if (ui.notifTime !== 'all') {
    const days = { today: 0, '7d': 7, '30d': 30 }[ui.notifTime];
    const t = new Date(today() + 'T00:00:00');
    out = out.filter(n => {
      const d = new Date(String(n.date).slice(0, 10) + 'T00:00:00');
      const diff = Math.abs(Math.round((d - t) / 86400000));
      return ui.notifTime === 'today' ? diff === 0 : diff <= days;
    });
  }
  return out;
}
function notifPanelBody() {
  const feed = applyNotifFilters(buildNotifFeed());
  const seen = loadSeenNotifs();
  const userName = id => (state.users.find(x => x.id === id)?.name || id);
  const chLabel = ch => ch === 'sms' ? 'SMS' : ch.charAt(0).toUpperCase() + ch.slice(1);
  const GROUPS = [
    ['overdue',  'Overdue',           'badge-bd'],
    ['due',      'Due today',         'badge-mt'],
    ['activity', 'Recent activity',   'badge-neutral'],
    ['upcoming', 'Upcoming (7 days)', 'badge-brand'],
  ];
  return GROUPS.map(([key, label, badgeCls]) => {
    const items = feed.filter(n => n.group === key);
    if (!items.length) return '';
    const rows = items.map(n => `
      <div class="px-4 py-2.5 border-b border-slate-100 ${seen.has(n.key) ? '' : 'bg-brand-50/40'}">
        <div class="text-sm text-slate-800">${n.message}</div>
        ${n.group === 'activity' && (n.channels?.length || n.recipients?.length) ? `
          <div class="text-[11px] text-slate-500 mt-0.5">
            ${n.channels?.length ? 'via ' + n.channels.map(chLabel).join(', ') : ''}
            ${n.recipients?.length ? ' → ' + n.recipients.map(userName).join(', ') : ''}
          </div>` : ''}
        ${n.group === 'activity' ? `<div class="text-[10px] text-slate-400 mt-0.5">${new Date(n.date).toLocaleString()}</div>` : ''}
      </div>`).join('');
    return `<div>
      <div class="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 sticky top-0">
        <span class="badge ${badgeCls}">${label}</span>
        <span class="text-xs text-slate-500">${items.length}</span>
      </div>${rows}</div>`;
  }).join('') || `<div class="p-6 text-center text-sm text-slate-500">${
    (ui.notifPlant !== 'all' || ui.notifTime !== 'all')
      ? 'Nothing matches these filters.'
      : "You're all caught up — nothing due or overdue."}</div>`;
}
function refreshNotifPanel() {
  const body = document.getElementById('notifPanelBody');
  if (body) body.innerHTML = notifPanelBody();
}
function toggleNotifPanel() {
  const existing = document.getElementById('notifPanel');
  if (existing) { existing.remove(); return; }
  const plantOpts = ['<option value="all">All plants</option>'].concat(
    state.plants.filter(p => accessiblePlantIds().includes(p.id))
      .map(p => `<option value="${p.id}" ${ui.notifPlant===p.id?'selected':''}>${esc(p.name)}</option>`)
  ).join('');
  const timeOpts = [['all','All time'],['today','Today'],['7d','Last 7 days'],['30d','Last 30 days']]
    .map(([v,l]) => `<option value="${v}" ${ui.notifTime===v?'selected':''}>${l}</option>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
    <div id="notifPanel" class="fixed inset-0 z-[70]" onclick="if(event.target===this)this.remove()">
      <div class="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl flex flex-col">
        <div class="px-4 py-3 border-b border-slate-200 flex items-center">
          <div class="font-semibold">Notifications</div>
          <div class="ml-auto flex items-center gap-2">
            <button onclick="markAllNotifsRead()" class="text-xs text-brand hover:underline">Mark all read</button>
            <button onclick="document.getElementById('notifPanel').remove()" class="text-slate-400 hover:text-slate-700 text-xl leading-none" aria-label="Close">&times;</button>
          </div>
        </div>
        <div class="px-4 py-2 border-b border-slate-200 flex items-center gap-2 bg-white">
          <select onchange="ui.notifPlant=this.value; refreshNotifPanel()" class="flex-1 min-w-0 border border-slate-300 rounded-md px-2 py-1 text-xs bg-white">${plantOpts}</select>
          <select onchange="ui.notifTime=this.value; refreshNotifPanel()" class="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white">${timeOpts}</select>
        </div>
        <div id="notifPanelBody" class="flex-1 overflow-y-auto">${notifPanelBody()}</div>
      </div>
    </div>`);
}
function markAllNotifsRead() {
  const keys = buildNotifFeed().map(n => n.key);
  localStorage.setItem(notifSeenKey(), JSON.stringify(keys.slice(0, 1000)));
  const panel = document.getElementById('notifPanel');
  if (panel) panel.remove();
  renderHeaderChrome();
}

// ---------- Reusable controls ----------
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
  if (!isAdmin()) return '';   // engineers cannot add equipment
  return `<button onclick="openAddEquipmentModal()" class="px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-800 text-sm font-medium inline-flex items-center gap-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
    Add Equipment
  </button>`;
}

// ---------- Dashboard ----------
function renderDashboard() {
  let eq = applyTypeFilter(applyPlantFilter(state.equipment));
  const total = eq.length;
  const op = eq.filter(e => e.status === 'Operational').length;
  const mt = eq.filter(e => e.status === 'In Maintenance').length;
  const bd = eq.filter(e => e.status === 'Broken Down').length;

  let down;
  if (ui.dashStatusFilter === 'all')          down = eq.filter(e => e.status !== 'Operational');
  else if (ui.dashStatusFilter === 'total')   down = eq;
  else if (ui.dashStatusFilter === 'op')      down = eq.filter(e => e.status === 'Operational');
  else if (ui.dashStatusFilter === 'mt')      down = eq.filter(e => e.status === 'In Maintenance');
  else if (ui.dashStatusFilter === 'bd')      down = eq.filter(e => e.status === 'Broken Down');

  const card = (key, label, value, numCls) => {
    const active = ui.dashStatusFilter === key;
    return `<button onclick="ui.dashStatusFilter='${active?'all':key}'; renderDashboard()"
        class="text-left bg-white rounded-xl border ${active?'border-brand ring-2 ring-brand-50':'border-slate-200'} p-5 hover:border-brand transition">
      <div class="text-xs uppercase tracking-wide text-slate-500">${label}</div>
      <div class="text-3xl font-semibold mt-1 ${numCls||''}">${value}</div>
    </button>`;
  };

  const downRows = down.map(e => {
    const log = openLogFor(e.id);
    const et = ecStatus(log?.etr, log?.endDate);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.location)}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${log ? log.reason : '—'}</div><div class="cell-muted">${log ? 'Tech: ' + log.technician : ''}</div></td>
      <td><div class="cell-primary">${fmt(log?.startDate)}</div><div class="cell-muted">Expected: ${fmt(log?.etr)}</div></td>
      <td><span class="${et.cls}">${et.label}</span></td>
      <td>${statusBadge(e.status)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="7" class="py-6 text-center text-slate-500">No equipment to show for this filter.</td></tr>`;

  const heading = {
    all: 'Currently out of service',
    total: 'All equipment',
    op: 'Operational equipment',
    mt: 'Equipment in maintenance',
    bd: 'Equipment broken down',
  }[ui.dashStatusFilter];

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <h1 class="text-2xl font-semibold" data-tour="dashboard-h1">Plant Maintenance Dashboard</h1>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        ${typeFilterControl()}
        ${addEquipmentBtn()}
      </div>
    </div>
    <p class="text-slate-500 mb-6">Live status of plant equipment. Click any card below to filter the table.</p>

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
  const eq = applyTypeFilter(applyPlantFilter(state.equipment));
  const rows = eq.map(e => {
    const log = openLogFor(e.id);
    const action = e.status === 'Operational'
      ? `<button class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
      : `<button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium" onclick="openCompleteModal('${e.id}')">Mark Operational</button>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.location)}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${log?.etr ? log.etr : '—'}</div><div class="cell-muted">${log ? log.reason : ''}</div></td>
      <td class="col-center">${statusBadge(e.status)}</td>
      <td class="col-center">${action}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="py-6 text-center text-slate-500">No equipment for this plant.</td></tr>`;

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-4 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Equipment</h1>
        <p class="text-slate-500 text-sm">Click an equipment tag to view its full maintenance history.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        ${typeFilterControl()}
        <input id="eqSearch" placeholder="Filter…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-56" oninput="filterEq(this.value)" />
        ${addEquipmentBtn()}
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="list-table" id="eqTable">
          <thead><tr>
            <th>Equipment</th><th>Plant</th><th>Type / Model</th>
            <th>Expected Completion</th><th class="col-center">Status</th><th class="col-center">Action</th>
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
        <span class="text-slate-500">${l.startDate} → ${l.endDate || 'ongoing'}</span>
        ${l.endDate
          ? `<span class="text-xs text-slate-400">(${daysBetween(l.startDate, l.endDate)} day${daysBetween(l.startDate,l.endDate)===1?'':'s'})</span>`
          : `<span class="text-xs ${isOverdue(l)?'text-red-600 font-medium':'text-brand'}">Expected ${l.etr || '—'}</span>`}
      </div>
      <div class="text-sm text-slate-700 mt-1"><span class="font-medium">Reason:</span> ${esc(l.notes) || '—'}</div>
      ${l.completionNotes ? `<div class="text-sm text-slate-700 mt-1"><span class="font-medium">Completion notes:</span> ${esc(l.completionNotes)}</div>` : ''}
      <div class="text-xs text-slate-500 mt-1">Technician: ${esc(l.technician)}</div>
    </div>
  `).join('') || `<div class="text-slate-500 text-sm">No maintenance history yet.</div>`;

  const actionBtn = e.status === 'Operational'
    ? `<button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
    : `<button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium" onclick="openCompleteModal('${e.id}')">Mark Operational</button>`;

  document.getElementById('view').innerHTML = `
    <a href="#/equipment" class="text-sm text-brand hover:underline">&larr; Back to equipment</a>
    <div class="bg-white rounded-xl border border-slate-200 p-6 mt-3 mb-6">
      <div class="flex items-start flex-wrap gap-3">
        <div>
          <div class="flex items-center gap-3"><h1 class="text-2xl font-semibold">${e.tag}</h1>${statusBadge(e.status)}</div>
          <div class="text-slate-500 text-sm mt-1">${e.type} · ${esc(e.make)} ${esc(e.model)} · ${plantName(e.plantId)}</div>
        </div>
        <div data-tour="detail-actions" class="ml-auto flex gap-2 flex-wrap">
          ${isAdmin() ? `<button onclick="openEditEquipmentModal('${e.id}')" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium inline-flex items-center gap-1" title="Edit equipment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            Edit
          </button>` : ''}
          ${exportDropdown(`'${e.id}'`, 'detail-export')}
          ${actionBtn}
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div><div class="text-xs uppercase text-slate-500">Plant</div><div>${plantName(e.plantId)}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Location</div><div>${esc(e.location)}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Installed</div><div>${e.installed}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Expected Completion</div><div>${open?.etr || '—'}</div></div>
      </div>
    </div>

    <h2 class="font-semibold mb-3">Maintenance history</h2>
    <div class="bg-white rounded-xl border border-slate-200 p-6">${timeline}</div>
  `;
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
        <button onclick="openServiceReportModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium">Service Report</button>
        ${exportDropdown('', 'log-export')}
      </div>
    </div>
    <div class="flex items-center mb-4 gap-2 flex-nowrap overflow-x-auto pb-1">
      <input id="fSearch" placeholder="Search…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-48 flex-shrink-0" oninput="renderLogRows()" />
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
        <option value="">All technicians</option>${[...new Set(state.logs.map(l => l.technician).filter(Boolean))].sort().map(t=>`<option>${t}</option>`).join('')}
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
        const blob = `${e.tag} ${esc(e.make)} ${esc(e.model)} ${e.location} ${plantName(e.plantId)} ${l.notes} ${l.completionNotes||''} ${l.technician}`.toLowerCase();
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
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
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
      <td><div class="cell-primary">${p.name}</div><div class="cell-secondary">${p.location}</div></td>
      <td><div class="cell-primary">${eqCount}</div><div class="cell-muted">equipment</div></td>
      <td class="col-center"><button onclick="openPlantNotifModal('${p.id}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Configure Notifications</button></td>
    </tr>`;
  }).join('');
  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold" data-tour="plants-h1">Plants</h1>
        <p class="text-slate-500 text-sm mt-1">Per-plant notification settings and admin actions.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
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
        <table class="list-table">
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
  const userRows = state.users.map(u => {
    const roleBadge = (u.role === 'Admin' || u.role === 'Superadmin') ? 'badge-brand' : 'badge-neutral';
    const isSelf = currentUser()?.id === u.id;
    const isEng = u.role === 'Engineer';
    const assigned = assignmentsFor(u.id);
    const plantsCell = isEng
      ? (assigned.length
          ? `<div class="cell-primary">${assigned.length} plant${assigned.length===1?'':'s'}</div><div class="cell-muted truncate max-w-[220px]">${assigned.map(plantName).join(', ')}</div>`
          : `<span class="badge badge-mt">None assigned</span>`)
      : `<span class="text-xs text-slate-500">All plants</span>`;
    const actions = [];
    if (isEng) actions.push(`<button onclick="openAssignPlantsModal('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100">Assign plants</button>`);
    if (isSuperadmin() && !isSelf && u.role !== 'Superadmin')
      actions.push(`<select onchange="setUserRole('${u.id}', this.value)" class="text-xs border border-slate-300 rounded-md px-1.5 py-1 bg-white">
        <option value="Engineer" ${u.role==='Engineer'?'selected':''}>Engineer</option>
        <option value="Admin" ${u.role==='Admin'?'selected':''}>Admin</option>
      </select>`);
    // Real mode: user deletion happens in Supabase Auth (an in-app button that
    // dead-ends in "go to the console" is worse than no button).
    if (!SUPA && !isSelf && u.role !== 'Superadmin' && (isSuperadmin() || u.role === 'Engineer'))
      actions.push(`<button onclick="removeUser('${u.id}')" class="text-xs px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">Remove</button>`);
    return `<tr>
      <td>
        <div class="cell-primary">${esc(u.name)}${isSelf?' <span class="text-[10px] text-slate-400">(you)</span>':''}</div>
        <div class="cell-muted">${esc(u.email) || '—'}</div>
      </td>
      <td><span class="badge ${roleBadge}">${u.role}</span></td>
      <td>${plantsCell}</td>
      <td><div class="cell-muted">${u.phone || '—'}</div></td>
      <td class="col-center">${actions.length ? `<div class="inline-flex gap-1.5 flex-wrap justify-center">${actions.join('')}</div>` : '<span class="text-xs text-slate-400">—</span>'}</td>
    </tr>`;
  }).join('');

  // Prototype-only: real-mode invites go out by email (no shareable-link table).
  const pending = SUPA ? [] : (state.invites || []).filter(i => i.status === 'pending');
  const inviteRows = pending.map(i => `<tr>
      <td>
        <div class="cell-primary">${i.name}</div>
        <div class="cell-muted">${i.email}</div>
      </td>
      <td><span class="badge ${i.role === 'Admin' ? 'badge-brand' : 'badge-neutral'}">${i.role}</span></td>
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
        <p class="text-slate-500 text-sm mt-1">Manage who can access the tool and who performs maintenance.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${SUPA ? '' : `<button onclick="openAddTechnicianModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Technician
        </button>`}
        <button onclick="openInviteModal()" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>
          Invite User
        </button>
      </div>
    </div>
    ${SUPA ? `<div class="mt-3 p-2.5 rounded-md bg-brand-50 border border-brand-100 text-xs text-brand">Invite users by email — they receive a link to set their own password and join with the role you pick. Assign plants below once they appear.</div>` : ''}
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden mt-4">
      <div class="px-5 py-3 border-b border-slate-200 font-semibold text-sm">Users <span class="text-slate-400 font-normal">(${state.users.length})</span></div>
      <div class="overflow-x-auto">
        <table class="list-table">
          <thead><tr><th>User</th><th>Role</th><th>Assigned plants</th><th>Phone</th><th class="col-center">Actions</th></tr></thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </div>
    ${pendingSection}`;
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
  if (!isAdmin()) return;
  document.getElementById('modalTitle').textContent = 'Invite User';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitInvite(event)" class="space-y-3 text-sm">
      <div><label class="block text-xs text-slate-600 mb-1">Full name <span class="text-red-500">*</span></label>
        <input name="name" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Anita Desai" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Email <span class="text-red-500">*</span></label>
        <input name="email" type="email" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="name@digitalpaani.com" /></div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Role</label>
        <div class="grid ${isSuperadmin() ? 'grid-cols-2' : 'grid-cols-1'} gap-2">
          <label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="role" value="Engineer" checked class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Engineer</div><div class="text-[11px] text-slate-500">Equipment, Engineering Corner, Maintenance Log.</div></div>
          </label>
          ${isSuperadmin() ? `<label class="flex items-start gap-2 p-2.5 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="role" value="Admin" class="mt-0.5" />
            <div><div class="font-medium text-slate-800">Admin</div><div class="text-[11px] text-slate-500">Full access incl. plants, team, notifications.</div></div>
          </label>` : ''}
        </div>
        ${isSuperadmin() ? '' : '<div class="text-[11px] text-slate-400 mt-1">Only the Superadmin can grant Admin access.</div>'}
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">${SUPA ? 'Send invite' : 'Create invite'}</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
}
async function submitInvite(ev) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const email = f.get('email').trim().toLowerCase();
  const name = f.get('name').trim();
  const requestedRole = f.get('role') || 'Engineer';
  const role = (requestedRole === 'Admin' && isSuperadmin()) ? 'Admin' : 'Engineer';

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
      alert(`Invitation email sent to ${email} as ${data.role || role}. They'll set their own password from the email link.`);
      await hydrateCloud(); route();
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = 'Send invite'; }
      alert('Could not send invite: ' + err.message);
    }
    return;
  }

  // Prototype fallback: shareable link flow.
  if (state.users.some(u => u.email.toLowerCase() === email)) { alert('A user with this email already exists.'); return; }
  if ((state.invites||[]).some(i => i.status === 'pending' && i.email.toLowerCase() === email)) { alert('An invite is already pending for this email.'); return; }
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
      <div class="text-slate-700">Invite for <b>${invite.name}</b> (${invite.email}) as <b>${invite.role}</b>.</div>
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
}
function copyInviteLink() {
  const field = document.getElementById('inviteLinkField');
  const done = () => { const b = document.getElementById('copyBtn'); if (b){ b.textContent = 'Copied!'; setTimeout(()=>{ if(b) b.textContent='Copy'; }, 1500); } };
  if (navigator.clipboard) navigator.clipboard.writeText(field.value).then(done, () => { field.select(); document.execCommand('copy'); done(); });
  else { field.select(); document.execCommand('copy'); done(); }
}
function revokeInvite(id) {
  if (!isAdmin()) return;
  const inv = (state.invites||[]).find(i => i.id === id);
  if (!inv || !confirm(`Revoke the invite for ${inv.name}? The link will stop working.`)) return;
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
}
function submitAddTechnician(ev) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  const email = f.get('email').trim().toLowerCase();
  if (state.users.some(u => u.email.toLowerCase() === email)) { alert('A user with this email already exists.'); return; }
  state.users.push({ id: nextUserId(), name: f.get('name').trim(), email, role: 'Engineer', phone: (f.get('phone')||'').trim(), password: 'eng123', status: 'active' });
  saveUsers(state.users);
  closeModal(); route();
}

// ---------- Accept invite (no session required) ----------
function renderAcceptInvite(token) {
  const data = b64urlDecode(token);
  const wrap = (inner) => `<div class="min-h-[70vh] flex items-center justify-center px-4"><div class="w-full max-w-sm">
    <div class="flex items-center gap-2 justify-center mb-6">
      <img src="logo.png?v=1" alt="DigitalPaani" class="h-11 w-auto rounded-lg" />
      <div><div class="font-semibold text-lg leading-tight">DigitalPaani</div><div class="text-xs text-slate-500 leading-tight">Maintenance Operations</div></div>
    </div>${inner}</div></div>`;
  const card = (inner) => `<div class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">${inner}</div>`;

  if (!data || !data.e) {
    document.getElementById('view').innerHTML = wrap(card(`<h1 class="text-lg font-semibold mb-1">Invalid invite</h1>
      <p class="text-sm text-slate-500 mb-4">This invite link is invalid or malformed.</p>
      <a href="#/dashboard" onclick="location.hash='#/dashboard'" class="text-sm text-brand hover:underline">Go to sign in</a>`));
    return;
  }
  const existing = state.users.find(u => u.email.toLowerCase() === data.e.toLowerCase());
  if (existing && existing.status === 'active') {
    document.getElementById('view').innerHTML = wrap(card(`<h1 class="text-lg font-semibold mb-1">Already a member</h1>
      <p class="text-sm text-slate-500 mb-4">${data.e} already has an active account. Please sign in.</p>
      <button onclick="location.hash='#/dashboard'; route();" class="w-full px-3 py-2 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Go to sign in</button>`));
    return;
  }
  document.getElementById('view').innerHTML = wrap(card(`
    <h1 class="text-lg font-semibold mb-1">Accept your invite</h1>
    <p class="text-xs text-slate-500 mb-4">You've been invited to DigitalPaani Maintenance Ops. Set a password to activate your account.</p>
    <form onsubmit="submitAcceptInvite(event, '${token}')" class="space-y-3">
      <div><label class="block text-xs text-slate-600 mb-1">Name</label>
        <input value="${(data.n||'').replace(/"/g,'&quot;')}" disabled class="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
      <div><label class="block text-xs text-slate-600 mb-1">Email</label>
        <input value="${data.e}" disabled class="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500" /></div>
      <div class="flex items-center gap-2 text-xs text-slate-600">Role: <span class="badge ${data.r === 'Admin' ? 'badge-brand' : 'badge-neutral'}">${data.r || 'Engineer'}</span></div>
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
function removeUser(id) {
  if (!isAdmin() || currentUser()?.id === id) return;
  const u = state.users.find(x => x.id === id);
  if (!u) return;
  // Superadmin can never be removed; only a Superadmin may remove an Admin.
  if (u.role === 'Superadmin') { alert('The Superadmin account cannot be removed.'); return; }
  if (u.role === 'Admin' && !isSuperadmin()) { alert('Only the Superadmin can remove an Admin.'); return; }
  if (!confirm(`Remove ${u.name} from the team?`)) return;
  if (SUPA) { alert('Delete the user in Supabase → Authentication → Users. This list reflects Supabase.'); return; }
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
      <span><span class="font-medium text-slate-800">${p.name}</span>${p.location?` <span class="text-slate-400">· ${p.location}</span>`:''}</span>
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
  if (!isSuperadmin()) { alert('Only the Superadmin can change roles.'); route(); return; }
  if (SUPA) {
    const { error } = await SUPA.from('profiles').update({ role }).eq('id', userId);
    if (error) { saveError(error); route(); return; }
    await hydrateCloud();
  } else {
    const u = state.users.find(x => x.id === userId); if (u) u.role = role; saveUsers(state.users);
  }
  route();
}

window._recipState = {};
function renderRecipPicker(eventKey) {
  const ids = window._recipState[eventKey] || [];
  const chips = ids.map(uid => {
    const u = state.users.find(x => x.id === uid); if (!u) return '';
    return `<span class="recip-chip">${esc(u.name)}<button type="button" onclick="removeRecipient('${eventKey}','${uid}')" aria-label="Remove ${u.name}">&times;</button></span>`;
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
  XLSX.writeFile(wb, name);
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
  doc.save(name);
}

// ---------- Engineering Corner ----------
const SLOT_DAY = { W1: 4, W2: 11, W3: 18, W4: 25 };

function getPendingTasks() {
  const admin = effRole(currentUser()) === 'Admin';
  const ids = accessiblePlantIds();
  return state.logs
    .filter(l => !l.endDate)
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(x => x.e && (admin || ids.includes(x.e.plantId)))
    .sort((a,b) => a.l.startDate.localeCompare(b.l.startDate));
}

function getUpcomingPPM(days = 30) {
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const horizon = new Date(now); horizon.setDate(horizon.getDate() + days);
  const admin = effRole(currentUser()) === 'Admin'; const ids = accessiblePlantIds();
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e || (!admin && !ids.includes(e.plantId))) continue;
    if (e.status !== 'Operational') continue; // already under maintenance
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
const PPM_BASELINE = '2026-07-19';

function getOverduePPM() {
  // PPM slots whose date is in the past but no completion log exists at-or-after that date in this month.
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const admin = effRole(currentUser()) === 'Admin'; const ids = accessiblePlantIds();
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e || (!admin && !ids.includes(e.plantId))) continue;
    if (e.status !== 'Operational') continue; // already in maintenance — being handled
    if (slot === 'weekly') continue; // weekly noise — skip from "overdue"
    const day = SLOT_DAY[slot];
    const m = now.getMonth(), y = now.getFullYear();
    const slotDate = new Date(y, m, day);
    if (slotDate >= now) continue; // not yet due
    const slotStr = dstr(slotDate);
    if (slotStr < PPM_BASELINE) continue; // pre-launch slot — not our backlog
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

  let body = '';
  if (tab === 'pending') body = renderPendingTab(pending, overdue);
  else if (tab === 'upcoming') body = renderUpcomingTab(upcoming);
  else body = renderVisitsTab(visits);

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <h1 class="text-2xl font-semibold" data-tour="engineer-h1">Engineering Corner</h1>
      <div class="ml-auto flex gap-2 flex-wrap">${plantFilterControl()}${typeFilterControl()}</div>
    </div>
    <p class="text-slate-500 mb-5">For site service engineers: see what's pending, what's coming up, and generate visit-wise sign-off reports.</p>
    <div class="flex gap-2 mb-5 flex-wrap">
      ${tabBtn('pending',  'Pending', pending.length + overdue.length)}
      ${tabBtn('upcoming', 'Upcoming PPM', upcoming.length)}
      ${tabBtn('visits',   'Visit Reports', visits.length)}
    </div>
    ${body}
  `;
}

function renderPendingTab(pending, overdue) {
  const fEq = e => (ui.plantFilter === 'all' || e.plantId === ui.plantFilter) && (ui.typeFilter === 'all' || e.type === ui.typeFilter);
  const fOngoing = pending.filter(({e}) => fEq(e));
  const fOverdue = overdue.filter(({e}) => fEq(e));

  if (!fOngoing.length && !fOverdue.length) return `<div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-sm">Nothing pending — every equipment is operational and no PPM is overdue.</div>`;

  const ongoingRows = fOngoing.map(({l, e}) => {
    const et = ecStatus(l.etr, null);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${esc(e.make)} ${esc(e.model)}</div></td>
      <td><div class="cell-primary">${l.reason}</div><div class="cell-muted">Tech: ${esc(l.technician)}</div></td>
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
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${plantName(e.plantId)}</div></td>
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

  return ongoingSection + overdueSection;
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
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${plantName(e.plantId)}</div></td>
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
      <td><div class="cell-primary">${v.date}</div><div class="cell-muted">${v.technicians.join(', ')}</div></td>
      <td><div class="cell-primary">${v.equipment.length} equipment</div><div class="cell-muted">${v.logs.length} task${v.logs.length===1?'':'s'} completed</div></td>
      <td><div class="cell-primary">${plantNames}</div></td>
      <td><div class="text-xs text-slate-600 max-w-md truncate" title="${v.equipment.map(e=>e.tag).join(', ').replace(/"/g,'&quot;')}">${v.equipment.map(e=>e.tag).join(', ')}</div></td>
      <td class="col-center"><button onclick="openVisitReportModal('${v.date}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Generate Report</button></td>
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

function openVisitReportModal(date) {
  const logs = state.logs.filter(l => l.endDate === date);
  if (!logs.length) { alert('No completed tasks on this date.'); return; }
  const technicians = [...new Set(logs.map(l => l.technician))];
  document.getElementById('modalTitle').textContent = `Visit Report — ${date}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitVisitReport(event, '${date}')" class="space-y-3 text-sm">
      <div class="p-3 rounded-md bg-brand-50 border border-brand-100 text-xs text-slate-700">
        <div><span class="font-medium">Visit date:</span> ${date}</div>
        <div><span class="font-medium">Tasks:</span> ${logs.length} · <span class="font-medium">Technicians on record:</span> ${technicians.join(', ') || '—'}</div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="block text-xs text-slate-600 mb-1">Prepared by</label><input name="preparedBy" placeholder="Service engineer" value="${technicians[0]||''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        <div><label class="block text-xs text-slate-600 mb-1">Approved by</label><input name="approvedBy" placeholder="Maintenance lead" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" name="action" value="download" class="px-3 py-1.5 rounded-md border border-brand bg-white text-brand hover:bg-brand-50 text-sm font-medium">Download</button>
        <button type="submit" name="action" value="preview"  class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white text-sm font-medium">Preview</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function submitVisitReport(ev, date) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const action = (ev.submitter && ev.submitter.value) || 'preview';
  const preparedBy = f.get('preparedBy') || '';
  const approvedBy = f.get('approvedBy') || '';
  closeModal();
  const result = buildVisitReportDoc(date, preparedBy, approvedBy);
  if (!result) return;
  if (action === 'download') result.doc.save(result.filename);
  else openPdfPreview(result.doc, result.filename, 'Visit Report');
}
function buildVisitReportDoc(date, preparedByIn, approvedByIn) {
  const logs = state.logs.filter(l => l.endDate === date);
  if (!logs.length) { alert('No completed tasks on this date.'); return null; }
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
function openServiceReportModal() {
  const filtered = getFilteredLogs();
  const filteredEqIds = [...new Set(filtered.map(({l}) => l.equipmentId))];
  const filteredCount = filteredEqIds.length;
  const allCount = state.equipment.length;

  document.getElementById('modalTitle').textContent = 'Generate Service Report';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="generateServiceReport(event)" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-sm">
      <div>
        <div class="text-sm font-medium mb-2">Scope</div>
        <div class="grid grid-cols-2 gap-2">
          <label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="scope" value="filtered" checked class="mt-1" />
            <div>
              <div class="font-medium text-slate-800 text-sm">Filtered</div>
              <div class="text-xs text-slate-500">Use the current Maintenance Log filters. ${filteredCount} equipment · ${filtered.length} log entr${filtered.length===1?'y':'ies'}.</div>
            </div>
          </label>
          <label class="flex items-start gap-2 p-3 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <input type="radio" name="scope" value="all" class="mt-1" />
            <div>
              <div class="font-medium text-slate-800 text-sm">All</div>
              <div class="text-xs text-slate-500">Every equipment on record · ${allCount} equipment.</div>
            </div>
          </label>
        </div>
      </div>
      <div>
        <div class="text-sm font-medium mb-1">Reporting period <span class="text-xs text-slate-500 font-normal">(optional)</span></div>
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
          <div><label class="block text-xs text-slate-600 mb-1">Prepared by</label><input name="preparedBy" placeholder="Technician name" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
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
}
function buildServiceReportDoc(args) {
  const { scope, from, to, preparedBy, approvedBy } = args;
  let ids;
  if (scope === 'filtered') {
    const filtered = getFilteredLogs();
    ids = [...new Set(filtered.map(({l}) => l.equipmentId))];
  } else {
    ids = state.equipment.map(e => e.id);
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

function generateServiceReport(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const action = (ev.submitter && ev.submitter.value) || 'preview';
  const args = {
    scope: f.get('scope') || 'filtered',
    from: f.get('from') || '',
    to: f.get('to') || today(),
    preparedBy: f.get('preparedBy') || '',
    approvedBy: f.get('approvedBy') || '',
  };
  const result = buildServiceReportDoc(args);
  if (!result) { alert('No equipment matches the chosen scope.'); return; }
  closeModal();
  if (action === 'download') {
    result.doc.save(result.filename);
  } else {
    openPdfPreview(result.doc, result.filename, 'Service Report');
  }
}

// ---------- PDF preview ----------
function openPdfPreview(doc, filename, title) {
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
  if (window._pdfPreview) window._pdfPreview.doc.save(window._pdfPreview.filename);
}
function closePdfPreview() {
  const el = document.getElementById('pdfPreview');
  if (el) el.remove();
  if (window._pdfPreview) { URL.revokeObjectURL(window._pdfPreview.url); window._pdfPreview = null; }
}

// ---------- Modals & mutations ----------
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function openMaintModal(eqId) {
  const e = eqById(eqId);
  document.getElementById('modalTitle').textContent = `Put ${e.tag} in maintenance`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitMaint(event, '${eqId}')" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Reason <span class="text-red-500">*</span></label>
        <select name="reason" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Select…</option><option>Scheduled</option><option>Breakdown</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Start date <span class="text-red-500">*</span></label>
          <input type="date" name="startDate" value="${today()}" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Expected completion <span class="text-red-500">*</span></label>
          <input type="date" name="etr" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Technician <span class="text-red-500">*</span></label>
        <input name="technician" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. A. Mehta" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Reason / scope of work <span class="text-red-500">*</span></label>
        <textarea name="notes" rows="4" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Describe what triggered this maintenance and what work will be done — parts to replace, observed symptoms, vendor involvement, etc."></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Confirm</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
async function submitMaint(ev, eqId) {
  ev.preventDefault();
  if (openLogFor(eqId)) { alert('This equipment already has an open work-order. Complete it before starting a new one.'); return; }
  const f = new FormData(ev.target);
  const log = {
    id: 'L-' + Date.now(), equipmentId: eqId,
    reason: f.get('reason'), startDate: f.get('startDate'), etr: f.get('etr'),
    endDate: null, technician: f.get('technician'),
    notes: f.get('notes') || '', completionNotes: '',
  };
  const newStatus = log.reason === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
  const evKey = log.reason === 'Breakdown' ? 'breakdown' : 'maintenance';
  if (SUPA) {
    const unlock = lockSubmit(ev);
    // Atomic RPC: log insert + status change in one transaction, with a
    // DB-side guard against duplicate open work-orders.
    const { error } = await SUPA.rpc('log_maintenance_start', {
      p_id: log.id, p_eq: eqId, p_reason: log.reason, p_start: log.startDate,
      p_etr: log.etr || null, p_tech: log.technician, p_notes: log.notes,
    });
    if (error) { unlock(); saveError(error); return; }
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
  const e = eqById(eqId);
  const log = openLogFor(eqId);
  document.getElementById('modalTitle').textContent = `Mark ${e.tag} operational`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitComplete(event, '${eqId}')" class="space-y-3 text-sm">
      ${log ? `<div class="p-3 rounded-md bg-brand-50 border border-brand-100 text-xs text-slate-700">
        <div><span class="font-medium">Reason:</span> ${log.reason}</div>
        <div><span class="font-medium">Started:</span> ${log.startDate} · <span class="font-medium">Expected:</span> ${log.etr}</div>
        <div class="mt-1"><span class="font-medium">Scope of work:</span> ${esc(log.notes)||'—'}</div>
      </div>` : ''}
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion date <span class="text-red-500">*</span></label>
        <input type="date" name="endDate" value="${today()}" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion notes <span class="text-red-500">*</span></label>
        <textarea name="completionNotes" rows="4" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Summarise work performed, parts replaced, test results, and any follow-ups."></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2 flex-wrap">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button type="submit" name="action" value="confirm" class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white">Confirm</button>
        <button type="submit" name="action" value="confirm-report" class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Confirm &amp; Generate Service Report</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
async function submitComplete(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const endDate = f.get('endDate');
  const completionNotes = f.get('completionNotes') || '';
  const wantReport = (ev.submitter && ev.submitter.value === 'confirm-report');
  const log = openLogFor(eqId);
  if (SUPA) {
    if (!log) { alert('No open work-order found.'); return; }
    const unlock = lockSubmit(ev);
    // Atomic RPC: closes the log and returns the equipment to service together.
    const { error } = await SUPA.rpc('log_maintenance_complete', {
      p_log: log.id, p_end: endDate, p_notes: completionNotes,
    });
    if (error) { unlock(); saveError(error); return; }
    const closedLog = { ...log, endDate, completionNotes };
    await hydrateCloud();
    closeModal(); route();
    pushEventNotification('operational', eqById(eqId), closedLog);
    toast(`${esc(eqById(eqId)?.tag || 'Equipment')} is back in service.`);
    if (wantReport) generateSingleServiceReport(eqId, closedLog);
    return;
  }
  if (log) { log.endDate = endDate; log.completionNotes = completionNotes; }
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

function openEquipmentFormModal(mode, eqId) {
  const isEdit = mode === 'edit';
  const e = isEdit ? eqById(eqId) : null;
  const plantOpts = state.plants.map(p => `<option value="${p.id}" ${e && e.plantId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  const typeOpts = EQ_TYPES.map(t => `<option ${e && e.type === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('modalTitle').textContent = isEdit ? `Edit ${e.tag}` : 'Add Equipment';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitEquipmentForm(event, '${mode}', '${eqId||''}')" class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
          <input name="tag" required value="${e ? e.tag.replace(/"/g,'&quot;') : ''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. P-705" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Type <span class="text-red-500">*</span></label>
          <select name="type" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
            <option value="">Select…</option>${typeOpts}
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Make</label>
          <input name="make" value="${e ? (e.make||'').replace(/"/g,'&quot;') : ''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Grundfos" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Model</label>
          <input name="model" value="${e ? (e.model||'').replace(/"/g,'&quot;') : ''}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. NB 65-200" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Plant <span class="text-red-500">*</span></label>
        <select name="plantId" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Select…</option>${plantOpts}
        </select>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Installed</label>
        <input type="date" name="installed" value="${e ? e.installed : today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">${isEdit ? 'Save changes' : 'Add'}</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function openAddEquipmentModal() { openEquipmentFormModal('add'); }
function openEditEquipmentModal(eqId) { openEquipmentFormModal('edit', eqId); }
async function submitEquipmentForm(ev, mode, eqId) {
  ev.preventDefault();
  if (!isAdmin()) return;
  const f = new FormData(ev.target);
  if (mode === 'edit') {
    const cur = eqById(eqId); if (!cur) return;
    const patch = { tag: f.get('tag'), type: f.get('type'), make: f.get('make') || '', model: f.get('model') || '', plantId: f.get('plantId'), installed: f.get('installed') || cur.installed };
    if (SUPA) {
      const unlock = lockSubmit(ev);
      const { error } = await SUPA.from('equipment').update(eqToDb({ ...cur, ...patch })).eq('id', eqId);
      if (error) { unlock(); saveError(error); return; }
      await hydrateCloud(); closeModal(); route(); return;
    }
    Object.assign(cur, patch);
  } else {
    const newEq = {
      id: 'EQ-' + String(Date.now()).slice(-6), tag: f.get('tag'), type: f.get('type'),
      make: f.get('make') || '', model: f.get('model') || '',
      plantId: f.get('plantId'), location: '',
      installed: f.get('installed') || today(), status: 'Operational', slot: null,
    };
    if (SUPA) {
      const unlock = lockSubmit(ev);
      const { error } = await SUPA.from('equipment').insert(eqToDb(newEq));
      if (error) { unlock(); saveError(error); return; }
      await hydrateCloud(); closeModal(); route(); return;
    }
    state.equipment.push(newEq);
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

function openImportPPMModal() {
  window._importedRows = null;
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
        <input type="file" name="file" accept=".xlsx,.xls" required class="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-brand file:bg-brand-50 file:text-brand file:font-medium file:cursor-pointer" oninput="onPPMFileChosen(this)" />
        <div class="text-xs text-slate-500 mt-1">Expected layout: rows of equipment with columns <code>S.No · Name · Make · Capacity · Qty</code> followed by 52 weekly slot cells marked with frequency codes.</div>
      </div>

      <div id="ppmPreview" class="hidden"></div>

      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button id="ppmImportBtn" disabled class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white disabled:opacity-40 disabled:cursor-not-allowed">Import</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
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
      const byType = rows.reduce((m, r) => { m[r.type] = (m[r.type]||0)+1; return m; }, {});
      const summary = Object.entries(byType).map(([t,c]) => `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-50 text-brand border border-brand-100 font-medium">${t}<span class="text-brand-600">${c}</span></span>`).join('');
      const sample = rows.slice(0, 8).map(r => `<tr>
        <td class="py-1 px-2 font-medium">${r.tag}</td>
        <td class="py-1 px-2 text-slate-600">${r.type}</td>
        <td class="py-1 px-2 text-slate-600">${r.make||'—'}</td>
        <td class="py-1 px-2 text-slate-600">${r.model||'—'}</td>
        <td class="py-1 px-2"><span class="text-xs px-2 py-0.5 rounded-full border ${r.slot?'border-brand-100 bg-brand-50 text-brand':'border-slate-200 bg-slate-50 text-slate-500'} font-medium">${r.slot||'—'}</span></td>
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
      preview.innerHTML = `<div class="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">Could not parse file: ${e.message}</div>`;
      btn.disabled = true;
      window._importedRows = null;
    }
  };
  reader.readAsArrayBuffer(file);
}

// Non-equipment / procedural rows we don't track as maintainable equipment
const PPM_EXCLUDE_RE = /test\b|\bcheck\b|monitoring|\blog\b|hardness|turbidity|chlorine|reading|sensor|detector|analys|flow ?meter|flowmeter|\bmeter\b|camera|cctv|tank cleaning|\bcleaning\b|settler|\bdiffuser\b|thickener|\bpanel\b|\bmcc\b|earthing|\bcable|wiring|transformer/i;
const PPM_TYPE_RE = [
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
  const newEquipment = rows.map((r, idx) => ({
    id: `EQ-IMP-${base}-${idx}`,
    tag: r.tag, type: r.type, make: r.make, model: r.model,
    plantId, location: '', installed: today(), status: 'Operational',
    slot: r.slot || null,
  }));

  if (SUPA) {
    const unlock = lockSubmit(ev, 'Importing…');
    const { error } = await SUPA.from('equipment').insert(newEquipment.map(eqToDb));
    if (error) { unlock(); saveError(error); return; }
    await hydrateCloud();
    closeModal();
    alert(`Imported ${newEquipment.length} equipment into the plant.`);
    ui.plantFilter = plantId; location.hash = '#/equipment'; route();
    return;
  }

  // Prototype: keep separate slots map + generate demo history
  const newSlots = {};
  newEquipment.forEach((e) => { if (e.slot) newSlots[e.id] = e.slot; });
  const newLogs = generatePastPPMLogs(newSlots, newEquipment, `IMP-${base}`);
  state.equipment = state.equipment.concat(newEquipment);
  state.slots = Object.assign({}, state.slots || {}, newSlots);
  state.logs = state.logs.concat(newLogs);
  saveEq(state.equipment); saveSlots(state.slots); saveLog(state.logs);
  closeModal();
  alert(`Imported ${newEquipment.length} equipment with ${newLogs.length} historic PPM log entries.`);
  location.hash = '#/equipment'; ui.plantFilter = plantId; route();
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
        body:  { 'en-US':"These cards show real-time equipment counts. Click any card to filter the table below — for example, In Maintenance shows exactly what's down right now.",
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
      if (data.session) { await loadAuthProfile(data.session.user); await hydrateCloud(); }
    } catch (e) { console.warn('session restore failed', e); }
    // React to sign-in / sign-out / token refresh across tabs
    SUPA.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') needsPasswordSet = true;
      if (event === 'SIGNED_OUT' || !session) { authUser = null; cloudUsers = null; cloudAssignments = {}; }
      else if (!authUser || authUser.id !== session.user.id) { await loadAuthProfile(session.user); await hydrateCloud(); }
      route();
    });
  }
  route();
  mountTourFAB();
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
}
boot();
