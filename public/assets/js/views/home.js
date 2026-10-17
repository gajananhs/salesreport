import { html, raw, $, $$, setHTML, inr, inrShort, num, today, fmtTime, fmtDay, periodRange, pad2, sum, uid, addDays } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, empty, toast } from '../ui.js';
import { stats, orderSeries } from '../metrics.js';
import { barChart } from '../charts.js';
import { icons } from '../icons.js';

export const title = 'Home';

export function render(root) {
  const s = store.get();
  const me = store.me();
  const first = me.name.split(' ')[0];

  setHTML(root, html`
    ${header({ kicker: new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }), title: `Hi, ${first}` })}
    <div class="cols two">
      <div>
        <div class="hero">
          <div class="label">Field day</div>
          <div class="time" id="clock">00:00:00</div>
          <div class="sub" id="day-sub"></div>
          <div class="hero-row">
            <button class="hero-btn" id="day-btn"></button>
            <a class="hero-btn ghost" href="#/visits" style="text-decoration:none;text-align:center">+ Visit</a>
          </div>
          <div class="hero-meta" id="day-meta"></div>
        </div>
        <div class="stat-strip" id="home-strip"></div>
        <div class="card">
          <h3>This week <span class="link" id="week-total"></span></h3>
          <div id="week-chart"></div>
          <div class="chart-legend"><span>Order value by day</span><span id="week-best"></span></div>
        </div>
        <div class="card" id="dw-card">
          <h3>Daily work report <span class="link" id="dw-status"></span></h3>
          <p class="card-sub">Pick how today's work is logged, then add a row for each activity.</p>
          ${chipGroup('dw-type', [['office', 'Office work'], ['field', 'Field work']], s.dailyWork.workType, { label: 'Work type' })}
          <div id="dw-body"></div>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Today's value <a href="#/reports">Reports</a></h3>
          <div id="today-value"></div>
        </div>
        <div class="card" id="approvals-card" hidden>
          <h3>Pending approvals <a href="#/expenses">See all</a></h3>
          <div id="approvals"></div>
        </div>
        <div class="card">
          <h3>Reminders &amp; plans <a href="#/plans">See all</a></h3>
          <div id="home-plans"></div>
        </div>
        <div class="card">
          <h3>Open tasks <a href="#/tasks">See all</a></h3>
          <div id="home-tasks"></div>
        </div>
        <div class="quick">
          <button type="button" data-go="#/visits"><span class="qi">${raw(icons.pin)}</span>Log visit</button>
          <button type="button" data-go="#/expenses"><span class="qi">${raw(icons.receipt)}</span>Log expense</button>
          <button type="button" data-go="#/plans"><span class="qi">${raw(icons.calendar)}</span>Add plan</button>
        </div>
      </div>
    </div>`);

  $$('.quick [data-go]', root).forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.go; }));

  // ---------- clock + field day ----------
  const tick = () => {
    const n = new Date();
    $('#clock', root).textContent = `${pad2(n.getHours())}:${pad2(n.getMinutes())}:${pad2(n.getSeconds())}`;
  };
  tick();
  const timer = setInterval(tick, 1000);

  function paintDay() {
    const { day } = store.get();
    const btn = $('#day-btn', root);
    const sub = $('#day-sub', root);
    if (!day.startedAt) {
      btn.textContent = 'Start field day'; btn.classList.remove('checked');
      sub.textContent = 'Day not started yet';
    } else if (!day.endedAt) {
      btn.textContent = 'End field day'; btn.classList.add('checked');
      sub.textContent = `Started at ${fmtTime(day.startedAt)}`;
    } else {
      btn.textContent = 'Resume day'; btn.classList.remove('checked');
      const mins = Math.round((day.endedAt - day.startedAt) / 60000);
      sub.textContent = `Day closed at ${fmtTime(day.endedAt)} · ${Math.floor(mins / 60)}h ${mins % 60}m on the field`;
    }
  }
  $('#day-btn', root).addEventListener('click', () => {
    store.update((st) => {
      if (!st.day.startedAt || st.day.endedAt) {
        if (!st.day.startedAt) st.day.startedAt = Date.now();
        st.day.endedAt = null;
      } else st.day.endedAt = Date.now();
    });
    paintDay();
    toast(store.get().day.endedAt ? 'Field day closed — good work today' : 'Field day started');
  });

  // ---------- figures ----------
  function paintFigures() {
    const st = store.get();
    const t = today();
    const d = stats(st, [t, t], [st.meId]);
    setHTML($('#day-meta', root), html`<span>Visits <b>${d.visits}</b></span><span>KM <b>${num(d.km)}</b></span><span>Orders <b>${inrShort(d.orderValue)}</b></span>`);
    setHTML($('#home-strip', root), html`
      <div class="stat"><div class="num">${d.customers}</div><div class="lbl">Customers visited</div></div>
      <div class="stat"><div class="num">${d.dealers}</div><div class="lbl">Dealers visited</div></div>
      <div class="stat"><div class="num">${d.quotes}</div><div class="lbl">Quotations sent</div></div>
      <div class="stat accent"><div class="num">${d.orders}</div><div class="lbl">Orders received</div></div>`);
    setHTML($('#today-value', root), html`
      <div class="row-item"><div class="pname">Order value received</div><span class="amt">${inr(d.orderValue)}</span></div>
      <div class="row-item"><div class="pname">Payment collected</div><span class="amt">${inr(d.payValue)}</span></div>
      <div class="row-item"><div class="pname">Quotation value</div><span class="amt">${inr(d.quoteValue)}</span></div>
      <div class="row-item"><div class="pname">KM travelled</div><span class="amt">${num(d.km)} km</span></div>
      <div class="row-item"><div class="pname">Expenses logged</div><span class="amt">${inr(d.expense)}</span></div>`);

    const wk = periodRange('weekly');
    // always show the full Mon–Sun week; future days stay empty
    const buckets = orderSeries(st, [wk[0], addDays(wk[0], 6)], [st.meId]);
    setHTML($('#week-chart', root), barChart(buckets, { highlightKey: t }));
    const wTotal = sum(buckets, (b) => b.value);
    $('#week-total', root).textContent = inr(wTotal);
    const best = buckets.reduce((a, b) => (b.value > a.value ? b : a), buckets[0]);
    setHTML($('#week-best', root), best && best.value ? html`Best: <b>${best.tip}</b>` : html``);

    // approvals (manager view)
    const apCard = $('#approvals-card', root);
    apCard.hidden = !st.managerView;
    if (st.managerView) {
      const pend = st.expenses.filter((e) => e.status === 'submitted' && e.userId !== st.meId).slice(0, 3);
      const adv = st.advances.filter((a) => a.status === 'submitted');
      const rows = [
        ...adv.map((a) => html`<div class="row-item"><div><div class="pname">${store.member(a.userId)?.name}</div><div class="psub">Advance · ${inr(a.amount)}</div></div>${badge('submitted', 'Pending')}</div>`),
        ...pend.map((e) => html`<div class="row-item"><div><div class="pname">${store.member(e.userId)?.name}</div><div class="psub">Expense · ${inr(e.total)} · ${fmtDay(e.date)}</div></div>${badge('submitted', 'Pending')}</div>`),
      ];
      setHTML($('#approvals', root), rows.length ? html`${rows}` : empty('Nothing waiting for you.'));
    }

    const plans = st.plans.filter((p) => !p.done).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3);
    setHTML($('#home-plans', root), plans.length
      ? html`${plans.map((p) => html`<div class="row-item"><div><div class="pname">${p.purpose}</div><div class="psub">${p.name ? p.name + ' · ' : ''}${fmtDay(p.date)}</div></div>${p.date < t ? badge('high', 'Overdue') : ''}</div>`)}`
      : empty('No open plans. Add one for tomorrow.'));

    const tasks = st.tasks.filter((x) => x.assignedTo === st.meId && x.status !== 'done').slice(0, 3);
    setHTML($('#home-tasks', root), tasks.length
      ? html`${tasks.map((x) => html`<div class="row-item"><div><div class="pname">${x.title}</div><div class="psub">${x.customer || x.city} · due ${fmtDay(x.due)}</div></div>${badge(x.status)}</div>`)}`
      : empty('All caught up.'));
  }

  // ---------- daily work report ----------
  let rows = s.dailyWork.rows.length ? s.dailyWork.rows.map((r) => ({ ...r })) : [];
  const typeChips = bindChips(root, 'dw-type', (v) => {
    if (!rows.length) rows.push(blankRow(v));
    paintDW();
  });

  function blankRow(type) {
    return { id: uid('r'), from: '', to: '', activity: '', customer: type === 'office' ? 'Office' : '' };
  }
  function paintDW() {
    const body = $('#dw-body', root);
    const st = store.get();
    $('#dw-status', root).textContent = st.dailyWork.savedAt ? `Saved ${fmtTime(st.dailyWork.savedAt)}` : '';
    if (!typeChips.value) { setHTML(body, html``); return; }
    setHTML(body, html`
      ${rows.map((r, i) => html`<div class="dw-row" data-id="${r.id}">
        <div class="dw-head"><span>ROW ${i + 1}</span><button type="button" class="btn-mini danger" data-del="${r.id}" aria-label="Remove row ${i + 1}">Remove</button></div>
        <div class="row-2">
          <div class="field"><label for="dw-f-${r.id}">From</label><input type="time" id="dw-f-${r.id}" data-k="from" value="${r.from}"></div>
          <div class="field"><label for="dw-t-${r.id}">To</label><input type="time" id="dw-t-${r.id}" data-k="to" value="${r.to}"></div>
        </div>
        <div class="field"><label for="dw-a-${r.id}">Activity</label><input type="text" id="dw-a-${r.id}" data-k="activity" value="${r.activity}" placeholder="e.g. Quotation preparation"></div>
        <div class="field"><label for="dw-c-${r.id}">Customer / place</label><input type="text" id="dw-c-${r.id}" data-k="customer" value="${r.customer}" placeholder="e.g. Deccan Polymers" list="customer-list"></div>
      </div>`)}
      <button type="button" class="btn-secondary" id="dw-add">+ Add row</button>
      <p class="error-text" id="dw-err" hidden></p>
      <button type="button" class="btn-primary" id="dw-save" style="margin-top:10px">Save report</button>`);
  }
  $('#dw-card', root).addEventListener('input', (e) => {
    const k = e.target.dataset.k;
    const id = e.target.closest('.dw-row')?.dataset.id;
    const r = rows.find((x) => x.id === id);
    if (k && r) r[k] = e.target.value;
  });
  $('#dw-card', root).addEventListener('click', (e) => {
    if (e.target.id === 'dw-add') { rows.push(blankRow(typeChips.value)); paintDW(); $$('.dw-row input[data-k="from"]', root).pop()?.focus(); }
    if (e.target.dataset.del) { rows = rows.filter((r) => r.id !== e.target.dataset.del); paintDW(); }
    if (e.target.id === 'dw-save') {
      const err = $('#dw-err', root);
      const bad = rows.findIndex((r) => !r.activity.trim());
      const badTime = rows.findIndex((r) => r.from && r.to && r.to < r.from);
      if (!rows.length) { err.textContent = 'Add at least one row.'; err.hidden = false; return; }
      if (bad >= 0) { err.textContent = `Row ${bad + 1}: describe the activity.`; err.hidden = false; return; }
      if (badTime >= 0) { err.textContent = `Row ${badTime + 1}: "To" time is before "From".`; err.hidden = false; return; }
      err.hidden = true;
      store.update((st) => { st.dailyWork = { date: today(), workType: typeChips.value, rows: rows.map((r) => ({ ...r })), savedAt: Date.now() }; });
      paintDW();
      toast(`Daily report saved — ${rows.length} row${rows.length > 1 ? 's' : ''}`);
    }
  });

  paintDay();
  paintFigures();
  paintDW();
  const unsub = store.subscribe(paintFigures);
  return () => { clearInterval(timer); unsub(); };
}
