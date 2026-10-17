// App bootstrap: hash router, navigation state, global banners.
// Hash routes (#/visits) need no server rewrites, so the app works from any
// GitHub Pages sub-path (https://<user>.github.io/<repo>/).
import { html, raw, $, $$, setHTML, esc } from './util.js';
import { store } from './store.js';
import { icons } from './icons.js';
import { openSheet } from './ui.js';
import { registerServiceWorker, onPwaEvent, applyUpdate, canInstall, install, isStandalone } from './pwa.js';
import * as home from './views/home.js';
import * as visits from './views/visits.js';
import * as expenses from './views/expenses.js';
import * as tasks from './views/tasks.js';
import * as plans from './views/plans.js';
import * as reports from './views/reports.js';
import * as salesdata from './views/salesdata.js';
import * as profile from './views/profile.js';

const ROUTES = { home, visits, expenses, tasks, plans, reports, salesdata, profile };
const NAV = [
  ['home', 'Home'], ['visits', 'Visits'], ['expenses', 'Expenses'], ['tasks', 'Tasks'],
  ['plans', 'Plans'], ['reports', 'Reports'], ['salesdata', 'Sales data'], ['profile', 'Profile'],
];
const TABS = ['home', 'visits', 'expenses', 'tasks'];
const MORE = ['plans', 'reports', 'salesdata', 'profile'];

let cleanup = null;
let currentRoute = '';
const banners = { update: false, offline: !navigator.onLine, install: false };

function buildNav() {
  setHTML($('#side-nav'), html`${NAV.map(([k, label]) => html`<a class="side-link" href="#/${k}" data-route="${k}">${raw(icons[k])}<span>${label}</span></a>`)}`);
  setHTML($('#tabbar'), html`
    ${TABS.map((k) => html`<a class="tab" href="#/${k}" data-route="${k}">${raw(icons[k])}<span>${NAV.find((n) => n[0] === k)[1]}</span></a>`)}
    <button type="button" class="tab" id="tab-more" aria-haspopup="dialog">${raw(icons.more)}<span>More</span></button>`);
  $('#tab-more').addEventListener('click', openMore);
}

function openMore() {
  openSheet('More', html`<div class="more-list">${MORE.map((k) => html`
    <a class="row-item" href="#/${k}" data-close><span class="more-item"><span class="more-ico">${raw(icons[k])}</span><span class="pname">${NAV.find((n) => n[0] === k)[1]}</span></span><span class="psub">›</span></a>`)}</div>`);
}

function route() {
  const key = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home').toLowerCase();
  const name = ROUTES[key] ? key : 'home';
  if (!ROUTES[key] && location.hash && location.hash !== '#/' && location.hash !== '#') {
    history.replaceState(null, '', '#/home');
  }
  if (typeof cleanup === 'function') { try { cleanup(); } catch (_) { /* ignore */ } }
  cleanup = null;

  const host = $('#view');
  const section = document.createElement('section');
  section.className = 'view';
  section.setAttribute('aria-label', ROUTES[name].title);
  host.replaceChildren(section);
  cleanup = ROUTES[name].render(section) || null;

  document.title = `${ROUTES[name].title} · Sales Reporter`;
  $$('[data-route]').forEach((a) => {
    const on = a.dataset.route === name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('#tab-more')?.classList.toggle('active', MORE.includes(name));
  if (currentRoute && currentRoute !== name) {
    window.scrollTo(0, 0);
    section.querySelector('h1')?.setAttribute('tabindex', '-1');
    section.querySelector('h1')?.focus({ preventScroll: true });
  }
  currentRoute = name;
}

function paintBanners() {
  const el = $('#banners');
  const parts = [];
  if (banners.offline) parts.push(`<div class="banner offline" role="status"><span>You're offline. Everything still works — changes are saved on this device.</span></div>`);
  if (banners.update) parts.push(`<div class="banner" role="status"><span>A new version is ready.</span><button type="button" data-act="update">Reload</button></div>`);
  if (banners.install && !banners.update) parts.push(`<div class="banner" role="status"><span>Install Sales Reporter for quick, offline access.</span><span class="btn-row"><button type="button" data-act="install">Install</button><button type="button" data-act="dismiss-install" aria-label="Dismiss" style="background:transparent;color:inherit">✕</button></span></div>`);
  el.innerHTML = parts.join('');
  $('#side-net').textContent = banners.offline ? 'Offline' : 'Online';
  $('#side-net').classList.toggle('off', banners.offline);
}

function paintDatalist() {
  const dl = $('#customer-list');
  dl.innerHTML = store.get().customers.map((c) => `<option value="${esc(c.name)}"></option>`).join('');
}

function init() {
  buildNav();
  paintDatalist();
  $('#side-company').textContent = store.get().settings.company;
  store.subscribe(() => { paintDatalist(); $('#side-company').textContent = store.get().settings.company; });

  window.addEventListener('hashchange', route);
  route();

  window.addEventListener('online', () => { banners.offline = false; paintBanners(); });
  window.addEventListener('offline', () => { banners.offline = true; paintBanners(); });
  $('#banners').addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'update') applyUpdate();
    if (act === 'install') { await install(); banners.install = false; paintBanners(); }
    if (act === 'dismiss-install') {
      banners.install = false; paintBanners();
      try { localStorage.setItem('sales-reporter:install-dismissed', '1'); } catch (_) { /* ignore */ }
    }
  });
  onPwaEvent((evt) => {
    if (evt.type === 'update-ready') banners.update = true;
    if (evt.type === 'installable') {
      let dismissed = false;
      try { dismissed = localStorage.getItem('sales-reporter:install-dismissed') === '1'; } catch (_) { /* ignore */ }
      banners.install = canInstall() && !isStandalone() && !dismissed;
    }
    if (evt.type === 'installed') banners.install = false;
    paintBanners();
  });
  paintBanners();
  registerServiceWorker();
  document.documentElement.classList.remove('booting');
}

init();
