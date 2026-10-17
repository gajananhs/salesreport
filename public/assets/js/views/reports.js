import { html, $, setHTML, inr, inrShort, num, periodRange, fmtDate, PERIODS, today, sum } from '../util.js';
import { store } from '../store.js';
import { header, chipGroup, bindChips, empty } from '../ui.js';
import { stats, orderSeries } from '../metrics.js';
import { barChart, ring } from '../charts.js';

export const title = 'Reports';

let period = 'monthly';
let member = '';
let metric = 'orderValue';

const METRICS = [['orderValue', 'Orders'], ['quoteValue', 'Quotations'], ['payValue', 'Payments']];

export function render(root) {
  setHTML(root, html`
    ${header({ kicker: 'Self-reported performance', title: 'Reports', actions: html`<button type="button" class="icon-btn" id="r-print" aria-label="Print report"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/></svg></button>` })}
    ${chipGroup('r-period', Object.entries(PERIODS), period, { scroll: true, label: 'Period' })}
    <p class="footnote" id="r-range" style="margin:-4px 2px 10px"></p>
    <div class="cols two">
      <div>
        <div class="stat-grid" id="r-stats"></div>
        <div class="card">
          <h3>Trend <span></span></h3>
          ${chipGroup('r-metric', METRICS, metric, { label: 'Metric' })}
          <div id="r-chart"></div>
          <div class="chart-legend"><span id="r-chart-note"></span><span id="r-chart-total"></span></div>
        </div>
      </div>
      <div>
        <div class="card">
          <h3>Visit outcomes</h3>
          <div id="r-outcomes"></div>
        </div>
        <div class="card" id="r-team" hidden>
          <h3>Team performance</h3>
          <div class="field"><label for="r-member">View report for</label><select id="r-member"></select></div>
          <div id="r-team-body"></div>
        </div>
        <div class="card">
          <h3>Top customers</h3>
          <div id="r-top"></div>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);
  bindChips(root, 'r-period', (v) => { period = v; paint(); });
  bindChips(root, 'r-metric', (v) => { metric = v; paint(); });
  f('r-member').addEventListener('change', (e) => { member = e.target.value; paint(); });
  f('r-print').addEventListener('click', () => window.print());

  function paint() {
    const st = store.get();
    const range = periodRange(period);
    const ids = st.managerView && member === '__all' ? st.team.map((m) => m.id) : st.managerView && member ? [member] : [st.meId];
    const who = ids.length > 1 ? 'Whole team' : store.member(ids[0])?.name;
    f('r-range').textContent = `${who} · ${range[0] === range[1] ? fmtDate(range[0], { weekday: 'short', day: 'numeric', month: 'short' }) : `${fmtDate(range[0])} – ${fmtDate(range[1])}`}`;
    const s = stats(st, range, ids);
    setHTML(f('r-stats'), html`
      <div class="stat"><div class="num">${s.customers}</div><div class="lbl">Customers visited</div></div>
      <div class="stat"><div class="num">${s.dealers}</div><div class="lbl">Dealers visited</div></div>
      <div class="stat"><div class="num">${s.quotes}</div><div class="lbl">Quotations sent</div></div>
      <div class="stat"><div class="num">${s.orders}</div><div class="lbl">Orders received</div></div>
      <div class="stat accent"><div class="num">${inrShort(s.orderValue)}</div><div class="lbl">Order value</div></div>
      <div class="stat"><div class="num">${inrShort(s.payValue)}</div><div class="lbl">Payment received</div></div>
      <div class="stat"><div class="num">${num(s.km)}</div><div class="lbl">KM travelled</div></div>
      <div class="stat"><div class="num">${inrShort(s.expense)}</div><div class="lbl">Expenses</div></div>`);

    const buckets = orderSeries(st, range, ids, metric);
    setHTML(f('r-chart'), barChart(buckets, { highlightKey: today() }));
    f('r-chart-note').textContent = buckets.length && buckets[0].tip.startsWith('Week') ? 'Per week' : 'Per day';
    setHTML(f('r-chart-total'), html`Total <b>${inr(sum(buckets, (b) => b.value))}</b>`);

    const conv = s.visits ? (s.successful / s.visits) * 100 : 0;
    setHTML(f('r-outcomes'), s.visits
      ? html`<div class="ring-wrap">${ring(conv, `${Math.round(conv)}%`, 'converted')}
          <div class="ring-legend"><b>${s.visits}</b> visits<br>${s.successful} successful · ${s.followUp} follow-up<br>${s.pending} pending · ${s.lost} not interested</div></div>
          <p class="footnote">Quotation value ${inr(s.quoteValue)} · ${s.visits ? (s.km / Math.max(1, s.visits)).toFixed(1) : 0} km per visit · cost per visit ${inr(s.expense / Math.max(1, s.visits))}</p>`
      : empty('No visits in this period.'));

    // top customers by order value
    const set = new Set(ids);
    const byCust = {};
    st.visits.filter((v) => set.has(v.userId) && v.date >= range[0] && v.date <= range[1]).forEach((v) => {
      byCust[v.name] = byCust[v.name] || { orders: 0, visits: 0 };
      byCust[v.name].orders += v.orderValue; byCust[v.name].visits += 1;
    });
    const top = Object.entries(byCust).sort((a, b) => b[1].orders - a[1].orders || b[1].visits - a[1].visits).slice(0, 5);
    setHTML(f('r-top'), top.length
      ? html`${top.map(([n, x]) => html`<div class="row-item"><div><div class="pname">${n}</div><div class="psub">${x.visits} visit${x.visits > 1 ? 's' : ''}</div></div><span class="amt">${inr(x.orders)}</span></div>`)}`
      : empty('No customer activity in this period.'));

    // team
    f('r-team').hidden = !st.managerView;
    if (st.managerView) {
      setHTML(f('r-member'), html`<option value="">Me (${store.me().name})</option><option value="__all" ${member === '__all' ? 'selected' : ''}>All team members</option>${st.team.filter((m) => m.id !== st.meId).map((m) => html`<option value="${m.id}" ${member === m.id ? 'selected' : ''}>${m.name}</option>`)}`);
      const rows = st.team.map((m) => ({ m, s: stats(st, range, [m.id]) })).sort((a, b) => b.s.orderValue - a.s.orderValue);
      const max = Math.max(1, ...rows.map((r) => r.s.orderValue));
      setHTML(f('r-team-body'), html`${rows.map(({ m, s: x }) => html`<div class="row-item"><div style="flex:1">
          <div class="pname">${m.name}</div><div class="psub">${x.visits} visits · ${x.orders} orders · ${num(x.km)} km</div>
          <div class="progress"><i style="width:${Math.round((x.orderValue / max) * 100)}%"></i></div></div>
          <span class="amt">${inrShort(x.orderValue)}</span></div>`)}
        <div class="total-bar deep"><span>Team order value</span><strong>${inr(sum(rows, (r) => r.s.orderValue))}</strong></div>`);
    } else member = '';
  }

  paint();
  return store.subscribe(paint);
}
