import { html, $, setHTML, inr, today, fmtDay, periodRange, inRange, sum, uid, toNum, cap } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, switchRow, periodSelect, empty, toast, fieldError, clearInvalid, openSheet } from '../ui.js';

export const title = 'Visits';

const TYPES = [['customer', 'Customer'], ['dealer', 'Dealer'], ['consultant', 'Consultant'], ['office', 'Office work']];
const CATS = [['direct', 'Direct'], ['distributor', 'Distributor'], ['retailer', 'Retailer'], ['industrial', 'Industrial'], ['other', 'Other']];
const OUTCOMES = [['successful', 'Successful'], ['follow_up', 'Follow-up'], ['pending', 'Pending'], ['not_interested', 'Not interested']];

let period = 'weekly';

export function render(root) {
  let editingId = null;
  let gps = null;

  setHTML(root, html`
    ${header({ kicker: 'Customer & dealer calls', title: 'Visits' })}
    <div class="cols two">
      <div>
        <div class="gps warn" id="gps"><span id="gps-text"><span class="dot"></span>Location not captured</span><button type="button" class="btn-mini" id="gps-btn">Capture</button></div>
        <form class="card" id="visit-form" novalidate>
          <h3 id="vf-title">Log a visit</h3>
          <span class="label">Visit type</span>
          ${chipGroup('v-type', TYPES, 'customer', { label: 'Visit type' })}
          <div class="row-2">
            <div class="field"><label for="v-date">Visit date</label><input type="date" id="v-date" required></div>
            <div class="field"><label for="v-phone">Contact phone</label><input type="tel" id="v-phone" inputmode="tel" placeholder="98765 43210" autocomplete="off"></div>
          </div>
          <div class="field"><label for="v-name" id="v-name-label">Customer / dealer name *</label><input type="text" id="v-name" list="customer-list" placeholder="e.g. Sharma Traders" autocomplete="off" required></div>
          <div class="field"><label for="v-location">Location</label><input type="text" id="v-location" placeholder="e.g. Peenya, Bengaluru" autocomplete="off"></div>
          <span class="label">Customer category</span>
          ${chipGroup('v-cat', CATS, 'direct', { scroll: true, label: 'Customer category' })}
          <div class="row-2">
            <div class="field"><label for="v-purpose">Purpose</label><input type="text" id="v-purpose" placeholder="e.g. Product demo"></div>
            <div class="field"><label for="v-product">Product discussed</label><input type="text" id="v-product" placeholder="e.g. 40 mm air piping"></div>
          </div>
          <span class="label">Outcome</span>
          ${chipGroup('v-outcome', OUTCOMES, 'pending', { scroll: true, label: 'Outcome' })}
          <div class="field" id="v-follow-wrap" hidden><label for="v-follow">Follow-up date</label><input type="date" id="v-follow"></div>
          ${switchRow('v-qsent', 'Quotation sent', false)}
          <div class="field reveal" id="v-qwrap" hidden><label for="v-qval">Quotation value (₹)</label><input type="number" id="v-qval" min="0" inputmode="numeric" placeholder="0"></div>
          ${switchRow('v-orecv', 'Order received', false)}
          <div class="field reveal" id="v-owrap" hidden><label for="v-oval">Order value (₹)</label><input type="number" id="v-oval" min="0" inputmode="numeric" placeholder="0"></div>
          ${switchRow('v-pcoll', 'Payment collected', false)}
          <div class="field reveal" id="v-pwrap" hidden><label for="v-pval">Payment amount (₹)</label><input type="number" id="v-pval" min="0" inputmode="numeric" placeholder="0"></div>
          <div class="field" style="margin-top:10px"><label for="v-comp">Competitor activity</label><textarea id="v-comp" placeholder="e.g. Competitor quoted lower price"></textarea></div>
          <div class="field"><label for="v-remarks">Remarks</label><textarea id="v-remarks" placeholder="Any other notes"></textarea></div>
          <p class="error-text" id="v-err" hidden></p>
          <button type="submit" class="btn-primary" id="v-save">Save visit</button>
          <button type="button" class="btn-secondary" id="v-cancel" hidden>Cancel edit</button>
        </form>
      </div>
      <div>
        <div class="card">
          <h3>Recent visits ${periodSelect('v-period', period)}</h3>
          <div class="total-bar" id="v-totals"></div>
          <div id="v-list"></div>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);
  const type = bindChips(root, 'v-type', syncType);
  const cat = bindChips(root, 'v-cat');
  const outcome = bindChips(root, 'v-outcome', syncOutcome);
  f('v-date').value = today();

  function syncType(v) {
    f('v-name-label').textContent = v === 'office' ? 'Task / place *' : v === 'consultant' ? 'Consultant name *' : 'Customer / dealer name *';
  }
  function syncOutcome(v) { f('v-follow-wrap').hidden = v !== 'follow_up'; }
  [['v-qsent', 'v-qwrap'], ['v-orecv', 'v-owrap'], ['v-pcoll', 'v-pwrap']].forEach(([sw, wrap]) => {
    f(sw).addEventListener('change', () => { f(wrap).hidden = !f(sw).checked; });
  });

  // autofill phone/location from the customer master
  f('v-name').addEventListener('change', () => {
    const c = store.get().customers.find((x) => x.name.toLowerCase() === f('v-name').value.trim().toLowerCase());
    if (!c) return;
    if (!f('v-phone').value) f('v-phone').value = c.phone;
    if (!f('v-location').value) f('v-location').value = c.city;
    cat.set(c.category);
    if (c.type) { type.set(c.type); syncType(c.type); }
  });

  // ---------- GPS ----------
  function paintGps(state, text) {
    const el = f('gps');
    el.classList.toggle('warn', state !== 'ok');
    setHTML(f('gps-text'), html`<span class="dot"></span>${text}`);
    f('gps-btn').textContent = state === 'ok' ? 'Refresh' : state === 'busy' ? '…' : 'Capture';
    f('gps-btn').disabled = state === 'busy';
  }
  function captureGps() {
    if (!('geolocation' in navigator)) { paintGps('err', 'Location not supported on this device'); return; }
    paintGps('busy', 'Capturing GPS location…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        gps = { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5), acc: Math.round(p.coords.accuracy) };
        paintGps('ok', `Location captured · ±${gps.acc} m`);
      },
      (e) => paintGps('err', e.code === 1 ? 'Location permission denied — visit saves without GPS' : 'Could not get location — tap Capture to retry'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  f('gps-btn').addEventListener('click', captureGps);
  // capture silently only when permission was granted earlier (no surprise prompt)
  navigator.permissions?.query({ name: 'geolocation' }).then((r) => { if (r.state === 'granted') captureGps(); }).catch(() => {});

  // ---------- save ----------
  f('visit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearInvalid(root);
    const err = f('v-err');
    const name = f('v-name').value.trim();
    const date = f('v-date').value;
    if (!name) return fieldError(err, 'Enter the customer, dealer or task name.', [f('v-name')]);
    if (!date) return fieldError(err, 'Pick the visit date.', [f('v-date')]);
    if (date > today()) return fieldError(err, 'Visit date can’t be in the future — use Plans for upcoming visits.', [f('v-date')]);
    if (outcome.value === 'follow_up' && !f('v-follow').value) return fieldError(err, 'Pick a follow-up date.', [f('v-follow')]);
    if (outcome.value === 'follow_up' && f('v-follow').value < date) return fieldError(err, 'Follow-up date must be on or after the visit date.', [f('v-follow')]);
    for (const [sw, val, label] of [['v-qsent', 'v-qval', 'quotation value'], ['v-orecv', 'v-oval', 'order value'], ['v-pcoll', 'v-pval', 'payment amount']]) {
      if (f(sw).checked && !toNum(f(val).value)) return fieldError(err, `Enter the ${label}.`, [f(val)]);
    }
    fieldError(err, '');

    const rec = {
      date, type: type.value, name, phone: f('v-phone').value.trim(), location: f('v-location').value.trim(),
      category: cat.value, purpose: f('v-purpose').value.trim(), product: f('v-product').value.trim(), outcome: outcome.value,
      followUp: outcome.value === 'follow_up' ? f('v-follow').value : '',
      quoteSent: f('v-qsent').checked, quoteValue: f('v-qsent').checked ? toNum(f('v-qval').value) : 0,
      orderRecv: f('v-orecv').checked, orderValue: f('v-orecv').checked ? toNum(f('v-oval').value) : 0,
      payColl: f('v-pcoll').checked, payValue: f('v-pcoll').checked ? toNum(f('v-pval').value) : 0,
      competitor: f('v-comp').value.trim(), remarks: f('v-remarks').value.trim(),
    };
    store.update((st) => {
      if (editingId) {
        const v = st.visits.find((x) => x.id === editingId);
        Object.assign(v, rec, gps ? { gps } : {});
      } else {
        st.visits.push({ id: uid('v'), userId: st.meId, km: 0, gps, createdAt: Date.now(), ...rec });
        // add new names to the customer master so they autocomplete next time
        if (rec.type !== 'office' && !st.customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          st.customers.push({ name, type: rec.type, city: rec.location, phone: rec.phone, category: rec.category });
        }
        // a follow-up automatically becomes a plan
        if (rec.followUp) st.plans.push({ id: uid('p'), type: 'next_week', name, purpose: `Follow-up: ${rec.purpose || 'visit'}`, date: rec.followUp, notes: '', done: false });
      }
    });
    toast(editingId ? 'Visit updated' : rec.followUp ? 'Visit saved · follow-up added to Plans' : 'Visit saved');
    resetForm();
  });

  function resetForm() {
    editingId = null;
    f('visit-form').reset();
    f('v-date').value = today();
    type.set('customer'); cat.set('direct'); outcome.set('pending');
    syncType('customer'); syncOutcome('pending');
    ['v-qwrap', 'v-owrap', 'v-pwrap'].forEach((w) => { f(w).hidden = true; });
    f('vf-title').textContent = 'Log a visit';
    f('v-save').textContent = 'Save visit';
    f('v-cancel').hidden = true;
  }
  f('v-cancel').addEventListener('click', resetForm);

  function startEdit(id) {
    const v = store.get().visits.find((x) => x.id === id);
    if (!v) return;
    editingId = id;
    type.set(v.type); cat.set(v.category); outcome.set(v.outcome);
    syncType(v.type); syncOutcome(v.outcome);
    f('v-date').value = v.date; f('v-name').value = v.name; f('v-phone').value = v.phone; f('v-location').value = v.location;
    f('v-purpose').value = v.purpose; f('v-product').value = v.product; f('v-follow').value = v.followUp || '';
    [['v-qsent', 'v-qwrap', 'v-qval', v.quoteSent, v.quoteValue], ['v-orecv', 'v-owrap', 'v-oval', v.orderRecv, v.orderValue], ['v-pcoll', 'v-pwrap', 'v-pval', v.payColl, v.payValue]]
      .forEach(([sw, wrap, val, on, amt]) => { f(sw).checked = on; f(wrap).hidden = !on; f(val).value = on ? amt : ''; });
    f('v-comp').value = v.competitor; f('v-remarks').value = v.remarks;
    f('vf-title').textContent = `Edit visit — ${v.name}`;
    f('v-save').textContent = 'Update visit';
    f('v-cancel').hidden = false;
    f('visit-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    f('v-name').focus({ preventScroll: true });
  }

  // ---------- list ----------
  function paintList() {
    const st = store.get();
    const range = periodRange(period);
    const list = st.visits.filter((v) => v.userId === st.meId && inRange(v.date, range)).sort((a, b) => b.createdAt - a.createdAt);
    setHTML(f('v-totals'), html`<span>${list.length} visit${list.length === 1 ? '' : 's'} · orders</span><strong>${inr(sum(list, (v) => v.orderValue))}</strong>`);
    setHTML(f('v-list'), list.length
      ? html`${list.map((v) => html`<div class="row-item tap" data-id="${v.id}" tabindex="0" role="button" aria-label="Open visit ${v.name}">
          <div><div class="pname">${v.name}</div><div class="psub">${fmtDay(v.date)} · ${cap(v.type)}${v.orderValue ? ' · order ' + inr(v.orderValue) : v.quoteValue ? ' · quote ' + inr(v.quoteValue) : ''}</div></div>
          ${badge(v.outcome)}</div>`)}`
      : empty('No visits in this period.'));
  }
  f('v-period').addEventListener('change', (e) => { period = e.target.value; paintList(); });
  const openFromList = (e) => {
    const row = e.target.closest('.row-item[data-id]');
    if (!row || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    showDetail(row.dataset.id);
  };
  f('v-list').addEventListener('click', openFromList);
  f('v-list').addEventListener('keydown', openFromList);

  function showDetail(id) {
    const v = store.get().visits.find((x) => x.id === id);
    if (!v) return;
    const row = (k, val) => (val ? html`<div class="mini-row"><span>${k}</span><span>${val}</span></div>` : '');
    openSheet(v.name, html`
      <div style="margin-bottom:10px">${badge(v.outcome)}</div>
      ${row('Date', fmtDay(v.date))}${row('Type', cap(v.type))}${row('Category', cap(v.category))}
      ${row('Phone', v.phone)}${row('Location', v.location)}${row('Purpose', v.purpose)}${row('Product', v.product)}
      ${row('Follow-up', v.followUp ? fmtDay(v.followUp) : '')}
      ${row('Quotation', v.quoteSent ? inr(v.quoteValue) : '')}${row('Order', v.orderRecv ? inr(v.orderValue) : '')}${row('Payment', v.payColl ? inr(v.payValue) : '')}
      ${row('Competitor', v.competitor)}${row('Remarks', v.remarks)}
      ${row('GPS', v.gps ? `${v.gps.lat}, ${v.gps.lng}` : '')}
      <div class="btn-row" style="margin-top:16px">
        <button type="button" class="btn-primary" data-edit style="flex:1">Edit</button>
        <button type="button" class="btn-danger" data-del style="flex:1">Delete</button>
      </div>`, {
      onMount(sheet, close) {
        $('[data-edit]', sheet).addEventListener('click', () => { close(); startEdit(id); });
        $('[data-del]', sheet).addEventListener('click', () => {
          if (!confirm(`Delete the visit to ${v.name}?`)) return;
          store.update((st) => { st.visits = st.visits.filter((x) => x.id !== id); });
          if (editingId === id) resetForm();
          close(); toast('Visit deleted');
        });
      },
    });
  }

  paintList();
  return store.subscribe(paintList);
}
