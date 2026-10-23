/* Sales Reporter — PWA shell.
 * Runs after the original app.js. It only adds things around the app:
 * line icons + sidebar brand, install / update / offline banners, and
 * the service worker. It never changes app logic or data.
 * APP_VERSION is stamped by scripts/build.mjs.
 */
(function () {
  'use strict';
  var APP_VERSION = '2.0.0';
  window.SR_PWA_VERSION = APP_VERSION;

  var svg = function (body) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  var ICONS = {
    home: svg('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>'),
    visit: svg('<path d="M12 21s-7-5.6-7-11.2A7 7 0 0 1 19 9.8C19 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.6"/>'),
    expense: svg('<path d="M12 2v20M17 5.5c0-1.6-2-2.5-5-2.5S7 4 7 5.8s2 2.4 5 2.9 5 1.3 5 3-2 2.8-5 2.8-5-.9-5-2.5"/>'),
    tasks: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    plans: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'),
    reports: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    salesdata: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    profile: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    logbook: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
    more: svg('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
    receipt: svg('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
  };

  function $(id) { return document.getElementById(id); }

  // ---------- Meridian phone frame (presentation only) ----------
  // Moves the existing page into a phone-shaped container. Elements keep
  // their ids and event listeners, so app.js behaves exactly as before.
  var screenEl = null;
  function buildFrame() {
    if ($('sr-phone')) return;
    var phone = document.createElement('div'); phone.id = 'sr-phone';
    var notch = document.createElement('div'); notch.id = 'sr-notch'; notch.setAttribute('aria-hidden', 'true');
    screenEl = document.createElement('div'); screenEl.id = 'sr-screen';
    phone.appendChild(notch); phone.appendChild(screenEl);
    Array.prototype.slice.call(document.body.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'SCRIPT') return;
      screenEl.appendChild(n);
    });
    document.body.insertBefore(phone, document.body.firstChild);
  }
  function toTop() { if (screenEl) screenEl.scrollTop = 0; else window.scrollTo(0, 0); }

  // ---------- icons + 5-tab bar with "More" (presentation only) ----------
  var PRIMARY = ['home', 'visit', 'expense', 'tasks'];
  function decorateNav() {
    var bar = document.querySelector('.tab-bar');
    if (!bar) return;
    var buttons = Array.prototype.slice.call(bar.querySelectorAll('.tab-btn'));
    buttons.forEach(function (b) {
      var key = b.dataset.view || (b.id === 'btn-open-logbook' ? 'logbook' : '');
      var span = b.querySelector('span');
      if (span && ICONS[key]) { span.innerHTML = ICONS[key]; span.setAttribute('aria-hidden', 'true'); }
      if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', b.textContent.trim());
    });
    var qa = { 'qa-visit': ICONS.visit, 'qa-expense': ICONS.receipt, 'qa-plan': ICONS.plans };
    Object.keys(qa).forEach(function (id) {
      var el = $(id) && $(id).querySelector('.action-icon');
      if (el) el.innerHTML = qa[id];
    });

    // Extra tabs move into a "More" sheet; their original buttons stay in the
    // DOM (hidden) so app.js keeps driving them — we simply click them.
    var extra = buttons.filter(function (b) { return PRIMARY.indexOf(b.dataset.view) < 0; });
    extra.forEach(function (b) { b.classList.add('sr-overflow'); });
    var more = document.createElement('button');
    more.type = 'button'; more.id = 'sr-more-btn'; more.className = 'sr-tab';
    more.setAttribute('aria-haspopup', 'dialog'); more.setAttribute('aria-label', 'More');
    more.innerHTML = '<span aria-hidden="true">' + ICONS.more + '</span>More';
    bar.appendChild(more);

    var sheet = document.createElement('div');
    sheet.id = 'sr-more'; sheet.hidden = true; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', 'More');
    (screenEl || document.body).appendChild(sheet);
    function openMore() {
      var html = '<div class="sheet"><div class="grip"></div><h3>More</h3>';
      extra.forEach(function (b, i) {
        if (b.classList.contains('hidden') || b.style.display === 'none') return;
        var key = b.dataset.view || 'logbook';
        html += '<button type="button" class="item' + (b.classList.contains('active') ? ' active' : '') + '" data-i="' + i + '"><span class="ico">' + (ICONS[key] || '') + '</span>' + b.textContent.trim() + '</button>';
      });
      sheet.innerHTML = html + '</div>';
      sheet.hidden = false;
      var first = sheet.querySelector('button.item'); if (first) first.focus();
    }
    function closeMore() { sheet.hidden = true; }
    more.addEventListener('click', openMore);
    sheet.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('button.item');
      if (item) { closeMore(); extra[+item.dataset.i].click(); toTop(); return; }
      if (e.target === sheet) closeMore();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) closeMore(); });

    // "More" is highlighted whenever one of its screens is the active one
    var syncMore = function () {
      var on = extra.some(function (b) { return b.classList.contains('active'); });
      more.classList.toggle('active', on);
    };
    if (window.MutationObserver) extra.forEach(function (b) { new MutationObserver(syncMore).observe(b, { attributes: true, attributeFilter: ['class'] }); });
    syncMore();

    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.tab-btn');
      if (b && b.dataset.view) toTop();
    });
  }

  // ---------- banners ----------
  var state = { offline: !navigator.onLine, update: false, install: false };
  var deferredPrompt = null;
  var waitingWorker = null;
  var updateRequested = false;

  function paintBanner() {
    var host = $('pwa-banner');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pwa-banner';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      (screenEl || document.body).insertBefore(host, (screenEl || document.body).firstChild);
      host.addEventListener('click', onBannerClick);
    }
    var html = '';
    if (state.offline) html += '<div class="pb off"><span>You\'re offline — Sales Reporter needs a connection to load and save data. It will work again as soon as you reconnect.</span></div>';
    if (state.update) html += '<div class="pb"><span>A new version of the app is ready.</span><button type="button" data-act="update">Reload</button></div>';
    if (state.install && !state.update) html += '<div class="pb"><span>Install Sales Reporter on this device for one-tap access.</span><span><button type="button" data-act="install">Install</button> <button type="button" class="x" data-act="dismiss" aria-label="Dismiss">✕</button></span></div>';
    host.innerHTML = html;
  }

  function onBannerClick(e) {
    var act = e.target.closest && e.target.closest('[data-act]');
    if (!act) return;
    act = act.dataset.act;
    if (act === 'update') {
      if (!waitingWorker) { location.reload(); return; }
      updateRequested = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    if (act === 'install' && deferredPrompt) {
      var p = deferredPrompt; deferredPrompt = null;
      p.prompt();
      p.userChoice.finally(function () { state.install = false; paintBanner(); });
    }
    if (act === 'dismiss') {
      state.install = false; paintBanner();
      try { localStorage.setItem('sr_install_dismissed', '1'); } catch (_) { /* ignore */ }
    }
  }

  window.addEventListener('online', function () { state.offline = false; paintBanner(); });
  window.addEventListener('offline', function () { state.offline = true; paintBanner(); });
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var dismissed = false;
    try { dismissed = localStorage.getItem('sr_install_dismissed') === '1'; } catch (_) { /* ignore */ }
    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    state.install = !dismissed && !standalone;
    paintBanner();
  });
  window.addEventListener('appinstalled', function () { deferredPrompt = null; state.install = false; paintBanner(); });

  // ---------- service worker ----------
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var go = function () {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' }).then(function (reg) {
        var track = function (w) {
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) { waitingWorker = w; state.update = true; paintBanner(); }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; state.update = true; paintBanner(); }
        reg.addEventListener('updatefound', function () { if (reg.installing) track(reg.installing); });
        document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') reg.update().catch(function () {}); });
      }).catch(function (err) { console.warn('Service worker registration failed:', err); });
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading || !updateRequested) return;
      reloading = true;
      location.reload();
    });
  }

  // Friendlier text when the server can't be reached (network down or the
  // server's api/.htaccess CORS file missing). Presentation only.
  function explainNetworkErrors() {
    var msg = 'Can\u2019t reach the Sales Reporter server. Check your internet connection. ' +
      'If this keeps happening, the server needs its one-time setup file (api/.htaccess) \u2014 see the README.';
    ['login-error', 'register-error', 'forgot-error'].forEach(function (id) {
      var el = $(id);
      if (!el || !window.MutationObserver) return;
      new MutationObserver(function () {
        if (/failed to fetch|networkerror|load failed/i.test(el.textContent)) el.textContent = msg;
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  // Logbook hand-off opens as a real link (new window, no opener), so an
  // installed Logbook app picks it up instead of a browser tab. app.js uses
  // window.open(url, "_blank", "noopener") only for that hand-off; same
  // result when Logbook isn't installed. Every other window.open is untouched.
  function openHandoffAsLink() {
    var nativeOpen = window.open;
    window.open = function (url, target, features) {
      if (url && target === '_blank' && /noopener/i.test(features || '')) {
        var a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
        return null; // window.open with noopener also returns null
      }
      return nativeOpen.apply(window, arguments);
    };
  }

  openHandoffAsLink();
  buildFrame();
  decorateNav();
  explainNetworkErrors();
  paintBanner();
  registerSW();
})();
