// Meridian-style bar chart and ring, rendered as plain HTML/CSS.
import { html, inrShort, inr } from './util.js';

export function barChart(buckets, { highlightKey, format = inr } = {}) {
  const max = Math.max(1, ...buckets.map((b) => b.value));
  return html`<div class="bars" role="img" aria-label="${buckets.map((b) => `${b.tip}: ${format(b.value)}`).join(', ')}">
      ${buckets.map((b) => html`<div class="bar${b.key === highlightKey ? ' today' : ''}" tabindex="0" data-tip="${b.tip} · ${inrShort(b.value)}" style="height:${Math.max(3, Math.round((b.value / max) * 100))}%"></div>`)}
    </div>
    <div class="bar-lbls" aria-hidden="true">${buckets.map((b) => html`<div class="bar-lbl">${b.label}</div>`)}</div>`;
}

export function ring(pct, big, small) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return html`<div class="ring" style="--p:${p}%" role="img" aria-label="${big} ${small}"><div class="ring-inner"><b>${big}</b><span>${small}</span></div></div>`;
}
