// Mock / sample data. Every company, person, phone number and document
// here is fictional. Dates are generated relative to "today" so the demo
// always looks current; a fixed PRNG seed keeps the figures stable.
import { addDays, today, parseISO, uid } from './util.js';

export const DATA_VERSION = 3;

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ME_ID = 'u_rohan';

export const TEAM = [
  { id: 'u_rohan', name: 'Rohan Kulkarni', designation: 'Senior Sales Executive', region: 'Bengaluru South', email: 'rohan.k@northwind-demo.in', phone: '98450 11223', empId: 'NW-0217', joined: '2023-06-12' },
  { id: 'u_ananya', name: 'Ananya Rao', designation: 'Sales Executive', region: 'Mysuru', email: 'ananya.r@northwind-demo.in', phone: '98861 44001', empId: 'NW-0231', joined: '2024-01-08' },
  { id: 'u_imran', name: 'Imran Sheikh', designation: 'Sales Executive', region: 'Hubballi–Dharwad', email: 'imran.s@northwind-demo.in', phone: '99001 55870', empId: 'NW-0198', joined: '2022-09-19' },
  { id: 'u_kiran', name: 'Kiran Patil', designation: 'Area Sales Manager', region: 'Belagavi', email: 'kiran.p@northwind-demo.in', phone: '97411 20983', empId: 'NW-0144', joined: '2021-03-01' },
  { id: 'u_divya', name: 'Divya Menon', designation: 'Sales Executive', region: 'Mangaluru', email: 'divya.m@northwind-demo.in', phone: '96320 77412', empId: 'NW-0256', joined: '2024-07-22' },
];
export const MANAGER = { name: 'Meera Shetty', designation: 'Regional Sales Manager' };
export const COMPANY = 'Northwind Fluid Systems Pvt. Ltd.';

export const CUSTOMERS = [
  { name: 'Sharma Traders', type: 'dealer', city: 'Jayanagar, Bengaluru', phone: '98440 12345', category: 'distributor' },
  { name: 'Vega Auto Components', type: 'customer', city: 'Bommasandra, Bengaluru', phone: '80 4112 7788', category: 'industrial' },
  { name: 'Kaveri Textiles', type: 'customer', city: 'Mandya', phone: '94480 66120', category: 'industrial' },
  { name: 'Deccan Polymers', type: 'customer', city: 'Peenya, Bengaluru', phone: '80 2839 4411', category: 'industrial' },
  { name: 'Shree Ganesh Engineering', type: 'customer', city: 'Hosur Road, Bengaluru', phone: '99860 31122', category: 'direct' },
  { name: 'Malnad Agro Foods', type: 'customer', city: 'Shivamogga', phone: '94481 90021', category: 'industrial' },
  { name: 'Pinnacle Pharma Labs', type: 'customer', city: 'Jigani, Bengaluru', phone: '80 2782 6600', category: 'industrial' },
  { name: 'Coastal Packaging Co.', type: 'customer', city: 'Baikampady, Mangaluru', phone: '824 240 1180', category: 'direct' },
  { name: 'Bharat Pneumatics', type: 'dealer', city: 'Rajajinagar, Bengaluru', phone: '98450 70707', category: 'retailer' },
  { name: 'Om Sai Hydraulics', type: 'dealer', city: 'Tumakuru', phone: '96860 41414', category: 'retailer' },
  { name: 'Apex Design Consultants', type: 'consultant', city: 'Indiranagar, Bengaluru', phone: '80 4166 2020', category: 'other' },
  { name: 'Sunrise Castings', type: 'customer', city: 'Belur Industrial Area, Dharwad', phone: '836 248 3311', category: 'industrial' },
  { name: 'Greenfield Breweries', type: 'customer', city: 'Kolar', phone: '81520 33190', category: 'industrial' },
  { name: 'Metro Tool Room', type: 'customer', city: 'Whitefield, Bengaluru', phone: '99161 28800', category: 'direct' },
];

export const PRODUCTS = [
  'Aluminium compressed-air piping 25 mm',
  'Aluminium compressed-air piping 40 mm',
  'Push-fit modular fittings',
  'FRL units (filter-regulator-lubricator)',
  'Ball valves & drop brackets',
  'Air receiver tank 500 L',
  'Ring-main layout & installation',
];
const PURPOSES = ['Product demo', 'Follow-up on quotation', 'Site survey', 'Payment follow-up', 'New enquiry', 'Order finalisation', 'Technical clarification'];
const COMPETITORS = ['', '', '', 'Competitor quoted 6% lower on 40 mm line', 'Customer comparing with GI piping', '', 'Existing vendor offering free installation'];

export const RATE_MASTER = [
  { designation: 'Sales Executive', lodging: 1800, food: 600, ta: 400, vehicle: 6 },
  { designation: 'Senior Sales Executive', lodging: 2200, food: 750, ta: 500, vehicle: 6 },
  { designation: 'Area Sales Manager', lodging: 3000, food: 900, ta: 700, vehicle: 12 },
];

function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
const round = (n, to = 100) => Math.round(n / to) * to;

function makeVisits(r, t) {
  const visits = [];
  TEAM.forEach((m, mi) => {
    for (let back = 34; back >= 0; back--) {
      const date = addDays(t, -back);
      const dow = parseISO(date).getDay();
      if (dow === 0) continue; // Sundays off
      if (back === 0 && m.id === ME_ID) continue; // today starts empty for me; one seeded below
      const count = back === 0 ? (r() < 0.5 ? 1 : 0) : 1 + Math.floor(r() * (mi === 0 ? 3 : 2.6));
      for (let k = 0; k < count; k++) {
        const c = pick(r, CUSTOMERS);
        const roll = r();
        const outcome = roll < 0.28 ? 'successful' : roll < 0.62 ? 'follow_up' : roll < 0.88 ? 'pending' : 'not_interested';
        const quoteSent = outcome !== 'not_interested' && r() < 0.45;
        const orderRecv = outcome === 'successful' && r() < 0.8;
        const payColl = r() < (orderRecv ? 0.4 : 0.12);
        visits.push({
          id: uid('v'),
          userId: m.id,
          date,
          type: c.type,
          name: c.name,
          phone: c.phone,
          location: c.city,
          category: c.category,
          purpose: pick(r, PURPOSES),
          product: pick(r, PRODUCTS),
          outcome,
          followUp: outcome === 'follow_up' ? addDays(date, 2 + Math.floor(r() * 6)) : '',
          quoteSent,
          quoteValue: quoteSent ? round(40000 + r() * 360000, 500) : 0,
          orderRecv,
          orderValue: orderRecv ? round(25000 + r() * 290000, 500) : 0,
          payColl,
          payValue: payColl ? round(15000 + r() * 140000, 500) : 0,
          competitor: pick(r, COMPETITORS),
          remarks: '',
          km: 8 + Math.floor(r() * 46),
          gps: null,
          createdAt: parseISO(date).getTime() + (10 + k * 2) * 3600000,
        });
      }
    }
  });
  // one visit already logged this morning
  const c = CUSTOMERS[1];
  visits.push({
    id: uid('v'), userId: ME_ID, date: t, type: 'customer', name: c.name, phone: c.phone, location: c.city,
    category: c.category, purpose: 'Site survey', product: PRODUCTS[1], outcome: 'follow_up', followUp: addDays(t, 3),
    quoteSent: true, quoteValue: 186500, orderRecv: false, orderValue: 0, payColl: false, payValue: 0,
    competitor: 'Customer comparing with GI piping', remarks: 'Plant head wants ring-main drawing by Friday.', km: 22, gps: null,
    createdAt: Date.now() - 2 * 3600000,
  });
  return visits;
}

function makeExpenses(r, t, advances) {
  const out = [];
  TEAM.forEach((m) => {
    for (let back = 24; back >= 1; back--) {
      const date = addDays(t, -back);
      if (parseISO(date).getDay() === 0) continue;
      if (r() < 0.25) continue;
      const mode = pick(r, ['car', 'bike', 'bike', 'public', 'car']);
      const km = mode === 'public' ? 0 : 14 + Math.floor(r() * 70);
      const rate = mode === 'car' ? 12 : mode === 'bike' ? 6 : 0;
      const pub = mode === 'public' ? round(120 + r() * 600, 10) : 0;
      const boarding = round(150 + r() * 450, 10);
      const lodging = r() < 0.12 ? round(1400 + r() * 900, 50) : 0;
      const other = r() < 0.4 ? round(40 + r() * 260, 10) : 0;
      const total = km * rate + pub + boarding + lodging + other;
      const age = back;
      const status = age > 14 ? (r() < 0.9 ? 'paid' : 'rejected') : age > 6 ? pick(r, ['approved', 'approved', 'partially_paid', 'paid']) : pick(r, ['submitted', 'submitted', 'approved']);
      out.push({
        id: uid('e'), userId: m.id, date, mode, from: 'Office', to: pick(r, CUSTOMERS).city.split(',')[0],
        km, rate, publicAmt: pub, boarding, lodging, other, total,
        notes: lodging ? 'Outstation stay' : '', attachments: r() < 0.6 ? [`bill-${date}.jpg`] : [],
        status, advanceId: m.id === ME_ID && back <= 9 ? advances[0].id : '', createdAt: parseISO(date).getTime() + 19 * 3600000,
      });
    }
  });
  return out;
}

function makeDocs(r, t) {
  const docs = [];
  const lines = () => {
    const n = 2 + Math.floor(r() * 3);
    const items = [];
    for (let i = 0; i < n; i++) {
      const p = PRODUCTS[(i + Math.floor(r() * PRODUCTS.length)) % PRODUCTS.length];
      const qty = p.includes('piping') ? 20 + Math.floor(r() * 180) : p.includes('installation') ? 1 : p.includes('tank') ? 1 + Math.floor(r() * 2) : 1 + Math.floor(r() * 24);
      const rate = p.includes('piping') ? round(380 + r() * 520, 5) : p.includes('tank') ? 46500 : p.includes('installation') ? 85000 : round(650 + r() * 5200, 5);
      items.push({ name: p, qty, unit: p.includes('piping') ? 'm' : p.includes('installation') ? 'job' : 'nos', rate });
    }
    return items;
  };
  const mk = (type, prefix, start, count, statuses) => {
    for (let i = 0; i < count; i++) {
      const items = lines();
      const sub = items.reduce((a, x) => a + x.qty * x.rate, 0);
      const c = CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
      docs.push({
        id: uid('d'), type, number: `${prefix}-${start + i * 7 + Math.floor(r() * 5)}`,
        customer: c.name, city: c.city, date: addDays(t, -Math.floor(r() * 40)),
        items, subtotal: sub, gst: Math.round(sub * 0.18), total: Math.round(sub * 1.18),
        status: pick(r, statuses), rep: pick(r, TEAM).name,
      });
    }
  };
  mk('quotations', 'QT', 4120, 14, ['Open', 'Open', 'Won', 'Lost', 'Revised']);
  mk('transfer_orders', 'SO', 8810, 10, ['Confirmed', 'In production', 'Ready to ship', 'Shipped']);
  mk('delivery_challans', 'DC', 6250, 10, ['Dispatched', 'Delivered', 'Delivered', 'In transit']);
  docs.sort((a, b) => (a.date < b.date ? 1 : -1));
  return docs;
}

export function seed() {
  const t = today();
  const r = rng(20261017);
  const advances = [
    {
      id: uid('a'), userId: ME_ID, purpose: 'Mysuru–Mandya customer tour', from: addDays(t, -9), to: addDays(t, 2),
      days: 12, perDay: 3450, amount: 15000, status: 'paid', approver: MANAGER.name, createdAt: Date.now() - 10 * 86400000,
    },
    {
      id: uid('a'), userId: ME_ID, purpose: 'Hosur Road industrial belt — September', from: addDays(t, -40), to: addDays(t, -29),
      days: 10, perDay: 3450, amount: 12000, status: 'settled', approver: MANAGER.name, createdAt: Date.now() - 42 * 86400000,
    },
    {
      id: uid('a'), userId: 'u_ananya', purpose: 'Chamarajanagar dealer visits', from: addDays(t, 1), to: addDays(t, 4),
      days: 4, perDay: 2800, amount: 11200, status: 'submitted', approver: MANAGER.name, createdAt: Date.now() - 86400000,
    },
  ];
  const visits = makeVisits(r, t);
  const expenses = makeExpenses(r, t, advances);
  const tasks = [
    { id: uid('t'), title: 'Send revised quote — 40 mm ring main', customer: 'Vega Auto Components', city: 'Bommasandra', phone: '80 4112 7788', source: 'Manager', assignedTo: ME_ID, assignedBy: MANAGER.name, due: addDays(t, 1), priority: 'high', status: 'in_progress', notes: 'Include drop brackets and 3 FRL units.' },
    { id: uid('t'), title: 'IndiaMART lead: compressed air line for new shed', customer: 'Lakshmi Agro Industries', city: 'Ramanagara', phone: '99020 18811', source: 'IndiaMART', assignedTo: ME_ID, assignedBy: 'Auto-routing (pincode 562159)', due: t, priority: 'high', status: 'open', notes: 'Buyer wants ~180 m of 25 mm line, call before noon.' },
    { id: uid('t'), title: 'Collect pending payment — invoice INV-3307', customer: 'Kaveri Textiles', city: 'Mandya', phone: '94480 66120', source: 'Manager', assignedTo: ME_ID, assignedBy: MANAGER.name, due: addDays(t, 2), priority: 'medium', status: 'open', notes: '' },
    { id: uid('t'), title: 'Demo kit return to stores', customer: '', city: 'Office', phone: '', source: 'Manager', assignedTo: ME_ID, assignedBy: MANAGER.name, due: addDays(t, -1), priority: 'low', status: 'done', notes: '' },
    { id: uid('t'), title: 'IndiaMART lead: push-fit fittings bulk enquiry', customer: 'Nandi Motors', city: 'Chikkaballapur', phone: '81973 22014', source: 'IndiaMART', assignedTo: 'u_ananya', assignedBy: 'Auto-routing (region)', due: addDays(t, 1), priority: 'medium', status: 'open', notes: '' },
    { id: uid('t'), title: 'Site survey for brewery expansion', customer: 'Greenfield Breweries', city: 'Kolar', phone: '81520 33190', source: 'Manager', assignedTo: 'u_imran', assignedBy: MANAGER.name, due: addDays(t, 3), priority: 'medium', status: 'in_progress', notes: '' },
    { id: uid('t'), title: 'Dealer stock review', customer: 'Om Sai Hydraulics', city: 'Tumakuru', phone: '96860 41414', source: 'Manager', assignedTo: 'u_kiran', assignedBy: MANAGER.name, due: addDays(t, -2), priority: 'low', status: 'done', notes: '' },
  ];
  const leads = [
    { id: uid('l'), buyer: 'Sri Venkateshwara Foods', city: 'Chitradurga', state: 'Karnataka', pincode: '577501', product: 'Aluminium air piping 25 mm — 120 m', received: Date.now() - 50 * 60000 },
    { id: uid('l'), buyer: 'Precision Moulds & Dies', city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', product: 'FRL units with auto drain', received: Date.now() - 3.2 * 3600000 },
    { id: uid('l'), buyer: 'Konkan Cashew Processors', city: 'Karwar', state: 'Karnataka', pincode: '581301', product: 'Ring main installation quote', received: Date.now() - 20 * 3600000 },
  ];
  const plans = [
    { id: uid('p'), type: 'next_day', name: 'Deccan Polymers', purpose: 'Present 40 mm vs GI cost comparison', date: addDays(t, 1), notes: 'Carry sample fittings.', done: false },
    { id: uid('p'), type: 'next_day', name: 'Bharat Pneumatics', purpose: 'Collect C-form and dealer order', date: addDays(t, 1), notes: '', done: false },
    { id: uid('p'), type: 'next_week', name: 'Pinnacle Pharma Labs', purpose: 'Clean-room line spec meeting with QA', date: addDays(t, 6), notes: 'Ask for drawing of utility block.', done: false },
    { id: uid('p'), type: 'next_week', name: 'Malnad Agro Foods', purpose: 'Follow up on quotation QT-4141', date: addDays(t, 8), notes: '', done: false },
    { id: uid('p'), type: 'pending_work', name: '', purpose: 'Submit September expense bills to accounts', date: t, notes: '', done: false },
    { id: uid('p'), type: 'next_day', name: 'Metro Tool Room', purpose: 'Drop off catalogue', date: addDays(t, -1), notes: '', done: true },
    { id: uid('p'), type: 'pending_work', name: 'Sunrise Castings', purpose: 'Share installation reference list', date: addDays(t, -3), notes: '', done: true },
  ];

  return {
    version: DATA_VERSION,
    seededOn: t,
    meId: ME_ID,
    managerView: false,
    settings: { carRate: 12, bikeRate: 6, company: COMPANY },
    rateMaster: RATE_MASTER.map((x) => ({ ...x })),
    team: TEAM.map((x) => ({ ...x })),
    customers: CUSTOMERS.map((x) => ({ ...x })),
    day: { date: t, startedAt: null, endedAt: null },
    dailyWork: { date: t, workType: '', rows: [], savedAt: null },
    visits,
    expenses,
    advances,
    tasks,
    leads,
    plans,
    docs: makeDocs(r, t),
  };
}
