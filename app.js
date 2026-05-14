// ---------- Seed data ----------
const SEED_PLANTS = [
  { id: 'PL-01', name: 'Adani Mumbai',       location: 'Mumbai, MH',     notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','sms'], operational:[], overdue:['email'] }) },
  { id: 'PL-02', name: 'Hindalco Mahaan',    location: 'Singrauli, MP',  notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','whatsapp'], operational:[], overdue:['email','sms'] }) },
  { id: 'PL-03', name: 'Tata Jamshedpur',    location: 'Jamshedpur, JH', notifications: defaultNotifConfig({ maintenance:[], breakdown:['email'], operational:[], overdue:['email'] }) },
  { id: 'PL-04', name: 'Reliance Jamnagar',  location: 'Jamnagar, GJ',   notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','sms','teams'], operational:['email'], overdue:['email','sms'] }) },
];
function defaultNotifConfig(prefs = {}) {
  const make = (ch) => ({ enabled: ch.length > 0, channels: ch });
  return {
    recipients:  prefs.recipients  || ['U-4','U-5'],
    maintenance: make(prefs.maintenance || []),
    breakdown:   make(prefs.breakdown   || []),
    operational: make(prefs.operational || []),
    overdue:     make(prefs.overdue     || []),
  };
}
const CHANNELS = ['email','sms','whatsapp','call'];

const SEED_USERS = [
  { id: 'U-1', name: 'A. Mehta',          role: 'Maintenance Technician', email: 'amehta@plant.com',  phone: '+91 90000 11111' },
  { id: 'U-2', name: 'R. Sharma',         role: 'Maintenance Technician', email: 'rsharma@plant.com', phone: '+91 90000 22222' },
  { id: 'U-3', name: 'S. Iyer',           role: 'Maintenance Technician', email: 'siyer@plant.com',   phone: '+91 90000 33333' },
  { id: 'U-4', name: 'P. Kulkarni',       role: 'Maintenance Lead',       email: 'pk@plant.com',      phone: '+91 90000 44444' },
  { id: 'U-5', name: 'N. Rao',            role: 'Plant Manager',          email: 'nrao@plant.com',    phone: '+91 90000 55555' },
  { id: 'U-6', name: 'Operations Desk',   role: 'Control Room',           email: 'ops@plant.com',     phone: '+91 90000 66666' },
];

const SEED_EQUIPMENT = [
  { id: 'EQ-001', tag: 'P-101A', type: 'Pump',   make: 'Grundfos',     model: 'NB 65-200',     plantId: 'PL-01', location: 'Cooling Tower Loop', installed: '2019-03-12', status: 'Operational' },
  { id: 'EQ-002', tag: 'P-101B', type: 'Pump',   make: 'Grundfos',     model: 'NB 65-200',     plantId: 'PL-01', location: 'Cooling Tower Loop', installed: '2019-03-12', status: 'In Maintenance' },
  { id: 'EQ-003', tag: 'P-204',  type: 'Pump',   make: 'KSB',          model: 'Etanorm 80-200',plantId: 'PL-02', location: 'Boiler Feed',        installed: '2020-07-01', status: 'Operational' },
  { id: 'EQ-004', tag: 'P-310',  type: 'Pump',   make: 'Sulzer',       model: 'AHLSTAR APP',   plantId: 'PL-03', location: 'Process Line 3',     installed: '2018-11-22', status: 'Broken Down' },
  { id: 'EQ-005', tag: 'P-410',  type: 'Pump',   make: 'Flowserve',    model: 'Durco Mark 3',  plantId: 'PL-04', location: 'Effluent Treatment', installed: '2021-01-09', status: 'Operational' },
  { id: 'EQ-006', tag: 'P-511',  type: 'Pump',   make: 'Wilo',         model: 'IL 80/170-7.5', plantId: 'PL-01', location: 'HVAC Chiller',       installed: '2022-05-30', status: 'Operational' },
  { id: 'EQ-007', tag: 'P-602',  type: 'Pump',   make: 'Grundfos',     model: 'CR 32-4',       plantId: 'PL-02', location: 'RO Plant',           installed: '2020-02-14', status: 'In Maintenance' },
  { id: 'EQ-008', tag: 'B-201',  type: 'Blower', make: 'Atlas Copco',  model: 'ZS 55+',        plantId: 'PL-04', location: 'Aeration Tank 1',    installed: '2019-09-18', status: 'Operational' },
  { id: 'EQ-009', tag: 'B-202',  type: 'Blower', make: 'Atlas Copco',  model: 'ZS 55+',        plantId: 'PL-04', location: 'Aeration Tank 2',    installed: '2019-09-18', status: 'Broken Down' },
  { id: 'EQ-010', tag: 'B-305',  type: 'Blower', make: 'Kaeser',       model: 'EBS 410L',      plantId: 'PL-03', location: 'Pneumatic Conveyor', installed: '2021-06-04', status: 'Operational' },
  { id: 'EQ-011', tag: 'B-410',  type: 'Blower', make: 'Howden',       model: 'Roots URAI-68', plantId: 'PL-02', location: 'Dust Collection',    installed: '2018-04-20', status: 'In Maintenance' },
  { id: 'EQ-012', tag: 'B-501',  type: 'Blower', make: 'Aerzen',       model: 'GM 25S',        plantId: 'PL-01', location: 'Bag Filter House',   installed: '2022-10-11', status: 'Operational' },
  { id: 'EQ-013', tag: 'P-705',  type: 'Pump',   make: 'KSB',          model: 'Megachem 65',   plantId: 'PL-03', location: 'Chemical Dosing',    installed: '2020-12-05', status: 'Operational' },
  { id: 'EQ-014', tag: 'B-602',  type: 'Blower', make: 'Kaeser',       model: 'CBS 121',       plantId: 'PL-01', location: 'Instrument Air',     installed: '2021-03-28', status: 'Operational' },
];

const SEED_LOGS = [
  { id: 'L-001', equipmentId: 'EQ-001', reason: 'Scheduled', startDate: '2026-02-10', etr: '2026-02-11', endDate: '2026-02-11', technician: 'A. Mehta',  notes: 'Mechanical seal replacement, alignment check.', completionNotes: 'Seal replaced; alignment verified within 0.05 mm.' },
  { id: 'L-002', equipmentId: 'EQ-003', reason: 'Breakdown', startDate: '2026-01-22', etr: '2026-01-25', endDate: '2026-01-24', technician: 'R. Sharma', notes: 'Bearing failure on drive end.',                  completionNotes: 'Replaced 6309 bearings. Vibration normal post-restart.' },
  { id: 'L-003', equipmentId: 'EQ-008', reason: 'Scheduled', startDate: '2026-03-05', etr: '2026-03-05', endDate: '2026-03-05', technician: 'S. Iyer',   notes: 'Oil change, intake filter replacement.',         completionNotes: 'Oil topped up; new filter installed.' },
  { id: 'L-004', equipmentId: 'EQ-005', reason: 'Breakdown', startDate: '2026-04-02', etr: '2026-04-04', endDate: '2026-04-03', technician: 'A. Mehta',  notes: 'Impeller erosion.',                              completionNotes: 'Hard-faced impeller installed; pressure stable.' },
  { id: 'L-005', equipmentId: 'EQ-010', reason: 'Scheduled', startDate: '2026-04-15', etr: '2026-04-16', endDate: '2026-04-16', technician: 'R. Sharma', notes: 'Belt tensioning and inspection.',                completionNotes: 'Belts tensioned; no cracks observed.' },
  // open entries
  { id: 'L-006', equipmentId: 'EQ-002', reason: 'Scheduled', startDate: '2026-05-10', etr: '2026-05-14', endDate: null, technician: 'A. Mehta',  notes: 'Annual overhaul — wear ring and seal replacement.', completionNotes: '' },
  { id: 'L-007', equipmentId: 'EQ-004', reason: 'Breakdown', startDate: '2026-05-09', etr: '2026-05-16', endDate: null, technician: 'R. Sharma', notes: 'Motor winding burnt. Awaiting rewinding from vendor.', completionNotes: '' },
  { id: 'L-008', equipmentId: 'EQ-007', reason: 'Scheduled', startDate: '2026-05-12', etr: '2026-05-13', endDate: null, technician: 'S. Iyer',   notes: 'Cartridge filter replacement, leak test.',          completionNotes: '' },
  { id: 'L-009', equipmentId: 'EQ-009', reason: 'Breakdown', startDate: '2026-05-11', etr: '2026-05-18', endDate: null, technician: 'A. Mehta',  notes: 'High vibration, gearbox damaged. Spare being procured.', completionNotes: '' },
  { id: 'L-010', equipmentId: 'EQ-011', reason: 'Scheduled', startDate: '2026-05-13', etr: '2026-05-15', endDate: null, technician: 'R. Sharma', notes: 'Roots blower lobe clearance check, oil change.',    completionNotes: '' },
];

// ---------- Storage ----------
const LS_EQ = 'mm.equipment.v2';
const LS_LOG = 'mm.logs.v2';
const LS_PLANT = 'mm.plants.v2';
const LS_USERS = 'mm.users.v1';

function load() {
  if (!localStorage.getItem(LS_EQ))    localStorage.setItem(LS_EQ,    JSON.stringify(SEED_EQUIPMENT));
  if (!localStorage.getItem(LS_LOG))   localStorage.setItem(LS_LOG,   JSON.stringify(SEED_LOGS));
  if (!localStorage.getItem(LS_PLANT)) localStorage.setItem(LS_PLANT, JSON.stringify(SEED_PLANTS));
  if (!localStorage.getItem(LS_USERS)) localStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
  return {
    equipment: JSON.parse(localStorage.getItem(LS_EQ)),
    logs:      JSON.parse(localStorage.getItem(LS_LOG)),
    plants:    JSON.parse(localStorage.getItem(LS_PLANT)),
    users:     JSON.parse(localStorage.getItem(LS_USERS)),
  };
}
const saveEq    = e => localStorage.setItem(LS_EQ,    JSON.stringify(e));
const saveLog   = l => localStorage.setItem(LS_LOG,   JSON.stringify(l));
const savePlant = p => localStorage.setItem(LS_PLANT, JSON.stringify(p));
function resetDemo() { [LS_EQ, LS_LOG, LS_PLANT, LS_USERS].forEach(k => localStorage.removeItem(k)); route(); }

// ---------- Helpers ----------
const today = () => new Date().toISOString().slice(0,10);
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
  return `<a class="text-brand font-semibold hover:underline inline-flex items-center gap-1" href="#/equipment/${e.id}">${e.tag}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></a>`;
}

// ---------- State / routing / filters ----------
let state = load();
const ui = { plantFilter: 'all', dashStatusFilter: 'all' };

const routes = [
  { hash: '#/dashboard', label: 'Dashboard' },
  { hash: '#/equipment', label: 'Equipment' },
  { hash: '#/log',       label: 'Maintenance Log' },
  { hash: '#/plants',    label: 'Plants' },
];

function renderNav() {
  const cur = location.hash || '#/dashboard';
  document.getElementById('nav').innerHTML = routes.map(r => {
    const active = cur === r.hash || (r.hash === '#/equipment' && cur.startsWith('#/equipment/'));
    return `<a href="${r.hash}" class="px-3 py-1.5 rounded-md ${active?'bg-brand-50 text-brand font-medium':'text-slate-600 hover:bg-slate-100'}">${r.label}</a>`;
  }).join('');
}

function route() {
  state = load();
  renderNav();
  const h = location.hash || '#/dashboard';
  if (h.startsWith('#/equipment/')) return renderEquipmentDetail(h.split('/')[2]);
  if (h === '#/equipment') return renderEquipment();
  if (h === '#/log')       return renderLog();
  if (h === '#/plants')    return renderPlants();
  return renderDashboard();
}
window.addEventListener('hashchange', route);

// ---------- Reusable controls ----------
function plantFilterControl() {
  const opts = ['<option value="all">All plants</option>'].concat(
    state.plants.map(p => `<option value="${p.id}" ${ui.plantFilter===p.id?'selected':''}>${p.name}</option>`)
  ).join('');
  return `<select onchange="ui.plantFilter=this.value; route()" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white">${opts}</select>`;
}
function applyPlantFilter(eq) { return ui.plantFilter === 'all' ? eq : eq.filter(e => e.plantId === ui.plantFilter); }
function addEquipmentBtn() {
  return `<button onclick="openAddEquipmentModal()" class="px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-800 text-sm font-medium inline-flex items-center gap-1">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
    Add Equipment
  </button>`;
}

// ---------- Dashboard ----------
function renderDashboard() {
  let eq = applyPlantFilter(state.equipment);
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
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${e.location}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${e.make} ${e.model}</div></td>
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
      <h1 class="text-2xl font-semibold">Plant Maintenance Dashboard</h1>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        ${addEquipmentBtn()}
      </div>
    </div>
    <p class="text-slate-500 mb-6">Live status of pumps and blowers. Click any card below to filter the table.</p>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      ${card('total','Total Equipment', total, 'text-slate-800')}
      ${card('op','Operational',         op,    'text-green-700')}
      ${card('mt','In Maintenance',      mt,    'text-brand')}
      ${card('bd','Broken Down',         bd,    'text-red-600')}
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-200 flex items-center">
        <div class="font-semibold">${heading}</div>
        <div class="ml-auto text-sm text-slate-500">${down.length} equipment</div>
      </div>
      <div class="overflow-x-auto">
        <table class="list-table">
          <thead><tr>
            <th>Equipment</th><th>Plant</th><th>Type / Model</th><th>Reason</th>
            <th>Start / Expected Completion</th><th>Status</th><th>State</th>
          </tr></thead>
          <tbody>${downRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Equipment list ----------
function renderEquipment() {
  const eq = applyPlantFilter(state.equipment);
  const rows = eq.map(e => {
    const log = openLogFor(e.id);
    const action = e.status === 'Operational'
      ? `<button class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
      : `<button class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium" onclick="openCompleteModal('${e.id}')">Mark Operational</button>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${e.location}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${e.make} ${e.model}</div></td>
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
      <div class="text-sm text-slate-700 mt-1"><span class="font-medium">Scope:</span> ${l.notes || '—'}</div>
      ${l.completionNotes ? `<div class="text-sm text-slate-700 mt-1"><span class="font-medium">Completion notes:</span> ${l.completionNotes}</div>` : ''}
      <div class="text-xs text-slate-500 mt-1">Technician: ${l.technician}</div>
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
          <div class="text-slate-500 text-sm mt-1">${e.type} · ${e.make} ${e.model} · ${plantName(e.plantId)}</div>
        </div>
        <div class="ml-auto flex gap-2 flex-wrap">
          ${exportDropdown(`'${e.id}'`, 'detail-export')}
          ${actionBtn}
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div><div class="text-xs uppercase text-slate-500">Plant</div><div>${plantName(e.plantId)}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Location</div><div>${e.location}</div></div>
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
    <div class="flex items-center mb-4 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Maintenance Log</h1>
        <p class="text-slate-500 text-sm">Full history across all equipment.</p>
      </div>
      <div class="ml-auto flex gap-2 flex-wrap">
        ${plantFilterControl()}
        <select id="fType" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white" onchange="renderLogRows()">
          <option value="">All types</option><option>Pump</option><option>Blower</option>
        </select>
        <select id="fReason" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white" onchange="renderLogRows()">
          <option value="">All reasons</option><option>Scheduled</option><option>Breakdown</option>
        </select>
        <select id="fStatus" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm bg-white" onchange="renderLogRows()">
          <option value="">All statuses</option><option value="open">Ongoing</option><option value="closed">Completed</option>
        </select>
        <input id="fSearch" placeholder="Search…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-44" oninput="renderLogRows()" />
        ${exportDropdown('', 'log-export')}
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
    </div>
  `;
  renderLogRows();
}

function getFilteredLogs() {
  const fType = document.getElementById('fType')?.value || '';
  const fReason = document.getElementById('fReason')?.value || '';
  const fStatus = document.getElementById('fStatus')?.value || '';
  const fSearch = (document.getElementById('fSearch')?.value || '').toLowerCase();
  return state.logs
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(({l, e}) => {
      if (!e) return false;
      if (ui.plantFilter !== 'all' && e.plantId !== ui.plantFilter) return false;
      if (fType && e.type !== fType) return false;
      if (fReason && l.reason !== fReason) return false;
      if (fStatus === 'open' && l.endDate) return false;
      if (fStatus === 'closed' && !l.endDate) return false;
      if (fSearch) {
        const blob = `${e.tag} ${e.make} ${e.model} ${e.location} ${plantName(e.plantId)} ${l.notes} ${l.completionNotes||''} ${l.technician}`.toLowerCase();
        if (!blob.includes(fSearch)) return false;
      }
      return true;
    })
    .sort((a,b) => b.l.startDate.localeCompare(a.l.startDate));
}

function renderLogRows() {
  const data = getFilteredLogs();
  const rows = data.map(({l, e}) => {
    const durDays = l.endDate ? daysBetween(l.startDate, l.endDate) : daysBetween(l.startDate, today());
    const overdue = isOverdue(l);
    const durHtml = l.endDate
      ? `<span class="text-slate-700">${durDays} day${durDays===1?'':'s'}</span>`
      : `<span class="font-medium ${overdue?'text-red-600':'text-brand'}">${durDays} day${durDays===1?'':'s'} (ongoing)</span>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${e.make} ${e.model}</div></td>
      <td><div class="cell-primary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${l.reason}</div><div class="cell-muted">${e.type} · ${e.location}</div></td>
      <td><div class="cell-primary">${l.startDate}</div><div class="cell-muted">${l.endDate ? 'End: ' + l.endDate : 'Expected: ' + (l.etr || '—')}</div></td>
      <td>${durHtml}</td>
      <td><div class="cell-primary">${l.technician}</div></td>
      <td class="max-w-xs"><div class="text-slate-600 line-clamp-2" title="${(l.notes||'').replace(/"/g,'&quot;')}">${l.notes||''}</div></td>
      <td>${ongoingStatusPill(l)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" class="py-6 text-center text-slate-500">No log entries match your filters.</td></tr>`;
  document.getElementById('logRows').innerHTML = rows;
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
    const enabledEvents = NOTIF_EVENTS.filter(ev => p.notifications[ev.key].enabled).length;
    return `<tr>
      <td><div class="cell-primary">${p.name}</div><div class="cell-secondary">${p.location}</div></td>
      <td><div class="cell-primary">${eqCount}</div><div class="cell-muted">equipment</div></td>
      <td><div class="cell-primary">${enabledEvents} / ${NOTIF_EVENTS.length}</div><div class="cell-muted">events enabled</div></td>
      <td class="col-center"><button onclick="openPlantNotifModal('${p.id}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Configure Notifications</button></td>
    </tr>`;
  }).join('');
  document.getElementById('view').innerHTML = `
    <h1 class="text-2xl font-semibold mb-1">Plants</h1>
    <p class="text-slate-500 mb-6">Per-plant notification settings for maintenance events.</p>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="list-table">
          <thead><tr><th>Plant</th><th>Equipment</th><th>Notifications</th><th class="col-center">Action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function openPlantNotifModal(plantId) {
  const p = plantById(plantId);
  const recipients = p.notifications.recipients || [];
  const recipientBoxes = state.users.map(u => `
    <label class="flex items-start gap-2 p-2 rounded-md border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs">
      <input type="checkbox" name="recipient.${u.id}" ${recipients.includes(u.id)?'checked':''} class="mt-0.5" />
      <div>
        <div class="font-medium text-slate-800">${u.name}</div>
        <div class="text-slate-500">${u.role}</div>
      </div>
    </label>`).join('');

  const eventBlock = NOTIF_EVENTS.map(ev => {
    const cfg = p.notifications[ev.key];
    const channelBoxes = CHANNELS.map(ch => `
      <label class="inline-flex items-center gap-1.5 text-xs">
        <input type="checkbox" name="${ev.key}.${ch}" ${cfg.channels.includes(ch)?'checked':''} />
        <span class="capitalize">${ch === 'sms' ? 'SMS' : ch}</span>
      </label>`).join('');
    return `
      <div class="border border-slate-200 rounded-lg p-3">
        <label class="flex items-center gap-2">
          <input type="checkbox" name="${ev.key}.enabled" ${cfg.enabled?'checked':''} />
          <span class="font-medium text-sm">${ev.label}</span>
        </label>
        <div class="text-xs text-slate-500 mt-1 mb-2">Channels</div>
        <div class="flex flex-wrap gap-x-3 gap-y-1.5">${channelBoxes}</div>
      </div>`;
  }).join('');

  document.getElementById('modalTitle').textContent = `Notifications — ${p.name}`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="savePlantNotif(event, '${plantId}')" class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <div class="text-sm font-medium mb-1">Recipients</div>
        <div class="text-xs text-slate-500 mb-2">Select users who should receive notifications for this plant.</div>
        <div class="grid grid-cols-2 gap-2">${recipientBoxes}</div>
      </div>
      <div>
        <div class="text-sm font-medium mb-2">Events &amp; channels</div>
        <div class="space-y-2">${eventBlock}</div>
      </div>
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Save</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}

function savePlantNotif(ev, plantId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const p = plantById(plantId);
  p.notifications.recipients = state.users.filter(u => f.get(`recipient.${u.id}`)).map(u => u.id);
  NOTIF_EVENTS.forEach(evt => {
    p.notifications[evt.key].enabled = !!f.get(`${evt.key}.enabled`);
    p.notifications[evt.key].channels = CHANNELS.filter(ch => f.get(`${evt.key}.${ch}`));
  });
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
    Technician: l.technician, 'Scope / Notes': l.notes, 'Completion Notes': l.completionNotes || '',
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
function submitMaint(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const log = {
    id: 'L-' + Date.now(), equipmentId: eqId,
    reason: f.get('reason'), startDate: f.get('startDate'), etr: f.get('etr'),
    endDate: null, technician: f.get('technician'),
    notes: f.get('notes') || '', completionNotes: '',
  };
  state.logs.unshift(log);
  eqById(eqId).status = log.reason === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
  saveLog(state.logs); saveEq(state.equipment);
  closeModal(); route();
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
        <div class="mt-1"><span class="font-medium">Scope:</span> ${log.notes||'—'}</div>
      </div>` : ''}
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion date <span class="text-red-500">*</span></label>
        <input type="date" name="endDate" value="${today()}" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Completion notes <span class="text-red-500">*</span></label>
        <textarea name="completionNotes" rows="4" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Summarise work performed, parts replaced, test results, and any follow-ups."></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white">Confirm</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function submitComplete(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const log = openLogFor(eqId);
  if (log) {
    log.endDate = f.get('endDate');
    log.completionNotes = f.get('completionNotes') || '';
  }
  eqById(eqId).status = 'Operational';
  saveLog(state.logs); saveEq(state.equipment);
  closeModal(); route();
}

function openAddEquipmentModal() {
  const plantOpts = state.plants.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  document.getElementById('modalTitle').textContent = 'Add Equipment';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitAddEquipment(event)" class="space-y-3 text-sm">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Name <span class="text-red-500">*</span></label>
          <input name="tag" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. P-705" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Type <span class="text-red-500">*</span></label>
          <select name="type" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
            <option value="">Select…</option><option>Pump</option><option>Blower</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Make</label>
          <input name="make" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Grundfos" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Model</label>
          <input name="model" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. NB 65-200" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Plant <span class="text-red-500">*</span></label>
        <select name="plantId" required class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option value="">Select…</option>${plantOpts}
        </select>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Location <span class="text-slate-400">(optional)</span></label>
        <input name="location" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. Cooling Tower Loop" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Installed</label>
        <input type="date" name="installed" value="${today()}" class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Add</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function submitAddEquipment(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const id = 'EQ-' + String(Date.now()).slice(-6);
  state.equipment.push({
    id, tag: f.get('tag'), type: f.get('type'),
    make: f.get('make') || '', model: f.get('model') || '',
    plantId: f.get('plantId'), location: f.get('location') || '',
    installed: f.get('installed') || today(), status: 'Operational',
  });
  saveEq(state.equipment);
  closeModal(); route();
}

// ---------- Boot ----------
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all data back to the seed demo?')) resetDemo();
});
if (!location.hash) location.hash = '#/dashboard';
route();
