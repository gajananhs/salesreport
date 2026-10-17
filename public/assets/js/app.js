/* ============================================================
   SALES REPORTER — client-side app (plain JS, no framework)
   Talks to /api/*.php endpoints, stores session token in
   localStorage, captures GPS via navigator.geolocation.
   ============================================================ */

(function () {
  "use strict";

  // PWA: the app is served from GitHub Pages; the API stays on the existing
  // server. SR_CONFIG.SERVER comes from assets/js/config.js.
  var SERVER = (window.SR_CONFIG && window.SR_CONFIG.SERVER) || "";
  var API = SERVER + "api/";
  // Server-relative file paths (e.g. uploads/expense_bills/x.jpg) -> absolute URL.
  function srvUrl(p) { p = String(p || ""); return /^(https?:|data:|blob:)/i.test(p) || !SERVER ? p : SERVER + p.replace(/^\/+/, ""); }
  var TOKEN_KEY = "sr_token";
  var USER_KEY = "sr_user";

  var state = {
    user: null,
    settings: { car_rate_per_km: 12, bike_rate_per_km: 3, company_name: "My Company" },
    visitGps: null,
    expenseGps: null,
    teamMembers: [],
  };

  // ---------------- helpers ----------------
  function $(id) { return document.getElementById(id); }

  function api(path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) headers["X-Session-Token"] = token;
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () {
        throw new Error("Server returned an invalid response");
      }).then(function (data) {
        if (!data.ok) {
          if (res.status === 401) { doLocalLogout(); }
          throw new Error(data.error || "Request failed");
        }
        return data;
      });
    });
  }

  // Same as api(), but sends a FormData body (multipart/form-data) instead
  // of JSON — used wherever a file may be attached (e.g. expense receipts).
  // Never set Content-Type manually here: the browser must add its own
  // multipart boundary, which it can only do if the header is left unset.
  function apiUpload(path, formData) {
    var headers = {};
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) headers["X-Session-Token"] = token;
    return fetch(API + path, { method: "POST", headers: headers, body: formData })
      .then(function (res) {
        return res.json().catch(function () {
          throw new Error("Server returned an invalid response");
        }).then(function (data) {
          if (!data.ok) {
            if (res.status === 401) { doLocalLogout(); }
            throw new Error(data.error || "Request failed");
          }
          return data;
        });
      });
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.add("hidden"); }, 2600);
  }

  function money(n) {
    n = Number(n) || 0;
    return "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  // Local calendar date as YYYY-MM-DD. Using Date#toISOString() here would
  // return UTC, which silently rolls to the wrong day for IST users near
  // midnight — exactly what makes "today" mismatch between browser and
  // server. Always use this instead for date-input defaults.
  function localDateStr(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  // "Work for the Day" tasks are stored server-side as a JSON array string.
  function parseTasks(raw) {
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(function (t) { return typeof t === "string" && t.trim() !== ""; }) : [];
    } catch (e) { return []; }
  }

  // Chip group: returns getter for the active value
  function chipGroup(containerId, onChange) {
    var box = $(containerId);
    box.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      e.preventDefault();
      box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
      btn.classList.add("active");
      if (onChange) onChange(btn.dataset.value);
    });
    return function () {
      var active = box.querySelector(".chip.active");
      return active ? active.dataset.value : null;
    };
  }

  // ---------------- view switching ----------------
  function show(viewId) {
    ["view-login", "view-register", "view-forgot"].forEach(function (id) { $(id).classList.add("hidden"); });
    if (viewId === "login" || viewId === "register" || viewId === "forgot") {
      $("app-shell").classList.add("hidden");
      $("view-" + viewId).classList.remove("hidden");
      return;
    }
    $("app-shell").classList.remove("hidden");
    document.querySelectorAll(".tab-view").forEach(function (v) { v.classList.add("hidden"); });
    $("view-" + viewId).classList.remove("hidden");
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === viewId);
    });
    // Refresh data when entering tabs
    if (viewId === "home") { loadHome(); loadHomePlansPreview(); loadDailyReport(); }
    if (viewId === "visit") { captureGps("visit"); loadVisits(); }
    if (viewId === "expense") { captureGps("expense"); loadExpenses(); updateExpenseTotal(); }
    if (viewId === "tasks") loadTasks();
    if (viewId === "plans") loadPlans();
    if (viewId === "reports") loadReports();
    if (viewId === "salesdata") loadSalesData();
    if (viewId === "profile") loadProfile();
  }

  document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { show(btn.dataset.view); });
  });

  // ---------------- GPS ----------------
  function captureGps(kind) {
    var card = $(kind + "-gps");
    var status = $(kind + "-gps-status");
    card.classList.remove("gps-ok", "gps-err");
    if (!navigator.geolocation) {
      card.classList.add("gps-err");
      status.textContent = "GPS not supported on this device";
      return;
    }
    status.textContent = "Capturing GPS location\u2026";
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var fix = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        if (kind === "visit") state.visitGps = fix; else state.expenseGps = fix;
        card.classList.add("gps-ok");
        status.textContent = "\u2713 Location captured: " +
          fix.latitude.toFixed(5) + ", " + fix.longitude.toFixed(5);
      },
      function (err) {
        card.classList.add("gps-err");
        status.textContent = "GPS unavailable: " + (err.message || "permission denied") +
          " \u2014 you can still save without location.";
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  $("visit-gps-retry").addEventListener("click", function () { captureGps("visit"); });
  $("expense-gps-retry").addEventListener("click", function () { captureGps("expense"); });

  // ---------------- auth ----------------
  var getRegRole = chipGroup("reg-role");

  $("link-register").addEventListener("click", function (e) { e.preventDefault(); show("register"); });
  $("link-login").addEventListener("click", function (e) { e.preventDefault(); show("login"); });
  $("link-forgot").addEventListener("click", function (e) { e.preventDefault(); show("forgot"); });
  $("link-back-login").addEventListener("click", function (e) { e.preventDefault(); show("login"); });

  $("btn-forgot").addEventListener("click", function () {
    $("forgot-error").textContent = "";
    var btn = this;
    btn.disabled = true;
    api("forgot_password.php", {
      method: "POST",
      body: { email: $("forgot-email").value },
    }).then(function () {
      $("forgot-form").classList.add("hidden");
      $("forgot-sent").classList.remove("hidden");
    }).catch(function (err) {
      $("forgot-error").textContent = err.message;
    }).then(function () { btn.disabled = false; });
  });

  $("btn-login").addEventListener("click", function () {
    $("login-error").textContent = "";
    api("login.php", {
      method: "POST",
      body: { email: $("login-email").value, password: $("login-password").value },
    }).then(function (data) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      state.user = data.user;
      enterApp();
    }).catch(function (err) { $("login-error").textContent = err.message; });
  });

  $("btn-register").addEventListener("click", function () {
    $("register-error").textContent = "";
    api("register.php", {
      method: "POST",
      body: {
        name: $("reg-name").value,
        email: $("reg-email").value,
        phone: $("reg-phone").value,
        password: $("reg-password").value,
        role: getRegRole(),
        territory: $("reg-territory").value,
      },
    }).then(function (data) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      state.user = data.user;
      enterApp();
    }).catch(function (err) { $("register-error").textContent = err.message; });
  });

  $("btn-logout").addEventListener("click", function () {
    try { localStorage.removeItem("sr_approver_device"); } catch (e) {}   // explicit log out: forget approver device
    api("logout.php", { method: "POST" }).catch(function () {}).then(doLocalLogout);
  });

  function doLocalLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    state.user = null;
    show("login");
  }

  // ---------------- Logbook (single sign-on hand-off) ----------------
  // Clicking the tab does NOT switch an in-app view — it asks the server
  // for a short-lived signed link (valid 2 minutes) and opens LOGBOOK in a
  // new tab, already logged in as the same person by name. No second PIN.
  var logbookBtn = $("btn-open-logbook");
  if (logbookBtn) {
    logbookBtn.addEventListener("click", function () {
      logbookBtn.disabled = true;
      api("get_logbook_link.php")
        .then(function (data) {
          window.open(data.url, "_blank", "noopener");
        })
        .catch(function (err) {
          toast(err.message || "Could not open Logbook");
        })
        .then(function () { logbookBtn.disabled = false; });
    });
  }

  function roleLabel(role) {
    return {
      gm: "General Manager",
      ceo: "CEO",
      mh: "Marketing Head",
      tm: "Territory Manager",
      am: "Assistant Manager",
      mm: "Marketing Manager",
      me: "Marketing Executive",
    }[role] || role;
  }

  function enterApp() {
    // Gajanan / Ramji: remember this browser so Approve buttons in emails
    // (old ones included) approve directly here, without signing in.
    api("approve_link.php", { method: "POST", body: { action: "device" } }).then(function (d) {
      try { localStorage.setItem("sr_approver_device", d.device); } catch (e) {}
    }, function () {});
    api("get_settings.php").then(function (data) {
      state.settings = data.settings;
    }).catch(function () {});
    show("home");
  }

  // ---------------- home ----------------
  function loadHome() {
    var u = state.user;
    if (!u) return;
    var h = new Date().getHours();
    $("home-greeting").textContent = h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,";
    $("home-name").textContent = u.name;
    $("home-role").textContent = roleLabel(u.role);

    api("get_my_summary.php?period=daily").then(function (data) {
      $("st-customers").textContent = data.visits.customers_visited || 0;
      $("st-dealers").textContent = data.visits.dealers_visited || 0;
      $("st-quotes").textContent = data.visits.quotations_sent || 0;
      $("st-orders").textContent = data.visits.orders_received || 0;
      $("st-ovalue").textContent = money(data.visits.order_value);
      $("st-pvalue").textContent = money(data.visits.payment_collected);
      $("st-km").textContent = Number(data.expenses.total_km || 0).toFixed(0);
      $("st-expense").textContent = money(data.expenses.total_expenses);
    }).catch(function (err) { toast(err.message); });
    loadPaymentQueue();
  }

  // ---------------- Payments to Make (Accounts — Sukanya H S only) ----------------
  // The server decides who this is for (api/get_payment_queue.php → 403 for
  // everyone else); the card just stays hidden then.
  var PAY_MODES = ["Bank Transfer", "UPI", "Cash", "Cheque"];
  var PAY_SOURCE = { salesreport: "Sales Report", tallyfield: "TallyField", tally: "Tally" };
  function paidNote(a) {
    var p = a && a.paid;
    if (!p) return "";
    return '<div class="rc-status-note">\uD83D\uDCB0 Paid ' + money(p.amount) + " on " + esc(p.on) + " via " + esc(p.mode || "") +
      (p.ref ? " \u00B7 Ref/Txn " + esc(p.ref) : "") + " \u00B7 from " + esc(PAY_SOURCE[p.source] || p.source || "Sales Report") +
      " \u00B7 by " + esc(p.by || "") + "</div>";
  }
  var HIST_LABEL = { created: "Request created", approved: "Approved", fully_approved: "Sent to Accounts", rejected: "Rejected",
    approvals_reset: "Edited \u2014 approvals cleared", paid: "Payment recorded" };
  function historyHtml(r) {
    return (r.history || []).map(function (h) {
      return "<div>" + esc(String(h.created_at).slice(0, 16)) + " \u2014 " + esc(HIST_LABEL[h.event] || h.event) +
        (h.actor_name ? " \u00B7 " + esc(h.actor_name) : "") + (h.detail ? " \u00B7 " + esc(h.detail) : "") + "</div>";
    }).join("") || "<div>No history yet.</div>";
  }
  function payCardHtml(r, withPayBtn) {
    var paid = r.approval && r.approval.paid;
    return '<div class="record-card" data-pay-card="' + r.id + '">' +
      '<div class="rc-top"><span>' + esc(r.request_no) + " \u2014 " + esc(r.employee_name) + "</span><span>" + money(r.total_advance_requested) + "</span></div>" +
      '<div class="rc-badges"><span class="status-pill ' + (paid ? "approved" : "pending") + '">' + (paid ? "Paid" : "Approved \u2013 Awaiting Payment") + "</span></div>" +
      '<div class="rc-sub">' + esc(r.purpose_of_travel || "") + " \u00B7 " + esc(r.travel_from || "") + " \u2192 " + esc(r.travel_to || "") +
      " \u00B7 " + esc(r.date_from) + " to " + esc(r.date_to) + "</div>" +
      advApprovalLine(r) + paidNote(r.approval) +
      '<div class="ax-actions"><button class="btn-small" data-pay-view="' + r.id + '" style="margin-top:0;">View</button>' +
      '<button class="btn-small" data-pay-form="' + r.id + '" style="margin-top:0;">Export Form</button>' +
      '<button class="btn-small" data-pay-hist="' + r.id + '" style="margin-top:0;">History</button>' +
      (withPayBtn ? '<button class="btn-small" data-pay-open="' + r.id + '" style="margin-top:0;border-color:var(--success);color:var(--success);">Mark as Paid</button>' : "") +
      '</div><div class="pay-editor hidden" id="pay-ed-' + r.id + '"></div>' +
      '<div class="rc-status-note hidden" id="pay-hist-' + r.id + '" style="margin-top:8px;">' + historyHtml(r) + "</div></div>";
  }
  // Inline "Mark as Paid" form — shared by the Home card and the Advance Expenses list.
  function openPayEditor(box, r, onDone) {
    box.innerHTML =
      '<div class="row-2"><div><label>Amount paid (\u20B9)</label><input type="number" class="pe-amt" min="0" step="0.01" max="' + r.total_advance_requested + '" value="' + r.total_advance_requested + '"></div>' +
      '<div><label>Paid on</label><input type="date" class="pe-date" max="' + localDateStr() + '" value="' + localDateStr() + '"></div></div>' +
      '<div class="row-2"><div><label>Mode</label><select class="pe-mode">' + PAY_MODES.map(function (m) { return "<option>" + m + "</option>"; }).join("") + "</select></div>" +
      '<div><label>UTR / Ref</label><input type="text" class="pe-ref" maxlength="80" placeholder="Required unless Cash"></div></div>' +
      '<p class="error-msg pe-err"></p>' +
      '<div class="ax-actions"><button class="btn-small pe-save" style="margin-top:0;border-color:var(--success);color:var(--success);">Confirm payment</button>' +
      '<button class="btn-small pe-cancel" style="margin-top:0;">Cancel</button></div>';
    box.classList.remove("hidden");
    box.querySelector(".pe-cancel").addEventListener("click", function () { box.classList.add("hidden"); box.innerHTML = ""; });
    box.querySelector(".pe-save").addEventListener("click", function () {
      var btn = this; btn.disabled = true;
      var err = box.querySelector(".pe-err"); err.textContent = "";
      api("mark_advance_paid.php", { method: "POST", body: {
        id: r.id, amount: box.querySelector(".pe-amt").value, paid_on: box.querySelector(".pe-date").value,
        mode: box.querySelector(".pe-mode").value, ref: box.querySelector(".pe-ref").value
      } }).then(function () {
        toast(r.request_no + " marked paid \u2713 \u2014 employee notified");
        onDone();
      }).catch(function (e) { err.textContent = e.message; btn.disabled = false; });
    });
  }
  var payQueue = [];
  function loadPaymentQueue() {
    api("get_payment_queue.php").then(function (d) {
      payQueue = d.to_pay.concat(d.paid);
      $("home-pay-card").classList.remove("hidden");
      $("home-pay-summary").textContent = d.to_pay.length
        ? d.to_pay.length + " approved request" + (d.to_pay.length === 1 ? "" : "s") + " to pay \u00B7 " + money(d.total_due)
        : "Nothing to pay right now \u2014 requests appear here as soon as Gajanan approves them.";
      $("home-pay-list").innerHTML = d.to_pay.map(function (r) { return payCardHtml(r, true); }).join("");
      $("home-paid-wrap").classList.toggle("hidden", !d.paid.length);
      $("home-paid-list").innerHTML = d.paid.map(function (r) { return payCardHtml(r, false); }).join("");
    }).catch(function () { $("home-pay-card").classList.add("hidden"); });
  }
  $("home-pay-card").addEventListener("click", function (e) {
    var b = e.target.closest("[data-pay-open],[data-pay-view],[data-pay-form],[data-pay-hist]");
    if (!b) return;
    if (b.dataset.payHist) { $("pay-hist-" + b.dataset.payHist).classList.toggle("hidden"); return; }
    if (b.dataset.payForm) { exportAdvanceRequest(Number(b.dataset.payForm)); return; }
    if (b.dataset.payView) { openAdvanceHub(); openAdvForm(Number(b.dataset.payView), false); return; }
    var r = payQueue.find(function (x) { return x.id === Number(b.dataset.payOpen); });
    if (r) openPayEditor($("pay-ed-" + r.id), r, loadPaymentQueue);
  });

  function loadHomePlansPreview() {
    api("get_plans.php?status=open").then(function (data) {
      var box = $("home-plans-preview");
      var items = data.plans.slice(0, 3);
      if (!items.length) {
        box.innerHTML = '<p class="empty-note">No open reminders. You\'re all caught up.</p>';
        return;
      }
      box.innerHTML = items.map(planCardHtml).join("");
    }).catch(function () { $("home-plans-preview").innerHTML = ""; });
  }

  $("qa-visit").addEventListener("click", function () { show("visit"); });
  $("qa-expense").addEventListener("click", function () { show("expense"); });
  $("qa-plan").addEventListener("click", function () { show("plans"); });
  $("home-plans-link").addEventListener("click", function (e) { e.preventDefault(); show("plans"); });

  // ---------------- Daily Work Report (Home tab): Office Work / Field Work ----------------
  var dwRows = [];          // in-memory row data, rebuilt from/to the DOM
  var dwLoadedForType = null; // work_type the currently-open form was populated for
  var dwHasSaved = false;   // true once today's report has been saved at least once this session

  var getDwWorkType = chipGroup("dw-worktype", function (val) {
    if (dwRows.length && dwLoadedForType && dwLoadedForType !== val) {
      if (!confirm("Rows will be cleared. Switch work type anyway?")) {
        setDwChip(dwLoadedForType);
        return;
      }
    }
    dwLoadedForType = val;
    dwRows = [];
    $("dw-rows-section").classList.remove("hidden");
    renderDwRows();
  });

  function setDwChip(val) {
    $("dw-worktype").querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("active", c.dataset.value === val);
    });
  }

  function loadDailyReport() {
    dwHasSaved = false;
    $("dw-saved-hint").textContent = "";
    api("get_daily_report.php").then(function (data) {
      if (!data.report) {
        dwLoadedForType = null;
        dwRows = [];
        setDwChip(null);
        $("dw-rows-section").classList.add("hidden");
        return;
      }
      dwHasSaved = true;
      dwLoadedForType = data.report.work_type;
      dwRows = data.report.rows || [];
      setDwChip(dwLoadedForType);
      $("dw-rows-section").classList.remove("hidden");
      renderDwRows();
      $("dw-saved-hint").textContent = "Saved for today \u2014 " + dwRows.length + " row" + (dwRows.length === 1 ? "" : "s") + ". Edit and Save again to update.";
    }).catch(function () { /* non-critical on Home load */ });
  }

  function dwFieldRowHtml(n, r) {
    r = r || {};
    return '<div class="row-2">' +
      '<div><label>Customer / Dealer Name *</label><input type="text" class="dw-f-contact" placeholder="e.g. Sharma Traders" value="' + esc(r.contact_name || "") + '"></div>' +
      '<div><label>Location</label><input type="text" class="dw-f-location" placeholder="e.g. Andheri East, Mumbai" value="' + esc(r.location || "") + '"></div>' +
      "</div>" +
      '<label>Purpose</label><input type="text" class="dw-f-purpose" placeholder="e.g. Follow-up on quotation" value="' + esc(r.purpose || "") + '">' +
      '<label>KM Travelled</label><input type="number" class="dw-f-km" min="0" placeholder="0" value="' + esc(r.km || "") + '">' +
      '<label>Remarks</label><input type="text" class="dw-f-remarks" placeholder="Any other notes" value="' + esc(r.remarks || "") + '">';
  }

  function dwOfficeRowHtml(n, r) {
    r = r || {};
    return '<label>Activity Description *</label><input type="text" class="dw-o-activity" placeholder="e.g. Prepared quotation for ONGC tender" value="' + esc(r.activity_description || "") + '">' +
      '<label>Time Spent (hours)</label><input type="number" class="dw-o-hours" min="0" step="0.5" placeholder="0" value="' + esc(r.time_spent_hours || "") + '">' +
      '<div class="toggle-row"><label>Quotation Sent</label><input type="checkbox" class="dw-o-qsent" ' + (Number(r.quotation_sent) ? "checked" : "") + '></div>' +
      '<input type="number" class="dw-o-qvalue" min="0" placeholder="Quotation Value (\u20B9)" value="' + esc(r.quotation_value || "") + '">' +
      '<div class="toggle-row"><label>Order Received</label><input type="checkbox" class="dw-o-orecv" ' + (Number(r.order_received) ? "checked" : "") + '></div>' +
      '<input type="number" class="dw-o-ovalue" min="0" placeholder="Order Value (\u20B9)" value="' + esc(r.order_value || "") + '">' +
      '<div class="toggle-row"><label>Payment Collected</label><input type="checkbox" class="dw-o-pcoll" ' + (Number(r.payment_collected) ? "checked" : "") + '></div>' +
      '<input type="number" class="dw-o-pvalue" min="0" placeholder="Payment Value (\u20B9)" value="' + esc(r.payment_value || "") + '">' +
      '<label>Remarks</label><input type="text" class="dw-o-remarks" placeholder="Any other notes" value="' + esc(r.remarks || "") + '">';
  }

  function renderDwRows() {
    var type = dwLoadedForType;
    var list = $("dw-rows-list");
    if (!dwRows.length) dwRows = [{}];
    list.innerHTML = dwRows.map(function (r, i) {
      return '<div class="dw-row" data-idx="' + i + '">' +
        '<div class="dw-row-head"><span class="dw-row-num">Row ' + (i + 1) + '</span>' +
        '<button type="button" class="btn-remove-row" data-dwremove="' + i + '">&times;</button></div>' +
        (type === "field" ? dwFieldRowHtml(i, r) : dwOfficeRowHtml(i, r)) +
        "</div>";
    }).join("");
    list.querySelectorAll("[data-dwremove]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        collectDwRowsFromDom();
        var idx = Number(btn.dataset.dwremove);
        dwRows.splice(idx, 1);
        if (!dwRows.length) dwRows = [{}];
        renderDwRows();
      });
    });
  }

  $("dw-add-row").addEventListener("click", function () {
    collectDwRowsFromDom();
    dwRows.push({});
    renderDwRows();
  });

  // Reads the current DOM state of every row back into dwRows, preserving
  // whatever the user has typed before a re-render (add/remove row) or save.
  function collectDwRowsFromDom() {
    var type = dwLoadedForType;
    var out = [];
    $("dw-rows-list").querySelectorAll(".dw-row").forEach(function (rowEl) {
      if (type === "field") {
        out.push({
          contact_name: rowEl.querySelector(".dw-f-contact").value,
          location: rowEl.querySelector(".dw-f-location").value,
          purpose: rowEl.querySelector(".dw-f-purpose").value,
          km: rowEl.querySelector(".dw-f-km").value,
          remarks: rowEl.querySelector(".dw-f-remarks").value,
        });
      } else {
        out.push({
          activity_description: rowEl.querySelector(".dw-o-activity").value,
          time_spent_hours: rowEl.querySelector(".dw-o-hours").value,
          quotation_sent: rowEl.querySelector(".dw-o-qsent").checked,
          quotation_value: rowEl.querySelector(".dw-o-qvalue").value,
          order_received: rowEl.querySelector(".dw-o-orecv").checked,
          order_value: rowEl.querySelector(".dw-o-ovalue").value,
          payment_collected: rowEl.querySelector(".dw-o-pcoll").checked,
          payment_value: rowEl.querySelector(".dw-o-pvalue").value,
          remarks: rowEl.querySelector(".dw-o-remarks").value,
        });
      }
    });
    dwRows = out;
  }

  $("dw-save").addEventListener("click", function () {
    $("dw-error").textContent = "";
    var type = getDwWorkType();
    if (!type) { $("dw-error").textContent = "Select Office Work or Field Work first"; return; }
    collectDwRowsFromDom();

    var hasValidRow = dwRows.some(function (r) {
      return type === "field" ? (r.contact_name || "").trim() !== "" : (r.activity_description || "").trim() !== "";
    });
    if (!hasValidRow) {
      $("dw-error").textContent = type === "field"
        ? "Add at least one row with a Customer/Dealer Name"
        : "Add at least one row with an Activity Description";
      return;
    }

    var btn = this;
    btn.disabled = true;
    api("save_daily_report.php", { method: "POST", body: { work_type: type, rows: dwRows } })
      .then(function (data) {
        toast("Daily Work Report saved \u2713 (" + data.row_count + " row" + (data.row_count === 1 ? "" : "s") + ")");
        $("dw-saved-hint").textContent = "Saved for today \u2014 " + data.row_count + " row" + (data.row_count === 1 ? "" : "s") + ".";
        loadHome();
      }).catch(function (err) {
        $("dw-error").textContent = err.message;
      }).then(function () { btn.disabled = false; });
  });

  // ---------------- log visit ----------------
  var editingVisitId = null;
  var visitCache = {};
  var visitNameLabels = {
    customer: "Customer Name *",
    dealer: "Dealer Name *",
    consultant: "Consultant Name *",
    office: "Office Work Note (optional)",
  };
  var getVisitType = chipGroup("v-type", function (val) {
    $("v-name-label").textContent = visitNameLabels[val] || "Name";
    $("v-name").required = val !== "office";
    loadContactNames(val);
  });
  var getVisitCategory = chipGroup("v-category");
  var getVisitOutcome = chipGroup("v-outcome", function (val) {
    $("v-followup-wrap").classList.toggle("hidden", val !== "follow_up");
  });

  var nameSuggestions = [];   // this user's own recent contact names (instant, offline-friendly)
  var sharedMatches = [];     // shared customer directory search results (get_customers.php)
  var sharedSearchTimer = null;

  function loadContactNames(visitType) {
    api("get_contact_names.php?visit_type=" + encodeURIComponent(visitType)).then(function (data) {
      nameSuggestions = data.names || [];
    }).catch(function () { nameSuggestions = []; /* non-critical, fail silently */ });
  }
  loadContactNames(getVisitType());

  // Shared Customer Directory (Requirement 4): searches this app's own
  // `customers` table, merged server-side with canaresai.com when configured.
  function searchSharedCustomers(q) {
    clearTimeout(sharedSearchTimer);
    sharedSearchTimer = setTimeout(function () {
      api("get_customers.php?q=" + encodeURIComponent(q)).then(function (data) {
        sharedMatches = (data.customers || []).map(function (c) { return c.name; });
        renderNameDropdown($("v-name").value);
      }).catch(function () { /* non-critical, fail silently */ });
    }, 250);
  }

  // ---- custom "premium" dropdown for the name field ----
  var ddList = $("v-name-dd-list");
  function renderNameDropdown(filterText) {
    var q = (filterText || "").trim().toLowerCase();
    if (q.length >= 2) searchSharedCustomers(q);

    var pool = nameSuggestions.concat(sharedMatches);
    var seen = {};
    var unique = pool.filter(function (n) {
      var key = n.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    var matches = q === "" ? unique : unique.filter(function (n) {
      return n.toLowerCase().indexOf(q) !== -1;
    });
    if (!matches.length) {
      ddList.innerHTML = '<div class="dd-empty">' + (unique.length ? "No matches" : "No saved names yet") + "</div>";
    } else {
      ddList.innerHTML = matches.slice(0, 50).map(function (n) {
        return '<div class="dd-item" data-name="' + esc(n) + '">' + esc(n) + "</div>";
      }).join("");
    }
    ddList.classList.remove("hidden");
  }
  function closeNameDropdown() { ddList.classList.add("hidden"); }

  $("v-name").addEventListener("input", function () { renderNameDropdown(this.value); });
  $("v-name").addEventListener("focus", function () { renderNameDropdown(this.value); });
  $("v-name-dd-toggle").addEventListener("click", function () {
    if (ddList.classList.contains("hidden")) { renderNameDropdown(""); $("v-name").focus(); }
    else { closeNameDropdown(); }
  });
  ddList.addEventListener("mousedown", function (e) {
    var item = e.target.closest(".dd-item");
    if (!item) return;
    e.preventDefault();
    $("v-name").value = item.dataset.name;
    closeNameDropdown();
  });
  document.addEventListener("click", function (e) {
    if (!$("v-name-dd").contains(e.target)) closeNameDropdown();
  });

  // ---- "+ Add Customer" (New Customer modal) ----
  function openAddCustomerModal() {
    $("add-customer-error").textContent = "";
    ["nc-code", "nc-name", "nc-gst", "nc-credit", "nc-contact-person", "nc-mobile", "nc-email",
     "nc-bill-line1", "nc-bill-line2", "nc-bill-city", "nc-bill-state", "nc-bill-pincode",
     "nc-ship-line1", "nc-ship-line2", "nc-ship-city", "nc-ship-state", "nc-ship-country", "nc-ship-pincode",
     "nc-legacy"].forEach(function (id) { $(id).value = ""; });
    $("nc-bill-country").value = "India";
    $("nc-ship-same").checked = true;
    $("nc-ship-fields").classList.add("hidden");
    $("add-customer-modal").classList.remove("hidden");
    $("nc-code").focus();
  }
  function closeAddCustomerModal() { $("add-customer-modal").classList.add("hidden"); }

  $("btn-open-add-customer").addEventListener("click", openAddCustomerModal);
  $("add-customer-close").addEventListener("click", closeAddCustomerModal);
  $("btn-add-customer-cancel").addEventListener("click", closeAddCustomerModal);
  $("add-customer-modal").addEventListener("click", function (e) {
    if (e.target.id === "add-customer-modal") closeAddCustomerModal();
  });
  $("nc-ship-same").addEventListener("change", function () {
    $("nc-ship-fields").classList.toggle("hidden", this.checked);
  });

  $("btn-add-customer-save").addEventListener("click", function () {
    $("add-customer-error").textContent = "";
    var btn = this;
    btn.disabled = true;
    api("add_customer.php", {
      method: "POST",
      body: {
        customer_code: $("nc-code").value,
        name: $("nc-name").value,
        gst_number: $("nc-gst").value,
        credit_limit: $("nc-credit").value,
        contact_person: $("nc-contact-person").value,
        mobile_number: $("nc-mobile").value,
        email: $("nc-email").value,
        billing_address_line1: $("nc-bill-line1").value,
        billing_address_line2: $("nc-bill-line2").value,
        billing_city: $("nc-bill-city").value,
        billing_state: $("nc-bill-state").value,
        billing_country: $("nc-bill-country").value,
        billing_pincode: $("nc-bill-pincode").value,
        shipping_same_as_billing: $("nc-ship-same").checked,
        shipping_address_line1: $("nc-ship-line1").value,
        shipping_address_line2: $("nc-ship-line2").value,
        shipping_city: $("nc-ship-city").value,
        shipping_state: $("nc-ship-state").value,
        shipping_country: $("nc-ship-country").value,
        shipping_pincode: $("nc-ship-pincode").value,
        legacy_address: $("nc-legacy").value,
      },
    }).then(function (data) {
      toast("Customer saved \u2713");
      closeAddCustomerModal();
      // Drop the new customer straight into the visit form being filled in.
      $("v-name").value = data.name;
      nameSuggestions.unshift(data.name);
    }).catch(function (err) {
      $("add-customer-error").textContent = err.message;
    }).then(function () { btn.disabled = false; });
  });

  // ---- "Work for the Day" dynamic task rows ----
  function renumberTaskRows() {
    var rows = $("v-tasks-list").querySelectorAll(".task-row");
    rows.forEach(function (row, i) {
      var num = row.querySelector(".task-row-num");
      if (num) num.textContent = (i + 1) + ".";
    });
  }

  function addTaskRow(value) {
    var row = document.createElement("div");
    row.className = "task-row";
    row.innerHTML = '<span class="task-row-num">1.</span>' +
      '<input type="text" class="v-task-input" placeholder="e.g. Follow up with Sharma Traders">' +
      '<button type="button" class="btn-remove-task" aria-label="Remove row">&times;</button>';
    row.querySelector(".v-task-input").value = value || "";
    row.querySelector(".btn-remove-task").addEventListener("click", function () {
      var list = $("v-tasks-list");
      row.remove();
      if (!list.querySelector(".task-row")) addTaskRow(""); // always leave at least one row
      renumberTaskRows();
    });
    $("v-tasks-list").appendChild(row);
    renumberTaskRows();
    return row;
  }

  function setTaskRows(tasks) {
    $("v-tasks-list").innerHTML = "";
    (tasks && tasks.length ? tasks : [""]).forEach(function (t) { addTaskRow(t); });
  }

  function getTaskValues() {
    return Array.prototype.map.call(
      $("v-tasks-list").querySelectorAll(".v-task-input"),
      function (input) { return input.value.trim(); }
    ).filter(function (t) { return t !== ""; });
  }

  $("v-task-add").addEventListener("click", function () {
    var row = addTaskRow("");
    row.querySelector(".v-task-input").focus();
  });

  setTaskRows([]);

  if (!$("v-date").value) $("v-date").value = localDateStr();

  [["v-qsent", "v-qvalue-wrap"], ["v-orecv", "v-ovalue-wrap"], ["v-pcoll", "v-pvalue-wrap"]]
    .forEach(function (pair) {
      $(pair[0]).addEventListener("change", function () {
        $(pair[1]).classList.toggle("hidden", !this.checked);
      });
    });

  function resetVisitForm() {
    editingVisitId = null;
    $("visit-form-title").textContent = "Log Visit";
    $("btn-save-visit").textContent = "Save Visit";
    $("btn-cancel-edit-visit").classList.add("hidden");
    $("v-date").value = localDateStr();
    ["v-name", "v-phone", "v-location", "v-purpose", "v-product", "v-qvalue", "v-ovalue",
     "v-pvalue", "v-competitor", "v-remarks", "v-followup"].forEach(function (id) { $(id).value = ""; });
    ["v-qsent", "v-orecv", "v-pcoll"].forEach(function (id) { $(id).checked = false; });
    ["v-qvalue-wrap", "v-ovalue-wrap", "v-pvalue-wrap"].forEach(function (id) { $(id).classList.add("hidden"); });
    setTaskRows([]);
  }

  function setChipActive(containerId, value) {
    var box = $(containerId);
    box.querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("active", c.dataset.value === value);
    });
  }

  function startEditVisit(v) {
    editingVisitId = v.id;
    $("visit-form-title").textContent = "Edit Visit";
    $("btn-save-visit").textContent = "Update Visit";
    $("btn-cancel-edit-visit").classList.remove("hidden");

    setChipActive("v-type", v.visit_type);
    $("v-name-label").textContent = visitNameLabels[v.visit_type] || "Name";
    loadContactNames(v.visit_type);
    $("v-date").value = v.visit_date;
    $("v-name").value = v.contact_name || "";
    $("v-phone").value = v.contact_phone || "";
    $("v-location").value = v.location || "";
    setChipActive("v-category", v.customer_category || "direct");
    $("v-purpose").value = v.purpose || "";
    $("v-product").value = v.product_discussed || "";
    setChipActive("v-outcome", v.outcome || "pending");
    $("v-followup-wrap").classList.toggle("hidden", v.outcome !== "follow_up");
    $("v-followup").value = v.follow_up_date || "";
    $("v-qsent").checked = !!Number(v.quotation_sent);
    $("v-qvalue-wrap").classList.toggle("hidden", !Number(v.quotation_sent));
    $("v-qvalue").value = v.quotation_value || "";
    $("v-orecv").checked = !!Number(v.order_received);
    $("v-ovalue-wrap").classList.toggle("hidden", !Number(v.order_received));
    $("v-ovalue").value = v.order_value || "";
    $("v-pcoll").checked = !!Number(v.payment_collected);
    $("v-pvalue-wrap").classList.toggle("hidden", !Number(v.payment_collected));
    $("v-pvalue").value = v.payment_value || "";
    $("v-competitor").value = v.competitor_notes || "";
    $("v-remarks").value = v.remarks || "";
    setTaskRows(parseTasks(v.tasks));

    show("visit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("btn-cancel-edit-visit").addEventListener("click", resetVisitForm);

  $("btn-save-visit").addEventListener("click", function () {
    $("visit-error").textContent = "";
    var btn = this;
    btn.disabled = true;
    var payload = {
      visit_type: getVisitType(),
      visit_date: $("v-date").value,
      contact_name: $("v-name").value,
      contact_phone: $("v-phone").value,
      location: $("v-location").value,
      customer_category: getVisitCategory(),
      purpose: $("v-purpose").value,
      product_discussed: $("v-product").value,
      outcome: getVisitOutcome(),
      follow_up_date: getVisitOutcome() === "follow_up" ? $("v-followup").value : "",
      quotation_sent: $("v-qsent").checked,
      quotation_value: $("v-qvalue").value,
      order_received: $("v-orecv").checked,
      order_value: $("v-ovalue").value,
      payment_collected: $("v-pcoll").checked,
      payment_value: $("v-pvalue").value,
      competitor_notes: $("v-competitor").value,
      tasks: getTaskValues(),
      remarks: $("v-remarks").value,
      latitude: state.visitGps ? state.visitGps.latitude : "",
      longitude: state.visitGps ? state.visitGps.longitude : "",
    };
    var isEdit = !!editingVisitId;
    if (isEdit) payload.id = editingVisitId;

    api(isEdit ? "update_visit.php" : "add_visit.php", { method: "POST", body: payload })
      .then(function () {
        toast(isEdit ? "Visit updated \u2713" : "Visit saved \u2713");
        resetVisitForm();
        loadContactNames(getVisitType());
        loadVisits();
      }).catch(function (err) {
        $("visit-error").textContent = err.message;
      }).then(function () { btn.disabled = false; });
  });

  $("visit-period").addEventListener("change", loadVisits);

  function loadVisits() {
    api("get_visits.php?period=" + $("visit-period").value).then(function (data) {
      var list = $("visit-list");
      if (!data.visits.length) {
        list.innerHTML = '<p class="empty-note">No visits logged in this period yet.</p>';
        return;
      }
      visitCache = {};
      list.innerHTML = data.visits.map(function (v) {
        visitCache[v.id] = v;
        var badges = [];
        badges.push('<span class="badge gray">' + esc(v.visit_type) + "</span>");
        if (Number(v.quotation_sent)) badges.push('<span class="badge">Quote ' + money(v.quotation_value) + "</span>");
        if (Number(v.order_received)) badges.push('<span class="badge green">Order ' + money(v.order_value) + "</span>");
        if (Number(v.payment_collected)) badges.push('<span class="badge green">Payment ' + money(v.payment_value) + "</span>");
        if (v.location) badges.push('<span class="badge gray">\uD83D\uDCCD ' + esc(v.location) + "</span>");
        var taskCount = parseTasks(v.tasks).length;
        if (taskCount) badges.push('<span class="badge gray">\uD83D\uDCDD ' + taskCount + (taskCount === 1 ? " task" : " tasks") + "</span>");
        if (v.latitude) badges.push('<span class="badge gray">\uD83D\uDCCD GPS</span>');
        return '<div class="record-card">' +
          '<div class="rc-top"><span>' + esc(v.contact_name) + "</span><span>" + esc(v.visit_date) + "</span></div>" +
          '<div class="rc-sub">' + esc(v.purpose || "") + "</div>" +
          '<div class="rc-badges">' + badges.join("") + "</div>" +
          '<span class="rc-edit-link" data-edit-visit="' + v.id + '">Edit</span>' +
          "</div>";
      }).join("");
      list.querySelectorAll("[data-edit-visit]").forEach(function (el) {
        el.addEventListener("click", function () {
          var v = visitCache[this.dataset.editVisit];
          if (v) startEditVisit(v);
        });
      });
    }).catch(function (err) { toast(err.message); });
  }

  // ---------------- report history (modal) ----------------
  var historyCache = {};
  var historyUserId = null; // null = "my own" Report History; set = viewing a team member
  var visitTypeLabels = { customer: "Customer", dealer: "Dealer", consultant: "Consultant", office: "Office Work" };
  var visitTypeIcons = { customer: "\uD83D\uDC64", dealer: "\uD83C\uDFEC", consultant: "\uD83E\uDDD1\u200D\uD83D\uDCBC", office: "\uD83C\uDFE2" };
  var categoryLabels = { direct: "Direct", distributor: "Distributor", retailer: "Retailer", industrial: "Industrial", other: "Other" };
  var outcomeLabels = { successful: "Successful", follow_up: "Follow-up needed", pending: "Pending", not_interested: "Not interested" };

  function openHistoryModal(title) {
    $("history-modal-title").textContent = title || "\uD83D\uDCCB Report History";
    $("history-modal").classList.remove("hidden");
    $("history-list-view").classList.remove("hidden");
    $("history-detail-view").classList.add("hidden");
    loadHistory();
  }
  function closeHistoryModal() {
    $("history-modal").classList.add("hidden");
    historyUserId = null;
  }

  $("link-report-history").addEventListener("click", function (e) {
    e.preventDefault();
    historyUserId = null;
    $("hist-from").value = "";
    $("hist-to").value = "";
    openHistoryModal("\uD83D\uDCCB Report History");
  });
  $("history-modal-close").addEventListener("click", closeHistoryModal);
  $("btn-hist-close2").addEventListener("click", closeHistoryModal);
  $("history-modal").addEventListener("click", function (e) {
    if (e.target.id === "history-modal") closeHistoryModal();
  });

  $("btn-hist-clear").addEventListener("click", function () {
    $("hist-from").value = "";
    $("hist-to").value = "";
    loadHistory();
  });
  $("hist-from").addEventListener("change", loadHistory);
  $("hist-to").addEventListener("change", loadHistory);

  // Opens Report History scoped to one team member — every visit they've
  // logged, not just this period's aggregate stats.
  function openMemberHistory(memberId, memberName) {
    historyUserId = memberId;
    var d = new Date();
    d.setDate(d.getDate() - 180); // default window: last 6 months, adjustable via the date filters
    $("hist-from").value = localDateStr(d);
    $("hist-to").value = "";
    openHistoryModal("\uD83D\uDCCB " + memberName + "\u2019s Visits");
  }

  function loadHistory() {
    var from = $("hist-from").value;
    var to = $("hist-to").value;
    var list = $("history-list");
    list.innerHTML = '<p class="empty-note">Loading\u2026</p>';
    var q = "";
    if (from) q += "&from=" + from;
    if (to) q += "&to=" + to;
    if (historyUserId) q += "&user_id=" + historyUserId;
    api("get_visits.php?period=monthly" + q).then(function (data) {
      if (!data.visits.length) {
        list.innerHTML = '<p class="empty-note">No reports found in this date range.</p>';
        return;
      }
      historyCache = {};
      list.innerHTML = data.visits.map(function (v) {
        historyCache[v.id] = v;
        var metaBits = [esc(visitTypeLabels[v.visit_type] || v.visit_type)];
        if (Number(v.quotation_sent)) metaBits.push("Quote " + money(v.quotation_value));
        if (Number(v.order_received)) metaBits.push("Order " + money(v.order_value));
        return '<div class="hist-item">' +
          '<div class="hist-date-pill">' + esc(v.visit_date) + "</div>" +
          '<div class="hist-item-body">' +
            '<div class="hist-item-title">' + (visitTypeIcons[v.visit_type] || "\uD83D\uDCCB") + " " + esc(v.contact_name) + "</div>" +
            '<div class="hist-item-meta">' + metaBits.join(" &nbsp;\u2022&nbsp; ") + "</div>" +
          "</div>" +
          '<button class="hist-view-btn" data-view-report="' + v.id + '">View</button>' +
          "</div>";
      }).join("");
      list.querySelectorAll("[data-view-report]").forEach(function (el) {
        el.addEventListener("click", function () {
          var v = historyCache[this.dataset.viewReport];
          if (v) showHistoryDetail(v);
        });
      });
    }).catch(function (err) { toast(err.message); });
  }

  function detailRow(label, value) {
    if (value === null || value === undefined || value === "") return "";
    return '<div class="detail-row"><span class="detail-label">' + esc(label) + '</span><span class="detail-value">' + esc(String(value)) + "</span></div>";
  }

  function detailTaskRow(label, tasks) {
    if (!tasks || !tasks.length) return "";
    var items = tasks.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    return '<div class="detail-row"><span class="detail-label">' + esc(label) +
      '</span><span class="detail-value"><ol class="task-view-list">' + items + "</ol></span></div>";
  }

  function showHistoryDetail(v) {
    var rows = [
      detailRow("Visit Type", visitTypeLabels[v.visit_type] || v.visit_type),
      detailRow("Visit Date", v.visit_date),
      detailRow("Name", v.contact_name),
      detailRow("Phone", v.contact_phone),
      detailRow("Location", v.location),
      detailRow("Category", categoryLabels[v.customer_category] || v.customer_category),
      detailRow("Purpose", v.purpose),
      detailRow("Product / Service Discussed", v.product_discussed),
      detailRow("Outcome", outcomeLabels[v.outcome] || v.outcome),
      detailRow("Follow-up Date", v.follow_up_date),
      detailRow("Quotation Sent", Number(v.quotation_sent) ? "Yes \u2014 " + money(v.quotation_value) : "No"),
      detailRow("Order Received", Number(v.order_received) ? "Yes \u2014 " + money(v.order_value) : "No"),
      detailRow("Payment Collected", Number(v.payment_collected) ? "Yes \u2014 " + money(v.payment_value) : "No"),
      detailRow("Competitor Notes", v.competitor_notes),
      detailTaskRow("Work for the Day", parseTasks(v.tasks)),
      detailRow("Remarks", v.remarks),
      detailRow("Logged By", v.user_name),
      detailRow("GPS Location", v.gps_address || (v.latitude ? v.latitude + ", " + v.longitude : "")),
    ].join("");
    $("history-detail-body").innerHTML = rows || '<p class="empty-note">No details available.</p>';
    $("history-list-view").classList.add("hidden");
    $("history-detail-view").classList.remove("hidden");
  }

  $("btn-hist-back").addEventListener("click", function () {
    $("history-detail-view").classList.add("hidden");
    $("history-list-view").classList.remove("hidden");
  });
  // Wires one expense-logging form instance (chips, totals, attachment
  // label, save handler). Called once for the existing Log Expense form
  // (ids unchanged from before — behavior is identical to the old code)
  // and once for the new dated Today's Expenses form. Both instances
  // share the same "Advance Expenses" selector/hint and the same GPS
  // reading, since those live above the tab toggle, not per-form.
  function wireExpenseFormInstance(ids) {
    // One idempotency key per expense being entered: a double-tap or a
    // retry after a dropped connection can never create a second row
    // (here or in TallyField). Cleared only after a confirmed save.
    var pendingRef = null;
    function newClientRef() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    }
    var stagedFiles = []; // accumulates across multiple "Choose Files" picks — see change handler below

    var getMode = chipGroup(ids.mode, function (val) {
      $(ids.kmWrap).classList.toggle("hidden", val !== "car" && val !== "bike");
      $(ids.publicWrap).classList.toggle("hidden", val !== "public");
      $(ids.routeWrap).classList.toggle("hidden", val === "none");
      updateTotal();
    });

    [ids.km, ids.public, ids.boarding, ids.lodging, ids.other].forEach(function (id) {
      $(id).addEventListener("input", updateTotal);
    });

    function travelAmount() {
      var mode = getMode();
      var km = Number($(ids.km).value) || 0;
      if (mode === "car") return km * Number(state.settings.car_rate_per_km || 12);
      if (mode === "bike") return km * Number(state.settings.bike_rate_per_km || 3);
      if (mode === "public") return Number($(ids.public).value) || 0;
      return 0;
    }

    function updateTotal() {
      var mode = getMode();
      var travel = travelAmount();
      var km = Number($(ids.km).value) || 0;
      var rate = mode === "car" ? state.settings.car_rate_per_km : state.settings.bike_rate_per_km;
      $(ids.rateHint).textContent = "\u20B9" + rate + "/km \u00D7 " + km + " km = " + money(mode === "car" || mode === "bike" ? travel : 0);
      var total = travel + (Number($(ids.boarding).value) || 0) +
        (Number($(ids.lodging).value) || 0) + (Number($(ids.other).value) || 0);
      $(ids.total).textContent = money(total);

      var selId = Number($("e-advance-select").value) || null;
      var balEl = $(ids.balance);
      if (!selId) {
        $("e-advance-hint").textContent = myAdvanceRequests.length ? "" : $("e-advance-hint").textContent;
        balEl.textContent = "\u20B90";
        balEl.style.color = "";
        return;
      }
      var req = myAdvanceRequests.filter(function (r) { return r.id === selId; })[0];
      if (!req) return;
      $("e-advance-hint").textContent = "Advance " + money(req.total_advance_requested) + " (" + req.status + ")";
      var balance = Number(req.total_advance_requested) - total;
      balEl.textContent = money(Math.abs(balance)) + (balance < 0 ? " (reimburse employee)" : " (advance remaining)");
      balEl.style.color = balance < 0 ? "var(--error)" : "";
    }

    function renderAttachmentList() {
      var box = $(ids.attachmentName);
      if (!stagedFiles.length) { box.innerHTML = ""; return; }
      box.innerHTML = "Selected " + stagedFiles.length + " file" + (stagedFiles.length > 1 ? "s" : "") + ":<br>" +
        stagedFiles.map(function (f, i) {
          return '<span class="badge gray" style="margin:4px 4px 0 0;display:inline-block;">' + esc(f.name) +
            ' <a href="#" data-remove-att="' + i + '" style="color:#c0392b;font-weight:700;text-decoration:none;margin-left:4px;">&times;</a></span>';
        }).join("");
      box.querySelectorAll("[data-remove-att]").forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          stagedFiles.splice(Number(a.dataset.removeAtt), 1);
          renderAttachmentList();
        });
      });
    }

    $(ids.attachment).addEventListener("change", function () {
      var files = this.files;
      if (files && files.length) {
        Array.prototype.forEach.call(files, function (f) { stagedFiles.push(f); });
      }
      // Clear the native input so the SAME file can be re-picked later, and
      // so the next "Choose Files" click adds to stagedFiles instead of the
      // browser replacing the whole selection (that replace-not-add
      // behaviour is exactly what was making only the last pick show up).
      this.value = "";
      renderAttachmentList();
    });

    $(ids.saveBtn).addEventListener("click", function () {
      $(ids.error).textContent = "";

      var advanceRequestId = Number($("e-advance-select").value) || 0;
      if (!advanceRequestId) {
        $(ids.error).textContent = "Advance Expenses is required \u2014 select an advance request (or submit a new one) first";
        return;
      }

      var btn = this;
      btn.disabled = true;

      var fd = new FormData();
      fd.append("travel_mode", getMode());
      fd.append("km", $(ids.km).value);
      fd.append("travel_amount", $(ids.public).value);
      fd.append("boarding_amount", $(ids.boarding).value);
      fd.append("lodging_amount", $(ids.lodging).value);
      fd.append("other_amount", $(ids.other).value);
      fd.append("advance_request_id", advanceRequestId);
      if (!pendingRef) pendingRef = newClientRef();
      fd.append("client_ref", pendingRef);
      fd.append("from_location", $(ids.from).value);
      fd.append("to_location", $(ids.to).value);
      fd.append("notes", $(ids.notes).value);
      fd.append("latitude", state.expenseGps ? state.expenseGps.latitude : "");
      fd.append("longitude", state.expenseGps ? state.expenseGps.longitude : "");
      if (ids.date) {
        fd.append("expense_date", $(ids.date).value || localDateStr());
      }
      var attachmentFiles = stagedFiles;
      if (attachmentFiles && attachmentFiles.length) {
        attachmentFiles.forEach(function (f) { fd.append("attachments[]", f); });
      }

      apiUpload("add_expense.php", fd).then(function (res) {
        pendingRef = null;
        toast(res && res.duplicate ? "Already saved \u2713 (not duplicated)" : "Expense saved \u2713");
        [ids.km, ids.public, ids.boarding, ids.lodging, ids.other, ids.notes, ids.from, ids.to]
          .forEach(function (id) { $(id).value = ""; });
        $(ids.attachment).value = "";
        stagedFiles = [];
        renderAttachmentList();
        updateTotal();
        ids.onSaved();
      }).catch(function (err) {
        $(ids.error).textContent = err.message;
      }).then(function () { btn.disabled = false; });
    });

    return updateTotal;
  }

  var updateExpenseTotal = wireExpenseFormInstance({
    mode: "e-mode", kmWrap: "e-km-wrap", publicWrap: "e-public-wrap", routeWrap: "e-route-wrap",
    km: "e-km", public: "e-public", boarding: "e-boarding", lodging: "e-lodging", other: "e-other",
    rateHint: "e-rate-hint", total: "e-total", balance: "e-balance",
    attachment: "e-attachment", attachmentName: "e-attachment-name",
    from: "e-from", to: "e-to", notes: "e-notes",
    error: "expense-error", saveBtn: "btn-save-expense", date: null,
    onSaved: function () { loadExpenses(); },
  });

  wireExpenseFormInstance({
    mode: "t-mode", kmWrap: "t-km-wrap", publicWrap: "t-public-wrap", routeWrap: "t-route-wrap",
    km: "t-km", public: "t-public", boarding: "t-boarding", lodging: "t-lodging", other: "t-other",
    rateHint: "t-rate-hint", total: "t-total", balance: "t-balance",
    attachment: "t-attachment", attachmentName: "t-attachment-name",
    from: "t-from", to: "t-to", notes: "t-notes",
    error: "t-error", saveBtn: "btn-save-today-expense", date: "t-date",
    onSaved: function () { loadExpensesForDate(); },
  });

  // My own advance requests, cached for the dropdown + balance display.
  // Shared by both form instances above — there is only one Advance
  // Expenses selector, above the tab toggle.
  var myAdvanceRequests = [];
  function loadMyAdvanceRequestOptions() {
    return api("get_advance_requests.php").then(function (data) {
      myAdvanceRequests = (data.requests || []).filter(function (r) { return r.status !== "rejected"; });
      var sel = $("e-advance-select");
      var current = sel.value;
      sel.innerHTML = '<option value="">Select the advance request this expense is drawn against\u2026</option>' +
        myAdvanceRequests.map(function (r) {
          return '<option value="' + r.id + '">' + esc(r.request_no) + " \u2014 " + money(r.total_advance_requested) + " (" + esc(r.status) + ")</option>";
        }).join("");
      if (current) sel.value = current;
      if (!myAdvanceRequests.length) {
        $("e-advance-hint").innerHTML = 'No advance requests yet \u2014 click "Advance Expenses" above to submit one first.';
      }
      updateExpenseTotal();
    }).catch(function () { /* non-critical here; hub itself will surface real errors */ });
  }
  loadMyAdvanceRequestOptions();

  $("e-advance-select").addEventListener("change", updateExpenseTotal);

  function loadExpenses() {
    api("get_expenses.php?period=" + $("expense-period").value).then(function (data) {
      renderExpenseListInto($("expense-list"), $("expense-totals-bar"), data, "No expenses logged in this period yet.", "Period Total");
    }).catch(function (err) { toast(err.message); });
  }

  $("expense-period").addEventListener("change", loadExpenses);

  // ---------------- Today's Expenses tab (dated logging form) ----------------
  document.querySelectorAll("#e-view-toggle .chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll("#e-view-toggle .chip").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var tab = btn.dataset.etab;
      $("e-log-fields").classList.toggle("hidden", tab !== "log");
      $("e-today-panel").classList.toggle("hidden", tab !== "today");
      if (tab === "today") loadExpensesForDate();
    });
  });

  $("t-date").addEventListener("change", loadExpensesForDate);

  function loadExpensesForDate() {
    if (!$("t-date").value) $("t-date").value = localDateStr();
    api("get_expenses.php?date=" + $("t-date").value).then(function (data) {
      renderExpenseListInto($("e-today-list"), $("e-today-totals-bar"), data, "No expenses logged on this date.", "Day Total");
    }).catch(function (err) { toast(err.message); });
  }

  // Shared by the existing Recent Expenses list and the new Today's Expenses
  // panel — same markup/output as before, just no longer duplicated.
  function renderExpenseListInto(listEl, totalsEl, data, emptyMsg, totalsLabel) {
    if (!data.expenses.length) {
      listEl.innerHTML = '<p class="empty-note">' + emptyMsg + '</p>';
    } else {
      listEl.innerHTML = data.expenses.map(function (x) {
        var route = (x.from_location || x.to_location)
          ? esc((x.from_location || "?") + " \u2192 " + (x.to_location || "?")) : "";
        var badges = ['<span class="badge gray">' + esc(x.travel_mode) + "</span>"];
        if (Number(x.km) > 0) badges.push('<span class="badge">' + Number(x.km) + " km</span>");
        if (x.latitude) badges.push('<span class="badge gray">\uD83D\uDCCD GPS</span>');
        var adv = x.advance_request;
        if (adv) {
          badges.push('<span class="badge gray">' + esc(adv.request_no) + "</span>");
          var bal = Number(adv.balance) || 0;
          badges.push('<span class="badge ' + (bal < 0 ? "" : "green") + '">Balance ' + money(Math.abs(bal)) + (bal < 0 ? " due" : "") + "</span>");
        }
        badges.unshift(expenseStatusBadge(x));
        var attachments = (x.attachments || []).map(function (a, i) {
          return '<a class="attachment-link" href="' + esc(srvUrl(a.file_path)) + '" target="_blank" rel="noopener">View Bill' + (x.attachments.length > 1 ? " " + (i + 1) : "") + "</a>";
        }).join(" ");
        return '<div class="record-card">' +
          '<div class="rc-top"><span>' + money(x.total_amount) + "</span><span>" + esc(x.expense_date) + "</span></div>" +
          '<div class="rc-sub">' + route + (x.notes ? " \u00B7 " + esc(x.notes) : "") + "</div>" +
          '<div class="rc-badges">' + badges.join("") + "</div>" +
          expenseStatusNote(x) +
          attachments +
          "</div>";
      }).join("");
    }
    var t = data.totals || {};
    var advSummary = (data.advance_requests || []).map(function (a) {
      return esc(a.request_no) + ": " + money(a.balance) + (Number(a.balance) < 0 ? " due" : " left");
    }).join(" \u00B7 ");
    var payLine = t.paid !== undefined && (Number(t.paid) > 0 || Number(t.payable) > 0)
      ? " \u00B7 Paid " + money(t.paid) + " \u00B7 Pending " + money(t.payable) : "";
    totalsEl.innerHTML = t.total !== undefined
      ? "<span>" + totalsLabel + " \u2014 " + money(t.total) + payLine + (advSummary ? " \u00B7 " + advSummary : "") + "</span>"
      : "";
  }

  // ---------------- expense status (synced with TallyField) ----------------
  var EXPENSE_STATUS_LABELS = {
    submitted: "Submitted", approved: "Approved", partially_paid: "Partially Paid", paid: "Paid", rejected: "Rejected"
  };
  function expenseStatusBadge(x) {
    var st = x.payment_status || "submitted";
    return '<span class="badge st-' + esc(st) + '">' + esc(x.status_label || EXPENSE_STATUS_LABELS[st] || st) + "</span>";
  }
  function expenseStatusNote(x) {
    var st = x.payment_status || "submitted";
    var bits = [];
    if ((st === "paid" || st === "partially_paid") && Number(x.paid_amount) > 0) {
      bits.push("Paid " + money(x.paid_amount) + (x.paid_on ? " on " + esc(x.paid_on) : "") +
        (x.payment_mode ? " via " + esc(x.payment_mode) : "") + (x.payment_ref ? " (Ref " + esc(x.payment_ref) + ")" : ""));
      if (Number(x.balance_payable) > 0) bits.push("Pending " + money(x.balance_payable));
    }
    if (x.status_remarks) bits.push((st === "rejected" ? "Reason: " : "Note: ") + esc(x.status_remarks));
    if (x.status_updated_by) bits.push("by " + esc(x.status_updated_by) + (x.status_updated_at ? " \u00B7 " + esc(String(x.status_updated_at).slice(0, 16)) : ""));
    return bits.length ? '<div class="rc-status-note">' + bits.join(" \u00B7 ") + "</div>" : "";
  }

  // ================= ADVANCE EXPENSE REQUEST HUB =================
  var advDesignationLabels = {
    gm: "General Manager", ceo: "CEO", mh: "Marketing Head", tm: "Territory Manager",
    am: "Assistant Manager", mm: "Marketing Manager", me: "Marketing Executive",
  };
  var advProfile = null;   // { employee_name, employee_code, designation, department, mobile_number, reporting_manager, rate, rate_configured, profile_complete }
  var advEditingId = null; // null = new request; else editing an existing pending one
  var advViewingRequest = null; // full request object when viewing/editing (has attachments, status, etc.)
  var advTravelSections = ["flight", "train", "bus"];
  var advTravelFiles = { flight: [], train: [], bus: [] }; // pending File objects to upload on submit
  var advBillFiles = { bl_bills: [], lt_bills: [] }; // pending File objects for Section 2/3 bills

  function billIconFor(file) {
    var isPdf = (file.type || "").indexOf("pdf") !== -1 || /\.pdf$/i.test(file.name || "");
    return isPdf ? '<div class="thumb">\uD83D\uDCC4</div>' : null; // PDF icon; images get a real thumbnail instead
  }

  // Renders the staged (not-yet-uploaded) files for one bill field as a
  // preview strip with per-file remove buttons, plus any already-uploaded
  // bills (when editing/viewing an existing request).
  function renderBillPreview(fieldKey, containerId, existingBills) {
    var container = $(containerId);
    var html = "";
    (existingBills || []).forEach(function (b) {
      html += '<div class="bill-preview-item existing">' +
        '<a href="' + esc(srvUrl(b.file_path)) + '" target="_blank" rel="noopener"><div class="thumb">\uD83D\uDCCE</div></a>' +
        '<div class="name">' + esc(b.file_name || "Bill") + "</div></div>";
    });
    advBillFiles[fieldKey].forEach(function (file, i) {
      var isImage = /^image\//.test(file.type);
      var thumbHtml = isImage ? '<div class="thumb"><img src="' + URL.createObjectURL(file) + '"></div>' : billIconFor(file);
      html += '<div class="bill-preview-item">' + thumbHtml +
        '<button type="button" class="btn-remove-bill" data-billfield="' + fieldKey + '" data-billidx="' + i + '">&times;</button>' +
        '<div class="name">' + esc(file.name) + "</div></div>";
    });
    container.innerHTML = html;
    container.querySelectorAll(".btn-remove-bill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        advBillFiles[btn.dataset.billfield].splice(Number(btn.dataset.billidx), 1);
        renderBillPreview(btn.dataset.billfield, containerId, existingBills);
      });
    });
  }

  $("adv-bl-bills-input").addEventListener("change", function () {
    advBillFiles.bl_bills = advBillFiles.bl_bills.concat(Array.prototype.slice.call(this.files));
    this.value = "";
    renderBillPreview("bl_bills", "adv-bl-bills-preview", advViewingRequest ? (advViewingRequest.bills || []).filter(function (b) { return b.section === "boarding_lodging"; }) : []);
  });
  $("adv-lt-bills-input").addEventListener("change", function () {
    advBillFiles.lt_bills = advBillFiles.lt_bills.concat(Array.prototype.slice.call(this.files));
    this.value = "";
    renderBillPreview("lt_bills", "adv-lt-bills-preview", advViewingRequest ? (advViewingRequest.bills || []).filter(function (b) { return b.section === "local_travel"; }) : []);
  });

  function openAdvanceHub() {
    $("advance-hub-modal").classList.remove("hidden");
    showAdvListView();
  }
  function closeAdvanceHub() { $("advance-hub-modal").classList.add("hidden"); }
  $("btn-open-advance-hub").addEventListener("click", openAdvanceHub);
  $("adv-hub-close").addEventListener("click", closeAdvanceHub);
  $("btn-adv-back-to-list").addEventListener("click", showAdvListView);

  // Live status: an approval made elsewhere (email button, another person's
  // screen) shows up here without reopening — on return to the tab and every
  // 60 s while the Advance Expenses list is on screen and nothing is being
  // typed into it.
  function advListIsIdleOnScreen() {
    if (document.hidden || !state.user) return false;
    if ($("advance-hub-modal").classList.contains("hidden") || $("adv-list-view").classList.contains("hidden")) return false;
    if (!$("adv-import-view").classList.contains("hidden")) return false;
    return !document.querySelector("#advance-hub-modal .pay-editor:not(.hidden)");
  }
  function refreshAdvListIfIdle() {
    if (advListIsIdleOnScreen()) loadAdvRequestList(true);
    // Accounts' "Payments to Make" card: newly approved requests appear by themselves.
    if (!document.hidden && state.user && !$("home-pay-card").classList.contains("hidden")
        && !document.querySelector("#home-pay-card .pay-editor:not(.hidden)")) loadPaymentQueue();
  }
  setInterval(refreshAdvListIfIdle, 60000);   // light on the shared DB
  document.addEventListener("visibilitychange", refreshAdvListIfIdle);
  window.addEventListener("focus", refreshAdvListIfIdle);

  function showAdvListView() {
    $("adv-hub-title").textContent = "Advance Expenses";
    $("adv-list-view").classList.remove("hidden");
    $("adv-form-view").classList.add("hidden");
    $("btn-adv-back-to-list").classList.add("hidden");
    $("btn-adv-export").classList.add("hidden");
    $("btn-adv-print").classList.add("hidden");
    $("btn-adv-report-pdf").classList.add("hidden");
    $("btn-adv-report-print").classList.add("hidden");
    $("btn-adv-save").classList.add("hidden");
    loadAdvRequestList();
  }

  // Expenses Report dual approval: pill shows the final approval status;
  // a line shows each approver's decision with date/time.
  function advStatusPill(r) {
    var a = r.approval;
    var label = a ? a.final_label : r.status;
    var cls = a && a.final_status === "fully_approved" ? "approved" : (r.status === "rejected" ? "rejected" : (a && a.final_status === "legacy_approved" ? "approved" : "pending"));
    return '<span class="status-pill ' + cls + '">' + esc(label) + "</span>";
  }
  // Each approver's own status in words + the overall status, e.g.
  // "Gajanan: Approved 26-09 12:01 · Ramji Pandey (optional): Pending · Overall: Approved".
  function advApproverStatus(x) {
    return x.decision === "approved" ? "Approved" : x.decision === "rejected" ? "Rejected" : "Pending";
  }
  function advOverallStatus(r) {
    var a = r.approval || {};
    // Server label: "Pending Gajanan Approval" / "Approved – Awaiting Payment" / "Paid" / "Rejected".
    if (a.final_label) return esc(a.final_label);
    if (r.status === "rejected" || a.final_status === "rejected") return "Rejected";
    if (a.final_status === "fully_approved" || a.final_status === "legacy_approved" || r.status === "approved") return "Approved";
    return "Pending";
  }
  function advApprovalLine(r) {
    var a = r.approval;
    if (!a || !a.approvals) return "";
    return '<div class="rc-status-note">' + a.approvals.map(function (x) {
      var st = advApproverStatus(x);
      var mark = st === "Approved" ? "\u2705" : st === "Rejected" ? "\u274C" : (x.required ? "\u23F3" : "\u2796");
      return mark + " " + esc(x.label) + (x.required ? "" : " (optional)") + ": " + st + (x.at ? " " + esc(String(x.at).slice(0, 16)) : "");
    }).join(" \u00B7 ") + " \u00B7 <strong>Overall: " + advOverallStatus(r) + "</strong>" +
      (a.fully_approved_at ? " (" + esc(String(a.fully_approved_at).slice(0, 16)) + ")" : "") + "</div>";
  }
  function advReqItemHtml(r, showEmployee) {
    var a = r.approval || {};
    return '<div class="aef-req-list-item">' +
      '<div class="rc-top"><span>' + esc(r.request_no) + (showEmployee ? " \u2014 " + esc(r.employee_name) : "") + "</span>" + advStatusPill(r) + "</div>" +
      '<div class="rc-sub">' + esc(r.purpose_of_travel || "") + " \u00B7 " + esc(r.travel_from || "") + " \u2192 " + esc(r.travel_to || "") + "</div>" +
      '<div class="rc-sub">' + esc(r.date_from) + " to " + esc(r.date_to) + " \u00B7 " + money(r.total_advance_requested) + "</div>" +
      advApprovalLine(r) + paidNote(a) +
      '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">' +
      '<button class="btn-small" data-adv-view="' + r.id + '">View</button>' +
      (a.can_approve ? '<button class="btn-small" data-adv-approve="' + r.id + '" style="border-color:var(--success);color:var(--success);">Approve as ' + esc(a.my_slot_label || "") + "</button>" : "") +
      (a.can_mark_paid ? '<button class="btn-small" data-adv-pay="' + r.id + '" style="border-color:var(--success);color:var(--success);">Mark as Paid</button>' : "") +
      (r.status === "pending" && !showEmployee ? '<button class="btn-small" data-adv-edit="' + r.id + '">Edit</button>' : "") +
      '<button class="btn-small" data-adv-export="' + r.id + '" title="Tally-style Ledger Account of this employee">Export Excel</button>' +
      '<button class="btn-small" data-adv-export-form="' + r.id + '">Export Form</button>' +
      '<button class="btn-small" data-adv-report-pdf="' + r.id + '">Download PDF</button>' +
      '<button class="btn-small" data-adv-report-print="' + r.id + '">Print</button>' +
      '</div><div class="pay-editor hidden" id="adv-pay-ed-' + r.id + '"></div></div>';
  }

  function wireAdvReqButtons(list) {
    list.querySelectorAll("[data-adv-view]").forEach(function (btn) {
      btn.addEventListener("click", function () { openAdvForm(Number(btn.dataset.advView), false); });
    });
    list.querySelectorAll("[data-adv-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () { openAdvForm(Number(btn.dataset.advEdit), true); });
    });
    list.querySelectorAll("[data-adv-export]").forEach(function (btn) {
      btn.addEventListener("click", function () { exportEmployeeLedger(Number(btn.dataset.advExport)); });
    });
    list.querySelectorAll("[data-adv-report-pdf]").forEach(function (btn) {
      btn.addEventListener("click", function () { downloadExpenseReportPdf(Number(btn.dataset.advReportPdf)); });
    });
    list.querySelectorAll("[data-adv-report-print]").forEach(function (btn) {
      btn.addEventListener("click", function () { printExpenseReport(Number(btn.dataset.advReportPrint)); });
    });
    list.querySelectorAll("[data-adv-export-form]").forEach(function (btn) {
      btn.addEventListener("click", function () { exportAdvanceRequest(Number(btn.dataset.advExportForm)); });
    });
    list.querySelectorAll("[data-adv-pay]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.dataset.advPay);
        api("get_advance_request.php?id=" + id).then(function (d) {
          openPayEditor($("adv-pay-ed-" + id), d.request, function () { loadAdvRequestList(); loadPaymentQueue(); });
        }).catch(function (e) { toast(e.message); });
      });
    });
    list.querySelectorAll("[data-adv-approve]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        sendAdvDecision(Number(btn.dataset.advApprove), "approved").then(function () { loadAdvRequestList(); }, function () { btn.disabled = false; });
      });
    });
  }

  function loadAdvRequestList(silent) {
    // Other employees' advance data (team list, Tally ledger, import) is for
    // the approvers (Gajanan, Ramji Pandey) only — decided by the server.
    // Everyone else sees only their own requests.
    if (!silent) {
      $("adv-import-bar").classList.add("hidden");
      $("adv-tally-section").classList.add("hidden");
      $("adv-team-req-section").classList.add("hidden");
    }

    // Who sees the team list is decided by the server (GM/CEO, the two
    // approvers, and the Accounts viewer — who only gets Fully Approved ones).
    api("get_advance_requests.php").then(function (data) {
      var list = $("adv-req-list");
      list.innerHTML = data.requests.length
        ? data.requests.map(function (r) { return advReqItemHtml(r, false); }).join("")
        : '<p class="empty-note">No advance requests submitted yet.</p>';
      wireAdvReqButtons(list);
      var wf = data.workflow || {};
      $("adv-import-bar").classList.toggle("hidden", !wf.is_approver);
      $("adv-tally-section").classList.toggle("hidden", !wf.is_approver);
      if (wf.is_approver && !silent) loadTallyLedger();   // auto-refresh only re-reads the request lists
      if (!wf.can_view_team) { $("adv-team-req-section").classList.add("hidden"); return; }
      loadTeamAdvRequests(wf);
    }).catch(function (err) { if (!silent) toast(err.message); });
  }

  function loadTeamAdvRequests(wf) {
    var u = state.user;
    var title = $("adv-team-req-section").querySelector(".section-title");
    title.textContent = wf.is_viewer ? "Approved Expense Reports" : "Team Advance Requests";

    // Managers (tm/mh/ceo/gm) also see every request submitted across the
    // team, so approvals aren't limited to only what they happened to
    // submit themselves.
    $("adv-team-req-section").classList.remove("hidden");
    api("get_advance_requests.php?all_pending=1").then(function (data) {
      var list = $("adv-team-req-list");
      var others = data.requests.filter(function (r) { return Number(r.user_id || 0) !== Number(u.id); });
      var setup = (wf.setup_errors || []).length ? '<p class="error-msg">Approval setup: ' + wf.setup_errors.map(esc).join("<br>") + "</p>" : "";
      // Approvers: re-send one-click Approve emails for everything still pending.
      var pendingN = others.filter(function (r) { return r.status === "pending"; }).length;
      var resend = wf.is_approver && pendingN ? '<button type="button" class="btn-small" id="btn-adv-resend" style="margin:0 0 10px;">\u2709 Email me Approve buttons for ' + pendingN + ' pending request' + (pendingN === 1 ? "" : "s") + "</button>" : "";
      list.innerHTML = setup + resend + (others.length
        ? others.map(function (r) { return advReqItemHtml(r, true); }).join("")
        : '<p class="empty-note">' + (wf.is_viewer ? "No approved expense reports yet." : "No team requests submitted yet.") + "</p>");
      wireAdvReqButtons(list);
      var rb = $("btn-adv-resend");
      if (rb) rb.addEventListener("click", function () {
        rb.disabled = true;
        api("resend_approval_emails.php", { method: "POST", body: {} }).then(function (d) {
          toast(d.sent.length ? "Approval emails sent: " + d.sent.join(", ") : "Nothing waiting for approval");
        }).catch(function (e) { toast(e.message); }).then(function () { rb.disabled = false; });
      });
    }).catch(function (err) { toast(err.message); });
  }

  $("btn-adv-new").addEventListener("click", function () { openAdvForm(null, true); });

  // ---------------- Import Excel (Tally Ledger Account) — GM/CEO ----------------
  // Server parses + reconciles (api/import_ledger.php): preview first, the
  // user confirms/changes the employee per ledger, then commit.
  var liFiles = [];
  var liPreview = null;
  var liMapping = {};
  var LI_LABELS = {
    advance_approve: "Approve advance", expense_approve: "Approve expense", expense_paid: "Mark paid",
    tally_new: "New Tally voucher", already: "Already done", duplicate: "Already imported",
    awaiting_approval: "Not approved yet", advance_paid: "Mark advance paid",
    conflict: "Conflict", unmatched: "Skipped (no employee)"
  };
  function liAmt(v) {
    v = Number(v) || 0;
    return money(Math.abs(v)) + (v > 0 ? " Dr" : v < 0 ? " Cr" : "");
  }
  function liForm(mode) {
    var fd = new FormData();
    liFiles.forEach(function (f) { fd.append("files[]", f); });
    fd.append("mode", mode);
    fd.append("mapping", JSON.stringify(liMapping));
    return fd;
  }
  function liRunPreview() {
    $("adv-import-view").classList.remove("hidden");
    $("adv-import-view").innerHTML = '<p class="empty-note">Reading ledger&hellip;</p>';
    return apiUpload("import_ledger.php", liForm("preview")).then(function (data) {
      liPreview = data;
      data.ledgers.forEach(function (l) { liMapping[String(l.index)] = l.employee_id || 0; });
      renderLedgerPreview();
    }).catch(function (err) {
      $("adv-import-view").innerHTML = '<div class="li-card"><p class="error-msg">' + esc(err.message) + '</p><button class="btn-small" id="li-close">Close</button></div>';
      $("li-close").addEventListener("click", closeLedgerImport);
    });
  }
  function closeLedgerImport() {
    liFiles = []; liPreview = null; liMapping = {};
    $("adv-import-view").classList.add("hidden");
    $("adv-import-view").innerHTML = "";
  }
  function renderLedgerPreview() {
    var d = liPreview;
    var emps = d.employees;
    var toApply = 0;
    var html = '<h3 class="section-title">Import preview</h3>' +
      (d.problems && d.problems.length ? '<p class="error-msg">' + d.problems.map(esc).join("<br>") + "</p>" : "");
    d.ledgers.forEach(function (l) {
      var c = l.counts || {};
      var mapped = Number(liMapping[String(l.index)] || 0);
      if (mapped) ["advance_paid", "advance_approve", "expense_approve", "expense_paid", "tally_new"].forEach(function (k) { toApply += c[k] || 0; });
      var shown = l.entries.slice(0, 60);
      html += '<div class="li-card">' +
        '<div class="rc-top"><span>' + esc(l.party) + '</span><span>' + liAmt(l.balance) + "</span></div>" +
        '<div class="rc-sub">' + esc(l.file) + (l.sheet ? " \u00B7 " + esc(l.sheet) : "") + (l.period ? " \u00B7 " + esc(l.period) : "") + " \u00B7 " + l.entries.length + " vouchers</div>" +
        '<label style="margin-top:8px;">Employee</label><select data-li-emp="' + l.index + '"><option value="0">\u2014 Skip this ledger \u2014</option>' +
        emps.map(function (e) { return '<option value="' + e.id + '"' + (e.id === mapped ? " selected" : "") + ">" + esc(e.name) + (e.active ? "" : " (inactive)") + "</option>"; }).join("") + "</select>" +
        '<div class="rc-badges" style="margin-top:8px;">' + Object.keys(c).map(function (k) {
          return '<span class="badge li-' + k + '">' + (LI_LABELS[k] || k) + ": " + c[k] + "</span>";
        }).join("") + "</div>" +
        '<div class="li-table-wrap"><table class="li-table"><thead><tr><th>Date</th><th>Particulars</th><th>Voucher</th><th class="num">Amount</th><th>Action</th></tr></thead><tbody>' +
        shown.map(function (e) {
          var heads = e.heads && Object.keys(e.heads).length ? Object.keys(e.heads).map(function (h) { return esc(h) + " " + liAmt(e.heads[h]); }).join(", ") : "";
          return "<tr><td>" + esc(e.date) + '</td><td class="wrap">' + esc(e.particulars || "\u2014") + (heads ? '<div class="rc-status-note">' + heads + "</div>" : "") + "</td>" +
            "<td>" + esc(e.vch_type) + " " + esc(e.vch_no) + '</td><td class="num">' + liAmt(e.amount) + "</td>" +
            '<td class="wrap"><span class="badge li-' + e.action + '">' + (LI_LABELS[e.action] || e.action) + '</span><div class="rc-status-note">' + esc(e.note || "") + "</div></td></tr>";
        }).join("") +
        (l.entries.length > shown.length ? '<tr><td colspan="5" class="rc-status-note">+ ' + (l.entries.length - shown.length) + " more</td></tr>" : "") +
        "</tbody></table></div></div>";
    });
    html += '<div class="ax-actions" style="margin-bottom:18px;"><button class="btn-primary" id="li-commit" style="width:auto;padding:10px 18px;"' + (toApply ? "" : " disabled") + ">" +
      (toApply ? "Import " + toApply + " change" + (toApply === 1 ? "" : "s") : "Nothing to import") + '</button><button class="btn-small" id="li-cancel" style="margin-top:0;">Cancel</button></div>';
    $("adv-import-view").innerHTML = html;
    $("adv-import-view").querySelectorAll("[data-li-emp]").forEach(function (sel) {
      sel.addEventListener("change", function () { liMapping[sel.dataset.liEmp] = Number(sel.value); liRunPreview(); });
    });
    $("li-cancel").addEventListener("click", closeLedgerImport);
    $("li-commit").addEventListener("click", function () {
      var btn = this; btn.disabled = true; btn.textContent = "Importing\u2026";
      apiUpload("import_ledger.php", liForm("commit")).then(function (res) {
        var s = res.summary;
        var parts = [];
        if (s.advance_paid) parts.push(s.advance_paid + " advance(s) marked paid");
        if (s.advance_approve) parts.push(s.advance_approve + " advance(s) approved");
        if (s.expense_approve) parts.push(s.expense_approve + " expense(s) approved");
        if (s.expense_paid) parts.push(s.expense_paid + " expense(s) marked paid");
        if (s.tally_new) parts.push(s.tally_new + " Tally voucher(s) recorded");
        toast(parts.length ? "Imported: " + parts.join(", ") : "Nothing new \u2014 already up to date");
        if (res.conflicts && res.conflicts.length) alert("Not changed (check in Sales Report):\n\n" + res.conflicts.join("\n"));
        closeLedgerImport();
        loadAdvRequestList();
      }).catch(function (err) { toast(err.message); btn.disabled = false; btn.textContent = "Retry import"; });
    });
  }
  $("btn-adv-import").addEventListener("click", function () { $("adv-import-input").click(); });
  $("adv-import-input").addEventListener("change", function () {
    liFiles = Array.prototype.slice.call(this.files || []);
    this.value = "";
    if (!liFiles.length) return;
    liMapping = {};
    liRunPreview();
  });

  function loadTallyLedger() {
    api("tally_ledger.php").then(function (data) {
      var groups = data.groups || [];
      $("adv-tally-list").innerHTML = groups.length ? groups.map(function (g) {
        return '<div class="li-card"><div class="rc-top"><span>' + esc(g.employee_name) + "</span><span>" + liAmt(g.balance) + "</span></div>" +
          '<div class="li-table-wrap"><table class="li-table"><thead><tr><th>Date</th><th>Particulars</th><th>Voucher Type</th><th>Voucher No.</th><th class="num">Amount</th></tr></thead><tbody>' +
          g.entries.map(function (e) {
            var heads = e.heads && Object.keys(e.heads).length ? Object.keys(e.heads).map(function (h) { return esc(h) + " " + liAmt(e.heads[h]); }).join(", ") : "";
            return "<tr><td>" + esc(e.date) + '</td><td class="wrap">' + esc(e.particulars || "\u2014") + (heads ? '<div class="rc-status-note">' + heads + "</div>" : "") +
              "</td><td>" + esc(e.vch_type) + "</td><td>" + esc(e.vch_no) + '</td><td class="num">' + liAmt(e.amount) + "</td></tr>";
          }).join("") + "</tbody></table></div>" +
          '<div class="ax-actions"><button class="btn-small danger" data-tally-del="' + g.employee_id + '" style="margin-top:0;">Remove imported</button></div></div>';
      }).join("") : '<p class="empty-note">No Tally vouchers imported yet.</p>';
      $("adv-tally-list").querySelectorAll("[data-tally-del]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Remove all imported Tally vouchers for this employee? (Status changes already made stay.)")) return;
          api("tally_ledger.php", { method: "POST", body: { action: "delete_employee", employee_id: Number(b.dataset.tallyDel) } })
            .then(function () { toast("Imported vouchers removed"); loadTallyLedger(); })
            .catch(function (err) { toast(err.message); });
        });
      });
    }).catch(function () {});
  }

  // ---------------- Expense Report: Download PDF + Print ----------------
  // One report per Expenses Report (advance request) from
  // api/get_expense_report.php (same access rules as View/Export).
  // PDF is a real file built in the browser (jsPDF, loaded from cdnjs on
  // first use); Print opens a clean A4 page and calls the print dialog.
  function rptMoney(v) { return "Rs. " + (Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rptDate(v) { return v ? String(v).slice(0, 16) : "\u2014"; }
  function rptSections(r) {
    var rows = [];
    var out = function (label, no, from, to, cls, amt) {
      if (Number(amt) > 0) rows.push(["Out-station", label + (no ? " #" + no : "") + (from || to ? " (" + (from || "") + " \u2192 " + (to || "") + ")" : "") + (cls ? " " + cls : ""), rptMoney(amt)]);
    };
    out("Flight", r.flight_ticket_no, r.flight_from, r.flight_to, r.flight_class, r.flight_amount);
    out("Train", r.train_ticket_no, r.train_from, r.train_to, r.train_class, r.train_amount);
    out("Bus", r.bus_ticket_no, r.bus_from, r.bus_to, r.bus_class, r.bus_amount);
    if (Number(r.lodging_amount) > 0) rows.push(["Boarding & Lodging", "Lodging (" + (r.days_boarding_lodging || 0) + " day(s))", rptMoney(r.lodging_amount)]);
    if (Number(r.food_amount) > 0) rows.push(["Boarding & Lodging", "Food", rptMoney(r.food_amount)]);
    if (Number(r.ta_amount) > 0) rows.push(["Local Travelling", "Travelling Allowance (" + (r.days_local_travel || 0) + " day(s))", rptMoney(r.ta_amount)]);
    if (r.own_vehicle_used === "yes" && Number(r.own_vehicle_amount) > 0) rows.push(["Local Travelling", "Own vehicle " + (r.km_travelled || 0) + " km @ Rs. " + (r.own_vehicle_rate || 0) + "/km", rptMoney(r.own_vehicle_amount)]);
    if (Number(r.taxi_amount) > 0) rows.push(["Local Travelling", "Taxi", rptMoney(r.taxi_amount)]);
    if (Number(r.rented_amount) > 0) rows.push(["Local Travelling", "Rented vehicle", rptMoney(r.rented_amount)]);
    if (Number(r.auto_amount) > 0) rows.push(["Local Travelling", "Auto", rptMoney(r.auto_amount)]);
    return rows;
  }
  function rptPayment(d) {
    var p = d.approval && d.approval.paid;
    if (!p) return [["Payment status", d.overall === "Approved" ? "Approved \u2014 awaiting payment" : "Not paid"]];
    var src = { salesreport: "Sales Report", tallyfield: "TallyField", tally_import: "Tally" }[p.source] || p.source || "";
    return [["Payment status", "Paid"], ["Amount paid", rptMoney(p.amount)], ["Paid on", p.on || ""], ["Mode", p.mode || ""],
            ["Reference / Txn ID", p.ref || "\u2014"], ["Recorded by", (p.by || "") + (src ? " (" + src + ")" : "")]];
  }
  function rptApprovals(d) {
    var rows = (d.approval.approvals || []).map(function (x) {
      return [x.label, x.required ? "Mandatory" : "Optional", advApproverStatus(x), x.by || "\u2014", rptDate(x.at), x.remarks || ""];
    });
    rows.push(["Overall", "", d.overall, d.request.decided_by_name || "\u2014", rptDate(d.approval.fully_approved_at || d.request.decided_at), ""]);
    return rows;
  }
  function loadExpenseReport(id) { return api("get_expense_report.php?id=" + id); }

  function expenseReportHtml(d) {
    var r = d.request, t = function (rows, head) {
      return '<table>' + (head ? "<thead><tr>" + head.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead>" : "") +
        "<tbody>" + rows.map(function (row) { return "<tr>" + row.map(function (c) { return "<td>" + esc(c == null ? "" : String(c)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    };
    var secs = rptSections(r);
    return '<!doctype html><html><head><meta charset="utf-8"><title>Expense Report ' + esc(r.request_no) + '</title><style>' +
      '@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111}' +
      'h1{font-size:18px;margin:0}h2{font-size:12px;margin:14px 0 4px;text-transform:uppercase;color:#0b6b8a;border-bottom:1px solid #0b6b8a;padding-bottom:2px}' +
      'table{width:100%;border-collapse:collapse;margin-top:4px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#eef5f8}' +
      '.hdr{display:flex;justify-content:space-between;align-items:flex-start}.st{font-weight:bold;font-size:13px}.muted{color:#666;font-size:10px}.tot td{font-weight:bold}' +
      '</style></head><body>' +
      '<div class="hdr"><div><h1>Expense Report</h1><div>' + esc((d.company && d.company.name) || "") + '</div></div>' +
      '<div style="text-align:right"><div class="st">' + esc(r.request_no) + '</div><div>Overall status: <b>' + esc(d.overall) + '</b></div></div></div>' +
      '<h2>Employee</h2>' + t([["Name", r.employee_name], ["Employee code", r.employee_code], ["Designation", r.designation], ["Department", r.department], ["Mobile", r.mobile_number], ["Reporting manager", r.reporting_manager]]) +
      '<h2>Request</h2>' + t([["Purpose", r.purpose_of_travel], ["Route", (r.travel_from || "") + " \u2192 " + (r.travel_to || "")], ["Dates", (r.date_from || "") + " to " + (r.date_to || "")], ["Submitted on", rptDate(r.created_at)]]) +
      '<h2>Expense details</h2>' + (secs.length ? t(secs.concat([["", "TOTAL", rptMoney(r.total_advance_requested)]]), ["Category", "Description", "Amount"]).replace(/<tr><td><\/td><td>TOTAL/, '<tr class="tot"><td></td><td>TOTAL') : "<p>No amounts entered.</p>") +
      (r.local_travel_note ? '<p><b>Local travelling note:</b> ' + esc(r.local_travel_note) + "</p>" : "") +
      '<h2>Approval</h2>' + t(rptApprovals(d), ["Approver", "Type", "Status", "By", "Date / time", "Remarks"]) +
      '<h2>Payment</h2>' + t(rptPayment(d)) +
      (d.expenses.length ? '<h2>Expenses drawn against this request</h2>' +
        t(d.expenses.map(function (x) { return [x.date, x.category, x.description, rptMoney(x.amount), x.status + (x.status_by ? " (" + x.status_by + ")" : "")]; })
          .concat([["", "", "Total spent (excl. rejected)", rptMoney(d.expenses_total), ""]]), ["Date", "Category", "Description", "Amount", "Status"]) : "") +
      (d.history.length ? '<h2>History</h2>' + t(d.history.map(function (h) { return [rptDate(h.created_at), h.event.replace(/_/g, " "), h.actor_name || "", h.detail || ""]; }), ["When", "Event", "By", "Detail"]) : "") +
      '<p class="muted">Generated ' + esc(d.generated_at) + " by " + esc(d.generated_by) + " \u2014 Canares Sales Report</p></body></html>";
  }

  function printExpenseReport(id) {
    var w = window.open("", "_blank");   // opened synchronously so pop-up blockers allow it
    if (!w) { toast("Allow pop-ups for this site to print"); return; }
    w.document.write("<p style='font-family:Arial'>Preparing report\u2026</p>");
    loadExpenseReport(id).then(function (d) {
      w.document.open(); w.document.write(expenseReportHtml(d)); w.document.close();
      w.focus(); setTimeout(function () { w.print(); }, 300);
    }).catch(function (e) { w.close(); toast(e.message); });
  }

  var PDF_LIBS = ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
                  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"];
  var pdfLibsPromise = null;
  function loadPdfLibs() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
    if (pdfLibsPromise) return pdfLibsPromise;
    pdfLibsPromise = PDF_LIBS.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res, rej) {
          var s = document.createElement("script"); s.src = src; s.onload = res;
          s.onerror = function () { rej(new Error("Could not load the PDF tool \u2014 check your connection")); };
          document.head.appendChild(s);
        });
      });
    }, Promise.resolve()).catch(function (e) { pdfLibsPromise = null; throw e; });
    return pdfLibsPromise;
  }

  function downloadExpenseReportPdf(id) {
    toast("Preparing PDF\u2026");
    Promise.all([loadExpenseReport(id), loadPdfLibs()]).then(function (res) {
      var d = res[0], r = d.request;
      var doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
      var y = 40, left = 40;
      var section = function (title) {
        y = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : y) + 18;
        if (y > 760) { doc.addPage(); y = 40; }
        doc.setFontSize(10); doc.setTextColor(11, 107, 138); doc.text(title.toUpperCase(), left, y); doc.setTextColor(0);
        y += 6;
      };
      var table = function (rows, head) {
        doc.autoTable({ startY: y, head: head ? [head] : undefined, body: rows, theme: "grid", margin: { left: left, right: left },
          styles: { fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [11, 107, 138] } });
      };
      doc.setFontSize(16); doc.text("Expense Report", left, y);
      doc.setFontSize(9); doc.text(String((d.company && d.company.name) || ""), left, y + 14);
      doc.setFontSize(11); doc.text(String(r.request_no || ""), 555, y, { align: "right" });
      doc.setFontSize(9); doc.text("Overall status: " + d.overall, 555, y + 14, { align: "right" });
      y += 26;
      section("Employee");
      table([["Name", r.employee_name || ""], ["Employee code", r.employee_code || ""], ["Designation", r.designation || ""],
             ["Department", r.department || ""], ["Mobile", r.mobile_number || ""], ["Reporting manager", r.reporting_manager || ""]]);
      section("Request");
      table([["Purpose", r.purpose_of_travel || ""], ["Route", (r.travel_from || "") + " -> " + (r.travel_to || "")],
             ["Dates", (r.date_from || "") + " to " + (r.date_to || "")], ["Submitted on", rptDate(r.created_at)]]);
      section("Expense details");
      var secs = rptSections(r).map(function (row) { return row.map(function (c) { return String(c).replace(/\u2192/g, "->"); }); });
      secs.push([{ content: "TOTAL", colSpan: 2, styles: { fontStyle: "bold", halign: "right" } }, { content: rptMoney(r.total_advance_requested), styles: { fontStyle: "bold" } }]);
      table(secs, ["Category", "Description", "Amount"]);
      if (r.local_travel_note) { section("Local travelling note"); table([[r.local_travel_note]]); }
      section("Approval");
      table(rptApprovals(d).map(function (row) { return row.map(String); }), ["Approver", "Type", "Status", "By", "Date / time", "Remarks"]);
      section("Payment");
      table(rptPayment(d).map(function (row) { return row.map(String); }));
      if (d.expenses.length) {
        section("Expenses drawn against this request");
        var ex = d.expenses.map(function (x) { return [x.date, x.category, x.description.replace(/\u2192/g, "->"), rptMoney(x.amount), x.status + (x.status_by ? " (" + x.status_by + ")" : "")]; });
        ex.push([{ content: "Total spent (excl. rejected)", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } }, { content: rptMoney(d.expenses_total), styles: { fontStyle: "bold" } }, ""]);
        table(ex, ["Date", "Category", "Description", "Amount", "Status"]);
      }
      if (d.history.length) {
        section("History");
        table(d.history.map(function (h) { return [rptDate(h.created_at), h.event.replace(/_/g, " "), h.actor_name || "", h.detail || ""]; }), ["When", "Event", "By", "Detail"]);
      }
      var pages = doc.getNumberOfPages();
      for (var i = 1; i <= pages; i++) {
        doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(120);
        doc.text("Generated " + d.generated_at + " by " + d.generated_by + " - Canares Sales Report - page " + i + "/" + pages, left, 820);
      }
      doc.save("Expense_Report_" + String(r.request_no || id).replace(/[^A-Za-z0-9_-]/g, "_") + ".pdf");
    }).catch(function (e) { toast(e.message); });
  }

  // Tally-style Ledger Account (employee A/c, Apr–Mar year of the request)
  function exportEmployeeLedger(id) {
    var token = localStorage.getItem(TOKEN_KEY) || "";
    window.open(API + "export_ledger.php?id=" + id + "&token=" + encodeURIComponent(token), "_blank");
  }

  function exportAdvanceRequest(id) {
    var token = localStorage.getItem(TOKEN_KEY) || "";
    window.open(API + "export_advance_request.php?id=" + id + "&token=" + encodeURIComponent(token), "_blank");
  }

  function renderAdvTravelRows(req) {
    var labels = { flight: "Flight", train: "Train", bus: "Bus" };
    $("adv-travel-rows").innerHTML = advTravelSections.map(function (sec) {
      var ticketNo = req ? (req[sec + "_ticket_no"] || "") : "";
      var from = req ? (req[sec + "_from"] || "") : "";
      var to = req ? (req[sec + "_to"] || "") : "";
      var cls = req ? (req[sec + "_class"] || "") : "";
      var amt = req ? (req[sec + "_amount"] || "") : "";
      var atts = req && req.attachments ? req.attachments.filter(function (a) { return a.section === sec; }) : [];
      var attLinks = atts.map(function (a, i) {
        return '<a class="attachment-link" href="' + esc(srvUrl(a.file_path)) + '" target="_blank" rel="noopener">Ticket ' + (i + 1) + "</a>";
      }).join(" ");
      return '<div class="aef-travel-row">' +
        '<strong>' + labels[sec] + "</strong>" +
        '<div class="row-2 field-editable">' +
          '<div><label>Ticket/Fare No.</label><input type="text" class="adv-t-ticketno" data-sec="' + sec + '" value="' + esc(ticketNo) + '"></div>' +
          '<div><label>Amount (Rs.) \u2014 Actual</label><input type="number" min="0" class="adv-t-amount" data-sec="' + sec + '" value="' + esc(amt) + '"></div>' +
        "</div>" +
        '<div class="row-3 field-editable">' +
          '<div><label>From</label><input type="text" class="adv-t-from" data-sec="' + sec + '" value="' + esc(from) + '"></div>' +
          '<div><label>To</label><input type="text" class="adv-t-to" data-sec="' + sec + '" value="' + esc(to) + '"></div>' +
          '<div><label>Class/Category</label><input type="text" class="adv-t-class" data-sec="' + sec + '" value="' + esc(cls) + '"></div>' +
        "</div>" +
        '<label>Attach Ticket (PDF or image, one or more)</label>' +
        '<input type="file" class="adv-t-file" data-sec="' + sec + '" accept=".pdf,image/jpeg,image/png,image/webp" multiple>' +
        (attLinks ? '<p class="rate-hint">' + attLinks + "</p>" : "") +
        "</div>";
    }).join("");

    $("adv-travel-rows").querySelectorAll(".adv-t-amount").forEach(function (inp) {
      inp.addEventListener("input", recalcAdvForm);
    });
    $("adv-travel-rows").querySelectorAll(".adv-t-file").forEach(function (inp) {
      inp.addEventListener("change", function () {
        advTravelFiles[this.dataset.sec] = Array.prototype.slice.call(this.files);
      });
    });
  }

  function setAdvFormEditable(editable) {
    var ids = ["adv-purpose", "adv-travel-from", "adv-travel-to", "adv-date-from", "adv-date-to",
      "adv-days-bl", "adv-days-ta", "adv-own-vehicle-used", "adv-vehicle-rate", "adv-km",
      "adv-taxi-amount", "adv-rented-amount", "adv-auto-amount", "adv-local-note",
      "adv-lodging-amount", "adv-food-amount", "adv-ta-per-day", "adv-ta-amount", "adv-vehicle-amount"];
    ids.forEach(function (id) { $(id).disabled = !editable; });
    $("adv-travel-rows").querySelectorAll("input").forEach(function (inp) { inp.disabled = !editable; });
    $("adv-bl-bills-input").classList.toggle("hidden", !editable);
    $("adv-lt-bills-input").classList.toggle("hidden", !editable);
    $("btn-adv-save").classList.toggle("hidden", !editable);
  }

  function openAdvForm(requestId, editable) {
    advEditingId = requestId;
    advViewingRequest = null;
    advTravelFiles = { flight: [], train: [], bus: [] };
    advBillFiles = { bl_bills: [], lt_bills: [] };
    $("adv-form-error").textContent = "";
    $("adv-list-view").classList.add("hidden");
    $("adv-form-view").classList.remove("hidden");
    $("btn-adv-back-to-list").classList.remove("hidden");

    var afterProfileReady = function () {
      if (requestId) {
        api("get_advance_request.php?id=" + requestId).then(function (data) {
          advViewingRequest = data.request;
          populateAdvForm(data.request, editable && data.request.status === "pending");
        }).catch(function (err) { toast(err.message); showAdvListView(); });
      } else {
        populateAdvForm(null, true);
      }
    };

    if (advProfile) { afterProfileReady(); return; }
    api("get_my_employee_details.php").then(function (d) {
      advProfile = d;
      afterProfileReady();
    }).catch(function (err) { toast(err.message); showAdvListView(); });
  }

  function populateAdvForm(req, editable) {
    $("adv-hub-title").textContent = req ? req.request_no : "New Advance Expense Request";
    $("adv-req-no-display").textContent = req ? "Request No. " + req.request_no : "A request number is assigned once you submit.";

    var name = req ? req.employee_name : advProfile.employee_name;
    var code = req ? req.employee_code : advProfile.employee_code;
    var designation = req ? req.designation : advProfile.designation;
    var department = req ? req.department : advProfile.department;
    $("adv-emp-name").value = name || "";
    $("adv-emp-code").value = code || "";
    $("adv-designation").value = designation || "";
    $("adv-department").value = department || "";
    $("adv-bl-designation").value = designation || "";

    if (!req && advProfile && advProfile.rate_configured === false) {
      $("adv-form-error").textContent = "Note: no Rate Master limits set for \"" + designation + "\" \u2014 limits show \u20B90 (reference only). You can still submit.";
    }

    $("adv-purpose").value = req ? (req.purpose_of_travel || "") : "";
    $("adv-travel-from").value = req ? (req.travel_from || "") : "";
    $("adv-travel-to").value = req ? (req.travel_to || "") : "";
    $("adv-date-from").value = req ? (req.date_from || "") : "";
    $("adv-date-to").value = req ? (req.date_to || "") : "";
    $("adv-days-bl").value = req ? req.days_boarding_lodging : "";
    $("adv-days-ta").value = req ? req.days_local_travel : "";
    // Manual amounts: empty on a new form, saved values on view/edit.
    var keep = function (v) { return req && Number(v) ? Number(v) : ""; };
    $("adv-lodging-amount").value = keep(req && req.lodging_amount);
    $("adv-food-amount").value = keep(req && req.food_amount);
    $("adv-ta-per-day").value = keep(req && req.ta_per_day);
    $("adv-ta-amount").value = keep(req && req.ta_amount);
    $("adv-vehicle-amount").value = keep(req && req.own_vehicle_amount);
    $("adv-own-vehicle-used").value = req ? (req.own_vehicle_used || "no") : "no";
    $("adv-km").value = req ? req.km_travelled : "";
    $("adv-vehicle-rate").value = req && req.own_vehicle_used === "yes" ? (Number(req.own_vehicle_rate) || "") : "";
    $("adv-local-note").value = req ? (req.local_travel_note || "") : "";
    $("adv-taxi-amount").value = req ? (Number(req.taxi_amount) || "") : "";
    $("adv-rented-amount").value = req ? (Number(req.rented_amount) || "") : "";
    $("adv-auto-amount").value = req ? (Number(req.auto_amount) || "") : "";

    renderAdvTravelRows(req);
    renderBillPreview("bl_bills", "adv-bl-bills-preview", req ? (req.bills || []).filter(function (b) { return b.section === "boarding_lodging"; }) : []);
    renderBillPreview("lt_bills", "adv-lt-bills-preview", req ? (req.bills || []).filter(function (b) { return b.section === "local_travel"; }) : []);

    // Approval block
    $("adv-appr-employee").textContent = (name || "\u2014") + (req ? " \u2014 " + req.created_at : "");
    $("adv-appr-manager").textContent = (req ? req.reporting_manager : advProfile.reporting_manager) || "\u2014";
    if (req && req.status !== "pending") {
      $("adv-appr-manager").textContent += " \u2014 " + (req.decided_at || "");
    }
    // Dual approval: each approver's decision + date/time, then final status.
    var ap = req && req.approval;
    if (ap && ap.approvals) {
      $("adv-appr-accounts").innerHTML = ap.approvals.map(function (x) {
        return esc(x.label) + (x.required ? " (mandatory)" : " (optional)") + ": " + (x.decision === "pending" ? "Pending" : esc(x.decision === "approved" ? "Approved" : "Rejected") + " \u2014 " + esc(x.at || ""));
      }).join("<br>") + "<br><strong>Overall: " + advOverallStatus(req) + "</strong>" + (ap.fully_approved_at ? " \u2014 " + esc(ap.fully_approved_at) : "");
    } else {
      $("adv-appr-accounts").textContent = req && req.status !== "pending" ? (req.decided_by_name || "") + " \u2014 " + (req.decided_at || "") : "Pending";
    }
    $("adv-status-pill").innerHTML = req ? advStatusPill(req) : '<span class="status-pill pending">Pending Approval</span>';

    var canApprove = !!(ap && ap.can_approve);
    var canReject = !!(ap && ap.can_reject);
    $("btn-adv-approve").textContent = canApprove ? "Approve as " + (ap.my_slot_label || "") : "Approve";
    $("btn-adv-approve").classList.toggle("hidden", !canApprove);
    $("btn-adv-reject").classList.toggle("hidden", !canReject);
    $("adv-approve-actions").classList.toggle("hidden", !canApprove && !canReject);

    $("btn-adv-export").classList.toggle("hidden", !req);
    $("btn-adv-print").classList.toggle("hidden", !req);
    $("btn-adv-report-pdf").classList.toggle("hidden", !req);
    $("btn-adv-report-print").classList.toggle("hidden", !req);

    setAdvFormEditable(editable);
    recalcAdvForm();
  }

  function getAdvRate() {
    if (advViewingRequest) {
      return {
        daily_lodging_limit: Number(advViewingRequest.daily_lodging_limit) || 0,
        daily_food_limit: Number(advViewingRequest.daily_food_limit) || 0,
        ta_per_day: Number(advViewingRequest.ta_per_day) || 0,
        own_vehicle_rate: Number(advViewingRequest.own_vehicle_rate) || 0,
      };
    }
    return (advProfile && advProfile.rate) || { daily_lodging_limit: 0, daily_food_limit: 0, ta_per_day: 0, own_vehicle_rate: 0 };
  }

  function advAmt(sec) {
    var el = document.querySelector(".adv-t-amount[data-sec='" + sec + "']");
    return el ? Number(el.value) || 0 : 0;
  }

  var advLocalSubtotal = 0;
  function recalcAdvForm() {
    var rate = getAdvRate();
    var flightAmt = advAmt("flight");
    var trainAmt = advAmt("train");
    var busAmt = advAmt("bus");
    var outstationSubtotal = flightAmt + trainAmt + busAmt;

    // Only the typed amounts count; limits are display-only.
    var n = function (id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; };
    var lodgingAmount = n("adv-lodging-amount");
    var foodAmount = n("adv-food-amount");
    var boardingSubtotal = lodgingAmount + foodAmount;

    var taAmount = n("adv-ta-amount");

    var ownVehicleUsed = $("adv-own-vehicle-used").value === "yes";
    $("adv-km-wrap").style.display = ownVehicleUsed ? "" : "none";
    $("adv-vehicle-rate-wrap").style.display = ownVehicleUsed ? "" : "none";
    $("adv-vehicle-amount-wrap").style.display = ownVehicleUsed ? "" : "none";
    $("adv-other-transport-wrap").classList.toggle("hidden", ownVehicleUsed);

    var ownVehicleAmount = ownVehicleUsed ? n("adv-vehicle-amount") : 0;
    var taxiAmt = Number($("adv-taxi-amount").value) || 0;
    var rentedAmt = Number($("adv-rented-amount").value) || 0;
    var autoAmt = Number($("adv-auto-amount").value) || 0;
    var otherTransportTotal = ownVehicleUsed ? 0 : (taxiAmt + rentedAmt + autoAmt);
    if (ownVehicleUsed) { taxiAmt = 0; rentedAmt = 0; autoAmt = 0; }
    var localSubtotal = taAmount + ownVehicleAmount + otherTransportTotal;

    var total = outstationSubtotal + boardingSubtotal + localSubtotal;

    $("adv-outstation-subtotal").textContent = money(outstationSubtotal);
    $("adv-lodging-limit").value = money(rate.daily_lodging_limit);
    $("adv-food-limit").value = money(rate.daily_food_limit);
    $("adv-boarding-subtotal").textContent = money(boardingSubtotal);
    $("adv-local-subtotal").textContent = money(localSubtotal);
    advLocalSubtotal = localSubtotal;
    $("adv-sum-1").textContent = money(outstationSubtotal);
    $("adv-sum-2").textContent = money(boardingSubtotal);
    $("adv-sum-3").textContent = money(localSubtotal);
    $("adv-grand-total").textContent = money(total);
  }

  ["adv-days-bl", "adv-days-ta", "adv-own-vehicle-used", "adv-vehicle-rate", "adv-km", "adv-taxi-amount", "adv-rented-amount", "adv-auto-amount",
   "adv-lodging-amount", "adv-food-amount", "adv-ta-per-day", "adv-ta-amount", "adv-vehicle-amount"].forEach(function (id) {
    $(id).addEventListener("input", recalcAdvForm);
    $(id).addEventListener("change", recalcAdvForm);
  });

  $("btn-adv-save").addEventListener("click", function () {
    $("adv-form-error").textContent = "";
    var purpose = $("adv-purpose").value.trim();
    var travelFrom = $("adv-travel-from").value.trim();
    var travelTo = $("adv-travel-to").value.trim();
    var dateFrom = $("adv-date-from").value;
    var dateTo = $("adv-date-to").value;
    var daysBL = $("adv-days-bl").value;
    var daysTA = $("adv-days-ta").value;

    if (!purpose) { $("adv-form-error").textContent = "Purpose of Travel is required"; return; }
    if (!travelFrom) { $("adv-form-error").textContent = "Travel From (Place) is required"; return; }
    if (!travelTo) { $("adv-form-error").textContent = "Travel To (Place) is required"; return; }
    if (!dateFrom) { $("adv-form-error").textContent = "Date From is required"; return; }
    if (!dateTo) { $("adv-form-error").textContent = "Date To is required"; return; }
    if (dateTo < dateFrom) { $("adv-form-error").textContent = "Date To cannot be earlier than Date From"; return; }
    if (Number(daysBL) < 0) { $("adv-form-error").textContent = "No. of Days (Outstation) cannot be negative"; return; }
    if (Number(daysTA) < 0) { $("adv-form-error").textContent = "No. of TA Days cannot be negative"; return; }
    recalcAdvForm();
    if (!(parseFloat($("adv-grand-total").textContent.replace(/[^0-9.]/g, "")) > 0)) {
      $("adv-form-error").textContent = "Enter an amount in at least one section"; return;
    }
    var vehicleUsed = $("adv-own-vehicle-used").value === "yes";
    var vehicleRate = $("adv-vehicle-rate").value;
    if (vehicleUsed && !(Number(vehicleRate) > 0)) { $("adv-form-error").textContent = "Enter the Own Vehicle Rate (Rs./km)"; $("adv-vehicle-rate").focus(); return; }
    var localNote = $("adv-local-note").value.trim();
    if (advLocalSubtotal > 0 && !localNote) { $("adv-form-error").textContent = "Local Travelling note is required"; $("adv-local-note").focus(); return; }

    var fd = new FormData();
    fd.append("purpose_of_travel", purpose);
    fd.append("travel_from", travelFrom);
    fd.append("travel_to", travelTo);
    fd.append("date_from", dateFrom);
    fd.append("date_to", dateTo);
    fd.append("days_boarding_lodging", daysBL || 0);
    fd.append("days_local_travel", daysTA || 0);
    fd.append("lodging_amount", $("adv-lodging-amount").value || 0);
    fd.append("food_amount", $("adv-food-amount").value || 0);
    fd.append("ta_per_day", $("adv-ta-per-day").value || 0);
    fd.append("ta_amount", $("adv-ta-amount").value || 0);
    fd.append("own_vehicle_amount", $("adv-vehicle-amount").value || 0);
    fd.append("own_vehicle_used", $("adv-own-vehicle-used").value);
    fd.append("km_travelled", $("adv-km").value || 0);
    fd.append("own_vehicle_rate", vehicleUsed ? vehicleRate : 0);
    fd.append("local_travel_note", localNote);
    fd.append("taxi_amount", $("adv-taxi-amount").value || 0);
    fd.append("rented_amount", $("adv-rented-amount").value || 0);
    fd.append("auto_amount", $("adv-auto-amount").value || 0);
    advTravelSections.forEach(function (sec) {
      var row = document.querySelector(".adv-t-ticketno[data-sec='" + sec + "']").closest(".aef-travel-row");
      fd.append(sec + "_ticket_no", row.querySelector(".adv-t-ticketno").value);
      fd.append(sec + "_from", row.querySelector(".adv-t-from").value);
      fd.append(sec + "_to", row.querySelector(".adv-t-to").value);
      fd.append(sec + "_class", row.querySelector(".adv-t-class").value);
      fd.append(sec + "_amount", row.querySelector(".adv-t-amount").value || 0);
      (advTravelFiles[sec] || []).forEach(function (f) { fd.append(sec + "_tickets[]", f); });
    });
    (advBillFiles.bl_bills || []).forEach(function (f) { fd.append("bl_bills[]", f); });
    (advBillFiles.lt_bills || []).forEach(function (f) { fd.append("lt_bills[]", f); });
    if (advEditingId) fd.append("id", advEditingId);

    var btn = this;
    btn.disabled = true;
    apiUpload(advEditingId ? "update_advance_request.php" : "add_advance_request.php", fd).then(function (data) {
      toast("Advance Expense Request " + (advEditingId ? "updated" : "submitted") + " \u2713 Total: " + money(data.total_advance_requested));
      loadMyAdvanceRequestOptions();
      showAdvListView();
    }).catch(function (err) {
      $("adv-form-error").textContent = err.message;
    }).then(function () { btn.disabled = false; });
  });

  $("btn-adv-approve").addEventListener("click", function () { decideAdvRequest("approved"); });
  $("btn-adv-reject").addEventListener("click", function () { decideAdvRequest("rejected"); });
  function sendAdvDecision(id, status) {
    var remarks = "";
    if (status === "rejected") {
      remarks = prompt("Reason for rejecting this Expenses Report:") || "";
      if (!remarks.trim()) { toast("Rejection cancelled \u2014 a reason is needed"); return Promise.reject(new Error("cancelled")); }
    }
    return api("set_advance_request_status.php", { method: "POST", body: { id: id, status: status, remarks: remarks } })
      .then(function (res) {
        var a = res.approval || {};
        toast(status === "rejected" ? "Expenses Report rejected"
          : a.final_status === "fully_approved" ? "Approved \u2713 \u2014 sent to Accounts for payment"
          : "Your approval is recorded \u2014 still pending Gajanan\u2019s approval");
        return res;
      }, function (err) { toast(err.message); throw err; });
  }
  function decideAdvRequest(status) {
    if (!advViewingRequest) return;
    sendAdvDecision(advViewingRequest.id, status).then(showAdvListView, function () {});
  }

  $("btn-adv-report-pdf").addEventListener("click", function () { if (advViewingRequest) downloadExpenseReportPdf(advViewingRequest.id); });
  $("btn-adv-report-print").addEventListener("click", function () { if (advViewingRequest) printExpenseReport(advViewingRequest.id); });
  $("btn-adv-print").addEventListener("click", function () {
    window.print();
  });


  // ---------------- plans / reminders ----------------
  var editingPlanId = null;
  var planCache = {};
  var planTypeLabels = { next_day: "Next Day Plan", next_week: "Next Week Plan", pending_work: "Pending Work" };

  var getPlanType = chipGroup("pl-type", function () { loadPlans(); });

  function planCardHtml(p) {
    var today = localDateStr();
    var overdue = p.status === "open" && p.plan_date && p.plan_date < today;
    var badges = ['<span class="badge gray">' + esc(planTypeLabels[p.plan_type] || p.plan_type) + "</span>"];
    if (overdue) badges.push('<span class="badge" style="background:#fee2e2;color:#b91c1c;">Overdue</span>');
    var actions = p.status === "open"
      ? '<div class="rc-actions">' +
        '<button class="btn-done" data-plan-done="' + p.id + '">Mark Done</button>' +
        '<button class="btn-edit" data-plan-edit="' + p.id + '">Edit</button>' +
        '<button class="btn-del" data-plan-del="' + p.id + '">Delete</button></div>'
      : '<div class="rc-actions">' +
        '<button class="btn-edit" data-plan-reopen="' + p.id + '">Reopen</button>' +
        '<button class="btn-del" data-plan-del="' + p.id + '">Delete</button></div>';
    return '<div class="plan-card record-card' + (overdue ? " overdue" : "") + (p.status === "done" ? " done" : "") + '">' +
      '<div class="rc-top"><span>' + esc(p.contact_name || p.purpose) + "</span><span>" + esc(p.plan_date || "No date") + "</span></div>" +
      '<div class="rc-sub">' + esc(p.purpose) + (p.notes ? " \u00B7 " + esc(p.notes) : "") + "</div>" +
      '<div class="rc-badges">' + badges.join("") + "</div>" +
      actions +
      "</div>";
  }

  function resetPlanForm() {
    editingPlanId = null;
    $("pl-form-title").textContent = "Add Plan";
    $("btn-save-plan").textContent = "Save Plan";
    $("btn-cancel-edit-plan").classList.add("hidden");
    ["pl-name", "pl-purpose", "pl-date", "pl-notes"].forEach(function (id) { $(id).value = ""; });
  }

  function startEditPlan(p) {
    editingPlanId = p.id;
    $("pl-form-title").textContent = "Edit Plan";
    $("btn-save-plan").textContent = "Update Plan";
    $("btn-cancel-edit-plan").classList.remove("hidden");
    setChipActive("pl-type", p.plan_type);
    $("pl-name").value = p.contact_name || "";
    $("pl-purpose").value = p.purpose || "";
    $("pl-date").value = p.plan_date || "";
    $("pl-notes").value = p.notes || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("btn-cancel-edit-plan").addEventListener("click", resetPlanForm);

  $("btn-save-plan").addEventListener("click", function () {
    $("plan-error").textContent = "";
    var btn = this;
    btn.disabled = true;
    var payload = {
      plan_type: getPlanType(),
      contact_name: $("pl-name").value,
      purpose: $("pl-purpose").value,
      plan_date: $("pl-date").value,
      notes: $("pl-notes").value,
    };
    var isEdit = !!editingPlanId;
    if (isEdit) payload.id = editingPlanId;

    api(isEdit ? "update_plan.php" : "add_plan.php", { method: "POST", body: payload })
      .then(function () {
        toast(isEdit ? "Plan updated \u2713" : "Plan saved \u2713");
        resetPlanForm();
        loadPlans();
      }).catch(function (err) {
        $("plan-error").textContent = err.message;
      }).then(function () { btn.disabled = false; });
  });

  function loadPlans() {
    var type = getPlanType();
    $("pl-list-title").textContent = "Open \u2014 " + (planTypeLabels[type] || "");

    api("get_plans.php?plan_type=" + type + "&status=open").then(function (data) {
      planCache = {};
      var list = $("plan-list");
      if (!data.plans.length) {
        list.innerHTML = '<p class="empty-note">Nothing here yet.</p>';
      } else {
        data.plans.forEach(function (p) { planCache[p.id] = p; });
        list.innerHTML = data.plans.map(planCardHtml).join("");
      }
      wirePlanActions(list);
    }).catch(function (err) { toast(err.message); });

    api("get_plans.php?plan_type=" + type + "&status=done").then(function (data) {
      var list = $("plan-done-list");
      if (!data.plans.length) {
        list.innerHTML = '<p class="empty-note">No completed items yet.</p>';
      } else {
        data.plans.forEach(function (p) { planCache[p.id] = p; });
        list.innerHTML = data.plans.map(planCardHtml).join("");
      }
      wirePlanActions(list);
    }).catch(function (err) { toast(err.message); });
  }

  function wirePlanActions(container) {
    container.querySelectorAll("[data-plan-done]").forEach(function (el) {
      el.addEventListener("click", function () {
        api("update_plan.php", { method: "POST", body: { id: Number(this.dataset.planDone), status: "done" } })
          .then(function () { toast("Marked done \u2713"); loadPlans(); loadHomePlansPreview(); })
          .catch(function (err) { toast(err.message); });
      });
    });
    container.querySelectorAll("[data-plan-reopen]").forEach(function (el) {
      el.addEventListener("click", function () {
        api("update_plan.php", { method: "POST", body: { id: Number(this.dataset.planReopen), status: "open" } })
          .then(function () { toast("Reopened \u2713"); loadPlans(); loadHomePlansPreview(); })
          .catch(function (err) { toast(err.message); });
      });
    });
    container.querySelectorAll("[data-plan-edit]").forEach(function (el) {
      el.addEventListener("click", function () {
        var p = planCache[this.dataset.planEdit];
        if (p) startEditPlan(p);
      });
    });
    container.querySelectorAll("[data-plan-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        if (!confirm("Delete this item?")) return;
        api("delete_plan.php", { method: "POST", body: { id: Number(this.dataset.planDel) } })
          .then(function () { toast("Deleted"); loadPlans(); loadHomePlansPreview(); })
          .catch(function (err) { toast(err.message); });
      });
    });
  }

  // ---------------- reports ----------------
  chipGroup("r-period", loadReports);

  function getReportPeriod() {
    var active = document.querySelector("#r-period .chip.active");
    return active ? active.dataset.value : "daily";
  }

  function statCard(value, label) {
    return '<div class="stat-card"><span class="stat-value">' + value +
      '</span><span class="stat-label">' + label + "</span></div>";
  }

  function memberStatCards(m) {
    return statCard(m.customers_visited || 0, "Customers Visited") +
      statCard(m.dealers_visited || 0, "Dealers Visited") +
      statCard(m.quotations_sent || 0, "Quotations Sent") +
      statCard(m.orders_received || 0, "Orders Received") +
      statCard(money(m.order_value), "Order Value") +
      statCard(money(m.payment_collected), "Payment Collected") +
      statCard(Number(m.total_km || 0).toFixed(0) + " km", "KM Travelled") +
      statCard(money(m.total_expenses), "Total Expenses");
  }

  function showTeamMemberSelection() {
    var selectedId = $("r-team-member-select").value;
    var memberStats = $("r-team-member-stats");
    var list = $("r-team-list");
    var totals = $("r-team-totals");
    if (!selectedId) {
      memberStats.classList.add("hidden");
      memberStats.innerHTML = "";
      list.classList.remove("hidden");
      totals.classList.remove("hidden");
      return;
    }
    var member = state.teamMembers.filter(function (m) {
      return Number(m.id) === Number(selectedId);
    })[0];
    list.classList.add("hidden");
    totals.classList.add("hidden");
    memberStats.classList.remove("hidden");
    memberStats.innerHTML = member ? memberStatCards(member) :
      '<p class="empty-note">No report found for this employee.</p>';
  }

  $("r-team-member-select").addEventListener("change", showTeamMemberSelection);

  function loadReports() {
    var period = getReportPeriod();
    api("get_my_summary.php?period=" + period).then(function (data) {
      $("r-my-stats").innerHTML =
        statCard(data.visits.customers_visited || 0, "Customers Visited") +
        statCard(data.visits.dealers_visited || 0, "Dealers Visited") +
        statCard(data.visits.quotations_sent || 0, "Quotations Sent") +
        statCard(data.visits.orders_received || 0, "Orders Received") +
        statCard(money(data.visits.order_value), "Order Value") +
        statCard(money(data.visits.payment_collected), "Payment Collected") +
        statCard(Number(data.expenses.total_km || 0).toFixed(0) + " km", "KM Travelled") +
        statCard(money(data.expenses.total_expenses), "Total Expenses");
    }).catch(function (err) { toast(err.message); });

    var u = state.user;
    if (u && (u.role === "tm" || u.role === "mh" || u.role === "ceo" || u.role === "gm")) {
      $("r-team-section").classList.remove("hidden");
      $("r-team-title").textContent = (u.role === "gm" || u.role === "mh" || u.role === "ceo") ? "All Territories" : "Team \u2014 " + u.territory;
      api("get_team_summary.php?period=" + period).then(function (data) {
        state.teamMembers = data.members;

        var select = $("r-team-member-select");
        var previouslySelected = select.value;
        select.innerHTML = '<option value="">All Team Members</option>' +
          data.members.map(function (m) {
            return '<option value="' + m.id + '">' + esc(m.name) + " \u2014 " + roleLabel(m.role) + "</option>";
          }).join("");
        select.value = data.members.some(function (m) { return String(m.id) === previouslySelected; })
          ? previouslySelected : "";

        var list = $("r-team-list");
        if (!data.members.length) {
          list.innerHTML = '<p class="empty-note">No team members found.</p>';
          $("r-team-totals").innerHTML = "";
          showTeamMemberSelection();
          return;
        }
        list.innerHTML = data.members.map(function (m) {
          var delBtn = (u.role === "ceo" && Number(m.id) !== Number(u.id)) ?
            '<button class="btn-small danger" data-delmember="' + m.id + '">Delete</button>' : "";
          var viewBtn = '<button class="btn-small" data-viewmember="' + m.id + '" data-viewmembername="' + esc(m.name) + '">View</button>';
          return '<div class="record-card">' +
            '<div class="rc-top"><span>' + esc(m.name) + "</span><span>" + esc(m.territory) + "</span></div>" +
            '<div class="rc-sub">' + roleLabel(m.role) + "</div>" +
            '<div class="rc-badges">' +
            '<span class="badge">' + m.total_visits + " visits</span>" +
            '<span class="badge">' + m.quotations_sent + " quotes</span>" +
            '<span class="badge green">' + m.orders_received + " orders \u00B7 " + money(m.order_value) + "</span>" +
            '<span class="badge gray">' + Number(m.total_km).toFixed(0) + " km \u00B7 " + money(m.total_expenses) + "</span>" +
            "</div>" + viewBtn + delBtn + "</div>";
        }).join("");
        $("r-team-totals").innerHTML =
          "<span>Team Total \u2014 " + data.totals.total_visits + " visits, " +
          data.totals.orders_received + " orders</span><strong>" +
          money(data.totals.order_value) + "</strong>";

        list.querySelectorAll("button[data-viewmember]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            openMemberHistory(Number(btn.dataset.viewmember), btn.dataset.viewmembername);
          });
        });

        list.querySelectorAll("button[data-delmember]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var memberId = Number(btn.dataset.delmember);
            var card = btn.closest(".record-card");
            var name = card ? card.querySelector(".rc-top span").textContent : "this member";
            var typed = prompt("This permanently deletes " + name + " and ALL their visits, expenses and plans. This cannot be undone.\n\nType the name exactly to confirm: " + name);
            if (typed !== name) {
              if (typed !== null) toast("Name didn't match \u2014 nothing was deleted");
              return;
            }
            api("delete_member.php", {
              method: "POST",
              body: { user_id: memberId },
            }).then(function () {
              toast(name + " deleted");
              loadReports();
            }).catch(function (err) { toast(err.message); });
          });
        });

        showTeamMemberSelection();
      }).catch(function (err) { toast(err.message); });
    } else {
      $("r-team-section").classList.add("hidden");
    }
  }

  // ---------------- Sales Data module (real canaresai.com ERP documents) ----------------
  // Quotations / Transfer Orders / Delivery Challans — NOT the quotation_sent/
  // quotation_value fields under Reports (those are self-reported on a Visit).
  // This app keeps no copy of these; each load is a live pull of canaresai.com's
  // own GET /api/sales-report/<type>, which recomputes GST-correct totals
  // from its live data every time — so historical and just-created records
  // both show up with no separate sync step, and the tax figures can never
  // drift from what the ERP itself shows. No period filter — these are
  // canaresai.com's actual sales documents, not something scoped to a
  // reporting window. Its own top-level tab (not nested under Reports).
  var salesDataConfig = {
    quotations: { listFile: "get_quotations_report.php", key: "quotations", label: "quotation" },
    transfer_orders: { listFile: "get_transfer_orders_report.php", key: "transfer_orders", label: "transfer order" },
    delivery_challans: { listFile: "get_delivery_challans_report.php", key: "delivery_challans", label: "delivery challan" },
  };
  var sdRowsCache = [];   // the last-fetched, unfiltered list — the search box filters this client-side, no refetch
  var sdCurrentType = "quotations";
  var getSdType = chipGroup("sd-type", function (type) {
    sdCurrentType = type;
    $("sd-search").value = "";
    loadSalesData();
  });

  function renderSalesDataList(rows, type) {
    var list = $("sd-list");
    var totals = $("sd-totals");
    var cfg = salesDataConfig[type];
    if (!rows.length) {
      list.innerHTML = '<p class="empty-note">No matching ' + cfg.label + 's found.</p>';
      totals.innerHTML = "";
      return;
    }
    list.innerHTML = rows.map(function (r) {
      var subLabel = type === "delivery_challans" ? (r.order_code || "—") : (r.customer_name || "—");
      return '<div class="record-card">' +
        '<div class="rc-top"><span>' + esc(r.code || r.id) + "</span><span>" + esc((r.date || "").slice(0, 10)) + "</span></div>" +
        '<div class="rc-sub">' + esc(subLabel) + (r.status ? " · " + esc(r.status) : "") + "</div>" +
        '<div class="rc-badges">' +
        '<span class="badge gray">Subtotal ' + money(r.subtotal) + "</span>" +
        '<span class="badge gray">Tax ' + money(r.tax) + "</span>" +
        '<span class="badge green">Total ' + money(r.grand_total) + "</span>" +
        "</div>" +
        '<button class="btn-small" data-sdview="' + esc(r.id) + '" style="margin-top:8px;">View</button>' +
        "</div>";
    }).join("");
    var grandTotal = rows.reduce(function (s, r) { return s + Number(r.grand_total || 0); }, 0);
    var taxTotal = rows.reduce(function (s, r) { return s + Number(r.tax || 0); }, 0);
    totals.innerHTML = "<span>" + rows.length + " records · Tax " + money(taxTotal) + "</span><strong>" + money(grandTotal) + "</strong>";

    list.querySelectorAll("button[data-sdview]").forEach(function (btn) {
      btn.addEventListener("click", function () { openSalesDataDetail(type, btn.dataset.sdview); });
    });
  }

  function loadSalesData() {
    var type = getSdType() || "quotations";
    sdCurrentType = type;
    var cfg = salesDataConfig[type];
    $("sd-list").innerHTML = '<p class="empty-note">Loading…</p>';
    $("sd-totals").innerHTML = "";
    api(cfg.listFile).then(function (data) {
      sdRowsCache = data[cfg.key] || [];
      renderSalesDataList(sdRowsCache, type);
      // Creator-based visibility note (rules enforced on the server).
      var v = data.visibility || {};
      var note = "";
      if (v.scope === "own") {
        note = v.creator_info_missing
          ? "canaresai.com is not sending who created each " + cfg.label + " yet, so none can be shown to you. Ask your admin to enable creator details."
          : "Showing only the " + cfg.label + "s you created.";
      } else if (v.creator_info_missing) {
        note = "Admin view (all " + cfg.label + "s). Note: canaresai.com is not sending the creator of each document, so team members currently see none of them.";
      } else if (v.rows_without_creator) {
        note = "Admin view (all). " + v.rows_without_creator + " " + cfg.label + "(s) have no creator and are visible to admins only.";
      }
      if (note) $("sd-list").insertAdjacentHTML("afterbegin", '<p class="rate-hint" style="margin:0 0 8px;">' + esc(note) + "</p>");
    }).catch(function (err) {
      sdRowsCache = [];
      $("sd-list").innerHTML = '<p class="empty-note">' + esc(err.message || "Could not load this data") + "</p>";
      $("sd-totals").innerHTML = "";
    });
  }

  // Search by number: filters the already-fetched list client-side by
  // Quotation/Transfer Order/Delivery Challan code — no refetch, so it's
  // instant even before typing a full number.
  $("sd-search").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase();
    var filtered = q === "" ? sdRowsCache : sdRowsCache.filter(function (r) {
      return (r.code || "").toLowerCase().indexOf(q) !== -1;
    });
    renderSalesDataList(filtered, sdCurrentType);
  });

  // Deliberately no extra API call here — no new canaresai.com endpoint
  // needed for this. Renders straight from sdRowsCache (already fetched
  // for the list this row came from), so "View" just opens a focused,
  // single-record version of the same data the card already shows: no
  // per-line item breakdown (that data was never part of the list
  // response — only a dedicated ERP line-items endpoint would have it,
  // which isn't part of this).
  function openSalesDataDetail(type, id) {
    var row = sdRowsCache.filter(function (r) { return String(r.id) === String(id); })[0];
    if (!row) { toast("Could not find that record — try reloading the list."); return; }

    $("sd-detail-title").textContent = row.code || row.id;
    var subLabel = type === "delivery_challans" ? ("Order " + (row.order_code || "—")) : (row.customer_name || "—");
    $("sd-detail-body").innerHTML =
      '<p class="rc-sub">' + esc(subLabel) + (row.status ? " · " + esc(row.status) : "") + " · " + esc((row.date || "").slice(0, 10)) + "</p>" +
      '<div class="total-bar" style="margin-top:12px;"><span>Subtotal ' + money(row.subtotal) + " · Tax " + money(row.tax) +
      "</span><strong>" + money(row.grand_total) + "</strong></div>";
    $("sd-detail-modal").classList.remove("hidden");
  }

  function closeSalesDataDetail() { $("sd-detail-modal").classList.add("hidden"); }
  $("sd-detail-close").addEventListener("click", closeSalesDataDetail);
  $("btn-sd-detail-close2").addEventListener("click", closeSalesDataDetail);
  $("sd-detail-modal").addEventListener("click", function (e) {
    if (e.target.id === "sd-detail-modal") closeSalesDataDetail();
  });

  // ---------------- tasks ----------------
  var taskStatusLabels = { open: "Open", in_progress: "In Progress", done: "Done" };
  var taskAssigneeOptionsLoaded = false;
  var assignTaskMode = "new"; // "new" | "assign"
  var assignTaskId = null;    // set when assignTaskMode === "assign"

  function isTaskAssignerRole(role) { return role === "gm" || role === "ceo"; }

  function loadTaskAssigneeOptions() {
    if (taskAssigneeOptionsLoaded) return Promise.resolve();
    var endpoint = isTaskAssignerRole(state.user.role) ? "get_members.php" : "get_assignable_members.php";
    return api(endpoint).then(function (data) {
      taskAssigneeOptionsLoaded = true;
      $("at-assignee").innerHTML = data.members
        .filter(function (m) { return Number(m.is_active); })
        .map(function (m) { return '<option value="' + m.id + '">' + esc(m.name) + " (" + esc(roleLabel(m.role)) + ")</option>"; })
        .join("");
    });
  }

  function loadTasks() {
    var u = state.user;
    if (!u) return;
    var isAssigner = isTaskAssignerRole(u.role);
    $("tasks-assigner-tools").classList.toggle("hidden", !isAssigner);
    $("tasks-employee-header").classList.toggle("hidden", isAssigner);

    var statusSel = isAssigner ? $("tasks-status-filter") : $("tasks-status-filter-emp");
    var status = statusSel.value;
    var region = isAssigner ? $("tasks-region-filter").value : "";

    if (isAssigner) {
      api("get_tasks.php?unassigned=1").then(function (data) {
        var box = $("tasks-unassigned-section");
        var list = $("tasks-unassigned-list");
        if (!data.tasks.length) { box.classList.add("hidden"); return; }
        box.classList.remove("hidden");
        list.innerHTML = data.tasks.map(taskCardHtml.bind(null, true, true)).join("");
        wireTaskCardActions(list, true);
      }).catch(function () { $("tasks-unassigned-section").classList.add("hidden"); });
    }

    var q = [];
    if (status) q.push("status=" + status);
    if (region) q.push("region=" + encodeURIComponent(region));
    api("get_tasks.php" + (q.length ? "?" + q.join("&") : "")).then(function (data) {
      if (isAssigner) showIndiamartFillBox(data);
      var visible = isAssigner ? data.tasks.filter(function (t) { return t.assigned_to; }) : data.tasks;
      var list = $("tasks-list");
      if (isAssigner && !region) populateRegionFilter(data.tasks);
      if (!visible.length) {
        list.innerHTML = '<p class="empty-note">' + (isAssigner ? "No tasks yet." : "No tasks assigned to you yet.") + "</p>";
        return;
      }
      list.innerHTML = visible.map(taskCardHtml.bind(null, isAssigner, false)).join("");
      wireTaskCardActions(list, isAssigner);
    }).catch(function (err) { toast(err.message); });
  }

  function populateRegionFilter(tasks) {
    var sel = $("tasks-region-filter");
    var current = sel.value;
    var states = [];
    tasks.forEach(function (t) {
      if (t.lead_state && states.indexOf(t.lead_state) === -1) states.push(t.lead_state);
    });
    states.sort();
    sel.innerHTML = '<option value="">All Regions</option>' + states.map(function (s) {
      return '<option value="' + esc(s) + '">' + esc(s) + "</option>";
    }).join("");
    sel.value = states.indexOf(current) !== -1 ? current : "";
  }

  $("tasks-status-filter").addEventListener("change", loadTasks);
  $("tasks-status-filter-emp").addEventListener("change", loadTasks);
  $("tasks-region-filter").addEventListener("change", loadTasks);

  // IndiaMART's own lead-received time (stored in IST exactly as IndiaMART
  // sent it) — formatted from the text, no browser timezone conversion.
  function indiamartReceivedHtml(t) {
    if (t.source !== "indiamart") return "";
    var m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(t.lead_received_at || "");
    if (!m) return '<div class="rc-status-note">\uD83D\uDCE5 Received on IndiaMART: original time not available</div>';
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m[2]) - 1];
    var h = Number(m[4]), ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
    return '<div class="rc-status-note">\uD83D\uDCE5 Received on IndiaMART: <strong>' + Number(m[3]) + " " + mon + " " + m[1] +
      "</strong>, <strong>" + h12 + ":" + m[5] + " " + ap + " IST</strong></div>";
  }
  // Only already-synced official IndiaMART leads with a valid stored email
  // receive this button. The server validates access, loads the email from
  // storage, and records an at-most-once send attempt.
  function contactBuyerHtml(t) {
    if (!t || t.source !== "indiamart") return "";
    var status = String(t.contact_buyer_status || "");
    if (status === "sent") return '<span class="badge green contact-buyer-status" role="status">Email sent</span>';
    if (status === "sending") return '<span class="badge gray contact-buyer-status" role="status">Email processing</span>';
    if (status === "failed") return '<span class="badge contact-buyer-status" role="status" style="background:#fdecea;color:#c0392b;">Email failed — ask manager to follow up</span>';

    var email = t.lead_email == null ? "" : String(t.lead_email).trim();
    var at = email.lastIndexOf("@");
    var local = at > 0 ? email.slice(0, at) : "";
    var domain = at > 0 ? email.slice(at + 1) : "";
    var validLocal = at === email.indexOf("@") && local.length <= 64 &&
      /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local) &&
      local.charAt(0) !== "." && local.charAt(local.length - 1) !== "." && local.indexOf("..") === -1;
    var validDomain = /^(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)(?:\.(?:[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?))+$/i.test(domain);
    var taskId = Number(t.id);
    if (email.length <= 254 && validLocal && validDomain && isFinite(taskId) && taskId > 0 && Math.floor(taskId) === taskId) {
      return '<button type="button" class="btn-small contact-buyer-btn" data-contact-buyer="' + taskId + '" title="Send a brief email to this buyer">Contact Buyer</button>';
    }
    return "";
  }
  function taskCardHtml(isAssigner, isUnassigned, t) {
    var badges = ['<span class="badge gray">' + esc(t.source === "indiamart" ? "IndiaMART" : (t.source === "im_buylead" ? "IndiaMART BuyLead (open)" : "Manual")) + "</span>"];
    if (!isUnassigned) badges.push('<span class="badge ' + (t.status === "done" ? "green" : "") + '">' + esc(taskStatusLabels[t.status] || t.status) + "</span>");
    if (t.due_date) badges.push('<span class="badge gray">Due ' + esc(t.due_date) + "</span>");
    if (t.lead_city) badges.push('<span class="badge gray">' + esc(t.lead_city) + "</span>");
    if (t.lead_state) badges.push('<span class="badge gray">' + esc(t.lead_state) + "</span>");
    if (t.lead_pincode) badges.push('<span class="badge gray">PIN ' + esc(t.lead_pincode) + "</span>");
    if (Number(t.needs_manual_assignment)) badges.push('<span class="badge" style="background:#fdecea;color:#c0392b;">Needs manual assignment</span>');
    var leadBits = [t.lead_company, t.lead_contact, t.lead_phone].filter(Boolean).map(esc).join(" \u00B7 ");
    var actions = "";
    var contactAction = contactBuyerHtml(t);
    if (isUnassigned) {
      actions = contactAction + '<button class="btn-small" data-assign-lead="' + t.id + '" data-lead-title="' + esc(t.title) + '">Assign</button>';
    } else if (isAssigner) {
      actions = contactAction + '<span class="rc-sub">Assigned to ' + esc(t.assigned_to_name || "\u2014") +
        '</span> <button class="btn-small" data-assign-lead="' + t.id + '" data-lead-title="' + esc(t.title) + '" style="margin-left:8px;">Reassign</button>';
    } else {
      actions = contactAction + '<select class="task-status-select" data-taskid="' + t.id + '">' +
        Object.keys(taskStatusLabels).map(function (s) {
          return '<option value="' + s + '"' + (s === t.status ? " selected" : "") + ">" + taskStatusLabels[s] + "</option>";
        }).join("") +
        '</select> <button class="btn-small" data-assign-lead="' + t.id + '" data-lead-title="' + esc(t.title) + '" style="margin-left:8px;">Reassign</button>';
    }
    return '<div class="record-card">' +
      '<div class="rc-top"><span>' + esc(t.title) + "</span></div>" +
      (leadBits ? '<div class="rc-sub">' + leadBits + "</div>" : "") +
      indiamartReceivedHtml(t) +
      (t.description ? '<div class="rc-sub">' + esc(t.description) + "</div>" : "") +
      (t.assignment_reason ? '<div class="rc-sub">Assigned via: ' + esc(t.assignment_reason) + "</div>" : "") +
      '<div class="rc-badges">' + badges.join("") + "</div>" +
      '<div style="margin-top:8px;">' + actions + "</div>" +
      "</div>";
  }

  function wireTaskCardActions(container, isAssigner) {
    container.querySelectorAll("[data-contact-buyer]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var taskId = Number(btn.dataset.contactBuyer);
        if (!isFinite(taskId) || taskId <= 0 || Math.floor(taskId) !== taskId) return;
        btn.disabled = true;
        btn.textContent = "Sending…";
        api("contact_buyer.php", { method: "POST", body: { id: taskId } })
          .then(function () { toast("Email sent to buyer ✓"); })
          .catch(function (err) { toast(err.message || "Could not send email"); })
          .then(function () { loadTasks(); });
      });
    });
    container.querySelectorAll("[data-assign-lead]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openAssignTaskModal("assign", Number(btn.dataset.assignLead), btn.dataset.leadTitle);
      });
    });
    container.querySelectorAll(".task-status-select").forEach(function (sel) {
      sel.addEventListener("change", function () {
        api("update_task_status.php", { method: "POST", body: { id: Number(sel.dataset.taskid), status: sel.value } })
          .then(function () { toast("Status updated \u2713"); loadTasks(); })
          .catch(function (err) { toast(err.message); loadTasks(); });
      });
    });
  }

  function openAssignTaskModal(mode, taskId, presetTitle) {
    assignTaskMode = mode;
    assignTaskId = taskId || null;
    $("at-error").textContent = "";
    $("assign-task-title").textContent = mode === "assign" ? "Assign Lead" : "Assign Task";
    $("at-title").value = presetTitle || "";
    $("at-title").disabled = mode === "assign";
    $("at-description").value = "";
    $("at-due-date").value = "";
    document.getElementById("at-description").style.display = mode === "assign" ? "none" : "";
    document.getElementById("at-due-date").style.display = mode === "assign" ? "none" : "";
    loadTaskAssigneeOptions().then(function () {
      $("assign-task-modal").classList.remove("hidden");
    });
  }
  function closeAssignTaskModal() { $("assign-task-modal").classList.add("hidden"); }

  $("btn-open-assign-task").addEventListener("click", function () { openAssignTaskModal("new", null, ""); });
  $("assign-task-close").addEventListener("click", closeAssignTaskModal);
  $("btn-at-cancel").addEventListener("click", closeAssignTaskModal);
  $("assign-task-modal").addEventListener("click", function (e) {
    if (e.target.id === "assign-task-modal") closeAssignTaskModal();
  });

  $("btn-at-save").addEventListener("click", function () {
    $("at-error").textContent = "";
    var assignee = Number($("at-assignee").value) || 0;
    if (!assignee) { $("at-error").textContent = "Choose who to assign this to"; return; }

    var btn = this;
    btn.disabled = true;
    var call = assignTaskMode === "assign"
      ? api("assign_task.php", { method: "POST", body: { id: assignTaskId, assigned_to: assignee } })
      : (function () {
          var title = $("at-title").value.trim();
          if (!title) { $("at-error").textContent = "Title is required"; return Promise.reject({ handled: true }); }
          return api("add_task.php", {
            method: "POST",
            body: { title: title, description: $("at-description").value, assigned_to: assignee, due_date: $("at-due-date").value },
          });
        })();

    call.then(function () {
      toast(assignTaskMode === "assign" ? "Lead assigned \u2713" : "Task assigned \u2713");
      closeAssignTaskModal();
      loadTasks();
    }).catch(function (err) {
      if (!err || !err.handled) $("at-error").textContent = err && err.message ? err.message : "Something went wrong";
    }).then(function () { btn.disabled = false; });
  });

  $("btn-sync-indiamart").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    $("tasks-sync-hint").textContent = "Syncing\u2026";
    api("sync_indiamart_leads.php").then(function (data) {
      $("tasks-sync-hint").textContent = data.message || ("Imported " + data.imported + " new lead(s) of " + data.fetched + " fetched.");
      loadTasks();
    }).catch(function (err) {
      $("tasks-sync-hint").textContent = err.message;
    }).then(function () { btn.disabled = false; });
  });

  // ---------------- IndiaMART received-time fill (GM/CEO) ----------------
  // Leads imported before the time was stored get it from IndiaMART, one
  // older week per call (IndiaMART allows 1 call / 5 min). While this page
  // stays open it keeps going by itself until every lead has its time.
  var imFillTimer = null;
  function showIndiamartFillBox(data) {
    var n = Number(data.indiamart_missing_time || 0);
    var box = $("im-fill-box");
    if (!n) { box.classList.add("hidden"); return; }
    box.classList.remove("hidden");
    if (data.indiamart_backfill_finished) {
      $("im-fill-text").textContent = n + " older IndiaMART lead(s) are beyond what IndiaMART still returns \u2014 their original time is not available.";
      $("btn-im-fill").classList.add("hidden");
    } else if (!imFillTimer) {
      $("im-fill-text").textContent = n + " IndiaMART lead(s) don't show their received time yet.";
      $("btn-im-fill").classList.remove("hidden");
    }
  }
  function runIndiamartFill() {
    clearTimeout(imFillTimer); imFillTimer = null;
    $("btn-im-fill").disabled = true;
    api("sync_indiamart_leads.php?backfill=1").then(function (d) {
      var left = Number(d.leads_still_without_time || 0);
      var wait = d.cooldown_seconds ? Number(d.cooldown_seconds) : 305;
      var finished = !left || /finished|Checked back|already have/i.test(d.message || "");
      if (d.window || d.times_filled) loadTasks();
      if (finished) {
        $("im-fill-text").textContent = d.message || "Done.";
        $("btn-im-fill").classList.add("hidden");
        return;
      }
      $("im-fill-text").textContent = (d.times_filled ? d.times_filled + " filled. " : "") + left + " still without time \u2014 continuing automatically in " +
        Math.ceil(wait / 60) + " min (keep this page open).";
      imFillTimer = setTimeout(runIndiamartFill, wait * 1000);
    }).catch(function (err) {
      $("im-fill-text").textContent = err.message;
    }).then(function () { $("btn-im-fill").disabled = false; });
  }
  $("btn-im-fill").addEventListener("click", runIndiamartFill);

  // ---------------- profile & admin ----------------
  function loadProfile() {
    var u = state.user;
    if (!u) return;
    $("p-avatar").textContent = (u.name || "?").charAt(0).toUpperCase();
    $("p-name").textContent = u.name;
    $("p-email").textContent = u.email;
    $("p-meta").textContent = roleLabel(u.role) + " \u00B7 " + u.territory;

    if (u.role === "gm" || u.role === "ceo") {
      $("admin-section").classList.remove("hidden");
      api("get_settings.php").then(function (data) {
        state.settings = data.settings;
        $("a-car-rate").value = data.settings.car_rate_per_km;
        $("a-bike-rate").value = data.settings.bike_rate_per_km;
        $("a-company").value = data.settings.company_name;
      }).catch(function () {});
      loadMembers();
      loadRateMaster();
      loadLeadAssignmentRules();
      loadTeamExpenses();
      loadTallyFieldKey();
    } else {
      $("admin-section").classList.add("hidden");
    }
  }

  // ---------------- Expense approvals & payments (GM/CEO) ----------------
  // Same rows TallyField shows under Reports → Outstanding by Rep; both
  // sides edit through the same server rules (api/_expense_sync.php).
  var axRows = [];
  var axUsersLoaded = false;
  var axOpenEditor = null;

  function loadTeamExpenses() {
    if (!axUsersLoaded) {
      api("get_members.php").then(function (data) {
        axUsersLoaded = true;
        var sel = $("ax-user"), cur = sel.value;
        sel.innerHTML = '<option value="">All employees</option>' + (data.members || []).map(function (m) {
          return '<option value="' + m.id + '">' + esc(m.name) + (Number(m.is_active) ? "" : " (inactive)") + "</option>";
        }).join("");
        sel.value = cur;
      }).catch(function () {});
    }
    var q = "get_team_expenses.php?status=" + encodeURIComponent($("ax-status").value) +
      ($("ax-user").value ? "&user_id=" + encodeURIComponent($("ax-user").value) : "");
    api(q).then(function (data) {
      axRows = data.expenses || [];
      var t = data.totals || {};
      $("ax-totals").innerHTML = "<span>Claimed " + money(t.claimed) + " \u00B7 Paid " + money(t.paid) + " \u00B7 Pending " + money(t.payable) + "</span>";
      renderTeamExpenses();
    }).catch(function (err) { $("ax-list").innerHTML = '<p class="empty-note">' + esc(err.message) + "</p>"; });
  }

  function renderTeamExpenses() {
    if (!axRows.length) { $("ax-list").innerHTML = '<p class="empty-note">No expenses match this filter.</p>'; return; }
    $("ax-list").innerHTML = axRows.map(function (x) {
      var bills = (x.attachments || []).map(function (a, i) {
        return '<a class="attachment-link" href="' + esc(srvUrl(a)) + '" target="_blank" rel="noopener">Bill' + (x.attachments.length > 1 ? " " + (i + 1) : "") + "</a>";
      }).join(" ");
      return '<div class="record-card" data-ax-id="' + x.id + '">' +
        '<div class="rc-top"><span>' + esc(x.employee_name || "\u2014") + " \u00B7 " + money(x.total_amount) + "</span><span>" + esc(x.expense_date) + "</span></div>" +
        '<div class="rc-sub">' + esc(x.description) + (x.advance_request_no ? " \u00B7 " + esc(x.advance_request_no) : "") + "</div>" +
        '<div class="rc-badges">' + expenseStatusBadge(x) + "</div>" +
        expenseStatusNote(x) + bills +
        '<div class="ax-actions"><button class="btn-small" data-ax-edit="' + x.id + '">Update Status / Payment</button></div>' +
        '<div class="ax-editor hidden" id="ax-ed-' + x.id + '"></div>' +
        "</div>";
    }).join("");
    if (axOpenEditor && axRows.some(function (r) { return r.id === axOpenEditor; })) openExpenseEditor(axOpenEditor);
  }

  function openExpenseEditor(id) {
    var x = axRows.find(function (r) { return r.id === id; });
    var box = $("ax-ed-" + id);
    if (!x || !box) return;
    axOpenEditor = id;
    var st = x.payment_status;
    box.innerHTML =
      '<div class="row-2"><div><label>Status</label><select class="ax-f-status">' +
        Object.keys(EXPENSE_STATUS_LABELS).map(function (k) {
          return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + EXPENSE_STATUS_LABELS[k] + "</option>";
        }).join("") + "</select></div>" +
      '<div class="ax-pay"><label>Paid Amount (\u20B9)</label><input type="number" class="ax-f-amount" min="0" step="0.01" max="' + x.total_amount + '" value="' + (Number(x.paid_amount) > 0 ? x.paid_amount : x.total_amount) + '"></div></div>' +
      '<div class="row-2 ax-pay"><div><label>Paid On</label><input type="date" class="ax-f-date" max="' + localDateStr() + '" value="' + (x.paid_on || localDateStr()) + '"></div>' +
      '<div><label>Mode</label><select class="ax-f-mode">' + ["", "Cash", "Bank Transfer", "UPI", "Cheque", "Adjusted in Advance"].map(function (m) {
          return '<option value="' + m + '"' + ((x.payment_mode || "") === m ? " selected" : "") + ">" + (m || "\u2014") + "</option>";
        }).join("") + "</select></div></div>" +
      '<div class="ax-pay"><label>Payment Ref / UTR</label><input type="text" class="ax-f-ref" maxlength="80" value="' + esc(x.payment_ref || "") + '"></div>' +
      '<label>Remarks <span class="rate-hint">(required when rejecting)</span></label><input type="text" class="ax-f-remarks" maxlength="255" value="' + esc(x.status_remarks || "") + '">' +
      '<p class="error-msg ax-f-error"></p>' +
      '<div class="ax-actions"><button class="btn-small ax-f-save">Save</button><button class="btn-small ax-f-cancel">Cancel</button></div>';
    box.classList.remove("hidden");
    var statusSel = box.querySelector(".ax-f-status");
    function togglePay() {
      var paying = statusSel.value === "paid" || statusSel.value === "partially_paid";
      box.querySelectorAll(".ax-pay").forEach(function (el) { el.classList.toggle("hidden", !paying); });
    }
    statusSel.addEventListener("change", togglePay);
    togglePay();
    box.querySelector(".ax-f-cancel").addEventListener("click", function () { axOpenEditor = null; box.classList.add("hidden"); box.innerHTML = ""; });
    box.querySelector(".ax-f-save").addEventListener("click", function () {
      var btn = this; btn.disabled = true;
      var errEl = box.querySelector(".ax-f-error"); errEl.textContent = "";
      api("set_expense_status.php", { method: "POST", body: {
        id: x.id, if_version: x.version, payment_status: statusSel.value,
        paid_amount: box.querySelector(".ax-f-amount").value, paid_on: box.querySelector(".ax-f-date").value,
        payment_mode: box.querySelector(".ax-f-mode").value, payment_ref: box.querySelector(".ax-f-ref").value,
        remarks: box.querySelector(".ax-f-remarks").value
      } }).then(function (data) {
        toast("Updated \u2713 \u2014 " + data.expense.status_label + " (synced to TallyField)");
        axOpenEditor = null;
        loadTeamExpenses();
      }).catch(function (err) {
        errEl.textContent = err.message;
        btn.disabled = false;
        // A version conflict means TallyField changed it meanwhile — pull
        // the latest so the next Save starts from what's actually there.
        if (/changed by someone else/i.test(err.message)) loadTeamExpenses();
      });
    });
  }

  $("ax-list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ax-edit]");
    if (b) openExpenseEditor(Number(b.dataset.axEdit));
  });
  $("ax-status").addEventListener("change", loadTeamExpenses);
  $("ax-user").addEventListener("change", loadTeamExpenses);
  $("ax-refresh").addEventListener("click", loadTeamExpenses);

  // ---------------- TallyField integration key (GM/CEO) ----------------
  function loadTallyFieldKey() {
    api("tallyfield_key.php").then(function (d) {
      $("tf-api-base").value = d.api_base || "";
      $("tf-status").textContent = d.enabled
        ? "Enabled \u2014 key ending \u2026" + d.hint + (d.created ? " (created " + d.created + ")" : "")
        : "Not enabled yet.";
      $("tf-generate").textContent = d.enabled ? "Rotate Key" : "Generate Key";
      $("tf-disable").classList.toggle("hidden", !d.enabled);
    }).catch(function () {});
  }
  $("tf-generate").addEventListener("click", function () {
    if ($("tf-generate").textContent === "Rotate Key" &&
        !confirm("Rotating stops the current key immediately \u2014 TallyField will need the new one. Continue?")) return;
    api("tallyfield_key.php", { method: "POST", body: { action: "generate" } }).then(function (d) {
      $("tf-key").value = d.key;
      $("tf-key-box").classList.remove("hidden");
      loadTallyFieldKey();
    }).catch(function (err) { toast(err.message); });
  });
  $("tf-copy-key").addEventListener("click", function () {
    var k = $("tf-key").value;
    if (navigator.clipboard) navigator.clipboard.writeText(k).then(function () { toast("Key copied"); });
    else { $("tf-key").select(); document.execCommand("copy"); toast("Key copied"); }
  });
  $("tf-disable").addEventListener("click", function () {
    if (!confirm("Disable the TallyField integration? Expenses stop syncing until a new key is generated.")) return;
    api("tallyfield_key.php", { method: "POST", body: { action: "disable" } }).then(function () {
      $("tf-key-box").classList.add("hidden"); $("tf-key").value = "";
      loadTallyFieldKey(); toast("TallyField integration disabled");
    }).catch(function (err) { toast(err.message); });
  });

  // Pick up status changes made in TallyField when the app comes back
  // into view — no manual refresh needed.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !state.user) return;
    if (!$("view-expense").classList.contains("hidden")) {
      loadExpenses();
      if (!$("e-today-panel").classList.contains("hidden")) loadExpensesForDate();
    }
    if (!$("view-profile").classList.contains("hidden") && !$("admin-section").classList.contains("hidden")) loadTeamExpenses();
  });

  // ---------------- IndiaMART lead assignment rules ----------------
  var larMembers = [];
  function larTypeLabel(t) { return t === "product" ? "Product keywords" : (t === "pincode" ? "Pincode mapping" : "Region"); }
  function larValuesLabel(t) {
    return t === "product" ? "Keywords (comma-separated)"
      : (t === "pincode" ? "Pincodes / states / cities (comma-separated: 560073, 5600*, 560001-560110, Karnataka, Tumakuru)" : "States (comma-separated)");
  }
  function larRuleValues(r) {
    var mv = r.match_values || {};
    if (r.rule_type === "product") return mv.keywords || [];
    if (r.rule_type === "pincode") return (mv.pincodes || []).concat(mv.states || [], mv.cities || []);
    return mv.states || [];
  }

  function loadLeadAssignmentRules() {
    api("get_lead_assignment_rules.php").then(function (data) {
      larMembers = data.members || [];

      var missingBox = $("lar-missing-users");
      if (data.missing_users && data.missing_users.length) {
        missingBox.classList.remove("hidden");
        missingBox.innerHTML = '<p class="rate-hint" style="color:#c0392b;">Default rules need these users to exist first (create them under Team Members, then reopen this page): ' +
          data.missing_users.map(esc).join(", ") + "</p>";
      } else {
        missingBox.classList.add("hidden");
        missingBox.innerHTML = "";
      }

      var assigneeSel = $("lar-assignees");
      assigneeSel.innerHTML = larMembers.map(function (m) {
        return '<option value="' + m.id + '">' + esc(m.name) + " (" + esc(roleLabel(m.role)) + ")</option>";
      }).join("");

      var fallbackSel = $("lar-fallback-owner");
      fallbackSel.innerHTML = '<option value="0">— None —</option>' + larMembers.map(function (m) {
        return '<option value="' + m.id + '">' + esc(m.name) + "</option>";
      }).join("");
      fallbackSel.value = data.fallback_owner_id || 0;
      if ($("lar-pincode-strict")) $("lar-pincode-strict").checked = !!data.pincode_strict;

      var list = $("lar-rules-list");
      if (!data.rules.length) {
        list.innerHTML = '<p class="empty-note">No rules yet — add one below.</p>';
      } else {
        list.innerHTML = data.rules.map(function (r) {
          var valuesText = larRuleValues(r).join(", ");
          return '<div class="record-card">' +
            '<div class="rc-top"><span>#' + r.priority + ' \u2014 ' + esc(r.label) + "</span></div>" +
            '<div class="rc-sub">' + larTypeLabel(r.rule_type) + ': ' + esc(valuesText) + "</div>" +
            '<div class="rc-sub">Assign to: ' + esc(r.assignee_names || "\u2014 (needs manual assignment)") + (r.strategy === "round_robin" ? " (round-robin)" : "") + "</div>" +
            '<div class="rc-badges"><span class="badge ' + (Number(r.active) ? "green" : "gray") + '">' + (Number(r.active) ? "Active" : "Disabled") + "</span></div>" +
            '<div style="margin-top:8px;">' +
            '<button class="btn-small" data-lar-up="' + r.id + '">&#8593;</button> ' +
            '<button class="btn-small" data-lar-down="' + r.id + '">&#8595;</button> ' +
            '<button class="btn-small" data-lar-edit="' + r.id + '">Edit</button> ' +
            '<button class="btn-small" data-lar-toggle="' + r.id + '" data-active="' + Number(r.active) + '">' + (Number(r.active) ? "Disable" : "Enable") + "</button> " +
            '<button class="btn-small" data-lar-delete="' + r.id + '">Delete</button>' +
            "</div></div>";
        }).join("");
      }

      list.querySelectorAll("[data-lar-up]").forEach(function (b) { b.addEventListener("click", function () { larReorder(Number(b.dataset.larUp), "up"); }); });
      list.querySelectorAll("[data-lar-down]").forEach(function (b) { b.addEventListener("click", function () { larReorder(Number(b.dataset.larDown), "down"); }); });
      list.querySelectorAll("[data-lar-toggle]").forEach(function (b) {
        b.addEventListener("click", function () {
          api("update_lead_assignment_rules.php", { method: "POST", body: { action: "toggle", id: Number(b.dataset.larToggle), active: Number(b.dataset.active) ? 0 : 1 } })
            .then(loadLeadAssignmentRules).catch(function (err) { toast(err.message); });
        });
      });
      list.querySelectorAll("[data-lar-delete]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this rule?")) return;
          api("update_lead_assignment_rules.php", { method: "POST", body: { action: "delete", id: Number(b.dataset.larDelete) } })
            .then(loadLeadAssignmentRules).catch(function (err) { toast(err.message); });
        });
      });
      list.querySelectorAll("[data-lar-edit]").forEach(function (b) {
        b.addEventListener("click", function () {
          var rule = data.rules.filter(function (r) { return Number(r.id) === Number(b.dataset.larEdit); })[0];
          if (rule) larEditRule(rule);
        });
      });
    }).catch(function (err) { toast(err.message); });
  }

  function larReorder(id, direction) {
    api("update_lead_assignment_rules.php", { method: "POST", body: { action: "reorder", id: id, direction: direction } })
      .then(loadLeadAssignmentRules).catch(function (err) { toast(err.message); });
  }

  function larResetForm() {
    $("lar-edit-id").value = "";
    $("lar-label").value = "";
    $("lar-type").value = "region";
    $("lar-strategy").value = "single";
    $("lar-values-label").textContent = larValuesLabel("region");
    $("lar-values").value = "";
    $("lar-assignees").selectedIndex = -1;
    $("lar-error").textContent = "";
    $("btn-lar-cancel-edit").style.display = "none";
  }

  function larEditRule(rule) {
    $("lar-edit-id").value = rule.id;
    $("lar-label").value = rule.label;
    $("lar-type").value = rule.rule_type;
    $("lar-strategy").value = rule.strategy;
    $("lar-values-label").textContent = larValuesLabel(rule.rule_type);
    $("lar-values").value = larRuleValues(rule).join(", ");
    var ids = (rule.assignee_user_ids || []).map(Number);
    Array.prototype.forEach.call($("lar-assignees").options, function (opt) {
      opt.selected = ids.indexOf(Number(opt.value)) !== -1;
    });
    $("lar-error").textContent = "";
    $("btn-lar-cancel-edit").style.display = "";
  }

  $("lar-type").addEventListener("change", function () {
    $("lar-values-label").textContent = larValuesLabel(this.value);
  });
  $("btn-lar-cancel-edit").addEventListener("click", larResetForm);

  $("btn-lar-save").addEventListener("click", function () {
    $("lar-error").textContent = "";
    var id = Number($("lar-edit-id").value) || 0;
    var label = $("lar-label").value.trim();
    var type = $("lar-type").value;
    var strategy = $("lar-strategy").value;
    var values = $("lar-values").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var assigneeIds = Array.prototype.filter.call($("lar-assignees").options, function (o) { return o.selected; }).map(function (o) { return Number(o.value); });

    if (!label) { $("lar-error").textContent = "Label is required"; return; }
    if (!values.length) { $("lar-error").textContent = "Add at least one value"; return; }

    var body = { action: id ? "edit" : "add", id: id, label: label, rule_type: type, strategy: strategy, assignee_user_ids: assigneeIds };
    if (type === "product") body.keywords = values; else if (type === "pincode") body.pincodes = values; else body.states = values;

    api("update_lead_assignment_rules.php", { method: "POST", body: body }).then(function () {
      toast("Rule saved \u2713");
      larResetForm();
      loadLeadAssignmentRules();
    }).catch(function (err) { $("lar-error").textContent = err.message; });
  });

  if ($("lar-pincode-strict")) $("lar-pincode-strict").addEventListener("change", function () {
    api("update_lead_assignment_rules.php", { method: "POST", body: { action: "set_pincode_strict", strict: this.checked ? 1 : 0 } })
      .then(function () { toast("Pincode routing mode updated \u2713"); }).catch(function (err) { toast(err.message); });
  });

  $("lar-fallback-owner").addEventListener("change", function () {
    api("update_lead_assignment_rules.php", { method: "POST", body: { action: "set_fallback", user_id: Number(this.value) } })
      .then(function () { toast("Fallback owner updated \u2713"); }).catch(function (err) { toast(err.message); });
  });

  $("btn-lar-test").addEventListener("click", function () {
    var body = { state: $("lar-test-state").value.trim(), city: $("lar-test-city").value.trim(), product_text: $("lar-test-product").value.trim(),
                 pincode: $("lar-test-pincode") ? $("lar-test-pincode").value.trim() : "" };
    api("test_lead_assignment.php", { method: "POST", body: body }).then(function (data) {
      var who = data.possible_assignees && data.possible_assignees.length ? data.possible_assignees.join(" / ") : "nobody (needs manual assignment)";
      $("lar-test-result").textContent = data.matched_rule
        ? "Matched \u201c" + data.matched_rule + "\u201d \u2192 " + who
        : (data.unassigned_reason ? data.unassigned_reason + " \u2192 goes to Unassigned Leads for manual allocation."
          : (data.fallback ? "No rule matched \u2014 fallback (" + data.reason + ") \u2192 " + who : "No rule and no fallback owner \u2014 would stay unassigned."));
    }).catch(function (err) { $("lar-test-result").textContent = err.message; });
  });

  $("btn-lar-reassign").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    $("lar-reassign-result").textContent = "Running\u2026";
    api("reassign_unassigned_leads.php").then(function (data) {
      $("lar-reassign-result").textContent = "Checked " + data.checked + " unassigned lead(s), reassigned " + data.reassigned + ".";
      loadTasks();
    }).catch(function (err) { $("lar-reassign-result").textContent = err.message; }).then(function () { btn.disabled = false; });
  });

  $("btn-save-settings").addEventListener("click", function () {
    api("update_settings.php", {
      method: "POST",
      body: {
        car_rate_per_km: $("a-car-rate").value,
        bike_rate_per_km: $("a-bike-rate").value,
        company_name: $("a-company").value,
      },
    }).then(function () {
      $("a-settings-saved").classList.remove("hidden");
      setTimeout(function () { $("a-settings-saved").classList.add("hidden"); }, 2000);
      return api("get_settings.php");
    }).then(function (data) { state.settings = data.settings; })
      .catch(function (err) { toast(err.message); });
  });

  function loadRateMaster() {
    api("get_rate_master.php").then(function (data) {
      var list = $("a-rate-master-list");
      if (!data.rates.length) {
        list.innerHTML = '<p class="empty-note">No designations configured yet \u2014 add one below.</p>';
        return;
      }
      list.innerHTML = data.rates.map(function (r) {
        return '<div class="record-card">' +
          '<div class="rc-top"><span>' + esc(r.designation) + "</span></div>" +
          '<div class="row-2" style="margin-top:6px;">' +
          '<div><label>Daily Lodging Limit</label><input type="number" class="rm-lodging" min="0" data-des="' + esc(r.designation) + '" value="' + r.daily_lodging_limit + '"></div>' +
          '<div><label>Daily Food Limit</label><input type="number" class="rm-food" min="0" data-des="' + esc(r.designation) + '" value="' + r.daily_food_limit + '"></div>' +
          "</div>" +
          '<div class="row-2">' +
          '<div><label>TA per Day</label><input type="number" class="rm-ta" min="0" data-des="' + esc(r.designation) + '" value="' + r.ta_per_day + '"></div>' +
          '<div><label>Own Vehicle Rate (\u20B9/km)</label><input type="number" class="rm-vehicle" min="0" data-des="' + esc(r.designation) + '" value="' + r.own_vehicle_rate + '"></div>' +
          "</div>" +
          '<button class="btn-small" data-rm-save="' + esc(r.designation) + '">Save</button>' +
          "</div>";
      }).join("");
      list.querySelectorAll("[data-rm-save]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var des = btn.dataset.rmSave;
          saveRateMasterRow(
            des,
            list.querySelector('.rm-lodging[data-des="' + des + '"]').value,
            list.querySelector('.rm-food[data-des="' + des + '"]').value,
            list.querySelector('.rm-ta[data-des="' + des + '"]').value,
            list.querySelector('.rm-vehicle[data-des="' + des + '"]').value
          );
        });
      });
    }).catch(function (err) { toast(err.message); });
  }

  function saveRateMasterRow(designation, lodging, food, ta, vehicle) {
    api("set_rate_master.php", {
      method: "POST",
      body: {
        designation: designation,
        daily_lodging_limit: lodging,
        daily_food_limit: food,
        ta_per_day: ta,
        own_vehicle_rate: vehicle,
      },
    }).then(function () {
      toast("Rate Master saved \u2713");
      loadRateMaster();
    }).catch(function (err) { toast(err.message); });
  }

  $("btn-add-rate-row").addEventListener("click", function () {
    var designation = $("a-rate-new-designation").value.trim();
    if (!designation) { toast("Enter a designation name"); return; }
    saveRateMasterRow(
      designation,
      $("a-rate-new-lodging").value || 0,
      $("a-rate-new-food").value || 0,
      $("a-rate-new-ta").value || 0,
      $("a-rate-new-vehicle").value || 0
    );
    ["a-rate-new-designation", "a-rate-new-lodging", "a-rate-new-food", "a-rate-new-ta", "a-rate-new-vehicle"]
      .forEach(function (id) { $(id).value = ""; });
  });

  var ROLE_OPTIONS = ["me", "tm", "am", "mm", "mh", "ceo", "gm"];

  function roleSelectHtml(memberId, currentRole) {
    var opts = ROLE_OPTIONS.map(function (r) {
      return '<option value="' + r + '"' + (r === currentRole ? " selected" : "") + '>' +
        roleLabel(r) + "</option>";
    }).join("");
    return '<select class="role-select" data-rolefor="' + memberId + '">' + opts + "</select>";
  }

  function loadMembers() {
    api("get_members.php").then(function (data) {
      var list = $("a-member-list");
      list.innerHTML = data.members.map(function (m) {
        var isSelf = state.user && Number(m.id) === Number(state.user.id);
        var activeBtn = isSelf ? "" :
          '<button class="btn-small" data-member="' + m.id + '" data-active="' + m.is_active + '">' +
          (Number(m.is_active) ? "Deactivate" : "Activate") + "</button>";
        var resetBtn = '<button class="btn-small" data-reset="' + m.id + '">Reset Password</button>';
        var roleSelect = isSelf ? roleLabel(m.role) : roleSelectHtml(m.id, m.role);
        var logbookNameInput = '<input type="text" class="logbook-name-input" data-lbnfor="' + m.id +
          '" value="' + esc(m.logbook_name || "") + '" placeholder="Logbook name (if different from \u201C' + esc(m.name) + '\u201D)">';
        var profileRow = '<div class="row-2" style="margin-top:6px;">' +
          '<input type="text" class="logbook-name-input" data-codefor="' + m.id + '" value="' + esc(m.employee_code || "") + '" placeholder="Employee Code">' +
          '<input type="text" class="logbook-name-input" data-deptfor="' + m.id + '" value="' + esc(m.department || "") + '" placeholder="Department">' +
          "</div>" +
          '<input type="text" class="logbook-name-input" data-rmfor="' + m.id + '" value="' + esc(m.reporting_manager || "") + '" placeholder="Reporting Manager">';
        return '<div class="member-row">' +
          '<div class="member-info"><h5>' + esc(m.name) +
          (Number(m.is_active) ? "" : ' <span class="badge gray">inactive</span>') + "</h5>" +
          "<p>" + roleSelect + " \u00B7 " + esc(m.territory) + " \u00B7 " + esc(m.email) +
          ' <button class="btn-small" data-editemail="' + m.id + '" data-editemailcur="' + esc(m.email) +
          '" data-editemailname="' + esc(m.name) + '">Edit</button></p>' +
          logbookNameInput +
          profileRow +
          "</div>" +
          resetBtn + activeBtn + "</div>";
      }).join("");

      // Edit email \u2014 a deliberate prompt() rather than an always-editable
      // inline field like Logbook name/Employee Code above: unlike those,
      // this is also the person's login, so a change should be an obvious,
      // deliberate action, not something that quietly saves on blur if a
      // field is clicked into by accident. Only ever touches users.email \u2014
      // every other table (visits, expenses, tasks, plans, leads, advance
      // requests, TallyField's rep link) references the person by their
      // numeric user_id, never by email, so nothing else needs to change.
      list.querySelectorAll("button[data-editemail]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var memberId = Number(btn.dataset.editemail);
          var newEmail = prompt("New login email for " + btn.dataset.editemailname + ":", btn.dataset.editemailcur);
          if (newEmail === null) return;             // cancelled
          newEmail = newEmail.trim();
          if (newEmail === "" || newEmail === btn.dataset.editemailcur) return;
          api("set_member_email.php", {
            method: "POST",
            body: { user_id: memberId, email: newEmail },
          }).then(function () {
            toast("Email updated \u2713 \u2014 their existing visits, expenses, tasks and reports are unaffected.");
            loadMembers();
          }).catch(function (err) { toast(err.message); });
        });
      });

      list.querySelectorAll("input[data-lbnfor]").forEach(function (inp) {
        inp.addEventListener("change", function () {
          api("set_member_logbook_name.php", {
            method: "POST",
            body: { user_id: Number(inp.dataset.lbnfor), logbook_name: inp.value },
          }).then(function () {
            toast("Logbook name saved \u2713");
          }).catch(function (err) { toast(err.message); });
        });
      });

      function saveProfileField(userId) {
        var codeInp = list.querySelector('input[data-codefor="' + userId + '"]');
        var deptInp = list.querySelector('input[data-deptfor="' + userId + '"]');
        var rmInp = list.querySelector('input[data-rmfor="' + userId + '"]');
        api("set_member_profile.php", {
          method: "POST",
          body: {
            user_id: userId,
            employee_code: codeInp ? codeInp.value : "",
            department: deptInp ? deptInp.value : "",
            reporting_manager: rmInp ? rmInp.value : "",
          },
        }).then(function () {
          toast("Employee details saved \u2713");
        }).catch(function (err) { toast(err.message); });
      }
      list.querySelectorAll("input[data-codefor], input[data-deptfor], input[data-rmfor]").forEach(function (inp) {
        inp.addEventListener("change", function () {
          var userId = Number(inp.dataset.codefor || inp.dataset.deptfor || inp.dataset.rmfor);
          saveProfileField(userId);
        });
      });

      list.querySelectorAll("select[data-rolefor]").forEach(function (sel) {
        sel.addEventListener("change", function () {
          var memberId = Number(sel.dataset.rolefor);
          var newRole = sel.value;
          api("set_member_role.php", {
            method: "POST",
            body: { user_id: memberId, role: newRole },
          }).then(function () {
            toast("Role updated to " + roleLabel(newRole) + " \u2713");
            loadMembers();
          }).catch(function (err) {
            toast(err.message);
            loadMembers();
          });
        });
      });

      list.querySelectorAll("button[data-member]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api("set_member_active.php", {
            method: "POST",
            body: { user_id: Number(btn.dataset.member), is_active: !Number(btn.dataset.active) },
          }).then(function () {
            toast("Member updated \u2713");
            loadMembers();
          }).catch(function (err) { toast(err.message); });
        });
      });

      list.querySelectorAll("button[data-reset]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var memberId = Number(btn.dataset.reset);
          var row = btn.closest(".member-row");
          var name = row ? row.querySelector("h5").textContent : "this member";
          if (!confirm("Reset password for " + name + "? They'll be logged out everywhere and need the new password to log back in.")) return;
          api("admin_reset_password.php", {
            method: "POST",
            body: { user_id: memberId },
          }).then(function (data) {
            alert("New temporary password for " + data.name + " (" + data.email + "):\n\n" + data.temp_password + "\n\nShare this with them directly (call, WhatsApp, in person) \u2014 it won't be shown again. They should change it after logging in.");
          }).catch(function (err) { toast(err.message); });
        });
      });
    }).catch(function (err) { toast(err.message); });
  }

  // ---------------- SSO hand-off FROM Logbook ("Back to Sales Report") ----------------
  // Mirrors the forward Logbook button: if the URL carries sso_name/sso_exp/sso_sig
  // (Logbook's "Back to Sales Report" button lands here with these), verify it with
  // the server and log the matching user straight in, no PIN.
  function tryLogbookSso() {
    var params = new URLSearchParams(window.location.search);
    var name = params.get("sso_name");
    var exp = params.get("sso_exp");
    var sig = params.get("sso_sig");
    if (!name || !exp || !sig) return false;

    // Strip the SSO params from the address bar right away so a refresh or
    // shared link doesn't try to reuse the single-use, short-lived link.
    params.delete("sso_name");
    params.delete("sso_exp");
    params.delete("sso_sig");
    var rest = params.toString();
    var cleanUrl = window.location.pathname + (rest ? "?" + rest : "") + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);

    // Explicitly show the login screen with a "signing you in" note WHILE
    // the handoff is being verified — previously nothing was shown here at
    // all (the code relied on the login screen's default unhidden state,
    // which only holds until the *next* show() call resets it one way or
    // another). If the verify request is slow, or fails in a way whose
    // toast() flashes and is gone before it's read — exactly what almost
    // looked like "nothing happened" with the earlier canaresai.com login
    // error — the screen looked blank/frozen with zero feedback. Now the
    // error (or the wait) is always visible as persistent text on the
    // login screen itself, not just a toast that can be missed.
    show("login");
    var errEl = $("login-error");
    if (errEl) errEl.textContent = "Signing you in from Logbook…";

    fetch(API + "sso_login.php?sso_name=" + encodeURIComponent(name) +
      "&sso_exp=" + encodeURIComponent(exp) + "&sso_sig=" + encodeURIComponent(sig))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.ok) throw new Error(data.error || "Could not sign in from Logbook");
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        state.user = data.user;
        if (errEl) errEl.textContent = "";
        enterApp();
      })
      .catch(function (err) {
        var msg = err.message || "Could not sign in from Logbook. Please log in below.";
        toast(msg);
        show("login");
        if (errEl) errEl.textContent = msg;
      });
    return true;
  }

  // ---------------- boot ----------------
  if (!tryLogbookSso()) {
    var savedUser = localStorage.getItem(USER_KEY);
    var savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser && savedToken) {
      state.user = JSON.parse(savedUser);
      // Validate the session is still alive
      api("me.php").then(function (data) {
        state.user = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        enterApp();
      }).catch(function () { doLocalLogout(); });
    } else {
      show("login");
    }
  }
})();
