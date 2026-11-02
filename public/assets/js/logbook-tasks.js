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
    addEmployeeFilters();
    markCards();
    new MutationObserver(markCards).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // For tests.
  window.__srLogbookTasks = { teamTasks: teamTasks };
})();
