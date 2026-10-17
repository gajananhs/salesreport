import { html, $, setHTML, today, fmtDay, uid } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, empty, toast, fieldError, clearInvalid, openSheet } from '../ui.js';
import { MANAGER } from '../data.js';

export const title = 'Tasks';

const NEXT = { open: 'in_progress', in_progress: 'done', done: 'open' };
const NEXT_LABEL = { open: 'Start', in_progress: 'Mark done', done: 'Reopen' };
let filter = '';

export function render(root) {
  setHTML(root, html`
    ${header({ kicker: 'Assigned work & IndiaMART leads', title: 'Tasks' })}
    <div class="cols two">
      <div>
        <div class="stat-strip" id="t-strip"></div>
        <div class="card">
          <h3><span id="t-title">My tasks</span></h3>
          ${chipGroup('t-filter', [['', 'All'], ['open', 'Open'], ['in_progress', 'In progress'], ['done', 'Done']], filter, { scroll: true, label: 'Status filter' })}
          <div id="t-list"></div>
        </div>
      </div>
      <div>
        <div id="mgr-tools" hidden>
          <form class="card" id="assign-form" novalidate>
            <h3>Assign a task</h3>
            <div class="field"><label for="as-title">Task *</label><input type="text" id="as-title" placeholder="e.g. Send revised quote"></div>
            <div class="row-2">
              <div class="field"><label for="as-to">Assign to *</label><select id="as-to"></select></div>
              <div class="field"><label for="as-due">Due *</label><input type="date" id="as-due"></div>
            </div>
            <div class="field"><label for="as-cust">Customer</label><input type="text" id="as-cust" list="customer-list" placeholder="optional"></div>
            <span class="label">Priority</span>
            ${chipGroup('as-pri', [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']], 'medium', { label: 'Priority' })}
            <div class="field"><label for="as-notes">Notes</label><textarea id="as-notes" placeholder="Anything the rep should know"></textarea></div>
            <p class="error-text" id="as-err" hidden></p>
            <button type="submit" class="btn-primary">Assign task</button>
          </form>
          <div class="card">
            <h3>Unassigned IndiaMART leads <button type="button" class="link" id="sync">↻ Sync</button></h3>
            <p class="card-sub">Leads that matched no pincode or region rule.</p>
            <div id="leads"></div>
          </div>
        </div>
        <div class="card" id="emp-help">
          <h3>How tasks work</h3>
          <p class="footnote">Tasks come from your manager or are auto-routed from IndiaMART buy-leads by pincode and region. Tap a task for details; use the button to move it from <b>Open</b> → <b>In progress</b> → <b>Done</b>. Switch on <b>Manager view</b> in Profile to assign tasks and route leads.</p>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);
  bindChips(root, 't-filter', (v) => { filter = v; paint(); });
  const pri = bindChips(root, 'as-pri');
  f('as-due').value = today();

  function paint() {
    const st = store.get();
    const mgr = st.managerView;
    f('mgr-tools').hidden = !mgr;
    f('emp-help').hidden = mgr;
    f('t-title').textContent = mgr ? 'All team tasks' : 'My tasks';
    const scope = st.tasks.filter((x) => mgr || x.assignedTo === st.meId);
    const count = (s) => scope.filter((x) => x.status === s).length;
    const overdue = scope.filter((x) => x.status !== 'done' && x.due < today()).length;
    setHTML(f('t-strip'), html`
      <div class="stat"><div class="num">${count('open')}</div><div class="lbl">Open</div></div>
      <div class="stat"><div class="num">${count('in_progress')}</div><div class="lbl">In progress</div></div>
      <div class="stat"><div class="num">${count('done')}</div><div class="lbl">Done</div></div>
      <div class="stat${overdue ? ' accent' : ''}"><div class="num">${overdue}</div><div class="lbl">Overdue</div></div>`);
    const order = { open: 0, in_progress: 1, done: 2 };
    const list = scope.filter((x) => !filter || x.status === filter).sort((a, b) => order[a.status] - order[b.status] || (a.due < b.due ? -1 : 1));
    setHTML(f('t-list'), list.length
      ? html`${list.map((x) => html`<div class="row-item">
          <div class="tap" data-open="${x.id}" tabindex="0" role="button" style="cursor:pointer">
            <div class="pname">${x.title}</div>
            <div class="psub">${x.source === 'IndiaMART' ? 'IndiaMART · ' : ''}${x.customer || x.city}${mgr ? ' · ' + (store.member(x.assignedTo)?.name || '—') : ''} · due ${fmtDay(x.due)}${x.status !== 'done' && x.due < today() ? ' · overdue' : ''}</div>
          </div>
          <div class="row-right">${badge(x.status)}<button type="button" class="btn-mini" data-next="${x.id}">${NEXT_LABEL[x.status]}</button></div>
        </div>`)}`
      : empty(filter ? 'No tasks with this status.' : 'No tasks assigned yet.'));

    if (mgr) {
      setHTML(f('as-to'), html`${st.team.map((m) => html`<option value="${m.id}">${m.name}</option>`)}`);
      setHTML(f('leads'), st.leads.length
        ? html`${st.leads.map((l) => html`<div class="row-item"><div><div class="pname">${l.buyer}</div><div class="psub">${l.product} · ${l.city}, ${l.pincode}</div></div>
            <div class="row-right"><select class="input" data-lead="${l.id}" aria-label="Assign ${l.buyer}" style="width:auto;min-height:32px;padding:5px 26px 5px 8px;font-size:11.5px"><option value="">Assign…</option>${st.team.map((m) => html`<option value="${m.id}">${m.name.split(' ')[0]}</option>`)}</select></div></div>`)}`
        : empty('Every lead has an owner.'));
    }
  }

  f('t-list').addEventListener('click', (e) => {
    const next = e.target.closest('[data-next]');
    if (next) {
      const id = next.dataset.next;
      let to;
      store.update((st) => { const t = st.tasks.find((x) => x.id === id); t.status = NEXT[t.status]; to = t.status; });
      toast(to === 'done' ? 'Task completed' : to === 'in_progress' ? 'Task started' : 'Task reopened');
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open) detail(open.dataset.open);
  });
  f('t-list').addEventListener('keydown', (e) => {
    const open = e.target.closest('[data-open]');
    if (open && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); detail(open.dataset.open); }
  });

  function detail(id) {
    const x = store.get().tasks.find((t) => t.id === id);
    if (!x) return;
    const r = (k, v) => (v ? html`<div class="mini-row"><span>${k}</span><span>${v}</span></div>` : '');
    openSheet(x.title, html`
      <div class="btn-row" style="margin-bottom:10px">${badge(x.status)} ${badge(x.priority)}</div>
      ${r('Customer', x.customer)}${r('City', x.city)}${r('Phone', x.phone)}${r('Source', x.source)}
      ${r('Assigned to', store.member(x.assignedTo)?.name)}${r('Assigned by', x.assignedBy)}${r('Due', fmtDay(x.due))}
      ${x.notes ? html`<p class="footnote" style="font-size:12px;color:var(--ink)">${x.notes}</p>` : ''}
      <div class="btn-row" style="margin-top:14px">
        ${x.phone ? html`<a class="btn-secondary" style="flex:1;text-align:center;text-decoration:none;margin:0" href="tel:${x.phone.replace(/\s/g, '')}">Call</a>` : ''}
        <button type="button" class="btn-primary" data-next style="flex:1">${NEXT_LABEL[x.status]}</button>
      </div>`, {
      onMount(sheet, close) {
        $('[data-next]', sheet).addEventListener('click', () => {
          store.update((st) => { const t = st.tasks.find((k) => k.id === id); t.status = NEXT[t.status]; });
          close(); toast('Task updated');
        });
      },
    });
  }

  f('assign-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearInvalid(root);
    const err = f('as-err');
    if (!f('as-title').value.trim()) return fieldError(err, 'Describe the task.', [f('as-title')]);
    if (!f('as-due').value) return fieldError(err, 'Pick a due date.', [f('as-due')]);
    if (f('as-due').value < today()) return fieldError(err, 'Due date can’t be in the past.', [f('as-due')]);
    fieldError(err, '');
    const to = f('as-to').value;
    const cust = store.get().customers.find((c) => c.name === f('as-cust').value.trim());
    store.update((st) => {
      st.tasks.push({ id: uid('t'), title: f('as-title').value.trim(), customer: f('as-cust').value.trim(), city: cust?.city || '', phone: cust?.phone || '', source: 'Manager', assignedTo: to, assignedBy: MANAGER.name, due: f('as-due').value, priority: pri.value, status: 'open', notes: f('as-notes').value.trim() });
    });
    toast(`Task assigned to ${store.member(to)?.name}`);
    f('assign-form').reset(); f('as-due').value = today(); pri.set('medium');
  });

  f('leads').addEventListener('change', (e) => {
    const id = e.target.dataset.lead;
    const to = e.target.value;
    if (!id || !to) return;
    store.update((st) => {
      const l = st.leads.find((x) => x.id === id);
      st.leads = st.leads.filter((x) => x.id !== id);
      st.tasks.push({ id: uid('t'), title: `IndiaMART lead: ${l.product}`, customer: l.buyer, city: l.city, phone: '', source: 'IndiaMART', assignedTo: to, assignedBy: `${MANAGER.name} (manual)`, due: today(), priority: 'high', status: 'open', notes: `Pincode ${l.pincode}, ${l.state}` });
    });
    toast(`Lead assigned to ${store.member(to)?.name}`);
  });

  f('sync').addEventListener('click', () => {
    const btn = f('sync');
    btn.textContent = 'Syncing…'; btn.disabled = true;
    setTimeout(() => {
      btn.textContent = '↻ Sync'; btn.disabled = false;
      toast(navigator.onLine ? 'IndiaMART is up to date — no new leads' : 'You are offline — sync will work when you reconnect');
    }, 900);
  });

  paint();
  return store.subscribe(paint);
}
