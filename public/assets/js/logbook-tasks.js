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
     * Salesreport team = the Sales Reporter's own member list
       (get_members.php \u2014 GM / CEO), or just the signed-in person. A Logbook
       user is a member when their Logbook name equals the member's Logbook
       name or name, ignoring capitals (the same match as Logbook sign-on).
       A task is shown when a member is assigned to it or created it;
       nobody else's Logbook tasks are ever shown.
     * GM / CEO see the whole team; anyone else only their own tasks.
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
  var LOGBOOK_DATA = cfg.LOGBOOK_DATA || "https://canaresonline.com/logbook/api/bootstrap.php";
  var CACHE_MS = 30000;
  var ASSIGNERS = { gm: 1, ceo: 1 };       // app.js isTaskAssignerRole()
  var nativeFetch = window.fetch.bind(window);

  var lbData = null, lbAt = 0;
  var members = null, membersToken = null;
  var employee = "";                      // Employee filter: "" = everyone, else a member id

  function norm(v) { return typeof v === "string" ? v.trim().toLowerCase() : ""; }
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

  function team(apiBase, u) {
    if (!isAssigner(u)) return Promise.resolve([u]);
    var token = read("sr_token") || "";
    if (members && membersToken === token) return Promise.resolve(members);
    return nativeFetch(apiBase + "get_members.php", { headers: { "X-Session-Token": token } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && Array.isArray(j.members)) {
          members = j.members; membersToken = token;
          fillEmployees();
        }
        return members || [u];
      })
      .catch(function () { return members || [u]; });
  }

  function stateOf(t, doneIds) {
    if (t.completedAt || doneIds[t.status]) return "done";
    return t.updates && t.updates.length ? "in_progress" : "open";
  }

  // Logbook tasks assigned to or created by `team`, shaped like get_tasks.php rows.
  function teamTasks(lb, team, status) {
    var users = {}, statuses = {}, doneIds = {}, byKey = {}, memberOf = {};
    (lb.users || []).forEach(function (u) { if (u && u.id) users[u.id] = u; });
    (lb.statuses || []).forEach(function (s) {
      if (!s || !s.id) return;
      statuses[s.id] = s;
      if (s.isDone || s.is_done) doneIds[s.id] = true;
    });
    team.forEach(function (m) {
      [norm(m.name), norm(m.logbook_name)].forEach(function (k) { if (k && !byKey[k]) byKey[k] = m; });
    });
    Object.keys(users).forEach(function (id) {
      var m = byKey[norm(users[id].name)];
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

  // ---------------- get_tasks.php ----------------
  var TASKS = /(^|\/)api\/get_tasks\.php(\?[^#]*)?$/;

  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var p = nativeFetch(input, init);
    var m = TASKS.exec(url.split("#")[0]);
    if (!m || (init && init.method && init.method !== "GET")) return p;
    var q = new URLSearchParams((m[2] || "").slice(1));
    if (q.get("unassigned") || q.get("region")) return p;   // IndiaMART-only views
    var apiBase = url.slice(0, url.indexOf("get_tasks.php"));

    return p.then(function (res) {
      if (!res.ok) return res;
      return res.clone().json().then(function (j) {
        var u = viewer();
        if (!j || !j.ok || !Array.isArray(j.tasks) || !u || !u.name) return res;
        var already = j.tasks.some(function (t) { return t && t.source === "logbook"; });
        return Promise.all([team(apiBase, u), already ? null : logbook()]).then(function (r) {
          var tasks = j.tasks;
          if (r[1]) tasks = tasks.concat(teamTasks(r[1], r[0], q.get("status") || "")).sort(newestFirst);
          if (employee && isAssigner(u)) tasks = tasks.filter(function (t) { return String(t.assigned_to) === employee; });
          j.tasks = tasks;
          return new Response(JSON.stringify(j), { status: res.status, statusText: res.statusText, headers: { "Content-Type": "application/json" } });
        });
      }).catch(function () { return res; });
    });
  };

  // ---------------- Employee filter (GM / CEO) ----------------
  function fillEmployees() {
    var sel = document.getElementById("tasks-employee-filter");
    if (!sel || !members) return;
    var cur = sel.value;
    var list = members.slice().sort(function (a, b) { return norm(a.name) < norm(b.name) ? -1 : 1; });
    sel.innerHTML = '<option value="">All Employees</option>';
    list.forEach(function (mb) {
      var o = document.createElement("option");
      o.value = String(mb.id);
      o.textContent = (mb.name || "?") + (String(mb.is_active) === "0" ? " (inactive)" : "");
      sel.appendChild(o);
    });
    sel.value = cur && sel.querySelector('option[value="' + safeId(cur) + '"]') ? cur : "";
    employee = sel.value;
  }

  function addEmployeeFilter() {
    var status = document.getElementById("tasks-status-filter");
    if (!status || document.getElementById("tasks-employee-filter")) return;
    var sel = document.createElement("select");
    sel.id = "tasks-employee-filter";
    sel.className = "period-select";
    sel.setAttribute("aria-label", "Employee");
    sel.innerHTML = '<option value="">All Employees</option>';
    var region = document.getElementById("tasks-region-filter");
    (region || status).insertAdjacentElement("afterend", sel);
    sel.addEventListener("change", function () {
      employee = sel.value;
      // app.js reloads the list on a status-filter change.
      status.dispatchEvent(new Event("change"));
    });
    fillEmployees();
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
    addEmployeeFilter();
    markCards();
    new MutationObserver(markCards).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  // For tests.
  window.__srLogbookTasks = { teamTasks: teamTasks };
})();
