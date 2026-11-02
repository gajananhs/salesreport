/* ============================================================
   SALES REPORTER \u2014 Logbook tasks on the Task tab
   ------------------------------------------------------------
   Adds the Salesreport team's Logbook tasks (canaresonline.com/logbook)
   to the Task tab, and an Employee filter for GM / CEO.

   Loaded by every copy of the app \u2014 GitHub Pages, the server copy
   (canaresonline.com/Salesreport\u2026/index.php: one <script> line, see
   README) and canaresai.com's Sales Report \u2014 so they all show the same.

   How:
     * app.js loads the Task tab with api/get_tasks.php. This file wraps
       window.fetch and, for that call only, adds Logbook's tasks to the
       answer before app.js renders it. app.js itself is unchanged.
     * Logbook data: its own api/bootstrap.php (read-only; Logbook allows
       canaresonline.com and *.github.io), or SR_CONFIG.LOGBOOK_DATA when a
       host serves it itself (canaresai.com). Cached for 30 s, like Logbook.
     * Salesreport team = the marketing team in TEAM_NAMES (Ramji, Sunitha,
       Tejas, Mr. Mahesh, Vipin, Sukanya, Prem Kumar Singh, Mohanraj;
       SR_CONFIG.SALES_TEAM overrides it), matched to Sales Reporter accounts
       (get_members.php, GM / CEO) and Logbook users by name or Logbook name,
       ignoring capitals, "Mr." and spaces; a name also matches the one longer
       name it starts with ("Ramji" = "Ramji Pandey"). A Logbook task is shown
       when one of them is assigned to it or created it; nobody else's.
     * GM / CEO see the whole team, and an Employee list on the Task tab and
       the Expenses tab: picking a person shows that person's tasks (Sales
       Reporter + Logbook) and expenses (get_expenses.php?user_id=, which the
       server allows GM / CEO). Anyone else sees only their own.
     * Nothing is copied or written: each Logbook task appears once
       (id "lb_<Logbook id>"), old ones included, edits show at once.
       The cards are read-only here \u2014 the task is updated in Logbook.
     * Logbook unreachable \u2192 the Task tab is exactly as before.
   ============================================================ */
(function () {
  "use strict";
  if (!window.fetch || window.__srLogbookTasks) return;
  window.__srLogbookTasks = true;

  var cfg = window.SR_CONFIG || {};
  var SELF = (document.currentScript && document.currentScript.src) || "";

  // Full screen + readable text (assets/css/readable.css, next to this file):
  // index.html links it itself; the server copy gets it from here.
  (function () {
    if (!SELF || document.querySelector('link[href$="assets/css/readable.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = SELF.replace(/assets\/js\/logbook-tasks\.js(\?.*)?$/, "assets/css/readable.css");
    document.head.appendChild(link);
  })();
  var LOGBOOK_DATA = cfg.LOGBOOK_DATA || "https://canaresonline.com/logbook/api/bootstrap.php";
  var CACHE_MS = 30000;
  var ASSIGNERS = { gm: 1, ceo: 1 };       // app.js isTaskAssignerRole()
  var nativeFetch = window.fetch.bind(window);

  var API_BASE = (cfg.SERVER || "") + "api/";
  // The marketing team shown under Employee (GM / CEO), and whose Logbook
  // tasks join the Task tab. SR_CONFIG.SALES_TEAM overrides it.
  var DEFAULT_TEAM = ["Ramji", "Sunitha", "Tejas", "Mr. Mahesh", "Vipin", "Sukanya", "Prem Kumar Singh", "Mohanraj"];
  var TEAM_NAMES = Array.isArray(cfg.SALES_TEAM) && cfg.SALES_TEAM.length ? cfg.SALES_TEAM : DEFAULT_TEAM;
  // Who approves rather than logs: their Expenses tab shows the team's
  // expenses to approve instead of the entry forms. SR_CONFIG.APPROVERS overrides.
  var APPROVERS = Array.isArray(cfg.APPROVERS) && cfg.APPROVERS.length ? cfg.APPROVERS : ["Gajanan"];

  var lbData = null, lbAt = 0;
  var people = null, peopleToken = null;  // TEAM_NAMES matched to Sales Reporter accounts
  var selected = "";                      // Employee filter: "" = everyone, else a person's key

  function norm(v) { return typeof v === "string" ? v.trim().toLowerCase() : ""; }
  // "Mr. Mahesh" -> "mahesh", "Ramji Pandey" -> "ramjipandey"
  function nameKey(v) { return norm(v).replace(/^(mr|mrs|ms|dr)\.?\s+/, "").replace(/[^a-z0-9]/g, ""); }
  // The person (from `list`) a name belongs to: same name, else the one name it starts with
  // ("Ramji Pandey" in Logbook is "Ramji" here).
  function personFor(list, name) {
    var k = nameKey(name);
    if (!k) return null;
    var exact = list.filter(function (pp) { return pp.keys.indexOf(k) !== -1; });
    if (exact.length) return exact[0];
    var pre = list.filter(function (pp) {
      return pp.keys.some(function (pk) { return pk.length >= 4 && (k.indexOf(pk) === 0 || pk.indexOf(k) === 0); });
    });
    return pre.length === 1 ? pre[0] : null;
  }
  function keysOf(arr) {
    var out = [];
    arr.forEach(function (v) { var k = nameKey(v); if (k && out.indexOf(k) === -1) out.push(k); });
    return out;
  }
  function selectedPerson() {
    if (!selected || !people) return null;
    return people.filter(function (pp) { return pp.key === selected; })[0] || null;
  }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function viewer() { try { return JSON.parse(read("sr_user") || "null"); } catch (e) { return null; } }
  function safeId(v) { return String(v == null ? "" : v).replace(/[^A-Za-z0-9_\-]/g, ""); }
  function isAssigner(u) { return !!(u && ASSIGNERS[u.role]); }

  // ---------------- data ----------------
  function logbook() {
    if (lbData && Date.now() - lbAt < CACHE_MS) return Promise.resolve(lbData);
    var crossSite = /^https?:/i.test(LOGBOOK_DATA) && LOGBOOK_DATA.indexOf(location.origin + "/") !== 0;
    return nativeFetch(LOGBOOK_DATA, { credentials: crossSite ? "omit" : "same-origin", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && Array.isArray(j.tasks)) { lbData = j; lbAt = Date.now(); }
        return lbData;
      })
      .catch(function () { return lbData; });
  }

  // TEAM_NAMES matched to the Sales Reporter's member list (GM / CEO may read it).
  function resolvePeople(members) {
    var accounts = members.map(function (m) { return { m: m, keys: keysOf([m.name, m.logbook_name]) }; });
    return TEAM_NAMES.map(function (name) {
      var acc = personFor(accounts, name);
      var m = acc && acc.m;
      return { key: nameKey(name), label: m ? m.name : name, id: m && m.id != null ? m.id : null,
               keys: keysOf([name].concat(m ? [m.name, m.logbook_name] : [])) };
    });
  }

  function team(u) {
    if (!isAssigner(u)) return Promise.resolve([{ key: nameKey(u.name), label: u.name, id: u.id, keys: keysOf([u.name, u.logbook_name]) }]);
    var token = read("sr_token") || "";
    if (people && peopleToken === token) return Promise.resolve(people);
    return nativeFetch(API_BASE + "get_members.php", { headers: { "X-Session-Token": token } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        people = resolvePeople(j && j.ok && Array.isArray(j.members) ? j.members : []);
        peopleToken = token;
        fillEmployees();
        return people;
      })
      .catch(function () { return people || resolvePeople([]); });
  }

  function stateOf(t, doneIds) {
    if (t.completedAt || doneIds[t.status]) return "done";
    return t.updates && t.updates.length ? "in_progress" : "open";
  }

  // Logbook tasks assigned to or created by `team`, shaped like get_tasks.php rows.
  function teamTasks(lb, team, status) {
    var users = {}, statuses = {}, doneIds = {}, memberOf = {};
    (lb.users || []).forEach(function (u) { if (u && u.id) users[u.id] = u; });
    (lb.statuses || []).forEach(function (s) {
      if (!s || !s.id) return;
      statuses[s.id] = s;
      if (s.isDone || s.is_done) doneIds[s.id] = true;
    });
    Object.keys(users).forEach(function (id) {
      var m = personFor(team, users[id].name);
      if (m) memberOf[id] = m;
    });

    var out = [], seen = {};
    (lb.tasks || []).forEach(function (t) {
      if (!t || !t.id) return;
      var to = t.assignedTo, by = t.assignedBy;
      if (!memberOf[to] && !memberOf[by]) return;
      var id = "lb_" + safeId(t.id);
      if (seen[id]) return;
      seen[id] = true;
      var st = stateOf(t, doneIds);
      if (status && status !== st) return;
      var toName = (users[to] || {}).name || "", byName = (users[by] || {}).name || "";
      var ups = (t.updates || []).filter(Boolean), last = ups[ups.length - 1];
      var desc = (t.description || "").trim();
      if (last) {
        var note = "Latest update (" + (last.date || "") + ", " + (last.progressPct || 0) + "%)" + (last.note ? ": " + last.note : "");
        desc = desc ? desc + " \u2014 " + note : note;
      }
      var created = t.createdAt || "";
      var member = memberOf[to];
      out.push({
        id: id,
        source: "logbook",
        source_ref: String(t.id),
        title: t.title || "(untitled)",
        description: desc,
        status: st === "done" ? "done" : ((statuses[t.status] || {}).name || st),
        status_group: st,
        due_date: t.dueDate || null,
        assigned_to: member && member.id != null ? member.id : "lb_" + safeId(to),
        team_key: member ? member.key : null,
        assigned_to_name: toName,
        assigned_by_name: byName,
        assignment_reason: "Logbook \u2014 assigned by " + (byName || "?") + " to " + (toName || "?") + " on " + (created.slice(0, 10) || "?"),
        created_at: created,
        completed_at: t.completedAt || null,
      });
    });
    return out;
  }

  function newestFirst(a, b) {
    var x = String((a && a.created_at) || ""), y = String((b && b.created_at) || "");
    return x < y ? 1 : x > y ? -1 : 0;
  }

  // ---------------- get_tasks.php / get_expenses.php ----------------
  var TASKS = /(^|\/)api\/get_tasks\.php(\?[^#]*)?$/;
  var EXPENSES = /(^|\/)api\/get_expenses\.php(\?[^#]*)?$/;

  function json(obj) { return new Response(JSON.stringify(obj), { status: 200, headers: { "Content-Type": "application/json" } }); }

  // Expenses tab: with a person picked, the list shows THEIR expenses
  // (get_expenses.php takes user_id for GM / CEO; the server checks).
  function expensesFetch(url, input, init) {
    var pp = selectedPerson();
    if (!pp || !isAssigner(viewer()) || /[?&]user_id=/.test(url)) return nativeFetch(input, init);
    if (pp.id == null) {
      return Promise.resolve(json({ ok: true, expenses: [], advance_requests: [],
        totals: { km: 0, travel: 0, boarding: 0, lodging: 0, other: 0, total: 0, paid: 0, payable: 0 } }));
    }
    return nativeFetch(url + (url.indexOf("?") === -1 ? "?" : "&") + "user_id=" + encodeURIComponent(pp.id), init);
  }

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var get = !(init && init.method && init.method !== "GET");
    if (get && EXPENSES.test(url.split("#")[0])) {
      if (!people && isAssigner(viewer())) team(viewer());   // fills the Employee lists
      if (isApprover()) setTimeout(loadTeamExpenses, 0);      // Expenses tab opened / refreshed
      return expensesFetch(url, input, init);
    }
    var p = nativeFetch(input, init);
    var m = TASKS.exec(url.split("#")[0]);
    if (!m || !get) return p;
    var q = new URLSearchParams((m[2] || "").slice(1));
    if (q.get("unassigned") || q.get("region")) return p;   // IndiaMART-only views

    return p.then(function (res) {
      if (!res.ok) return res;
      return res.clone().json().then(function (j) {
        var u = viewer();
        if (!j || !j.ok || !Array.isArray(j.tasks) || !u || !u.name) return res;
        var already = j.tasks.some(function (t) { return t && t.source === "logbook"; });
        return Promise.all([team(u), already ? null : logbook()]).then(function (r) {
          var tasks = j.tasks;
          if (r[1]) tasks = tasks.concat(teamTasks(r[1], r[0], q.get("status") || "")).sort(newestFirst);
          var pp = isAssigner(u) ? selectedPerson() : null;
          if (pp) tasks = tasks.filter(function (t) {
            return t.source === "logbook" ? t.team_key === pp.key : (pp.id != null && String(t.assigned_to) === String(pp.id));
          });
          j.tasks = tasks;
          return new Response(JSON.stringify(j), { status: res.status, statusText: res.statusText, headers: { "Content-Type": "application/json" } });
        });
      }).catch(function () { return res; });
    });
  };

  // ---------------- Employee filter (GM / CEO): Task tab + Expenses tab ----------------
  // One choice for both tabs: pick a person on either and the other follows.
  var FILTERS = [
    { id: "tasks-employee-filter", after: ["tasks-region-filter", "tasks-status-filter"], all: "All Employees",
      reload: "tasks-status-filter", needsAccount: false },
    { id: "expense-employee-filter", after: ["expense-period"], all: "My expenses",
      reload: "expense-period", needsAccount: true },
    { id: "team-exp-employee-filter", after: ["sr-te-status"], all: "All marketing team",
      reload: "sr-te-status", needsAccount: true },
  ];

  function fillEmployees() {
    var show = isAssigner(viewer());
    FILTERS.forEach(function (f) {
      var sel = document.getElementById(f.id);
      if (!sel) return;
      sel.classList.toggle("hidden", !show);
      if (!people) return;
      sel.innerHTML = "";
      var all = document.createElement("option");
      all.value = ""; all.textContent = f.all;
      sel.appendChild(all);
      people.forEach(function (pp) {
        var o = document.createElement("option");
        o.value = pp.key;
        o.textContent = pp.label + (pp.id == null ? " (no Sales Reporter account)" : "");
        if (f.needsAccount && pp.id == null) o.disabled = true;
        sel.appendChild(o);
      });
      sel.value = selectedPerson() ? selected : "";
    });
    if (!selectedPerson()) selected = "";
  }

  function addEmployeeFilters() {
    FILTERS.forEach(function (f) {
      if (document.getElementById(f.id)) return;
      var anchor = null;
      f.after.some(function (id) { anchor = document.getElementById(id); return !!anchor; });
      if (!anchor) return;
      var sel = document.createElement("select");
      sel.id = f.id;
      sel.className = "period-select hidden";
      sel.setAttribute("aria-label", "Employee");
      sel.innerHTML = '<option value="">' + f.all + "</option>";
      anchor.insertAdjacentElement("afterend", sel);
      sel.addEventListener("change", function () {
        selected = sel.value;
        FILTERS.forEach(function (g) { var o = document.getElementById(g.id); if (o && o !== sel) o.value = selectedPerson() && !(g.needsAccount && selectedPerson().id == null) ? selected : ""; });
        // app.js reloads each list on its period / status filter change.
        var r = document.getElementById(f.reload);
        if (r) r.dispatchEvent(new Event("change"));
        var day = document.getElementById("t-date"), panel = document.getElementById("e-today-panel");
        if (f.needsAccount && day && panel && !panel.classList.contains("hidden")) day.dispatchEvent(new Event("change"));
      });
    });
    fillEmployees();
    if (isAssigner(viewer()) && read("sr_token")) team(viewer());
  }

  // ---------------- Approver view (Gajanan): team expenses, no entry forms ----------------
  function isApprover() {
    var u = viewer();
    if (!isAssigner(u)) return false;
    var k = nameKey(u.name);
    return APPROVERS.some(function (n) { var a = nameKey(n); return a && (k === a || k.indexOf(a) === 0); });
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function money(v) { return "₹" + (Number(v) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
  function srApi(path, body) {
    var opts = { headers: { "X-Session-Token": read("sr_token") || "", "Content-Type": "application/json" } };
    if (body) { opts.method = "POST"; opts.body = JSON.stringify(body); }
    return nativeFetch(API_BASE + path, opts).then(function (r) {
      return r.json().catch(function () { throw new Error("Server returned an invalid response"); });
    }).then(function (j) { if (!j || !j.ok) throw new Error((j && j.error) || "Request failed"); return j; });
  }

  var APPROVER_CSS =
    "body.sr-approver #view-expense > :not(.app-header):not(#sr-team-exp){display:none !important;}" +
    "body.sr-approver #btn-adv-new, body.sr-approver #adv-list-view > h3.section-title, body.sr-approver #adv-req-list{display:none !important;}" +
    "#sr-team-exp .te-actions{display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;}" +
    "#sr-team-exp .te-approve{border-color:var(--ok,#2F7A4F) !important; color:var(--ok,#2F7A4F) !important;}" +
    "#sr-team-exp .te-reject{border-color:var(--red,#B85450) !important; color:var(--red,#B85450) !important;}" +
    "#sr-team-exp .section-title{display:flex; gap:8px; align-items:center; flex-wrap:wrap;}";

  function setupApproverView() {
    var on = isApprover();
    document.body.classList.toggle("sr-approver", on);
    var view = document.getElementById("view-expense");
    if (!view) return;
    var h2 = view.querySelector(".app-header h2");
    if (h2) {
      if (!h2.getAttribute("data-orig")) h2.setAttribute("data-orig", h2.textContent);
      h2.textContent = on ? "Team Expenses" : h2.getAttribute("data-orig");
    }
    if (!on || document.getElementById("sr-team-exp")) return;
    if (!document.getElementById("sr-approver-css")) {
      var st = document.createElement("style");
      st.id = "sr-approver-css"; st.textContent = APPROVER_CSS;
      document.head.appendChild(st);
    }
    var box = document.createElement("div");
    box.id = "sr-team-exp";
    box.innerHTML =
      '<div class="card"><h4>Advance expense requests</h4>' +
      '<p class="rate-hint">The marketing team’s Advance Expense Requests — open them to approve.</p>' +
      '<button type="button" class="btn-primary" id="sr-open-adv">Open advance requests to approve</button></div>' +
      '<h3 class="section-title">Daily expenses ' +
      '<select id="sr-te-status" class="period-select" aria-label="Status">' +
      '<option value="submitted">Waiting for approval</option><option value="open">Open (not fully paid)</option>' +
      '<option value="">All</option><option value="approved">Approved</option><option value="partially_paid">Partially paid</option>' +
      '<option value="paid">Paid</option><option value="rejected">Rejected</option></select></h3>' +
      '<div class="total-bar" id="sr-te-totals"></div>' +
      '<div id="sr-te-list" class="record-list"><p class="empty-note">Loading…</p></div>';
    var header = view.querySelector(".app-header");
    (header || view.firstChild).insertAdjacentElement(header ? "afterend" : "beforebegin", box);
    document.getElementById("sr-open-adv").addEventListener("click", function () {
      var b = document.getElementById("btn-open-advance-hub");
      if (b) b.click();
    });
    document.getElementById("sr-te-status").addEventListener("change", loadTeamExpenses);
    addEmployeeFilters();
  }

  var teLoading = 0;
  function loadTeamExpenses() {
    var list = document.getElementById("sr-te-list");
    if (!list || !isApprover()) return;
    var mine = ++teLoading;
    team(viewer()).then(function (ppl) {
      var pp = selectedPerson();
      var status = document.getElementById("sr-te-status").value;
      var q = "get_team_expenses.php?status=" + encodeURIComponent(status) + (pp && pp.id != null ? "&user_id=" + encodeURIComponent(pp.id) : "");
      return srApi(q).then(function (data) {
        if (mine !== teLoading) return;
        var ids = {};
        ppl.forEach(function (x) { if (x.id != null) ids[String(x.id)] = true; });
        var rows = (data.expenses || []).filter(function (r) { return pp || ids[String(r.employee_id)]; });
        var total = 0, payable = 0;
        rows.forEach(function (r) { if (r.payment_status !== "rejected") { total += Number(r.total_amount) || 0; payable += Number(r.balance_payable) || 0; } });
        document.getElementById("sr-te-totals").innerHTML = "<span>" + rows.length + " expense" + (rows.length === 1 ? "" : "s") +
          "</span><strong>" + money(total) + (payable ? " · to pay " + money(payable) : "") + "</strong>";
        if (!rows.length) { list.innerHTML = '<p class="empty-note">No expenses match this filter.</p>'; return; }
        list.innerHTML = rows.map(function (r) {
          var bills = (r.attachments || []).map(function (a, i) {
            return '<a class="attachment-link" href="' + esc(a) + '" target="_blank" rel="noopener">Bill' + (r.attachments.length > 1 ? " " + (i + 1) : "") + "</a>";
          }).join(" ");
          var st = r.payment_status;
          var actions = (st === "submitted" ? '<button type="button" class="btn-small te-approve" data-te-approve="' + r.id + '" data-te-ver="' + r.version + '">Approve</button>' : "") +
            (st === "submitted" || st === "approved" ? '<button type="button" class="btn-small te-reject" data-te-reject="' + r.id + '" data-te-ver="' + r.version + '">Reject</button>' : "");
          return '<div class="record-card">' +
            '<div class="rc-top"><span>' + esc(r.employee_name) + " · " + money(r.total_amount) + "</span><span>" + esc(r.expense_date) + "</span></div>" +
            '<div class="rc-sub">' + esc(r.description || "") + (r.notes ? " · " + esc(r.notes) : "") + (r.advance_request_no ? " · " + esc(r.advance_request_no) : "") + "</div>" +
            '<div class="rc-badges"><span class="badge' + (st === "paid" || st === "approved" ? " green" : st === "rejected" ? " st-rejected" : " st-submitted") + '">' + esc(r.status_label || st) + "</span>" +
            (r.status_remarks ? '<span class="badge gray">' + esc(r.status_remarks) + "</span>" : "") + "</div>" +
            (bills ? '<div style="margin-top:6px;">' + bills + "</div>" : "") +
            (actions ? '<div class="te-actions">' + actions + "</div>" : "") +
            "</div>";
        }).join("");
        list.querySelectorAll("[data-te-approve],[data-te-reject]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var approve = btn.hasAttribute("data-te-approve");
            var body = { id: Number(btn.getAttribute(approve ? "data-te-approve" : "data-te-reject")), if_version: Number(btn.getAttribute("data-te-ver")),
                         payment_status: approve ? "approved" : "rejected" };
            if (!approve) {
              var why = window.prompt("Reason for rejecting this expense:");
              if (!why || !why.trim()) return;
              body.remarks = why.trim();
            }
            btn.disabled = true;
            srApi("set_expense_status.php", body).then(function () { loadTeamExpenses(); }).catch(function (e) {
              window.alert(e.message); btn.disabled = false; loadTeamExpenses();
            });
          });
        });
      });
    }).catch(function (e) {
      if (mine === teLoading) list.innerHTML = '<p class="empty-note">' + esc(e.message) + "</p>";
    });
  }

  // ---------------- read-only Logbook cards ----------------
  function markCards() {
    document.querySelectorAll('[data-taskid^="lb_"],[data-assign-lead^="lb_"]').forEach(function (el) {
      var card = el.closest(".record-card");
      if (!card) return;
      if (!card.getAttribute("data-logbook")) {
        card.setAttribute("data-logbook", "1");
        var badge = card.querySelector(".rc-badges .badge");
        if (badge) badge.textContent = "Logbook";
        var note = document.createElement("span");
        note.className = "rc-sub";
        note.textContent = " \u00B7 From Logbook \u2014 update it in Logbook";
        (el.parentNode || card).appendChild(note);
      }
      el.remove();
    });
  }

  function start() {
    setupApproverView();
    addEmployeeFilters();
    markCards();
    new MutationObserver(markCards).observe(document.body, { childList: true, subtree: true });
    // Signing in / out happens without a page load: re-check who is viewing.
    window.addEventListener("storage", setupApproverView);
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest('.tab-btn[data-view="expense"]')) setupApproverView();
    }, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // For tests.
  window.__srLogbookTasks = { teamTasks: teamTasks };
})();
