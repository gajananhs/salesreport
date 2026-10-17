// Reusable UI pieces: header, badges, chips, toast, bottom sheet.
import { html, raw, esc, $, $$, initials, PERIODS } from './util.js';
import { icons } from './icons.js';
import { store } from './store.js';

export function header({ kicker, title, actions = '' }) {
  const me = store.me();
  return html`<header class="app-header">
    <div class="greet"><p>${kicker}</p><h1>${title}</h1></div>
    <div class="header-actions">${raw(String(actions))}<a class="avatar" href="#/profile" aria-label="Profile">${initials(me?.name)}</a></div>
  </header>`;
}

const STATUS = {
  successful: ['ok', 'Successful'], follow_up: ['pending', 'Follow-up'], pending: ['neutral', 'Pending'], not_interested: ['no', 'Not interested'],
  submitted: ['pending', 'Submitted'], approved: ['ok', 'Approved'], partially_paid: ['info', 'Part paid'], paid: ['ok', 'Paid'], rejected: ['no', 'Rejected'],
  settled: ['neutral', 'Settled'],
  open: ['pending', 'Open'], in_progress: ['info', 'In progress'], done: ['ok', 'Done'],
  high: ['no', 'High'], medium: ['pending', 'Medium'], low: ['neutral', 'Low'],
  Open: ['pending', 'Open'], Won: ['ok', 'Won'], Lost: ['no', 'Lost'], Revised: ['info', 'Revised'],
  Confirmed: ['info', 'Confirmed'], 'In production': ['pending', 'In production'], 'Ready to ship': ['ok', 'Ready to ship'], Shipped: ['ok', 'Shipped'],
  Dispatched: ['info', 'Dispatched'], Delivered: ['ok', 'Delivered'], 'In transit': ['pending', 'In transit'],
};
export function badge(key, label) {
  const [cls, text] = STATUS[key] || ['neutral', key];
  return html`<span class="badge ${cls}">${label || text}</span>`;
}

/** Chip group markup. options: [[value,label]] */
export function chipGroup(id, options, selected, { scroll = false, label = '' } = {}) {
  return html`<div class="chips${scroll ? ' scroll' : ''}" id="${id}" role="group" aria-label="${label}">
    ${options.map(([v, l]) => html`<button type="button" class="chip" data-value="${v}" aria-pressed="${String(v === selected)}">${l}</button>`)}
  </div>`;
}
/** Wire a chip group; returns getter/setter. */
export function bindChips(root, id, onChange) {
  const group = $('#' + id, root);
  const api = {
    get value() { return $('.chip[aria-pressed="true"]', group)?.dataset.value ?? ''; },
    set(v) { $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === v))); },
  };
  group.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    api.set(c.dataset.value);
    onChange?.(c.dataset.value);
  });
  return api;
}

export function periodSelect(id, value) {
  return html`<select id="${id}" aria-label="Period">${Object.entries(PERIODS).map(([k, l]) => html`<option value="${k}" ${k === value ? raw('selected') : ''}>${l}</option>`)}</select>`;
}

export function switchRow(id, label, checked) {
  return html`<div class="toggle-row"><label for="${id}">${label}</label><span class="switch"><input type="checkbox" id="${id}" ${checked ? raw('checked') : ''}><span></span></span></div>`;
}

export const empty = (text) => html`<div class="empty">${text}</div>`;

// ---------- toast ----------
let toastTimer;
export function toast(message) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// ---------- sheet ----------
export function openSheet(title, body, { onMount } = {}) {
  const prevFocus = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icons.close}</button></div>
    <div class="sheet-body">${String(body)}</div></div>`;
  const close = () => {
    scrim.remove();
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    prevFocus?.focus?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(scrim);
  document.body.style.overflow = 'hidden';
  $('[data-close]', scrim).focus();
  const sheet = $('.sheet', scrim);
  onMount?.(sheet, close);
  return { el: sheet, close };
}

/** Field validation helper: marks fields invalid and shows message. */
export function fieldError(errEl, msg, fields = []) {
  if (!msg) { errEl.hidden = true; return; }
  errEl.textContent = msg;
  errEl.hidden = false;
  fields.forEach((f) => f?.closest('.field')?.classList.add('invalid'));
  fields[0]?.focus?.();
}
export function clearInvalid(root) { $$('.field.invalid', root).forEach((f) => f.classList.remove('invalid')); }
