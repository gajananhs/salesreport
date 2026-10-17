import { html, $, setHTML, inr, num, fmtDate, sum, debounce } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, empty, openSheet } from '../ui.js';

export const title = 'Sales Data';

const TYPES = [['quotations', 'Quotations'], ['transfer_orders', 'Transfer orders'], ['delivery_challans', 'Delivery challans']];
const PH = { quotations: 'QT-4141', transfer_orders: 'SO-8817', delivery_challans: 'DC-6257' };
let type = 'quotations';
let query = '';

export function render(root) {
  setHTML(root, html`
    ${header({ kicker: 'ERP documents', title: 'Sales data' })}
    <p class="card-sub" style="margin:-8px 2px 14px">Quotations, orders and challans from the ERP — separate from the self-reported figures under Reports. Sample data.</p>
    ${chipGroup('sd-type', TYPES, type, { scroll: true, label: 'Document type' })}
    <div class="field"><label class="sr-only" for="sd-q">Search</label><input type="search" id="sd-q" placeholder="Search number or customer — e.g. ${PH[type]}" value="${query}" autocomplete="off"></div>
    <div class="stat-strip" id="sd-strip"></div>
    <div class="card">
      <h3 id="sd-title"></h3>
      <div id="sd-list"></div>
      <div class="total-bar deep" id="sd-total"></div>
    </div>`);

  const f = (id) => $('#' + id, root);
  bindChips(root, 'sd-type', (v) => { type = v; f('sd-q').placeholder = `Search number or customer — e.g. ${PH[v]}`; paint(); });
  f('sd-q').addEventListener('input', debounce((e) => { query = e.target.value.trim(); paint(); }, 150));

  function paint() {
    const docs = store.get().docs.filter((d) => d.type === type);
    const q = query.toLowerCase();
    const list = docs.filter((d) => !q || d.number.toLowerCase().includes(q) || d.customer.toLowerCase().includes(q));
    const statuses = [...new Set(docs.map((d) => d.status))];
    setHTML(f('sd-strip'), html`<div class="stat"><div class="num">${docs.length}</div><div class="lbl">Documents</div></div>
      ${statuses.slice(0, 3).map((s) => html`<div class="stat"><div class="num">${docs.filter((d) => d.status === s).length}</div><div class="lbl">${s}</div></div>`)}`);
    f('sd-title').textContent = `${TYPES.find((t) => t[0] === type)[1]}${q ? ` matching “${query}”` : ''}`;
    setHTML(f('sd-list'), list.length
      ? html`${list.map((d) => html`<div class="row-item tap" data-id="${d.id}" tabindex="0" role="button">
          <div><div class="pname">${d.number} · ${d.customer}</div><div class="psub">${fmtDate(d.date)} · ${d.items.length} line${d.items.length > 1 ? 's' : ''} · ${d.rep}</div></div>
          <div class="row-right"><span class="amt">${inr(d.total)}</span>${badge(d.status)}</div></div>`)}`
      : empty(q ? 'No documents match that search.' : 'No documents.'));
    setHTML(f('sd-total'), html`<span>${list.length} document${list.length === 1 ? '' : 's'} · incl. GST</span><strong>${inr(sum(list, (d) => d.total))}</strong>`);
  }

  const open = (e) => {
    const row = e.target.closest('.row-item[data-id]');
    if (!row || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    const d = store.get().docs.find((x) => x.id === row.dataset.id);
    openSheet(d.number, html`
      <div class="btn-row" style="margin-bottom:10px">${badge(d.status)}</div>
      <div class="mini-row"><span>Customer</span><span>${d.customer}</span></div>
      <div class="mini-row"><span>City</span><span>${d.city}</span></div>
      <div class="mini-row"><span>Date</span><span>${fmtDate(d.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
      <div class="mini-row"><span>Sales rep</span><span>${d.rep}</span></div>
      <h3 class="section-title" style="margin-top:14px">Line items</h3>
      ${d.items.map((it) => html`<div class="row-item"><div><div class="pname">${it.name}</div><div class="psub">${num(it.qty)} ${it.unit} × ${inr(it.rate)}</div></div><span class="amt">${inr(it.qty * it.rate)}</span></div>`)}
      <div class="mini-row" style="margin-top:8px"><span>Subtotal</span><span class="amt">${inr(d.subtotal)}</span></div>
      <div class="mini-row"><span>GST 18%</span><span class="amt">${inr(d.gst)}</span></div>
      <div class="total-bar deep"><span>Total</span><strong>${inr(d.total)}</strong></div>`);
  };
  f('sd-list').addEventListener('click', open);
  f('sd-list').addEventListener('keydown', open);

  paint();
  return store.subscribe(paint);
}
