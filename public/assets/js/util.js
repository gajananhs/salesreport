// Shared helpers: safe HTML templating, formatting, dates, periods.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

/** Marks a string as trusted HTML so `html` will not escape it. */
export class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Safe(s);

/**
 * Tagged template that escapes every interpolated value unless it is a
 * Safe instance (from raw() or a nested html``). Arrays are joined.
 */
export function html(strings, ...values) {
  let out = '';
  strings.forEach((str, i) => {
    out += str;
    if (i < values.length) out += serialize(values[i]);
  });
  return new Safe(out);
}
function serialize(v) {
  if (v == null || v === false) return '';
  if (v instanceof Safe) return v.s;
  if (Array.isArray(v)) return v.map(serialize).join('');
  return esc(v);
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function setHTML(el, content) { el.innerHTML = String(content); }

// ---------- numbers ----------
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const num = (n) => inr0.format(Math.round(Number(n) || 0));
export const inr = (n) => (Number(n) < 0 ? '−₹' : '₹') + inr0.format(Math.abs(Math.round(Number(n) || 0)));
/** Compact rupee figure: ₹4.2L, ₹1.1Cr, ₹86k. */
export function inrShort(n) {
  const v = Math.abs(Number(n) || 0);
  const sign = Number(n) < 0 ? '−' : '';
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7)}Cr`;
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5)}L`;
  if (v >= 1e3) return `${sign}₹${trim(v / 1e3)}k`;
  return `${sign}₹${Math.round(v)}`;
}
const trim = (x) => (x >= 100 ? Math.round(x) : x.toFixed(1).replace(/\.0$/, ''));
export const toNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };

// ---------- dates (all local, as YYYY-MM-DD strings) ----------
const pad = (n) => String(n).padStart(2, '0');
export const pad2 = pad;
export function iso(d = new Date()) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseISO(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
export function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); }
export const today = () => iso();
export function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
export function fmtDate(s, opts = { day: 'numeric', month: 'short' }) {
  if (!s) return '—';
  return parseISO(s).toLocaleDateString('en-IN', opts);
}
export function fmtDay(s) {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  if (s === addDays(t, 1)) return 'Tomorrow';
  return parseISO(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function fmtTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
export function weekStart(s) { const d = parseISO(s); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return iso(d); }

export const PERIODS = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
  last7: 'Last 7 days',
  lastweek: 'Last week',
  last30: 'Last 30 days',
};
/** Returns [from, to] inclusive ISO dates for a period key. */
export function periodRange(key, ref = today()) {
  switch (key) {
    case 'weekly': return [weekStart(ref), ref];
    case 'monthly': return [ref.slice(0, 8) + '01', ref];
    case 'last7': return [addDays(ref, -6), ref];
    case 'lastweek': { const ws = addDays(weekStart(ref), -7); return [ws, addDays(ws, 6)]; }
    case 'last30': return [addDays(ref, -29), ref];
    case 'daily':
    default: return [ref, ref];
  }
}
export const inRange = (d, [a, b]) => d >= a && d <= b;

// ---------- misc ----------
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
export const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
export const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export function debounce(fn, ms = 200) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
