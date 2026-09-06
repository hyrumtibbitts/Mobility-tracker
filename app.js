/* Mobility & rehab tracker — plain JS, no build step, no backend. */

var STORAGE_KEY = "mobility-tracker-v1";
var PROGRAM_DAYS = 84; /* 12 weeks */

/* ---------------------------------------------------------------- content */

/* Every day, all 7 days. */
var DAILY = [
  { id: "ankle-dorsiflexion", name: "Banded ankle dorsiflexion mobilization", detail: "5–10 × 30s hold — left ankle priority" },
  { id: "gastroc", name: "Gastroc stretch", detail: "Calf, knee straight — 3–4 × 30–60s, both legs" },
  { id: "soleus", name: "Soleus stretch", detail: "Calf, knee bent — 3–4 × 30–60s, both legs" },
  { id: "hamstring", name: "Hamstring static stretch", detail: "~90s total per leg" },
  { id: "thoracic-extension", name: "Foam roller thoracic extension", detail: "T7 / T9 / T11 — 30–90s each level" },
  { id: "wall-slides", name: "Wall slides", detail: "2–3 × 10–15" },
  { id: "chin-tucks-1", name: "Chin tucks — set 1", detail: "10 × 5–10s hold" },
  { id: "chin-tucks-2", name: "Chin tucks — set 2", detail: "Later in the day — 10 × 5–10s hold" },
  { id: "pec", name: "Doorway pec stretch", detail: "20–30s each side" },
  { id: "upper-trap", name: "Upper trap stretch", detail: "20–30s each side" },
  { id: "levator", name: "Levator scapulae stretch", detail: "20–30s each side" },
  { id: "stability-set", name: "Stability set", detail: "McGill Big 3, hip airplane, QL plank, clamshell, banded lateral walk, contralateral dead bug, band chop, back extension, QL extension" },
  { id: "decompression-am", name: "Passive decompression — AM", detail: "" },
  { id: "decompression-pm", name: "Passive decompression — PM", detail: "" }
];

/* On top of the daily list. */
var DAY_TYPES = {
  lift: {
    name: "Lift day",
    short: "Lift",
    items: [
      { id: "l-warmup", name: "Loaded mobility warm-up", detail: "ATG split squat + loaded butterfly" },
      { id: "l-glute-max", name: "Glute max loading", detail: "Hip thrust or bridge, 3–4 × 8–12 — or your RDL / hinge day" },
      { id: "l-glute-med", name: "Glute med work", detail: "Heavier band clamshell or lateral walk, 3 × 12–20" },
      { id: "l-neck-shrug", name: "Neck / shrug isometric add-on", detail: "" },
      { id: "l-cooldown", name: "Cooldown", detail: "" }
    ]
  },
  hybrid: {
    name: "Hybrid day",
    short: "Hybrid",
    items: [
      { id: "h-warmup", name: "Loaded mobility warm-up", detail: "ATG split squat + loaded butterfly" },
      { id: "h-glute-med", name: "Glute med work", detail: "3 × 12–20 — on every hybrid day" },
      { id: "h-glute-max", name: "Glute max loading", detail: "Only if the hybrid session is light on swings, hinges, or single-leg work", optional: true }
    ]
  },
  off: {
    name: "Off day",
    short: "Off",
    items: [
      { id: "o-couch", name: "Couch stretch", detail: "Hip flexor — 30–120s per side" },
      { id: "o-back-core", name: "Back / core strength block", detail: "Single-leg reverse hyper, single-leg RDL" },
      { id: "o-incline-walk", name: "Incline walk or steps", detail: "30–45 min" },
      { id: "o-extra-volume", name: "Extra hamstring / calf stretch volume", detail: "Beyond the daily minimum" }
    ]
  }
};

/* Sunday to Saturday, by Date.getDay(). */
var WEEK_MAP = ["off", "lift", "hybrid", "lift", "hybrid", "lift", "hybrid"];

var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* Spread across the week. days = the weekdays they are planned for. */
var WEEKLY = [
  { id: "w-peroneal", name: "Peroneal eversion + single-leg balance", detail: "Band eversion 3 × 15 + balance drill", target: 2, days: [1, 4] },
  { id: "w-ytw", name: "Y-T-W raises", detail: "2–3 × 10–15", target: 2, days: [2, 5] },
  { id: "w-face-pulls", name: "Face pulls or band pull-aparts", detail: "", target: 2, days: [3, 6] },
  { id: "w-photo", name: "Side profile check-in photo", detail: "", target: 1, days: [3] },
  { id: "w-knee-to-wall", name: "Knee-to-wall dorsiflexion measure", detail: "Record the number on the Progress tab", target: 1, days: [3] }
];

/* Old ids, so that stored data still counts after a rename. */
var MERGED = {
  "gastroc-soleus": ["gastroc"],
  "pec-trap-levator": ["pec"],
  "chin-tucks": ["chin-tucks-1", "chin-tucks-2"],
  "decompression": ["decompression-am", "decompression-pm"],
  "t-warmup": ["l-warmup"],
  "t-glute-max": ["l-glute-max"],
  "t-glute-med": ["l-glute-med"],
  "t-neck-shrug": ["l-neck-shrug"],
  "t-cooldown": ["l-cooldown"]
};

var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';
var CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

/* ------------------------------------------------------------ date helpers */

function iso(date) {
  var m = String(date.getMonth() + 1);
  var d = String(date.getDate());
  if (m.length < 2) { m = "0" + m; }
  if (d.length < 2) { d = "0" + d; }
  return date.getFullYear() + "-" + m + "-" + d;
}

function todayISO() { return iso(new Date()); }

function mondayISO(date) {
  var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function parseISO(text) {
  var p = String(text).split("-");
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function shiftISO(text, days) {
  var d = parseISO(text);
  d.setDate(d.getDate() + days);
  return iso(d);
}

function daysBetween(fromISO, toISO) {
  return Math.round((parseISO(toISO).getTime() - parseISO(fromISO).getTime()) / 86400000);
}

function weekdayOf(day) { return parseISO(day).getDay(); }

function longDate(text) {
  return parseISO(text).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function shortDate(text) {
  return parseISO(text).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function plural(n, word) { return n + " " + word + (n === 1 ? "" : "s"); }

/* ----------------------------------------------------------------- storage */

function emptyState() {
  return {
    date: todayISO(),
    weekStart: mondayISO(new Date()),
    override: null,      /* a day type chosen by hand, for today only */
    checks: {},          /* daily + session items done today */
    weekLog: {},         /* weekly item id -> the dates it was done */
    startDate: null,
    measures: [],
    history: {}
  };
}

function load() {
  var raw = null;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (err) { raw = null; }
  var base = emptyState();
  if (!raw || typeof raw !== "object") { return base; }
  base.date = raw.date || base.date;
  base.weekStart = raw.weekStart || base.weekStart;
  base.override = raw.override || null;
  base.checks = raw.checks || {};
  base.weekLog = raw.weekLog || {};
  base.startDate = raw.startDate || null;
  base.measures = Array.isArray(raw.measures) ? raw.measures : [];
  base.history = raw.history || {};

  /* Carry over the doses format, and any renamed ids. */
  var source = raw.doses || raw.checks || {};
  for (var id in source) {
    if (!Object.prototype.hasOwnProperty.call(source, id) || !source[id]) { continue; }
    var count = raw.doses ? source[id] : 1;
    var targets = MERGED[id] || [id];
    for (var i = 0; i < targets.length && i < count; i++) { base.checks[targets[i]] = true; }
    if (MERGED[id]) { delete base.checks[id]; }
  }
  return base;
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (err) { /* full or private */ }
}

function rollover() {
  var changed = false;
  var day = todayISO();
  var week = mondayISO(new Date());
  if (state.date !== day) {
    state.date = day;
    state.checks = {};
    state.override = null;
    changed = true;
  }
  if (state.weekStart !== week) {
    state.weekStart = week;
    changed = true;
  }
  if (changed) { save(); }
  return changed;
}

var state = load();

/* ------------------------------------------------------------------- data */

function typeOfDay(day) { return WEEK_MAP[weekdayOf(day)]; }

function todayType() { return state.override || typeOfDay(todayISO()); }

function sessionItems() { return DAY_TYPES[todayType()].items; }

/* Optional items never count against you. */
function required(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) { if (!items[i].optional) { out.push(items[i]); } }
  return out;
}

function doneCount(items) {
  var n = 0;
  for (var i = 0; i < items.length; i++) { if (state.checks[items[i].id]) { n += 1; } }
  return n;
}

/* ----------------------------------------------------------- weekly items */

function weekDates(id) {
  var all = state.weekLog[id] || [];
  var out = [];
  for (var i = 0; i < all.length; i++) {
    if (mondayISO(parseISO(all[i])) === state.weekStart) { out.push(all[i]); }
  }
  return out;
}

function weekDone(item) { return weekDates(item.id).length; }

function doneToday(item) { return weekDates(item.id).indexOf(todayISO()) > -1; }

function toggleWeekly(item) {
  var all = state.weekLog[item.id] || [];
  var today = todayISO();
  var at = all.indexOf(today);
  if (at > -1) { all.splice(at, 1); } else { all.push(today); }
  state.weekLog[item.id] = all.slice(-40);
}

function weeklyToday() {
  var today = weekdayOf(todayISO());
  var out = [];
  for (var i = 0; i < WEEKLY.length; i++) {
    if (WEEKLY[i].days.indexOf(today) > -1) { out.push(WEEKLY[i]); }
  }
  return out;
}

function dayLabel(item) {
  var names = [];
  for (var i = 0; i < item.days.length; i++) { names.push(DAY_NAMES[item.days[i]]); }
  return names.join(" · ");
}

/* --------------------------------------------------------- the day record */

function todayTasks() { return DAILY.concat(required(sessionItems())); }

function todayTotal() { return todayTasks().length + weeklyToday().length; }

function todayDone() {
  var n = doneCount(todayTasks());
  var extra = weeklyToday();
  for (var i = 0; i < extra.length; i++) { if (doneToday(extra[i])) { n += 1; } }
  return n;
}

function recordToday() {
  var e = doneCount(DAILY);
  var d = todayDone();
  if (d === 0) {
    delete state.history[state.date];
  } else {
    state.history[state.date] = { d: d, t: todayTotal(), e: e, et: DAILY.length };
  }
}

function ratioOf(day) {
  var rec = state.history[day];
  if (!rec || !rec.t) { return 0; }
  return Math.min(1, rec.d / rec.t);
}

function levelOf(day) {
  var r = ratioOf(day);
  if (r <= 0) { return 0; }
  return Math.min(4, Math.ceil(r * 4));
}

function isStreakDay(day) {
  var rec = state.history[day];
  if (!rec) { return false; }
  return rec.e >= (rec.et || DAILY.length);
}

function currentStreak() {
  var day = todayISO();
  if (!isStreakDay(day)) { day = shiftISO(day, -1); }
  var n = 0;
  while (isStreakDay(day)) { n += 1; day = shiftISO(day, -1); }
  return n;
}

function bestStreak() {
  var days = Object.keys(state.history).sort();
  var best = 0;
  var run = 0;
  var previous = null;
  for (var i = 0; i < days.length; i++) {
    if (!isStreakDay(days[i])) { run = 0; previous = days[i]; continue; }
    run = (previous && daysBetween(previous, days[i]) === 1 && isStreakDay(previous)) ? run + 1 : 1;
    if (run > best) { best = run; }
    previous = days[i];
  }
  return best;
}

/* ------------------------------------------------------------------ build */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  if (text !== undefined) { node.textContent = text; }
  return node;
}

function dotNode() {
  var dot = el("span", "dot");
  dot.innerHTML = CHECK_SVG;
  return dot;
}

function itemText(parent, item, tagText) {
  var text = el("span", "text");
  var name = el("span", "name", item.name);
  if (tagText) { name.appendChild(el("i", "tag", tagText)); }
  text.appendChild(name);
  if (item.detail) { text.appendChild(el("span", "detail", item.detail)); }
  parent.appendChild(text);
}

function checkRow(item) {
  var li = el("li", "row");
  var label = el("label", "check");
  var box = document.createElement("input");
  box.type = "checkbox";
  box.checked = !!state.checks[item.id];
  box.addEventListener("change", function () {
    if (box.checked) { state.checks[item.id] = true; } else { delete state.checks[item.id]; }
    li.classList.toggle("done", box.checked);
    afterChange();
  });
  label.appendChild(box);
  label.appendChild(dotNode());
  itemText(label, item, item.optional ? "optional" : null);
  li.appendChild(label);
  if (box.checked) { li.classList.add("done"); }
  return li;
}

function weeklyRow(item) {
  var li = el("li", "row");
  var button = el("button", "rowbtn");
  button.type = "button";
  var on = doneToday(item);
  var dot = dotNode();
  if (on) { dot.classList.add("on"); }
  button.appendChild(dot);
  itemText(button, item, dayLabel(item));

  var count = weekDone(item);
  var box = el("span", "counter" + (count >= item.target ? " full" : ""));
  var pips = el("span", "pips");
  for (var i = 0; i < item.target; i++) { pips.appendChild(el("i", i < count ? "pip on" : "pip")); }
  box.appendChild(pips);
  box.appendChild(el("b", null, count + "/" + item.target));
  button.appendChild(box);

  button.setAttribute("aria-label", item.name + ": " + count + " of " + item.target + " this week. " +
    (on ? "Done today. Tap to undo." : "Tap to mark it done today."));
  button.addEventListener("click", function () {
    toggleWeekly(item);
    afterChange();
    renderListBody();
  });
  li.appendChild(button);
  if (on) { li.classList.add("done"); }
  return li;
}

function afterChange() {
  recordToday();
  save();
  renderHero();
  renderCards();
  renderListMeter();
}

function fill(id, items, makeRow) {
  var list = document.getElementById(id);
  list.innerHTML = "";
  for (var i = 0; i < items.length; i++) { list.appendChild(makeRow(items[i])); }
}

/* --------------------------------------------------------------- sections */

var SECTIONS = {
  daily: {
    hash: "#/daily",
    eyebrow: function () { return "Every day"; },
    name: function () { return "Daily routine"; },
    items: function () { return DAILY; },
    row: checkRow
  },
  session: {
    hash: "#/session",
    eyebrow: function () { return longDate(todayISO()); },
    name: function () { return DAY_TYPES[todayType()].name; },
    items: sessionItems,
    row: checkRow
  },
  today: {
    hash: "#/today",
    eyebrow: function () { return "Planned for " + DAY_NAMES[weekdayOf(todayISO())]; },
    name: function () { return "Also today"; },
    items: weeklyToday,
    row: weeklyRow
  },
  week: {
    hash: "#/week",
    eyebrow: function () { return "Week of " + shortDate(state.weekStart); },
    name: function () { return "This week"; },
    items: function () { return WEEKLY; },
    row: weeklyRow
  }
};

var SECTION_ORDER = ["daily", "session", "today", "week"];

function sectionProgress(key) {
  var items = SECTIONS[key].items();
  if (key === "today" || key === "week") {
    var done = 0;
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      if (key === "today") {
        total += 1;
        if (doneToday(items[i])) { done += 1; }
      } else {
        total += items[i].target;
        done += Math.min(weekDone(items[i]), items[i].target);
      }
    }
    return { done: done, total: total, unit: key === "today" ? "left today" : "left this week" };
  }
  var live = required(items);
  return { done: doneCount(live), total: live.length, unit: "left today" };
}

function renderCards() {
  var box = document.getElementById("cards");
  if (!box) { return; }
  box.innerHTML = "";
  for (var i = 0; i < SECTION_ORDER.length; i++) {
    var key = SECTION_ORDER[i];
    var section = SECTIONS[key];
    if (!section.items().length) { continue; }
    var p = sectionProgress(key);
    var percent = p.total ? Math.round((p.done / p.total) * 100) : 0;
    var full = p.done >= p.total;

    var link = el("a", "card-link" + (full ? " done" : ""));
    link.href = section.hash;

    var top = el("div", "card-top");
    top.appendChild(el("span", "card-name", section.name()));
    var count = el("span", "card-count" + (full ? " full" : ""));
    count.appendChild(el("b", null, p.done + "/" + p.total));
    count.insertAdjacentHTML("beforeend", CHEVRON);
    top.appendChild(count);
    link.appendChild(top);

    var track = el("div", "track");
    var bar = el("i");
    bar.style.width = percent + "%";
    track.appendChild(bar);
    link.appendChild(track);

    link.appendChild(el("p", "card-sub", full ? "Complete" : (p.total - p.done) + " " + p.unit));
    box.appendChild(link);
  }
}

/* ------------------------------------------------------------ list page */

var openKey = null;

function renderListBody() {
  if (!openKey) { return; }
  var section = SECTIONS[openKey];
  fill("list-body", section.items(), section.row);
  renderListMeter();
}

function renderListMeter() {
  if (!openKey) { return; }
  var p = sectionProgress(openKey);
  var percent = p.total ? Math.round((p.done / p.total) * 100) : 0;
  document.getElementById("list-count").textContent = p.done + "/" + p.total;
  document.getElementById("list-sub").textContent =
    p.done >= p.total ? "Complete" : (p.total - p.done) + " " + p.unit;
  document.getElementById("list-bar").style.width = percent + "%";
}

function renderList(key) {
  openKey = key;
  var section = SECTIONS[key];
  document.getElementById("list-eyebrow").textContent = section.eyebrow();
  document.getElementById("list-title").textContent = section.name();
  var controls = document.getElementById("list-controls");
  controls.innerHTML = "";
  if (key === "session") { controls.appendChild(dayTypeControl()); }
  renderListBody();
}

/* ---------------------------------------------------------- day-type pick */

function dayTypeControl() {
  var wrap = el("div");
  var box = el("div", "segmented");
  box.setAttribute("role", "radiogroup");
  box.setAttribute("aria-label", "Day type");
  var keys = ["lift", "hybrid", "off"];
  for (var i = 0; i < keys.length; i++) {
    var type = DAY_TYPES[keys[i]];
    var button = el("button", keys[i] === todayType() ? "active" : null, type.short);
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("data-daytype", keys[i]);
    button.setAttribute("aria-label", type.name);
    button.setAttribute("aria-checked", keys[i] === todayType() ? "true" : "false");
    box.appendChild(button);
  }
  wrap.appendChild(box);

  var planned = typeOfDay(todayISO());
  var note = el("p", "control-note");
  if (state.override && state.override !== planned) {
    note.appendChild(document.createTextNode(
      DAY_NAMES[weekdayOf(todayISO())] + " is normally a " + DAY_TYPES[planned].name.toLowerCase() + ". "));
    var reset = el("button", "link", "Use the plan");
    reset.type = "button";
    reset.setAttribute("data-reset-daytype", "1");
    note.appendChild(reset);
  } else {
    note.textContent = "From your schedule: Mon / Wed / Fri lift, Tue / Thu / Sat hybrid, Sun off.";
  }
  wrap.appendChild(note);
  return wrap;
}

/* ------------------------------------------------------------------- hero */

function programDay() {
  if (!state.startDate) { return null; }
  return daysBetween(state.startDate, todayISO()) + 1;
}

function ringSVG(percent) {
  var r = 30;
  var c = 2 * Math.PI * r;
  return '<svg class="ring" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">' +
    '<circle class="bg" cx="38" cy="38" r="' + r + '"></circle>' +
    '<circle class="fg" cx="38" cy="38" r="' + r + '" stroke-dasharray="' + c.toFixed(1) + '" ' +
    'stroke-dashoffset="' + (c * (1 - percent / 100)).toFixed(1) + '" transform="rotate(-90 38 38)"></circle>' +
    '<text x="38" y="45" text-anchor="middle">' + percent + "</text></svg>";
}

function renderHero() {
  var hero = document.getElementById("hero");
  if (!hero) { return; }
  var done = todayDone();
  var total = todayTotal();
  var percent = total ? Math.round((done / total) * 100) : 0;
  var day = programDay();

  var headline;
  var note;
  if (day === null) {
    headline = "Today";
    note = "Set a start date on the Progress tab to count the 12 weeks.";
  } else if (day < 1) {
    headline = "Day 0";
    note = "The program starts in " + plural(1 - day, "day") + ".";
  } else if (day <= PROGRAM_DAYS) {
    headline = "Day " + day + " <small>/ " + PROGRAM_DAYS + "</small>";
    note = "Week " + Math.ceil(day / 7) + " of 12 — " + plural(PROGRAM_DAYS - day, "day") + " to the checkpoint";
  } else {
    headline = "Day " + day;
    note = "The 12 weeks are complete.";
  }

  hero.innerHTML =
    '<div class="hero-top"><div>' +
      '<p class="eyebrow">' + DAY_TYPES[todayType()].name + "</p>" +
      '<p class="day-big">' + headline + "</p>" +
      '<p class="hero-note">' + note + "</p>" +
    "</div>" + ringSVG(percent) + "</div>" +
    '<div class="track"><i style="width:' + percent + '%"></i></div>' +
    '<p class="hero-doses">' + done + " of " + total + " done today</p>" +
    (day !== null && day > PROGRAM_DAYS
      ? '<p class="alert">Day 84 has passed. If the ankle still pops on every step, book a surgical consult.</p>'
      : "");
}

/* --------------------------------------------------------------- progress */

var picked = null;

function renderGrid() {
  var grid = document.getElementById("grid");
  grid.innerHTML = "";
  var first = state.startDate ? state.startDate : shiftISO(todayISO(), -(PROGRAM_DAYS - 1));
  document.getElementById("grid-title").textContent = state.startDate ? "12 weeks" : "Last 12 weeks";

  var today = todayISO();
  var active = 0;
  for (var i = 0; i < PROGRAM_DAYS; i++) {
    var day = shiftISO(first, i);
    var level = levelOf(day);
    if (level > 0) { active += 1; }
    var cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cell l" + level;
    if (daysBetween(today, day) > 0) { cell.className += " future"; }
    if (day === today) { cell.className += " today"; }
    if (day === picked) { cell.className += " picked"; }
    cell.setAttribute("data-day", day);
    cell.setAttribute("aria-label", shortDate(day) + ": " + Math.round(ratioOf(day) * 100) + "% done");
    grid.appendChild(cell);
  }
  document.getElementById("grid-count").textContent = active + "/" + PROGRAM_DAYS + " days";
  showDay(picked);
}

function showDay(day) {
  var out = document.getElementById("grid-detail");
  if (!day) { out.textContent = "Tap a square to see that day."; return; }
  var rec = state.history[day];
  if (!rec) {
    out.textContent = longDate(day) + " — nothing logged · " + DAY_TYPES[typeOfDay(day)].name.toLowerCase();
    return;
  }
  out.textContent = longDate(day) + " — " + rec.d + " of " + rec.t + " done (" +
    Math.round((rec.d / rec.t) * 100) + "%)" + (isStreakDay(day) ? " · daily routine complete" : "");
}

function renderStats() {
  var row = document.getElementById("stat-row");
  row.innerHTML = "";
  var full = 0;
  for (var key in state.history) {
    if (Object.prototype.hasOwnProperty.call(state.history, key) && isStreakDay(key)) { full += 1; }
  }
  var stats = [
    { value: currentStreak(), label: "Streak" },
    { value: bestStreak(), label: "Best" },
    { value: full, label: "Full days" }
  ];
  for (var i = 0; i < stats.length; i++) {
    var box = el("div", "stat");
    box.appendChild(el("b", null, String(stats[i].value)));
    box.appendChild(el("span", null, stats[i].label));
    row.appendChild(box);
  }
}

function renderCheckpoint() {
  var body = document.getElementById("checkpoint-body");
  body.innerHTML = "";

  if (!state.startDate) {
    body.appendChild(el("p", "note", "Set the day you started the program. The app then counts the 12 weeks and fills the grid."));
    var form = el("form", "field-row");
    var input = document.createElement("input");
    input.type = "date";
    input.required = true;
    input.max = todayISO();
    input.value = todayISO();
    input.setAttribute("aria-label", "Program start date");
    var button = el("button", "primary", "Set start date");
    button.type = "submit";
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!input.value) { return; }
      state.startDate = input.value;
      save();
      render();
    });
    form.appendChild(input);
    form.appendChild(button);
    body.appendChild(form);
    return;
  }

  var day = programDay();
  if (day > PROGRAM_DAYS) {
    body.appendChild(el("p", "alert", "The 12 weeks are complete (day " + day + "). If the ankle still pops on every step, book a surgical consult."));
  } else if (day < 1) {
    body.appendChild(el("p", "big", "The program starts in " + plural(1 - day, "day") + "."));
  } else {
    body.appendChild(el("p", "big", "Week " + Math.ceil(day / 7) + " of 12"));
    var left = PROGRAM_DAYS - day;
    body.appendChild(el("p", "note", left === 0 ? "The checkpoint is today." : plural(left, "day") + " to the checkpoint."));
  }

  var change = el("button", "link", "Change start date");
  change.type = "button";
  change.addEventListener("click", function () {
    state.startDate = null;
    save();
    render();
  });
  var foot = el("p", "note");
  foot.appendChild(document.createTextNode("Started " + longDate(state.startDate) + ". "));
  foot.appendChild(change);
  body.appendChild(foot);
}

function renderMeasures() {
  var body = document.getElementById("measure-body");
  body.innerHTML = "";
  body.appendChild(el("p", "note", "One measurement each week, on Wednesday. Drive the knee to the wall and record the distance from the toes."));

  var thisWeek = null;
  for (var i = 0; i < state.measures.length; i++) {
    if (state.measures[i].week === state.weekStart) { thisWeek = state.measures[i]; }
  }

  var row = el("div", "field-row");
  var input = document.createElement("input");
  input.type = "number";
  input.step = "0.5";
  input.min = "0";
  input.inputMode = "decimal";
  input.placeholder = "cm";
  input.setAttribute("aria-label", "Knee-to-wall distance this week, in centimetres");
  if (thisWeek) { input.value = thisWeek.value; }
  input.addEventListener("change", function () {
    var value = parseFloat(input.value);
    var kept = [];
    for (var j = 0; j < state.measures.length; j++) {
      if (state.measures[j].week !== state.weekStart) { kept.push(state.measures[j]); }
    }
    if (!isNaN(value)) { kept.push({ week: state.weekStart, date: todayISO(), value: value }); }
    kept.sort(function (a, b) { return a.week < b.week ? -1 : 1; });
    state.measures = kept.slice(-24);
    save();
    renderMeasures();
  });
  row.appendChild(el("span", "note", "Week of " + shortDate(state.weekStart)));
  row.appendChild(input);
  body.appendChild(row);

  if (state.measures.length) {
    var list = el("ul", "history");
    for (var k = state.measures.length - 1; k >= 0 && k > state.measures.length - 9; k--) {
      var entry = state.measures[k];
      var li = document.createElement("li");
      li.appendChild(el("span", null, shortDate(entry.date)));
      li.appendChild(el("b", null, entry.value + " cm"));
      list.appendChild(li);
    }
    body.appendChild(list);
  }
}

/* ------------------------------------------------------- render + router */

function setDayType(type) {
  state.override = (type === typeOfDay(todayISO())) ? null : type;
  recordToday();
  save();
  render();
}

function routeOf(hash) {
  var clean = String(hash || "").replace(/^#/, "");
  if (clean === "/progress") { return { view: "progress" }; }
  if (clean === "/daily") { return { view: "list", key: "daily" }; }
  if (clean === "/session") { return { view: "list", key: "session" }; }
  if (clean === "/today") { return { view: "list", key: "today" }; }
  if (clean === "/week") { return { view: "list", key: "week" }; }
  return { view: "home" };
}

function render() {
  var route = routeOf(window.location.hash);
  if (route.view === "list" && !SECTIONS[route.key].items().length) { route = { view: "home" }; }
  document.getElementById("today-label").textContent = longDate(todayISO());

  document.getElementById("view-home").hidden = route.view !== "home";
  document.getElementById("view-list").hidden = route.view !== "list";
  document.getElementById("view-progress").hidden = route.view !== "progress";
  document.getElementById("back").hidden = route.view !== "list";
  document.getElementById("topbar-title").textContent =
    route.view === "list" ? SECTIONS[route.key].name() : "Mobility";

  var tabs = document.querySelectorAll(".tab");
  var live = route.view === "progress" ? "progress" : "today";
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("data-tab") === live) {
      tabs[i].setAttribute("aria-current", "page");
    } else {
      tabs[i].removeAttribute("aria-current");
    }
  }

  if (route.view === "home") {
    openKey = null;
    renderHero();
    renderCards();
    var controls = document.getElementById("home-controls");
    controls.innerHTML = "";
    controls.appendChild(dayTypeControl());
  } else if (route.view === "list") {
    renderList(route.key);
  } else {
    openKey = null;
    renderStats();
    renderGrid();
    renderCheckpoint();
    renderMeasures();
  }
}

/* ------------------------------------------------------------------ start */

window.addEventListener("hashchange", function () {
  render();
  window.scrollTo(0, 0);
});

document.getElementById("back").addEventListener("click", function () {
  if (window.history.length > 1) { window.history.back(); } else { window.location.hash = "#/"; }
});

document.addEventListener("click", function (event) {
  var reset = event.target.closest("[data-reset-daytype]");
  if (reset) { state.override = null; recordToday(); save(); render(); return; }
  var toggle = event.target.closest("[data-daytype]");
  if (toggle) { setDayType(toggle.getAttribute("data-daytype")); }
});

document.getElementById("grid").addEventListener("click", function (event) {
  var cell = event.target.closest(".cell");
  if (!cell) { return; }
  picked = cell.getAttribute("data-day");
  renderGrid();
});

document.getElementById("reset-all").addEventListener("click", function () {
  if (!window.confirm("Erase all data on this device? This cannot be undone.")) { return; }
  try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
  state = emptyState();
  picked = null;
  save();
  render();
});

/* Keep the page correct if it stays open past midnight. */
function checkRollover() { if (rollover()) { render(); } }
window.setInterval(checkRollover, 30000);
document.addEventListener("visibilitychange", function () { if (!document.hidden) { checkRollover(); } });
window.addEventListener("focus", checkRollover);

rollover();
recordToday();
render();
