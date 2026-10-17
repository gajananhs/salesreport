import { html, $, setHTML, today, addDays, fmtDay, uid } from '../util.js';
import { store } from '../store.js';
import { header, badge, chipGroup, bindChips, empty, toast, fieldError, clearInvalid } from '../ui.js';

export const title = 'Plans';

const TYPES = [['next_day', 'Next day plan'], ['next_week', 'Next week plan'], ['pending_work', 'Pending work']];
const LABEL = Object.fromEntries(TYPES);
let current = 'next_day';

export function render(root) {
  let editingId = null;

  setHTML(root, html`
    ${header({ kicker: 'What’s next', title: 'Plans & reminders' })}
    ${chipGroup('pl-type', TYPES, current, { scroll: true, label: 'Plan type' })}
    <div class="cols two">
      <div>
        <form class="card" id="pl-form" novalidate>
          <h3 id="pl-form-title">Add plan</h3>
          <div class="field"><label for="pl-name">Customer / dealer</label><input type="text" id="pl-name" list="customer-list" placeholder="optional — e.g. Sharma Traders" autocomplete="off"></div>
          <div class="field"><label for="pl-purpose">Purpose / task *</label><input type="text" id="pl-purpose" placeholder="e.g. Follow up on quotation"></div>
          <div class="field"><label for="pl-date">Planned date *</label><input type="date" id="pl-date"></div>
          <div class="field"><label for="pl-notes">Notes</label><textarea id="pl-notes" placeholder="Any other details"></textarea></div>
          <p class="error-text" id="pl-err" hidden></p>
          <button type="submit" class="btn-primary" id="pl-save">Save plan</button>
          <button type="button" class="btn-secondary" id="pl-cancel" hidden>Cancel edit</button>
        </form>
      </div>
      <div>
        <div class="card">
          <h3 id="pl-list-title">Open items</h3>
          <div id="pl-open"></div>
        </div>
        <div class="card">
          <h3>Completed</h3>
          <div id="pl-done"></div>
        </div>
      </div>
    </div>`);

  const f = (id) => $('#' + id, root);
  const defaultDate = (t) => (t === 'next_day' ? addDays(today(), 1) : t === 'next_week' ? addDays(today(), 7) : today());
  const typeChips = bindChips(root, 'pl-type', (v) => { current = v; if (!editingId) f('pl-date').value = defaultDate(v); paint(); });
  f('pl-date').value = defaultDate(current);

  function paint() {
    const st = store.get();
    const t = today();
    f('pl-list-title').textContent = `Open — ${LABEL[current]}`;
    const open = st.plans.filter((p) => !p.done && p.type === current).sort((a, b) => (a.date < b.date ? -1 : 1));
    const done = st.plans.filter((p) => p.done).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
    const row = (p, isDone) => html`<div class="row-item">
      <div><div class="pname" style="${isDone ? 'text-decoration:line-through;color:var(--sage)' : ''}">${p.purpose}</div>
      <div class="psub">${p.name ? p.name + ' · ' : ''}${fmtDay(p.date)}${isDone ? ' · ' + LABEL[p.type] : ''}${p.notes ? ' · ' + p.notes : ''}</div></div>
      <div class="row-right">
        ${!isDone && p.date < t ? badge('high', 'Overdue') : ''}
        ${isDone
          ? html`<button type="button" class="btn-mini" data-undo="${p.id}">Undo</button>`
          : html`<button type="button" class="btn-mini" data-edit="${p.id}" aria-label="Edit">Edit</button><button type="button" class="btn-mini" data-done="${p.id}">Done</button>`}
        <button type="button" class="btn-mini danger" data-del="${p.id}" aria-label="Delete">✕</button>
      </div></div>`;
    setHTML(f('pl-open'), open.length ? html`${open.map((p) => row(p, false))}` : empty('Nothing planned here yet.'));
    setHTML(f('pl-done'), done.length ? html`${done.map((p) => row(p, true))}` : empty('Completed items show up here.'));
  }

  root.addEventListener('click', (e) => {
    const d = e.target.dataset;
    if (d.done || d.undo) {
      store.update((st) => { const p = st.plans.find((x) => x.id === (d.done || d.undo)); p.done = !!d.done; });
      toast(d.done ? 'Marked done' : 'Moved back to open');
    } else if (d.del) {
      if (!confirm('Delete this plan?')) return;
      store.update((st) => { st.plans = st.plans.filter((x) => x.id !== d.del); });
      if (editingId === d.del) resetForm();
      toast('Plan deleted');
    } else if (d.edit) {
      const p = store.get().plans.find((x) => x.id === d.edit);
      editingId = p.id;
      f('pl-name').value = p.name; f('pl-purpose').value = p.purpose; f('pl-date').value = p.date; f('pl-notes').value = p.notes;
      f('pl-form-title').textContent = 'Edit plan';
      f('pl-save').textContent = 'Update plan';
      f('pl-cancel').hidden = false;
      f('pl-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      f('pl-purpose').focus({ preventScroll: true });
    }
  });

  function resetForm() {
    editingId = null;
    f('pl-form').reset();
    f('pl-date').value = defaultDate(current);
    f('pl-form-title').textContent = 'Add plan';
    f('pl-save').textContent = 'Save plan';
    f('pl-cancel').hidden = true;
  }
  f('pl-cancel').addEventListener('click', resetForm);

  f('pl-form').addEventListener('submit', (e) => {
    e.preventDefault();
    clearInvalid(root);
    const err = f('pl-err');
    const purpose = f('pl-purpose').value.trim();
    const date = f('pl-date').value;
    if (!purpose) return fieldError(err, 'Describe the plan or task.', [f('pl-purpose')]);
    if (!date) return fieldError(err, 'Pick a date.', [f('pl-date')]);
    if (!editingId && current !== 'pending_work' && date < today()) return fieldError(err, 'Planned date can’t be in the past.', [f('pl-date')]);
    fieldError(err, '');
    const rec = { name: f('pl-name').value.trim(), purpose, date, notes: f('pl-notes').value.trim() };
    store.update((st) => {
      if (editingId) Object.assign(st.plans.find((x) => x.id === editingId), rec);
      else st.plans.push({ id: uid('p'), type: typeChips.value, done: false, ...rec });
    });
    toast(editingId ? 'Plan updated' : `Added to ${LABEL[typeChips.value].toLowerCase()}`);
    resetForm();
  });

  paint();
  return store.subscribe(paint);
}
