// ---------- Seed data ----------
const SEED_EQUIPMENT = [
  { id: 'EQ-001', tag: 'P-101A', type: 'Pump',   make: 'Grundfos',     model: 'NB 65-200',     location: 'Cooling Tower Loop', installed: '2019-03-12', status: 'Operational' },
  { id: 'EQ-002', tag: 'P-101B', type: 'Pump',   make: 'Grundfos',     model: 'NB 65-200',     location: 'Cooling Tower Loop', installed: '2019-03-12', status: 'In Maintenance' },
  { id: 'EQ-003', tag: 'P-204',  type: 'Pump',   make: 'KSB',          model: 'Etanorm 80-200',location: 'Boiler Feed',        installed: '2020-07-01', status: 'Operational' },
  { id: 'EQ-004', tag: 'P-310',  type: 'Pump',   make: 'Sulzer',       model: 'AHLSTAR APP',   location: 'Process Line 3',     installed: '2018-11-22', status: 'Broken Down' },
  { id: 'EQ-005', tag: 'P-410',  type: 'Pump',   make: 'Flowserve',    model: 'Durco Mark 3',  location: 'Effluent Treatment', installed: '2021-01-09', status: 'Operational' },
  { id: 'EQ-006', tag: 'P-511',  type: 'Pump',   make: 'Wilo',         model: 'IL 80/170-7.5', location: 'HVAC Chiller',       installed: '2022-05-30', status: 'Operational' },
  { id: 'EQ-007', tag: 'P-602',  type: 'Pump',   make: 'Grundfos',     model: 'CR 32-4',       location: 'RO Plant',           installed: '2020-02-14', status: 'In Maintenance' },
  { id: 'EQ-008', tag: 'B-201',  type: 'Blower', make: 'Atlas Copco',  model: 'ZS 55+',        location: 'Aeration Tank 1',    installed: '2019-09-18', status: 'Operational' },
  { id: 'EQ-009', tag: 'B-202',  type: 'Blower', make: 'Atlas Copco',  model: 'ZS 55+',        location: 'Aeration Tank 2',    installed: '2019-09-18', status: 'Broken Down' },
  { id: 'EQ-010', tag: 'B-305',  type: 'Blower', make: 'Kaeser',       model: 'EBS 410L',      location: 'Pneumatic Conveyor', installed: '2021-06-04', status: 'Operational' },
  { id: 'EQ-011', tag: 'B-410',  type: 'Blower', make: 'Howden',       model: 'Roots URAI-68', location: 'Dust Collection',    installed: '2018-04-20', status: 'In Maintenance' },
  { id: 'EQ-012', tag: 'B-501',  type: 'Blower', make: 'Aerzen',       model: 'GM 25S',        location: 'Bag Filter House',   installed: '2022-10-11', status: 'Operational' },
  { id: 'EQ-013', tag: 'P-705',  type: 'Pump',   make: 'KSB',          model: 'Megachem 65',   location: 'Chemical Dosing',    installed: '2020-12-05', status: 'Operational' },
  { id: 'EQ-014', tag: 'B-602',  type: 'Blower', make: 'Kaeser',       model: 'CBS 121',       location: 'Instrument Air',     installed: '2021-03-28', status: 'Operational' },
];

const SEED_LOGS = [
  // closed entries
  { id: 'L-001', equipmentId: 'EQ-001', reason: 'Scheduled',  startDate: '2026-02-10', etr: '2026-02-11', endDate: '2026-02-11', technician: 'A. Mehta',  notes: 'Mechanical seal replacement, alignment check.' },
  { id: 'L-002', equipmentId: 'EQ-003', reason: 'Breakdown',  startDate: '2026-01-22', etr: '2026-01-25', endDate: '2026-01-24', technician: 'R. Sharma', notes: 'Bearing failure on drive end. Replaced 6309 bearings.' },
  { id: 'L-003', equipmentId: 'EQ-008', reason: 'Scheduled',  startDate: '2026-03-05', etr: '2026-03-05', endDate: '2026-03-05', technician: 'S. Iyer',   notes: 'Oil change, intake filter replacement.' },
  { id: 'L-004', equipmentId: 'EQ-005', reason: 'Breakdown',  startDate: '2026-04-02', etr: '2026-04-04', endDate: '2026-04-03', technician: 'A. Mehta',  notes: 'Impeller erosion, replaced with hard-faced impeller.' },
  { id: 'L-005', equipmentId: 'EQ-010', reason: 'Scheduled',  startDate: '2026-04-15', etr: '2026-04-16', endDate: '2026-04-16', technician: 'R. Sharma', notes: 'Belt tensioning and inspection.' },
  // open entries (match current "In Maintenance" / "Broken Down")
  { id: 'L-006', equipmentId: 'EQ-002', reason: 'Scheduled',  startDate: '2026-05-10', etr: '2026-05-14', endDate: null, technician: 'A. Mehta',  notes: 'Annual overhaul — wear ring and seal replacement.' },
  { id: 'L-007', equipmentId: 'EQ-004', reason: 'Breakdown',  startDate: '2026-05-09', etr: '2026-05-16', endDate: null, technician: 'R. Sharma', notes: 'Motor winding burnt. Awaiting rewinding from vendor.' },
  { id: 'L-008', equipmentId: 'EQ-007', reason: 'Scheduled',  startDate: '2026-05-12', etr: '2026-05-13', endDate: null, technician: 'S. Iyer',   notes: 'Cartridge filter replacement, leak test.' },
  { id: 'L-009', equipmentId: 'EQ-009', reason: 'Breakdown',  startDate: '2026-05-11', etr: '2026-05-18', endDate: null, technician: 'A. Mehta',  notes: 'High vibration, gear box damaged. Spare being procured.' },
  { id: 'L-010', equipmentId: 'EQ-011', reason: 'Scheduled',  startDate: '2026-05-13', etr: '2026-05-15', endDate: null, technician: 'R. Sharma', notes: 'Roots blower lobe clearance check, oil change.' },
];

// ---------- Storage ----------
const LS_EQ = 'mm.equipment.v1';
const LS_LOG = 'mm.logs.v1';

function load() {
  if (!localStorage.getItem(LS_EQ))  localStorage.setItem(LS_EQ,  JSON.stringify(SEED_EQUIPMENT));
  if (!localStorage.getItem(LS_LOG)) localStorage.setItem(LS_LOG, JSON.stringify(SEED_LOGS));
  return {
    equipment: JSON.parse(localStorage.getItem(LS_EQ)),
    logs: JSON.parse(localStorage.getItem(LS_LOG)),
  };
}
function saveEq(e)  { localStorage.setItem(LS_EQ,  JSON.stringify(e)); }
function saveLog(l) { localStorage.setItem(LS_LOG, JSON.stringify(l)); }
function resetDemo() {
  localStorage.removeItem(LS_EQ);
  localStorage.removeItem(LS_LOG);
  route();
}

// ---------- Helpers ----------
const today = () => new Date().toISOString().slice(0,10);
const fmt = d => d ? d : '—';
const statusBadge = s => {
  const cls = s === 'Operational' ? 'badge-op' : s === 'In Maintenance' ? 'badge-mt' : 'badge-bd';
  return `<span class="badge ${cls}">${s}</span>`;
};
const reasonBadge = r => {
  const cls = r === 'Breakdown' ? 'badge-bd' : 'badge-mt';
  return `<span class="badge ${cls}">${r}</span>`;
};
function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}
function etrStatus(etr) {
  if (!etr) return { label: '—', cls: 'text-slate-500' };
  const d = daysBetween(today(), etr);
  if (d < 0)  return { label: `Overdue by ${-d}d`, cls: 'text-red-600 font-medium' };
  if (d === 0) return { label: 'Due today', cls: 'text-amber-600 font-medium' };
  return { label: `In ${d}d`, cls: 'text-slate-600' };
}
function eqById(id) { return state.equipment.find(e => e.id === id); }
function openLogFor(eqId) { return state.logs.find(l => l.equipmentId === eqId && !l.endDate); }

// ---------- State / routing ----------
let state = load();

const routes = [
  { hash: '#/dashboard', label: 'Dashboard' },
  { hash: '#/equipment', label: 'Equipment' },
  { hash: '#/log',       label: 'Maintenance Log' },
];

function renderNav() {
  const cur = location.hash || '#/dashboard';
  document.getElementById('nav').innerHTML = routes.map(r => {
    const active = cur.startsWith(r.hash);
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
  return renderDashboard();
}
window.addEventListener('hashchange', route);

// ---------- Dashboard ----------
function renderDashboard() {
  const eq = state.equipment;
  const total = eq.length;
  const op = eq.filter(e => e.status === 'Operational').length;
  const mt = eq.filter(e => e.status === 'In Maintenance').length;
  const bd = eq.filter(e => e.status === 'Broken Down').length;
  const down = eq.filter(e => e.status !== 'Operational');

  const card = (label, value, cls) => `
    <div class="bg-white rounded-xl border border-slate-200 p-5">
      <div class="text-xs uppercase tracking-wide text-slate-500">${label}</div>
      <div class="text-3xl font-semibold mt-1 ${cls||''}">${value}</div>
    </div>`;

  const downRows = down.map(e => {
    const log = openLogFor(e.id);
    const et = etrStatus(log?.etr);
    return `<tr class="border-t border-slate-100">
      <td class="py-2 pr-4"><a class="text-brand hover:underline" href="#/equipment/${e.id}">${e.tag}</a></td>
      <td class="py-2 pr-4">${e.type}</td>
      <td class="py-2 pr-4">${e.make} ${e.model}</td>
      <td class="py-2 pr-4">${e.location}</td>
      <td class="py-2 pr-4">${statusBadge(e.status)}</td>
      <td class="py-2 pr-4">${log ? reasonBadge(log.reason) : '—'}</td>
      <td class="py-2 pr-4">${fmt(log?.startDate)}</td>
      <td class="py-2 pr-4">${fmt(log?.etr)}</td>
      <td class="py-2 pr-4"><span class="${et.cls}">${et.label}</span></td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" class="py-6 text-center text-slate-500">All equipment operational.</td></tr>`;

  document.getElementById('view').innerHTML = `
    <h1 class="text-2xl font-semibold mb-1">Plant Maintenance Dashboard</h1>
    <p class="text-slate-500 mb-6">Live status of pumps and blowers across the plant.</p>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      ${card('Total Equipment', total)}
      ${card('Operational', op, 'text-green-700')}
      ${card('In Maintenance', mt, 'text-amber-600')}
      ${card('Broken Down', bd, 'text-red-600')}
    </div>

    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-slate-200 flex items-center">
        <div class="font-semibold">Currently out of service</div>
        <div class="ml-auto text-sm text-slate-500">${down.length} equipment</div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th class="py-2 px-4">Tag</th><th class="py-2 px-4">Type</th><th class="py-2 px-4">Make / Model</th>
              <th class="py-2 px-4">Location</th><th class="py-2 px-4">Status</th><th class="py-2 px-4">Reason</th>
              <th class="py-2 px-4">Start</th><th class="py-2 px-4">ETR</th><th class="py-2 px-4">ETR Status</th>
            </tr>
          </thead>
          <tbody>${downRows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ---------- Equipment list ----------
function renderEquipment() {
  const rows = state.equipment.map(e => {
    const log = openLogFor(e.id);
    const action = e.status === 'Operational'
      ? `<button class="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800 hover:bg-amber-200" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
      : `<button class="text-xs px-2 py-1 rounded bg-green-100 text-green-800 hover:bg-green-200" onclick="markOperational('${e.id}')">Mark Operational</button>`;
    return `<tr class="border-t border-slate-100 hover:bg-slate-50">
      <td class="py-2 px-4 font-medium"><a class="text-brand hover:underline" href="#/equipment/${e.id}">${e.tag}</a></td>
      <td class="py-2 px-4">${e.type}</td>
      <td class="py-2 px-4">${e.make}</td>
      <td class="py-2 px-4">${e.model}</td>
      <td class="py-2 px-4">${e.location}</td>
      <td class="py-2 px-4">${statusBadge(e.status)}</td>
      <td class="py-2 px-4">${log?.etr ? log.etr : '—'}</td>
      <td class="py-2 px-4 text-right">${action}</td>
    </tr>`;
  }).join('');

  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-4">
      <div>
        <h1 class="text-2xl font-semibold">Equipment</h1>
        <p class="text-slate-500 text-sm">Click an equipment tag to view its full maintenance history.</p>
      </div>
      <div class="ml-auto flex gap-2">
        <input id="eqSearch" placeholder="Filter by tag, make, location…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-64" oninput="filterEq(this.value)" />
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="eqTable">
          <thead class="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th class="py-2 px-4">Tag</th><th class="py-2 px-4">Type</th><th class="py-2 px-4">Make</th>
              <th class="py-2 px-4">Model</th><th class="py-2 px-4">Location</th><th class="py-2 px-4">Status</th>
              <th class="py-2 px-4">ETR</th><th class="py-2 px-4 text-right">Action</th>
            </tr>
          </thead>
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
    <div class="relative pl-6 pb-5 border-l-2 ${l.endDate ? 'border-slate-200' : 'border-amber-400'}">
      <div class="absolute -left-[7px] top-1 w-3 h-3 rounded-full ${l.endDate ? 'bg-slate-300' : 'bg-amber-400'}"></div>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        ${reasonBadge(l.reason)}
        <span class="text-slate-500">${l.startDate} → ${l.endDate || 'ongoing'}</span>
        ${l.endDate ? `<span class="text-xs text-slate-400">(${daysBetween(l.startDate, l.endDate)} day${daysBetween(l.startDate,l.endDate)===1?'':'s'})</span>` : `<span class="text-xs text-amber-700">ETR ${l.etr || '—'}</span>`}
      </div>
      <div class="text-sm text-slate-700 mt-1">${l.notes}</div>
      <div class="text-xs text-slate-500 mt-1">Technician: ${l.technician}</div>
    </div>
  `).join('') || `<div class="text-slate-500 text-sm">No maintenance history yet.</div>`;

  const actionBtn = e.status === 'Operational'
    ? `<button class="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm" onclick="openMaintModal('${e.id}')">Put in Maintenance</button>`
    : `<button class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm" onclick="markOperational('${e.id}')">Mark Operational</button>`;

  document.getElementById('view').innerHTML = `
    <a href="#/equipment" class="text-sm text-brand hover:underline">&larr; Back to equipment</a>
    <div class="bg-white rounded-xl border border-slate-200 p-6 mt-3 mb-6">
      <div class="flex items-start">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold">${e.tag}</h1>
            ${statusBadge(e.status)}
          </div>
          <div class="text-slate-500 text-sm mt-1">${e.type} · ${e.make} ${e.model}</div>
        </div>
        <div class="ml-auto">${actionBtn}</div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div><div class="text-xs uppercase text-slate-500">Location</div><div>${e.location}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Installed</div><div>${e.installed}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Current ETR</div><div>${open?.etr || '—'}</div></div>
        <div><div class="text-xs uppercase text-slate-500">Equipment ID</div><div>${e.id}</div></div>
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
        <select id="fType" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm" onchange="renderLogRows()">
          <option value="">All types</option><option>Pump</option><option>Blower</option>
        </select>
        <select id="fReason" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm" onchange="renderLogRows()">
          <option value="">All reasons</option><option>Scheduled</option><option>Breakdown</option>
        </select>
        <select id="fStatus" class="border border-slate-300 rounded-md px-2 py-1.5 text-sm" onchange="renderLogRows()">
          <option value="">All statuses</option><option value="open">Ongoing</option><option value="closed">Completed</option>
        </select>
        <input id="fSearch" placeholder="Search…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-48" oninput="renderLogRows()" />
        <button onclick="exportXLSX()" class="px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm">Export Excel</button>
        <button onclick="exportPDF()" class="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm">Export PDF</button>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th class="py-2 px-4">Tag</th><th class="py-2 px-4">Type</th><th class="py-2 px-4">Make / Model</th>
              <th class="py-2 px-4">Reason</th><th class="py-2 px-4">Start</th><th class="py-2 px-4">ETR</th>
              <th class="py-2 px-4">End</th><th class="py-2 px-4">Duration</th>
              <th class="py-2 px-4">Technician</th><th class="py-2 px-4">Notes</th>
            </tr>
          </thead>
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
      if (fType && e.type !== fType) return false;
      if (fReason && l.reason !== fReason) return false;
      if (fStatus === 'open' && l.endDate) return false;
      if (fStatus === 'closed' && !l.endDate) return false;
      if (fSearch) {
        const blob = `${e.tag} ${e.make} ${e.model} ${e.location} ${l.notes} ${l.technician}`.toLowerCase();
        if (!blob.includes(fSearch)) return false;
      }
      return true;
    })
    .sort((a,b) => b.l.startDate.localeCompare(a.l.startDate));
}

function renderLogRows() {
  const data = getFilteredLogs();
  const rows = data.map(({l, e}) => {
    const dur = l.endDate ? `${daysBetween(l.startDate, l.endDate)}d` : `<span class="text-amber-600">ongoing</span>`;
    return `<tr class="border-t border-slate-100">
      <td class="py-2 px-4"><a class="text-brand hover:underline" href="#/equipment/${e.id}">${e.tag}</a></td>
      <td class="py-2 px-4">${e.type}</td>
      <td class="py-2 px-4">${e.make} ${e.model}</td>
      <td class="py-2 px-4">${reasonBadge(l.reason)}</td>
      <td class="py-2 px-4">${l.startDate}</td>
      <td class="py-2 px-4">${l.etr || '—'}</td>
      <td class="py-2 px-4">${l.endDate || '—'}</td>
      <td class="py-2 px-4">${dur}</td>
      <td class="py-2 px-4">${l.technician}</td>
      <td class="py-2 px-4 max-w-xs truncate" title="${l.notes.replace(/"/g,'&quot;')}">${l.notes}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="10" class="py-6 text-center text-slate-500">No log entries match your filters.</td></tr>`;
  document.getElementById('logRows').innerHTML = rows;
}

// ---------- Exports ----------
function exportRows() {
  return getFilteredLogs().map(({l, e}) => ({
    Tag: e.tag, Type: e.type, Make: e.make, Model: e.model, Location: e.location,
    Reason: l.reason, Start: l.startDate, ETR: l.etr || '', End: l.endDate || '',
    'Duration (days)': l.endDate ? daysBetween(l.startDate, l.endDate) : '',
    Status: l.endDate ? 'Completed' : 'Ongoing',
    Technician: l.technician, Notes: l.notes,
  }));
}
function exportXLSX() {
  const ws = XLSX.utils.json_to_sheet(exportRows());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Maintenance Log');
  XLSX.writeFile(wb, `maintenance-log-${today()}.xlsx`);
}
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text('Maintenance Log', 14, 14);
  doc.setFontSize(9);
  doc.text(`Generated ${today()}`, 14, 20);
  const rows = exportRows();
  const cols = Object.keys(rows[0] || { Tag:'' });
  doc.autoTable({
    head: [cols],
    body: rows.map(r => cols.map(c => r[c])),
    startY: 26, styles: { fontSize: 7 }, headStyles: { fillColor: [25,52,88] },
  });
  doc.save(`maintenance-log-${today()}.pdf`);
}

// ---------- Mutations ----------
function openMaintModal(eqId) {
  const e = eqById(eqId);
  document.getElementById('modalTitle').textContent = `Put ${e.tag} in maintenance`;
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="submitMaint(event, '${eqId}')" class="space-y-3 text-sm">
      <div>
        <label class="block text-xs text-slate-600 mb-1">Reason</label>
        <select name="reason" class="w-full border border-slate-300 rounded-md px-2 py-1.5">
          <option>Scheduled</option><option>Breakdown</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-slate-600 mb-1">Start date</label>
          <input type="date" name="startDate" value="${today()}" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
        <div>
          <label class="block text-xs text-slate-600 mb-1">Expected return (ETR)</label>
          <input type="date" name="etr" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Technician</label>
        <input name="technician" required class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="e.g. A. Mehta" />
      </div>
      <div>
        <label class="block text-xs text-slate-600 mb-1">Notes</label>
        <textarea name="notes" rows="3" class="w-full border border-slate-300 rounded-md px-2 py-1.5" placeholder="Work scope, parts needed…"></textarea>
      </div>
      <div class="flex gap-2 justify-end pt-2">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white">Confirm</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function submitMaint(ev, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const log = {
    id: 'L-' + Date.now(),
    equipmentId: eqId,
    reason: f.get('reason'),
    startDate: f.get('startDate'),
    etr: f.get('etr'),
    endDate: null,
    technician: f.get('technician'),
    notes: f.get('notes') || '',
  };
  state.logs.unshift(log);
  const e = eqById(eqId);
  e.status = log.reason === 'Breakdown' ? 'Broken Down' : 'In Maintenance';
  saveLog(state.logs); saveEq(state.equipment);
  closeModal(); route();
}

function markOperational(eqId) {
  const log = openLogFor(eqId);
  if (log) log.endDate = today();
  const e = eqById(eqId);
  e.status = 'Operational';
  saveLog(state.logs); saveEq(state.equipment);
  route();
}

// ---------- Boot ----------
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all data back to the seed demo?')) resetDemo();
});
if (!location.hash) location.hash = '#/dashboard';
route();
