// Derived figures shared by Home and Reports.
import { inRange, sum, addDays, parseISO, daysBetween, weekStart, fmtDate } from './util.js';

export function stats(state, range, userIds) {
  const ids = new Set(userIds);
  const v = state.visits.filter((x) => ids.has(x.userId) && inRange(x.date, range));
  const e = state.expenses.filter((x) => ids.has(x.userId) && inRange(x.date, range) && x.status !== 'rejected');
  return {
    visits: v.length,
    customers: v.filter((x) => x.type === 'customer' || x.type === 'consultant').length,
    dealers: v.filter((x) => x.type === 'dealer').length,
    quotes: v.filter((x) => x.quoteSent).length,
    quoteValue: sum(v, (x) => x.quoteValue),
    orders: v.filter((x) => x.orderRecv).length,
    orderValue: sum(v, (x) => x.orderValue),
    payValue: sum(v, (x) => x.payValue),
    km: sum(e, (x) => x.km),
    expense: sum(e, (x) => x.total),
    successful: v.filter((x) => x.outcome === 'successful').length,
    followUp: v.filter((x) => x.outcome === 'follow_up').length,
    pending: v.filter((x) => x.outcome === 'pending').length,
    lost: v.filter((x) => x.outcome === 'not_interested').length,
  };
}

/**
 * Order value bucketed for a bar chart. Ranges up to 14 days are shown per
 * day; longer ranges per ISO week.
 */
export function orderSeries(state, [from, to], userIds, metric = 'orderValue') {
  const ids = new Set(userIds);
  const v = state.visits.filter((x) => ids.has(x.userId) && x.date >= from && x.date <= to);
  const span = daysBetween(from, to) + 1;
  const buckets = [];
  if (span <= 14) {
    const start = span < 7 ? addDays(to, -6) : from;
    for (let d = start; d <= to; d = addDays(d, 1)) {
      buckets.push({ key: d, label: parseISO(d).toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3), tip: fmtDate(d), value: 0 });
    }
    const all = state.visits.filter((x) => ids.has(x.userId) && x.date >= start && x.date <= to);
    all.forEach((x) => { const b = buckets.find((k) => k.key === x.date); if (b) b.value += x[metric] || 0; });
  } else {
    for (let w = weekStart(from); w <= to; w = addDays(w, 7)) {
      const shown = w < from ? from : w; // first bucket may start mid-week
      buckets.push({ key: w, label: fmtDate(shown), tip: `Week of ${fmtDate(shown)}`, value: 0 });
    }
    v.forEach((x) => { const b = buckets.find((k) => k.key === weekStart(x.date)); if (b) b.value += x[metric] || 0; });
  }
  return buckets;
}
