import { html, $, setHTML, initials, fmtDate, inr, toNum } from '../util.js';
import { store } from '../store.js';
import { header, switchRow, toast, openSheet } from '../ui.js';
import { MANAGER } from '../data.js';
import { install, APP_VERSION } from '../pwa.js';

export const title = 'Profile';

export function render(root) {
  const st = store.get();
  const me = store.me();

  setHTML(root, html`
    ${header({ kicker: 'Account & settings', title: 'Profile' })}
    <div class="cols two-even">
      <div>
        <div class="card">
          <div class="ring-wrap">
            <div class="avatar lg">${initials(me.name)}</div>
            <div><div class="pname" style="font-family:var(--font-display);font-size:18px;font-weight:600">${me.name}</div>
            <div class="psub">${me.designation} · ${me.region}</div><div class="psub">${me.email}</div></div>
          </div>
        </div>
        <div class="card">
          <h3>Employment details</h3>
          <div class="mini-row"><span>Employee ID</span><span>${me.empId}</span></div>
          <div class="mini-row"><span>Date of joining</span><span>${fmtDate(me.joined, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
          <div class="mini-row"><span>Status</span><span class="status-chip">Confirmed</span></div>
          <div class="mini-row"><span>Phone</span><span>${me.phone}</span></div>
          <div class="mini-row"><span>Reporting manager</span><span>${MANAGER.name}</span></div>
          <div class="mini-row"><span>Company</span><span>${st.settings.company}</span></div>
        </div>
        <div class="card">
          <h3>App</h3>
          ${switchRow('p-mgr', 'Manager view (team, approvals, assign)', st.managerView)}
          <div class="toggle-row"><span>Install on this device</span><button type="button" class="btn-mini" id="p-install">Install</button></div>
          <div class="toggle-row"><span>Connection</span><span class="badge ${navigator.onLine ? 'ok' : 'no'}" id="p-net">${navigator.onLine ? 'Online' : 'Offline'}</span></div>
          <div class="toggle-row"><span>Version</span><span class="amt">${APP_VERSION}</span></div>
          <p class="footnote">Works offline once loaded. Everything you enter is stored on this device only.</p>
        </div>
      </div>
      <div>
        <form class="card" id="p-settings" novalidate>
          <h3>Expense rates &amp; company</h3>
          <div class="row-2">
            <div class="field"><label for="p-car">Car ₹/km</label><input type="number" id="p-car" min="0" step="0.5" value="${st.settings.carRate}"></div>
            <div class="field"><label for="p-bike">Bike ₹/km</label><input type="number" id="p-bike" min="0" step="0.5" value="${st.settings.bikeRate}"></div>
          </div>
          <div class="field"><label for="p-company">Company name (shown on reports)</label><input type="text" id="p-company" value="${st.settings.company}"></div>
          <button type="submit" class="btn-primary">Save settings</button>
        </form>
        <div class="card">
          <h3>Rate master</h3>
          <p class="card-sub">Per-designation daily limits used for advance requests.</p>
          ${st.rateMaster.map((r) => html`<div class="row-item"><div><div class="pname">${r.designation}</div><div class="psub">Lodging ${inr(r.lodging)} · Food ${inr(r.food)} · TA ${inr(r.ta)} · ₹${r.vehicle}/km</div></div></div>`)}
        </div>
        <div class="card">
          <h3>Data</h3>
          <button type="button" class="btn-secondary" id="p-export" style="margin-top:0">Download backup (JSON)</button>
          <button type="button" class="btn-secondary" id="p-reset">Reset demo data</button>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);

  f('p-mgr').addEventListener('change', (e) => {
    store.update((s) => { s.managerView = e.target.checked; });
    toast(e.target.checked ? 'Manager view on — see Tasks, Expenses and Reports' : 'Manager view off');
  });

  f('p-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const car = toNum(f('p-car').value), bike = toNum(f('p-bike').value);
    const company = f('p-company').value.trim();
    if (!car || !bike) { toast('Enter both per-km rates'); return; }
    if (!company) { toast('Company name can’t be empty'); f('p-company').focus(); return; }
    store.update((s) => { s.settings = { carRate: car, bikeRate: bike, company }; });
    toast('Settings saved');
  });

  f('p-install').addEventListener('click', async () => {
    const result = await install();
    if (result === 'unavailable') {
      openSheet('Install Sales Reporter', html`
        <p class="footnote" style="font-size:12.5px;color:var(--ink)"><b>iPhone / iPad (Safari):</b> tap the Share button, then <b>Add to Home Screen</b>.</p>
        <p class="footnote" style="font-size:12.5px;color:var(--ink)"><b>Android (Chrome):</b> open the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p>
        <p class="footnote" style="font-size:12.5px;color:var(--ink)"><b>Desktop (Chrome / Edge):</b> click the install icon at the right end of the address bar.</p>
        <p class="footnote">If the app is already installed, open it from your home screen or app list.</p>`);
    } else if (result === 'accepted') toast('Installing…');
  });

  f('p-export').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sales-reporter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  f('p-reset').addEventListener('click', () => {
    if (!confirm('Reset all demo data? Anything you entered will be replaced with fresh sample data.')) return;
    store.reset();
    toast('Demo data reset');
    location.hash = '#/home';
  });

  const net = () => { const el = f('p-net'); if (!el) return; el.textContent = navigator.onLine ? 'Online' : 'Offline'; el.className = `badge ${navigator.onLine ? 'ok' : 'no'}`; };
  window.addEventListener('online', net); window.addEventListener('offline', net);
  return () => { window.removeEventListener('online', net); window.removeEventListener('offline', net); };
}
