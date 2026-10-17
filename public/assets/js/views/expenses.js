import { html, $, setHTML, inr, inrShort, num, today, fmtDay, fmtDate, periodRange, inRange, sum, uid, toNum, cap, daysBetween } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, periodSelect, empty, toast, fieldError, clearInvalid, openSheet } from '../ui.js';
import { ring } from '../charts.js';
import { MANAGER } from '../data.js';

export const title = 'Expenses';

const MODES = [['car', 'Car'], ['bike', 'Bike'], ['public', 'Public / taxi'], ['none', 'No travel']];
let period = 'monthly';

const activeAdvances = (st) => st.advances.filter((a) => a.userId === st.meId && (a.status === 'approved' || a.status === 'paid'));
const spentOn = (st, advId) => sum(st.expenses.filter((e) => e.advanceId === advId && e.status !== 'rejected'), (e) => e.total);

export function render(root) {
  const st0 = store.get();
  let advId = activeAdvances(st0)[0]?.id || '';

  setHTML(root, html`
    ${header({ kicker: 'Travel & reimbursements', title: 'Expenses' })}
    <div class="cols two">
      <div>
        <div class="card">
          <h3>Advance <button type="button" class="link" id="adv-new">+ Request advance</button></h3>
          <div id="adv-summary"></div>
        </div>
        <form class="card" id="exp-form" novalidate>
          <h3>Log an expense</h3>
          <div class="row-2">
            <div class="field"><label for="e-date">Date</label><input type="date" id="e-date" required></div>
            <div class="field"><label for="e-adv">Drawn against</label><select id="e-adv"></select></div>
          </div>
          <span class="label">Travel mode</span>
          ${chipGroup('e-mode', MODES, 'car', { scroll: true, label: 'Travel mode' })}
          <div class="row-2" id="e-route">
            <div class="field"><label for="e-from">From</label><input type="text" id="e-from" placeholder="e.g. Office"></div>
            <div class="field"><label for="e-to">To</label><input type="text" id="e-to" placeholder="e.g. Client site"></div>
          </div>
          <div class="field" id="e-km-wrap"><label for="e-km">KM travelled</label><input type="number" id="e-km" min="0" inputmode="numeric" placeholder="0"><p class="field-hint" id="e-rate-hint"></p></div>
          <div class="field" id="e-pub-wrap" hidden><label for="e-pub">Public transport / taxi (₹)</label><input type="number" id="e-pub" min="0" inputmode="numeric" placeholder="0"></div>
          <div class="row-2">
            <div class="field"><label for="e-board">Boarding / meals (₹)</label><input type="number" id="e-board" min="0" inputmode="numeric" placeholder="0"></div>
            <div class="field"><label for="e-lodge">Lodging / hotel (₹)</label><input type="number" id="e-lodge" min="0" inputmode="numeric" placeholder="0"></div>
          </div>
          <div class="field"><label for="e-other">Other — toll / parking / misc (₹)</label><input type="number" id="e-other" min="0" inputmode="numeric" placeholder="0"></div>
          <div class="field"><label for="e-notes">Notes</label><input type="text" id="e-notes" placeholder="e.g. Outstation trip to Mysuru"></div>
          <div class="field"><label for="e-files">Bills (PDF or image, one or more)</label><input type="file" id="e-files" accept=".pdf,image/jpeg,image/png,image/webp" multiple><p class="field-hint" id="e-files-hint">Only file names are kept in this demo.</p></div>
          <div class="total-bar deep"><span>Total expense</span><strong id="e-total">₹0</strong></div>
          <div class="total-bar" id="e-bal-bar"><span>Advance balance after this</span><strong id="e-bal">₹0</strong></div>
          <p class="error-text" id="e-err" hidden></p>
          <button type="submit" class="btn-primary">Save expense</button>
        </form>
      </div>
      <div>
        <div class="card" id="team-card" hidden>
          <h3>Team approvals</h3>
          <p class="card-sub">Submitted by your team — approve or reject.</p>
          <div id="team-list"></div>
        </div>
        <div class="card">
          <h3>My expenses ${periodSelect('e-period', period)}</h3>
          <div class="total-bar" id="e-totals"></div>
          <div id="e-list"></div>
        </div>
        <div class="card">
          <h3>My advance requests</h3>
          <div id="adv-list"></div>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);
  f('e-date').value = today();
  const mode = bindChips(root, 'e-mode', () => { syncMode(); calc(); });

  function rateFor(m) { const s = store.get().settings; return m === 'car' ? s.carRate : m === 'bike' ? s.bikeRate : 0; }
  function syncMode() {
    const m = mode.value;
    f('e-km-wrap').hidden = !(m === 'car' || m === 'bike');
    f('e-pub-wrap').hidden = m !== 'public';
    f('e-route').hidden = m === 'none';
  }
  function current() {
    const m = mode.value;
    const km = m === 'car' || m === 'bike' ? toNum(f('e-km').value) : 0;
    const rate = rateFor(m);
    const pub = m === 'public' ? toNum(f('e-pub').value) : 0;
    const boarding = toNum(f('e-board').value), lodging = toNum(f('e-lodge').value), other = toNum(f('e-other').value);
    return { km, rate, pub, boarding, lodging, other, total: Math.round(km * rate + pub + boarding + lodging + other) };
  }
  function calc() {
    const c = current();
    f('e-rate-hint').textContent = `₹${c.rate}/km × ${num(c.km)} km = ${inr(c.km * c.rate)}`;
    f('e-total').textContent = inr(c.total);
    const st = store.get();
    const a = st.advances.find((x) => x.id === f('e-adv').value);
    f('e-bal-bar').hidden = !a;
    if (a) {
      const bal = a.amount - spentOn(st, a.id) - c.total;
      f('e-bal').textContent = inr(bal);
      f('e-bal-bar').classList.toggle('neg', bal < 0);
    }
  }
  f('exp-form').addEventListener('input', calc);
  f('e-files').addEventListener('change', () => {
    const files = [...f('e-files').files];
    const big = files.find((x) => x.size > 10 * 1024 * 1024);
    f('e-files-hint').textContent = big ? `${big.name} is over 10 MB — please compress it.` : files.length ? files.map((x) => x.name).join(', ') : 'Only file names are kept in this demo.';
  });

  function paintAdvSelect() {
    const st = store.get();
    const opts = activeAdvances(st);
    if (advId && !opts.some((a) => a.id === advId)) advId = opts[0]?.id || '';
    setHTML(f('e-adv'), html`<option value="">Not against an advance</option>${opts.map((a) => html`<option value="${a.id}" ${a.id === advId ? 'selected' : ''}>${a.purpose} (${inr(a.amount)})</option>`)}`);
    f('e-adv').value = advId;
  }
  f('e-adv').addEventListener('change', () => { advId = f('e-adv').value; calc(); paintAdvSummary(); });

  function paintAdvSummary() {
    const st = store.get();
    const a = st.advances.find((x) => x.id === advId);
    if (!a) {
      setHTML(f('adv-summary'), empty('No active advance. Request one before an outstation trip.'));
      return;
    }
    const spent = spentOn(st, a.id);
    const pct = a.amount ? (spent / a.amount) * 100 : 0;
    setHTML(f('adv-summary'), html`
      <div class="ring-wrap">
        ${ring(pct, inrShort(a.amount - spent), 'balance')}
        <div class="ring-legend">
          <b>${a.purpose}</b><br>
          ${inr(a.amount)} advance · ${inr(spent)} spent<br>
          ${fmtDate(a.from)} – ${fmtDate(a.to)} · ${badge(a.status)}
        </div>
      </div>
      <div class="progress" aria-hidden="true"><i style="width:${Math.min(100, Math.round(pct))}%"></i></div>`);
  }

  f('exp-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearInvalid(root);
    const err = f('e-err');
    const c = current();
    const date = f('e-date').value;
    if (!date) return fieldError(err, 'Pick the expense date.', [f('e-date')]);
    if (date > today()) return fieldError(err, 'Expense date can’t be in the future.', [f('e-date')]);
    if ((mode.value === 'car' || mode.value === 'bike') && !c.km && !c.boarding && !c.lodging && !c.other) return fieldError(err, 'Enter the KM travelled or at least one amount.', [f('e-km')]);
    if (c.total <= 0) return fieldError(err, 'Enter at least one amount greater than ₹0.', [f('e-board')]);
    if ([...f('e-files').files].some((x) => x.size > 10 * 1024 * 1024)) return fieldError(err, 'One of the bills is over 10 MB.', [f('e-files')]);
    fieldError(err, '');
    const m = mode.value;
    store.update((st) => {
      st.expenses.push({
        id: uid('e'), userId: st.meId, date, mode: m, from: f('e-from').value.trim(), to: f('e-to').value.trim(),
        km: c.km, rate: c.rate, publicAmt: c.pub, boarding: c.boarding, lodging: c.lodging, other: c.other, total: c.total,
        notes: f('e-notes').value.trim(), attachments: [...f('e-files').files].map((x) => x.name),
        status: 'submitted', advanceId: f('e-adv').value, createdAt: Date.now(),
      });
    });
    toast(`Expense of ${inr(c.total)} submitted for approval`);
    f('exp-form').reset();
    f('e-date').value = today();
    f('e-files-hint').textContent = 'Only file names are kept in this demo.';
    mode.set('car'); syncMode(); paintAdvSelect(); calc();
  });

  // ---------- lists ----------
  function paintLists() {
    const st = store.get();
    const range = periodRange(period);
    const mine = st.expenses.filter((x) => x.userId === st.meId && inRange(x.date, range)).sort((a, b) => b.createdAt - a.createdAt);
    const valid = mine.filter((x) => x.status !== 'rejected');
    const paid = sum(valid.filter((x) => x.status === 'paid'), (x) => x.total);
    setHTML(f('e-totals'), html`<span>${mine.length} entr${mine.length === 1 ? 'y' : 'ies'} · ${inr(paid)} paid</span><strong>${inr(sum(valid, (x) => x.total))}</strong>`);
    setHTML(f('e-list'), mine.length
      ? html`${mine.map((x) => html`<div class="row-item tap" data-id="${x.id}" tabindex="0" role="button">
          <div><div class="pname">${fmtDay(x.date)}</div><div class="psub">${modeLabel(x)}${x.to ? ' · ' + x.to : ''}</div></div>
          <div class="row-right"><span class="amt">${inr(x.total)}</span>${badge(x.status)}</div></div>`)}`
      : empty('No expenses in this period.'));

    const advs = st.advances.filter((a) => a.userId === st.meId).sort((a, b) => b.createdAt - a.createdAt);
    setHTML(f('adv-list'), advs.length
      ? html`${advs.map((a) => html`<div class="row-item"><div><div class="pname">${a.purpose}</div><div class="psub">${fmtDate(a.from)} – ${fmtDate(a.to)} · ${a.days} day${a.days > 1 ? 's' : ''}</div></div><div class="row-right"><span class="amt">${inr(a.amount)}</span>${badge(a.status)}</div></div>`)}`
      : empty('No advance requests yet.'));

    const team = f('team-card');
    team.hidden = !st.managerView;
    if (st.managerView) {
      const advP = st.advances.filter((a) => a.status === 'submitted' && a.userId !== st.meId);
      const expP = st.expenses.filter((x) => x.status === 'submitted' && x.userId !== st.meId).sort((a, b) => b.createdAt - a.createdAt);
      const rows = [
        ...advP.map((a) => html`<div class="row-item"><div><div class="pname">${store.member(a.userId)?.name}</div><div class="psub">Advance · ${a.purpose} · ${inr(a.amount)}</div></div>
          <div class="row-right"><button class="btn-mini" data-adv-ok="${a.id}">Approve</button><button class="btn-mini danger" data-adv-no="${a.id}">Reject</button></div></div>`),
        ...expP.map((x) => html`<div class="row-item"><div><div class="pname">${store.member(x.userId)?.name}</div><div class="psub">${fmtDay(x.date)} · ${modeLabel(x)} · ${inr(x.total)}</div></div>
          <div class="row-right"><button class="btn-mini" data-exp-ok="${x.id}">Approve</button><button class="btn-mini danger" data-exp-no="${x.id}">Reject</button></div></div>`),
      ];
      setHTML(f('team-list'), rows.length ? html`${rows}` : empty('Nothing waiting for approval.'));
    }
  }
  f('team-list').addEventListener('click', (e) => {
    const d = e.target.dataset;
    const set = (coll, id, status, msg) => { store.update((st) => { st[coll].find((x) => x.id === id).status = status; }); toast(msg); };
    if (d.advOk) set('advances', d.advOk, 'approved', 'Advance approved');
    if (d.advNo) set('advances', d.advNo, 'rejected', 'Advance rejected');
    if (d.expOk) set('expenses', d.expOk, 'approved', 'Expense approved');
    if (d.expNo) set('expenses', d.expNo, 'rejected', 'Expense rejected');
  });
  f('e-period').addEventListener('change', (e) => { period = e.target.value; paintLists(); });
  const open = (e) => {
    const row = e.target.closest('.row-item[data-id]');
    if (!row || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    showExpense(row.dataset.id);
  };
  f('e-list').addEventListener('click', open);
  f('e-list').addEventListener('keydown', open);

  function showExpense(id) {
    const st = store.get();
    const x = st.expenses.find((e) => e.id === id);
    if (!x) return;
    const adv = st.advances.find((a) => a.id === x.advanceId);
    const r = (k, v) => (v ? html`<div class="bd-row mini-row"><span>${k}</span><span>${v}</span></div>` : '');
    openSheet(`Expense · ${fmtDay(x.date)}`, html`
      <div style="margin-bottom:10px">${badge(x.status)}</div>
      ${r('Mode', modeLabel(x))}${r('Route', x.from || x.to ? `${x.from || '—'} → ${x.to || '—'}` : '')}
      ${r('Travel', x.km ? `${num(x.km)} km × ₹${x.rate} = ${inr(x.km * x.rate)}` : '')}${r('Public / taxi', x.publicAmt ? inr(x.publicAmt) : '')}
      ${r('Boarding / meals', x.boarding ? inr(x.boarding) : '')}${r('Lodging', x.lodging ? inr(x.lodging) : '')}${r('Other', x.other ? inr(x.other) : '')}
      ${r('Advance', adv ? adv.purpose : '')}${r('Notes', x.notes)}${r('Bills', x.attachments.join(', '))}
      <div class="total-bar deep" style="margin-top:12px"><span>Total</span><strong>${inr(x.total)}</strong></div>
      ${x.status === 'submitted' ? html`<button type="button" class="btn-danger" data-del>Withdraw expense</button>` : html`<p class="footnote">Approved or paid expenses can't be withdrawn. Ask accounts to reverse it if needed.</p>`}`, {
      onMount(sheet, close) {
        $('[data-del]', sheet)?.addEventListener('click', () => {
          if (!confirm('Withdraw this expense?')) return;
          store.update((s) => { s.expenses = s.expenses.filter((e) => e.id !== id); });
          close(); toast('Expense withdrawn');
        });
      },
    });
  }

  // ---------- advance request ----------
  f('adv-new').addEventListener('click', () => {
    const st = store.get();
    const me = store.me();
    const rm = st.rateMaster.find((r) => r.designation === me.designation) || st.rateMaster[0];
    const perDay = rm.lodging + rm.food + rm.ta;
    openSheet('Request an advance', html`
      <p class="card-sub" style="margin:0 0 12px">${me.designation} limits: lodging ${inr(rm.lodging)}, food ${inr(rm.food)}, TA ${inr(rm.ta)} per day.</p>
      <div class="field"><label for="a-purpose">Trip purpose *</label><input type="text" id="a-purpose" placeholder="e.g. Shivamogga dealer tour"></div>
      <div class="row-2">
        <div class="field"><label for="a-from">From *</label><input type="date" id="a-from" value="${today()}"></div>
        <div class="field"><label for="a-to">To *</label><input type="date" id="a-to" value="${today()}"></div>
      </div>
      <div class="field"><label for="a-amt">Amount (₹)</label><input type="number" id="a-amt" min="0" inputmode="numeric"><p class="field-hint" id="a-hint"></p></div>
      <p class="error-text" id="a-err" hidden></p>
      <button type="button" class="btn-primary" id="a-save">Submit to ${MANAGER.name}</button>`, {
      onMount(sheet, close) {
        const g = (id) => $('#' + id, sheet);
        let touched = false;
        const recalc = () => {
          const d = g('a-from').value && g('a-to').value ? daysBetween(g('a-from').value, g('a-to').value) + 1 : 0;
          g('a-hint').textContent = d > 0 ? `${d} day${d > 1 ? 's' : ''} × ${inr(perDay)} = ${inr(d * perDay)} (limit)` : 'Pick valid dates';
          if (!touched && d > 0) g('a-amt').value = d * perDay;
          return d;
        };
        g('a-amt').addEventListener('input', () => { touched = true; });
        ['a-from', 'a-to'].forEach((id) => g(id).addEventListener('change', recalc));
        recalc();
        g('a-save').addEventListener('click', () => {
          const days = recalc();
          const amt = toNum(g('a-amt').value);
          const err = g('a-err');
          if (!g('a-purpose').value.trim()) return fieldError(err, 'Describe the trip.', [g('a-purpose')]);
          if (days <= 0) return fieldError(err, '“To” date must be on or after “From”.', [g('a-to')]);
          if (!amt) return fieldError(err, 'Enter the advance amount.', [g('a-amt')]);
          if (amt > days * perDay) return fieldError(err, `That's above your limit of ${inr(days * perDay)} for ${days} day${days > 1 ? 's' : ''}.`, [g('a-amt')]);
          store.update((s) => {
            s.advances.push({ id: uid('a'), userId: s.meId, purpose: g('a-purpose').value.trim(), from: g('a-from').value, to: g('a-to').value, days, perDay, amount: amt, status: 'submitted', approver: MANAGER.name, createdAt: Date.now() });
          });
          close(); toast('Advance request sent for approval');
        });
      },
    });
  });

  syncMode(); paintAdvSelect(); paintAdvSummary(); calc(); paintLists();
  return store.subscribe(() => { paintAdvSelect(); paintAdvSummary(); calc(); paintLists(); });
}

function modeLabel(x) { return x.mode === 'car' ? 'Car' : x.mode === 'bike' ? 'Bike' : x.mode === 'public' ? 'Public / taxi' : cap(x.mode === 'none' ? 'No travel' : x.mode); }
