// ---------- Seed data ----------
const SEED_PLANTS = [
  { id: 'PL-01', name: 'Adani Mumbai',       location: 'Mumbai, MH',     notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','sms'], operational:[], overdue:['email'] }) },
  { id: 'PL-02', name: 'Hindalco Mahaan',    location: 'Singrauli, MP',  notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','whatsapp'], operational:[], overdue:['email','sms'] }) },
  { id: 'PL-03', name: 'Tata Jamshedpur',    location: 'Jamshedpur, JH', notifications: defaultNotifConfig({ maintenance:[], breakdown:['email'], operational:[], overdue:['email'] }) },
  { id: 'PL-04', name: 'Reliance Jamnagar',  location: 'Jamnagar, GJ',   notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','sms'], operational:['email'], overdue:['email','sms'] }) },
  { id: 'PL-05', name: 'Ireo Grandarch STP', location: 'Gurugram, HR',   notifications: defaultNotifConfig({ maintenance:['email'], breakdown:['email','whatsapp','sms'], operational:[], overdue:['email','whatsapp'] }) },
];
function defaultNotifConfig(prefs = {}) {
  const make = (ch, recips) => ({ enabled: (ch||[]).length > 0, channels: ch || [], recipients: recips || (ch && ch.length ? ['U-4','U-5'] : []) });
  return {
    maintenance: make(prefs.maintenance, prefs.maintenanceTo),
    breakdown:   make(prefs.breakdown,   prefs.breakdownTo),
    operational: make(prefs.operational, prefs.operationalTo),
    overdue:     make(prefs.overdue,     prefs.overdueTo),
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

  // ---- Ireo Grandarch STP (imported from PPM list) ----
  // Pumps (32)
  { id: 'EQ-101', tag: 'Raw Submersible Pump-1',              type: 'Pump',      make: 'KSB',           model: '4.2 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-102', tag: 'Raw Submersible Pump-2',              type: 'Pump',      make: 'KSB',           model: '4.2 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-103', tag: 'Raw Sewage Monobloc Pump-1 (Small)',  type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-104', tag: 'Raw Sewage Monobloc Pump-2 (Small)',  type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-105', tag: 'Raw Sewage Monobloc Pump-3 (Small)',  type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-106', tag: 'Raw Sewage Monobloc Pump-4 (Big)',    type: 'Pump',      make: 'Kirloskar',     model: '3 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-107', tag: 'Raw Sewage Monobloc Pump-5 (Big)',    type: 'Pump',      make: 'Kirloskar',     model: '3 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-108', tag: 'Equalization Bypass Pump',            type: 'Pump',      make: 'Kirloskar',     model: '10 HP',   plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-109', tag: 'Sludge Recirculation Pump-1 (Str-1)', type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-110', tag: 'Sludge Recirculation Pump-2 (Str-2)', type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-111', tag: 'Filter Feed Pump-1',                  type: 'Pump',      make: 'Grundfos-X',    model: '10 HP',   plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-112', tag: 'Filter Feed Pump-2',                  type: 'Pump',      make: 'Grundfos-X',    model: '10 HP',   plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-113', tag: 'CCT Bypass Pump-1',                   type: 'Pump',      make: 'Kirloskar',     model: '5 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-114', tag: 'CCT Bypass Pump-2',                   type: 'Pump',      make: 'Kirloskar',     model: '5 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-115', tag: 'High Rise Pump-1',                    type: 'Pump',      make: 'Grundfos-X',    model: '18.5 kW', plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-116', tag: 'High Rise Pump-2',                    type: 'Pump',      make: 'Grundfos-X',    model: '18.5 kW', plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-117', tag: 'High Rise Pump-3',                    type: 'Pump',      make: 'Grundfos-X',    model: '18.5 kW', plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-118', tag: 'Low Rise Pump-1',                     type: 'Pump',      make: 'Grundfos-X',    model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-119', tag: 'Low Rise Pump-2',                     type: 'Pump',      make: 'Grundfos-X',    model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-120', tag: 'Low Rise Pump-3',                     type: 'Pump',      make: 'Grundfos-X',    model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-121', tag: 'Softener Feed Pump-1',                type: 'Pump',      make: 'Grundfos-X',    model: '3 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-122', tag: 'Softener Feed Pump-2',                type: 'Pump',      make: 'Grundfos-X',    model: '3 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-123', tag: 'Softener Transfer Pump-1',            type: 'Pump',      make: 'Crompton',      model: '5.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-124', tag: 'Softener Transfer Pump-2',            type: 'Pump',      make: 'Crompton',      model: '5.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-125', tag: 'TWT Garden Pump-1',                   type: 'Pump',      make: 'Crompton',      model: '5.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-126', tag: 'TWT Garden Pump-2',                   type: 'Pump',      make: 'Crompton',      model: '5.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-127', tag: 'TWT Garden Pump-3',                   type: 'Pump',      make: 'Crompton',      model: '5.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-128', tag: 'Centrifuge Feed Pump-1',              type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-129', tag: 'Centrifuge Feed Pump-2',              type: 'Pump',      make: 'Kirloskar',     model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-130', tag: 'Sump Pit Pump',                       type: 'Pump',      make: '',              model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-131', tag: 'Chlorine Dosing Pump',                type: 'Pump',      make: 'Milton Roy',    model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-132', tag: 'Drain Pit Pump',                      type: 'Pump',      make: '',              model: '1 HP',    plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  // Blowers (6)
  { id: 'EQ-133', tag: 'Air Blower-1',                        type: 'Blower',    make: 'Beta Machinery',model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-134', tag: 'Air Blower-2',                        type: 'Blower',    make: 'Beta Machinery',model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-135', tag: 'Air Blower-3',                        type: 'Blower',    make: 'Beta Machinery',model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-136', tag: 'Air Blower-4',                        type: 'Blower',    make: 'Beta Machinery',model: '7.5 kW',  plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-137', tag: 'Sludge Recirc. Air Lifting-1 (Str-1)',type: 'Blower',    make: 'Via Blower',    model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-138', tag: 'Sludge Recirc. Air Lifting-2 (Str-2)',type: 'Blower',    make: 'Via Blower',    model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  // Filters & Treatment Units (5)
  { id: 'EQ-139', tag: 'MGF (Multi-Grade Filter)',            type: 'Filter',    make: '',              model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-140', tag: 'ACF-1 (Activated Carbon Filter)',     type: 'Filter',    make: 'Floysis',       model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-141', tag: 'ACF-2 (Activated Carbon Filter)',     type: 'Filter',    make: 'Floysis',       model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-142', tag: 'Centrifuge',                          type: 'Centrifuge',make: '',              model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
  { id: 'EQ-143', tag: 'UV System',                           type: 'UV System', make: '',              model: '',        plantId: 'PL-05', location: '', installed: '2025-04-01', status: 'Operational' },
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

// ---------- Generated PPM logs for Ireo Grandarch (from PPM schedule) ----------
const IREO_SLOTS = {
  'EQ-101':'W1','EQ-102':'W3','EQ-103':'W1','EQ-104':'W2','EQ-105':'W3',
  'EQ-106':'W1','EQ-107':'W2','EQ-108':'W1','EQ-109':'W1','EQ-110':'W3',
  'EQ-111':'W1','EQ-112':'W2','EQ-113':'W1','EQ-114':'W3','EQ-115':'W1',
  'EQ-116':'W2','EQ-117':'W3','EQ-118':'W1','EQ-119':'W2','EQ-120':'W3',
  'EQ-121':'W1','EQ-122':'W2','EQ-123':'W2','EQ-124':'W4','EQ-125':'W1',
  'EQ-126':'W2','EQ-127':'W3','EQ-128':'W1','EQ-129':'W3','EQ-130':'W2',
  'EQ-131':'W3','EQ-132':'W4',
  'EQ-133':'W1','EQ-134':'W2','EQ-135':'W3','EQ-136':'W4',
  'EQ-137':'weekly','EQ-138':'weekly',
  'EQ-139':'W1','EQ-140':'W2','EQ-141':'W3','EQ-142':'W2','EQ-143':'W4',
};
const PPM_NOTES = {
  Pump:       { sched: 'Monthly PPM — vibration, leak and seal check.',  done: 'Bearings greased, alignment verified, no abnormalities.' },
  Blower:     { sched: 'Weekly PPM — oil and filter inspection.',         done: 'Oil level normal, intake filter cleaned.' },
  Filter:     { sched: 'Monthly PPM — media inspection / backwash check.', done: 'Backwash performed; differential pressure within limits.' },
  Centrifuge: { sched: 'Monthly PPM — bowl and scroll inspection.',       done: 'Bowl cleaned; vibration normal.' },
  'UV System':{ sched: 'Monthly PPM — lamp intensity and quartz sleeve.', done: 'Quartz sleeve cleaned; intensity within spec.' },
};
function generatePastPPMLogs(slotsMap, equipmentList, idPrefix) {
  const SLOT_DAY = { W1: 4, W2: 11, W3: 18, W4: 25 };
  const TECHS = ['A. Mehta','R. Sharma','S. Iyer','P. Kulkarni'];
  const NOW = new Date();
  const yearStart = new Date('2026-01-01');
  const fmt = (d) => d.toISOString().slice(0,10);
  const out = [];
  let seq = 0;
  const eqMap = Object.fromEntries(equipmentList.map(e => [e.id, e]));
  for (const [eqId, slot] of Object.entries(slotsMap)) {
    const eq = eqMap[eqId]; if (!eq) continue;
    const noteSet = PPM_NOTES[eq.type] || PPM_NOTES.Pump;
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
const LS_EQ = 'mm.equipment.v4';
const LS_LOG = 'mm.logs.v4';
const LS_PLANT = 'mm.plants.v4';
const LS_USERS = 'mm.users.v1';
const LS_SLOTS = 'mm.slots.v1';

function load() {
  if (!localStorage.getItem(LS_EQ))    localStorage.setItem(LS_EQ,    JSON.stringify(SEED_EQUIPMENT));
  if (!localStorage.getItem(LS_SLOTS)) localStorage.setItem(LS_SLOTS, JSON.stringify(IREO_SLOTS));
  if (!localStorage.getItem(LS_LOG))   localStorage.setItem(LS_LOG,   JSON.stringify(SEED_LOGS.concat(generatePastPPMLogs(IREO_SLOTS, SEED_EQUIPMENT, 'PPM'))));
  if (!localStorage.getItem(LS_PLANT)) localStorage.setItem(LS_PLANT, JSON.stringify(SEED_PLANTS));
  if (!localStorage.getItem(LS_USERS)) localStorage.setItem(LS_USERS, JSON.stringify(SEED_USERS));
  return {
    equipment: JSON.parse(localStorage.getItem(LS_EQ)),
    logs:      JSON.parse(localStorage.getItem(LS_LOG)),
    plants:    JSON.parse(localStorage.getItem(LS_PLANT)),
    users:     JSON.parse(localStorage.getItem(LS_USERS)),
    slots:     JSON.parse(localStorage.getItem(LS_SLOTS)),
  };
}
const saveEq    = e => localStorage.setItem(LS_EQ,    JSON.stringify(e));
const saveLog   = l => localStorage.setItem(LS_LOG,   JSON.stringify(l));
const saveSlots = s => localStorage.setItem(LS_SLOTS, JSON.stringify(s));
const savePlant = p => localStorage.setItem(LS_PLANT, JSON.stringify(p));
function resetDemo() { [LS_EQ, LS_LOG, LS_PLANT, LS_USERS, LS_SLOTS].forEach(k => localStorage.removeItem(k)); route(); }

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
  return `<a class="tag-chip" href="#/equipment/${e.id}">${e.tag}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></a>`;
}

// ---------- State / routing / filters ----------
let state = load();
const ui = { plantFilter: 'all', typeFilter: 'all', dashStatusFilter: 'all', engineerTab: 'pending', visitFilter: 'all', visitFrom: '', visitTo: '' };
const EQ_TYPES = ['Pump','Blower','Filter','Centrifuge','UV System'];

const routes = [
  { hash: '#/dashboard', label: 'Dashboard' },
  { hash: '#/equipment', label: 'Equipment' },
  { hash: '#/log',       label: 'Maintenance Log' },
  { hash: '#/engineer',  label: 'Engineering Corner' },
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
  if (h === '#/engineer')  return renderEngineer();
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
function applyTypeFilter(eq)  { return ui.typeFilter  === 'all' ? eq : eq.filter(e => e.type      === ui.typeFilter);  }
function typeFilterControl() {
  const opts = ['<option value="all">All types</option>'].concat(
    EQ_TYPES.map(t => `<option value="${t}" ${ui.typeFilter===t?'selected':''}>${t}</option>`)
  ).join('');
  return `<select onchange="ui.typeFilter=this.value; route()" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white">${opts}</select>`;
}
function addEquipmentBtn() {
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
        ${typeFilterControl()}
        ${addEquipmentBtn()}
      </div>
    </div>
    <p class="text-slate-500 mb-6">Live status of plant equipment. Click any card below to filter the table.</p>

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
  const eq = applyTypeFilter(applyPlantFilter(state.equipment));
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
      <div class="text-sm text-slate-700 mt-1"><span class="font-medium">Reason:</span> ${l.notes || '—'}</div>
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
          <button onclick="openEditEquipmentModal('${e.id}')" class="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium inline-flex items-center gap-1" title="Edit equipment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            Edit
          </button>
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
    <div class="flex items-center mb-4 gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-semibold">Maintenance Log</h1>
        <p class="text-slate-500 text-sm">Full history across all equipment.</p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <button onclick="openServiceReportModal()" class="px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 text-sm font-medium">Service Report</button>
        ${exportDropdown('', 'log-export')}
      </div>
    </div>
    <div class="flex items-center mb-4 gap-2 flex-nowrap overflow-x-auto pb-1">
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
      <input id="fSearch" placeholder="Search…" class="border border-slate-300 rounded-md px-3 py-1.5 text-sm w-48 flex-shrink-0 ml-auto" oninput="renderLogRows()" />
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
  const fFrom = document.getElementById('fFrom')?.value || '';
  const fTo   = document.getElementById('fTo')?.value   || '';
  const fTech = document.getElementById('fTech')?.value || '';
  return state.logs
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(({l, e}) => {
      if (!e) return false;
      if (ui.plantFilter !== 'all' && e.plantId !== ui.plantFilter) return false;
      if (fType && e.type !== fType) return false;
      if (fReason && l.reason !== fReason) return false;
      if (fStatus === 'open' && l.endDate) return false;
      if (fStatus === 'closed' && !l.endDate) return false;
      if (fFrom && l.startDate < fFrom) return false;
      if (fTo   && l.startDate > fTo)   return false;
      if (fTech && l.technician !== fTech) return false;
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
    return `<tr>
      <td><div class="cell-primary">${p.name}</div><div class="cell-secondary">${p.location}</div></td>
      <td><div class="cell-primary">${eqCount}</div><div class="cell-muted">equipment</div></td>
      <td class="col-center"><button onclick="openPlantNotifModal('${p.id}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Configure Notifications</button></td>
    </tr>`;
  }).join('');
  document.getElementById('view').innerHTML = `
    <div class="flex items-center mb-1 flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Plants</h1>
        <p class="text-slate-500 text-sm mt-1">Per-plant notification settings and admin actions.</p>
      </div>
      <div class="ml-auto">
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

window._recipState = {};
function renderRecipPicker(eventKey) {
  const ids = window._recipState[eventKey] || [];
  const chips = ids.map(uid => {
    const u = state.users.find(x => x.id === uid); if (!u) return '';
    return `<span class="recip-chip">${u.name}<button type="button" onclick="removeRecipient('${eventKey}','${uid}')" aria-label="Remove ${u.name}">&times;</button></span>`;
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
        <span class="pd-name">${u.name}</span>
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

function savePlantNotif(ev, plantId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const p = plantById(plantId);
  NOTIF_EVENTS.forEach(evt => {
    p.notifications[evt.key].enabled    = !!f.get(`${evt.key}.enabled`);
    p.notifications[evt.key].channels   = CHANNELS.filter(ch => f.get(`${evt.key}.${ch}`));
    p.notifications[evt.key].recipients = (window._recipState[evt.key] || []).slice();
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
  return state.logs
    .filter(l => !l.endDate)
    .map(l => ({ l, e: eqById(l.equipmentId) }))
    .filter(x => x.e)
    .sort((a,b) => a.l.startDate.localeCompare(b.l.startDate));
}

function getUpcomingPPM(days = 30) {
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const horizon = new Date(now); horizon.setDate(horizon.getDate() + days);
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e) continue;
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

function getOverduePPM() {
  // PPM slots whose date is in the past but no completion log exists at-or-after that date in this month.
  const todayStr = today();
  const now = new Date(todayStr + 'T00:00:00');
  const out = [];
  for (const [eqId, slot] of Object.entries(state.slots || {})) {
    const e = eqById(eqId); if (!e) continue;
    if (slot === 'weekly') continue; // weekly noise — skip from "overdue"
    const day = SLOT_DAY[slot];
    const m = now.getMonth(), y = now.getFullYear();
    const slotDate = new Date(y, m, day);
    if (slotDate >= now) continue; // not yet due
    const slotStr = slotDate.toISOString().slice(0,10);
    const monthPrefix = slotStr.slice(0,7);
    const done = state.logs.some(l => l.equipmentId === eqId && l.endDate && l.endDate.startsWith(monthPrefix));
    if (!done) out.push({ e, date: slotDate, slot: `Monthly · ${slot}` });
  }
  return out.sort((a,b) => a.date - b.date);
}

function getVisits() {
  // Group completed logs by endDate (= visit day)
  const map = new Map();
  for (const l of state.logs) {
    if (!l.endDate) continue;
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
    <button onclick="ui.engineerTab='${key}'; renderEngineer()"
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
      <h1 class="text-2xl font-semibold">Engineering Corner</h1>
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
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${e.make} ${e.model}</div></td>
      <td><div class="cell-primary">${l.reason}</div><div class="cell-muted">Tech: ${l.technician}</div></td>
      <td><div class="cell-primary">${l.startDate}</div><div class="cell-muted">Expected: ${l.etr||'—'}</div></td>
      <td><span class="${et.cls}">${et.label}</span></td>
      <td class="col-center"><button onclick="openCompleteModal('${e.id}')" class="text-xs px-3 py-1.5 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 font-medium">Mark Complete</button></td>
    </tr>`;
  }).join('');

  const todayD = new Date(today() + 'T00:00:00');
  const overdueRows = fOverdue.map(({e, date, slot}) => {
    const ds = date.toISOString().slice(0,10);
    const overdueBy = Math.round((todayD - date) / 86400000);
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${e.make} ${e.model}</div></td>
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
        <thead><tr><th>Equipment</th><th>Type / Model</th><th>Reason</th><th>Start / Expected</th><th>ETR Status</th><th class="col-center">Action</th></tr></thead>
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
  const fmtD = (d) => d.toISOString().slice(0,10);
  const todayStr = today();
  const rows = filtered.map(({ e, date, slot }) => {
    const ds = fmtD(date);
    const isToday = ds === todayStr;
    const daysAway = Math.round((date - new Date(todayStr + 'T00:00:00')) / 86400000);
    const dueLabel = isToday ? `<span class="badge badge-mt">Due today</span>` : `<span class="badge badge-brand">In ${daysAway}d</span>`;
    return `<tr>
      <td><div class="cell-primary">${tagLink(e)}</div><div class="cell-secondary">${plantName(e.plantId)}</div></td>
      <td><div class="cell-primary">${e.type}</div><div class="cell-muted">${e.make} ${e.model}</div></td>
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
  return { from: start.toISOString().slice(0,10), to: todayStr };
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
      <td class="col-center"><button onclick="generateVisitReport('${v.date}')" class="text-xs px-3 py-1.5 rounded-md border border-brand bg-brand-50 text-brand hover:bg-brand-100 font-medium">Generate Report</button></td>
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

function generateVisitReport(date) {
  const logs = state.logs.filter(l => l.endDate === date);
  if (!logs.length) { alert('No completed tasks on this date.'); return; }
  const equipment = [...new Set(logs.map(l => l.equipmentId))].map(eqById).filter(Boolean);
  const plants = [...new Set(equipment.map(e => e.plantId))].map(plantById).filter(Boolean);
  const technicians = [...new Set(logs.map(l => l.technician))];

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
  const cW = (W - 28) / 3;
  const sig = (label, name, role, x) => {
    doc.setFont(undefined,'bold'); doc.text(label, x, y);
    doc.setFont(undefined,'normal');
    doc.setDrawColor(160,160,160); doc.line(x, y + 16, x + cW - 6, y + 16);
    doc.setFontSize(9); doc.text(name, x, y + 21);
    doc.setFontSize(7); doc.setTextColor(120,120,120);
    doc.text(role, x, y + 25);
    doc.text(`Date: ${date}`, x, y + 29);
    doc.setFontSize(9); doc.setTextColor(15,23,42);
  };
  sig('Service Engineer', technicians[0] || 'A. Mehta', 'Field Service', 14);
  sig('Maintenance Lead', 'P. Kulkarni',                'Plant Maintenance Lead', 14 + cW);
  sig('Customer',         `${plants[0] ? plants[0].name : 'Client'} Representative`, 'Authorised Signatory', 14 + 2*cW);

  doc.setFontSize(7); doc.setTextColor(140,140,140);
  doc.text('This visit report is system-generated from completed maintenance log entries.', 14, doc.internal.pageSize.getHeight() - 8);

  doc.save(`visit-report-${date}.pdf`);
}

// ---------- Service Report ----------
function openServiceReportModal() {
  const plantGroups = state.plants.map(p => {
    const eqs = state.equipment.filter(e => e.plantId === p.id);
    if (!eqs.length) return '';
    const items = eqs.map(e => `
      <label class="flex items-center gap-2 text-xs px-2 py-1 hover:bg-slate-50 rounded">
        <input type="checkbox" name="sr-eq" value="${e.id}" />
        <span class="font-medium text-slate-800">${e.tag}</span>
        <span class="text-slate-500">· ${e.type}${e.make?' · '+e.make:''}</span>
      </label>`).join('');
    return `<div class="border border-slate-200 rounded-lg p-2">
      <div class="flex items-center gap-2 mb-1 px-1">
        <input type="checkbox" onchange="toggleGroupCheck(this, '${p.id}')" />
        <span class="text-xs font-semibold text-slate-700">${p.name}</span>
        <span class="text-xs text-slate-400">(${eqs.length})</span>
      </div>
      <div data-plant="${p.id}" class="grid grid-cols-2 gap-x-2">${items}</div>
    </div>`;
  }).join('');

  document.getElementById('modalTitle').textContent = 'Generate Service Report';
  document.getElementById('modalBody').innerHTML = `
    <form onsubmit="generateServiceReport(event)" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-sm">
      <div>
        <div class="text-sm font-medium mb-1">Reporting period</div>
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
          <div class="col-span-2"><label class="block text-xs text-slate-600 mb-1">Customer / client representative</label><input name="customer" placeholder="Customer name (optional)" class="w-full border border-slate-300 rounded-md px-2 py-1.5" /></div>
        </div>
      </div>
      <div>
        <div class="text-sm font-medium mb-1">Equipment <span class="text-xs text-slate-500 font-normal">(select one or more)</span></div>
        <div class="space-y-2">${plantGroups}</div>
      </div>
      <div class="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button type="button" onclick="closeModal()" class="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700">Cancel</button>
        <button class="px-3 py-1.5 rounded-md bg-brand hover:bg-brand-800 text-white">Generate PDF</button>
      </div>
    </form>
  `;
  document.getElementById('modal').classList.remove('hidden');
}
function toggleGroupCheck(master, plantId) {
  const wrap = document.querySelector(`[data-plant="${plantId}"]`);
  wrap.querySelectorAll('input[name="sr-eq"]').forEach(cb => cb.checked = master.checked);
}
function generateServiceReport(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const ids = f.getAll('sr-eq');
  if (!ids.length) { alert('Please select at least one equipment.'); return; }
  const from = f.get('from') || '';
  const to   = f.get('to')   || today();
  const preparedBy = f.get('preparedBy') || '';
  const approvedBy = f.get('approvedBy') || '';
  const customer   = f.get('customer')   || '';

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(25,52,88);
  doc.rect(0, 0, W, 22, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(16); doc.text('Maintenance Service Report', 14, 14);
  doc.setFontSize(9);  doc.text(`Generated ${today()}`, W - 14, 14, { align: 'right' });
  doc.setTextColor(15,23,42);

  let y = 30;
  doc.setFontSize(10);
  doc.text(`Period:  ${from || '—'}  to  ${to}`, 14, y); y += 6;
  doc.text(`Equipment count:  ${ids.length}`, 14, y); y += 6;
  if (preparedBy) { doc.text(`Prepared by:  ${preparedBy}`, 14, y); y += 6; }
  if (approvedBy) { doc.text(`Approved by:  ${approvedBy}`, 14, y); y += 6; }
  if (customer)   { doc.text(`Customer:  ${customer}`, 14, y); y += 6; }
  y += 2;

  // Per-equipment section
  ids.forEach((eqId, idx) => {
    const eq = eqById(eqId); if (!eq) return;
    const plant = plantById(eq.plantId);
    let logs = state.logs.filter(l => l.equipmentId === eqId);
    if (from) logs = logs.filter(l => l.startDate >= from);
    if (to)   logs = logs.filter(l => l.startDate <= to);
    logs.sort((a,b) => a.startDate.localeCompare(b.startDate));

    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFillColor(241,244,249);
    doc.rect(14, y - 4, W - 28, 8, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(`${idx + 1}. ${eq.tag}`, 16, y + 1);
    doc.setFont(undefined, 'normal'); doc.setFontSize(8);
    doc.text(`${eq.type} · ${eq.make || '—'} ${eq.model || ''} · ${plant ? plant.name : ''}`, W - 16, y + 1, { align: 'right' });
    y += 8;

    if (!logs.length) {
      doc.setFontSize(9); doc.setTextColor(120,120,120);
      doc.text('No maintenance activity in this period.', 16, y + 4);
      doc.setTextColor(15,23,42);
      y += 10;
    } else {
      doc.autoTable({
        startY: y,
        head: [['Date', 'Reason', 'Duration', 'Technician', 'Work performed']],
        body: logs.map(l => [
          l.startDate + (l.endDate && l.endDate !== l.startDate ? ' → '+l.endDate : ''),
          l.reason,
          l.endDate ? `${daysBetween(l.startDate, l.endDate)}d` : 'ongoing',
          l.technician,
          l.completionNotes || l.notes || ''
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [25,52,88], textColor: 255 },
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
  const colW = (W - 28) / 3;
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
  sigBlock('Customer',    customer,   14 + 2 * colW);

  closeModal();
  doc.save(`service-report-${today()}.pdf`);
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
        <div class="mt-1"><span class="font-medium">Reason:</span> ${log.notes||'—'}</div>
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
  const wantReport = (ev.submitter && ev.submitter.value === 'confirm-report');
  closeModal(); route();
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

  // Sign-off (dummy)
  if (y > 230) { doc.addPage(); y = 24; }
  doc.setFontSize(11); doc.setFont(undefined,'bold'); doc.text('Sign-off', 14, y); y += 5;
  doc.setDrawColor(220,225,232); doc.line(14, y, W-14, y); y += 12;
  doc.setFontSize(9); doc.setFont(undefined,'normal');
  const cW = (W - 28) / 3;
  const sig = (label, name, role, x) => {
    doc.setFont(undefined,'bold'); doc.text(label, x, y);
    doc.setFont(undefined,'normal');
    doc.setDrawColor(160,160,160); doc.line(x, y + 16, x + cW - 6, y + 16);
    doc.setFontSize(9); doc.text(name, x, y + 21);
    doc.setFontSize(7); doc.setTextColor(120,120,120);
    doc.text(role, x, y + 25);
    doc.text(`Date: ${log.endDate}`, x, y + 29);
    doc.setFontSize(9); doc.setTextColor(15,23,42);
  };
  sig('Prepared by', log.technician || 'A. Mehta',  'Maintenance Technician',  14);
  sig('Approved by', 'P. Kulkarni',                  'Maintenance Lead',        14 + cW);
  sig('Customer',    `${plant ? plant.name : 'Client'} Representative`, 'Authorised Signatory', 14 + 2*cW);

  // Footer
  doc.setFontSize(7); doc.setTextColor(140,140,140);
  doc.text('This is a system-generated service report. Signatures above attest to the work described.', 14, doc.internal.pageSize.getHeight() - 8);

  doc.save(`service-report-${eq.tag.replace(/[^a-zA-Z0-9]+/g,'-')}-${log.endDate}.pdf`);
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
function submitEquipmentForm(ev, mode, eqId) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  if (mode === 'edit') {
    const e = eqById(eqId); if (!e) return;
    e.tag = f.get('tag'); e.type = f.get('type');
    e.make = f.get('make') || ''; e.model = f.get('model') || '';
    e.plantId = f.get('plantId');
    e.installed = f.get('installed') || e.installed;
  } else {
    const id = 'EQ-' + String(Date.now()).slice(-6);
    state.equipment.push({
      id, tag: f.get('tag'), type: f.get('type'),
      make: f.get('make') || '', model: f.get('model') || '',
      plantId: f.get('plantId'), location: '',
      installed: f.get('installed') || today(), status: 'Operational',
    });
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

function parsePPMWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // Locate header row containing "Equipment Name"
  let headerIdx = -1, nameCol = -1;
  for (let i = 0; i < rows.length; i++) {
    for (let c = 0; c < rows[i].length; c++) {
      if (String(rows[i][c]).toLowerCase().trim() === 'equipment name') {
        headerIdx = i; nameCol = c; break;
      }
    }
    if (headerIdx !== -1) break;
  }
  if (headerIdx === -1) throw new Error('No header row containing "Equipment Name" found.');

  const snCol  = Math.max(0, nameCol - 1);
  const makeCol = nameCol + 1;
  const capCol  = nameCol + 2;
  const slotsStartCol = nameCol + 4; // Name, Make, Capacity, Qty → then slots

  const TYPE_KEYWORDS = [
    ['PUMP', 'Pump'], ['BLOWER', 'Blower'],
    ['FILTER', 'Filter'], ['TREATMENT', 'Filter'],
    ['CENTRIFUGE', 'Centrifuge'], ['UV', 'UV System'],
  ];

  let currentType = null;
  const out = [];

  for (let i = headerIdx + 2; i < rows.length; i++) { // skip header + W1/W2 sub-row
    const row = rows[i];
    const sn   = row[snCol];
    const name = row[nameCol];

    if (!name) continue;
    const nameStr = String(name).trim();
    const snStr   = String(sn).trim();
    const snIsNum = snStr !== '' && /^\d+(?:\.\d+)?$/.test(snStr);

    // Section header — text but no S.No
    if (!snIsNum) {
      const upper = nameStr.toUpperCase();
      const m = TYPE_KEYWORDS.find(([kw]) => upper.includes(kw));
      if (m) currentType = m[1];
      continue;
    }

    if (!currentType) currentType = 'Pump'; // default if no section header seen

    // Scan slot markers — only treat known frequency codes as markers
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
      if (offset <= 3) slot = ['W1','W2','W3','W4'][offset];
      else slot = 'W' + ((offset % 4) + 1); // fallback
    }

    const make  = String(row[makeCol] || '').trim().replace(/^[-—]+$/, '');
    const model = String(row[capCol]  || '').trim().replace(/^[-—]+$/, '');

    out.push({ tag: nameStr, type: currentType, make, model, slot });
  }

  return out;
}

function submitImportPPM(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const plantId = f.get('plantId');
  const rows = window._importedRows;
  if (!plantId || !rows || !rows.length) return;

  const base = Date.now();
  const newEquipment = rows.map((r, idx) => ({
    id: `EQ-IMP-${base}-${idx}`,
    tag: r.tag, type: r.type, make: r.make, model: r.model,
    plantId, location: '', installed: today(), status: 'Operational',
  }));

  const newSlots = {};
  newEquipment.forEach((e, idx) => {
    if (rows[idx].slot) newSlots[e.id] = rows[idx].slot;
  });

  // Generate past PPM logs for newly imported equipment
  const newLogs = generatePastPPMLogs(newSlots, newEquipment, `IMP-${base}`);

  state.equipment = state.equipment.concat(newEquipment);
  state.slots = Object.assign({}, state.slots || {}, newSlots);
  state.logs = state.logs.concat(newLogs);
  saveEq(state.equipment);
  saveSlots(state.slots);
  saveLog(state.logs);

  closeModal();
  alert(`Imported ${newEquipment.length} equipment with ${newLogs.length} historic PPM log entries.`);
  location.hash = '#/equipment';
  ui.plantFilter = plantId;
  route();
}

// ---------- Boot ----------
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('Reset all data back to the seed demo?')) resetDemo();
});
if (!location.hash) location.hash = '#/dashboard';
route();
