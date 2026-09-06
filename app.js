/* Mobility & rehab tracker — plain JS, no build step, no backend. */

var STORAGE_KEY = "mobility-tracker-v1";
var PROGRAM_DAYS = 84; /* 12 weeks */

/* ---------------------------------------------------------------- content
   dose = how many times you do it in one day. Leave it out for once a day.
   Change a number here and the whole app follows: the pips, the ring,
   the grid, and the streak. Do not change an id after you use the app. */

var DAILY = [
  { id: "ankle-dorsiflexion", name: "Banded ankle dorsiflexion mobilization", detail: "5–10 reps × 30s hold — left ankle priority" },
  { id: "gastroc-soleus", name: "Gastroc + soleus stretch", detail: "3–4 × 30–60s each head, both legs" },
  { id: "hamstring", name: "Hamstring static stretch", detail: "~90s total per leg" },
  { id: "thoracic-extension", name: "Foam roller thoracic extension", detail: "T7 / T9 / T11 — 30–90s each" },
  { id: "wall-slides", name: "Wall slides", detail: "2–3 × 10–15" },
  { id: "chin-tucks", name: "Chin tucks", detail: "10 × 5–10s hold", dose: 2 },
  { id: "pec-trap-levator", name: "Doorway pec stretch + upper trap + levator stretch", detail: "20–30s each side" },
  { id: "stability-set", name: "Stability set", detail: "McGill Big 3, hip airplane, QL plank, clamshell, lateral walk, dead bug, band chop, back extension, QL extension" },
  { id: "decompression", name: "Passive decompression", detail: "AM and PM", dose: 2 }
];

var TRAINING = [
  { id: "t-warmup", name: "Loaded mobility warm-up", detail: "ATG split squat + loaded butterfly" },
  { id: "t-swole", name: "SWOLE session", detail: "Programmed lift for the day" },
  { id: "t-glute-max", name: "Glute max loading", detail: "Hip thrust or bridge, 3–4 × 8–12 — or RDL / hinge day" },
  { id: "t-glute-med", name: "Glute med work", detail: "Heavier band clamshell or lateral walk, 3 × 12–20" },
  { id: "t-neck-shrug", name: "Neck / shrug add-on", detail: "Existing isometric neck + shrug variation" },
  { id: "t-sweat", name: "Sweat finisher", detail: "Bike or rower intervals, ~10 min" },
  { id: "t-cooldown", name: "Cooldown", detail: "" }
];

var OFF = [
  { id: "o-back-core", name: "Back / core strength block", detail: "Single-leg reverse hyper, single-leg RDL" },
  { id: "o-couch", name: "Couch stretch", detail: "30–120s per side — tuck the pelvis before you drive the hip forward" },
  { id: "o-incline-walk", name: "Incline walk or steps", detail: "30–45 min" },
  { id: "o-extra-volume", name: "Extra hamstring / calf volume", detail: "Toward the weekly total stretch time" }
];

var WEEKLY = [
  { id: "w-peroneal", name: "Peroneal eversion + single-leg balance", detail: "Band eversion 3 × 15 + proprioception drill", target: 3 },
  { id: "w-ytw", name: "Y-T-W raises", detail: "2–3 × 10–15", target: 3 },
  { id: "w-face-pulls", name: "Face pulls or band pull-aparts", detail: "", target: 3 },
  { id: "w-photo", name: "Side profile check-in photo", detail: "", target: 1 },
  { id: "w-knee-to-wall", name: "Knee-to-wall dorsiflexion measure", detail: "Record the distance in centimetres on the Progress tab", target: 1 }
];

/* Old ids, kept so that stored data still counts after a rename. */
var MERGED = {
  "chin-tucks-1": "chin-tucks",
  "chin-tucks-2": "chin-tucks",
  "decompression-am": "decompression",
  "decompression-pm": "decompression"
};

var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>';

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
    dayType: "training",
    doses: {},
    counts: {},
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
  base.dayType = raw.dayType === "off" ? "off" : "training";
  base.doses = raw.doses || {};
  base.counts = raw.counts || {};
  base.startDate = raw.startDate || null;
  base.measures = Array.isArray(raw.measures) ? raw.measures : [];
  base.history = raw.history || {};

  /* Move data from the old one-checkbox-per-row format. */
  if (raw.checks && !raw.doses) {
    for (var id in raw.checks) {
      if (!Object.prototype.hasOwnProperty.call(raw.checks, id) || !raw.checks[id]) { continue; }
      var key = MERGED[id] || id;
      base.doses[key] = (base.doses[key] || 0) + 1;
    }
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
    state.doses = {};
    changed = true;
  }
  if (state.weekStart !== week) {
    state.weekStart = week;
    state.counts = {};
    changed = true;
  }
  if (changed) { save(); }
  return changed;
}

var state = load();

/* ------------------------------------------------------------------- data */

function dayTypeItems() { return state.dayType === "off" ? OFF : TRAINING; }

function doseOf(item) { return item.dose || 1; }
function countOf(item) { return state.doses[item.id] || 0; }
function itemDone(item) { return countOf(item) >= doseOf(item); }

function dosesDone(items) {
  var n = 0;
  for (var i = 0; i < items.length; i++) { n += Math.min(countOf(items[i]), doseOf(items[i])); }
  return n;
}

function dosesTotal(items) {
  var n = 0;
  for (var i = 0; i < items.length; i++) { n += doseOf(items[i]); }
  return n;
}

/* One record per day. d/t = doses done and planned. e/et = the every-day list. */
function recordToday() {
  var e = dosesDone(DAILY);
  var d = e + dosesDone(dayTypeItems());
  if (d === 0) {
    delete state.history[state.date];
  } else {
    state.history[state.date] = {
      d: d,
      t: dosesTotal(DAILY) + dosesTotal(dayTypeItems()),
      e: e,
      et: dosesTotal(DAILY)
    };
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

/* A day counts for the streak when every dose of the every-day list is done. */
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

function itemText(parent, item) {
  var text = el("span", "text");
  text.appendChild(el("span", "name", item.name));
  if (item.detail) { text.appendChild(el("span", "detail", item.detail)); }
  parent.appendChild(text);
}

function dotNode() {
  var dot = el("span", "dot");
  dot.innerHTML = CHECK_SVG;
  return dot;
}

function pipCounter(count, target) {
  var box = el("span", "counter");
  var pips = el("span", "pips");
  for (var i = 0; i < target; i++) { pips.appendChild(el("i", i < count ? "pip on" : "pip")); }
  box.appendChild(pips);
  box.appendChild(el("b", null, count + "/" + target));
  if (count >= target) { box.classList.add("full"); }
  return box;
}

/* Once a day: a checkbox. */
function checkRow(item) {
  var li = el("li", "row");
  var label = el("label", "check");
  var box = document.createElement("input");
  box.type = "checkbox";
  box.checked = itemDone(item);
  var dot = dotNode();
  box.addEventListener("change", function () {
    if (box.checked) { state.doses[item.id] = 1; } else { delete state.doses[item.id]; }
    li.classList.toggle("done", box.checked);
    afterChange();
  });
  label.appendChild(box);
  label.appendChild(dot);
  itemText(label, item);
  li.appendChild(label);
  if (box.checked) { li.classList.add("done"); }
  return li;
}

/* More than once a day: the whole row adds one dose. It wraps to 0 at the end. */
function doseRow(item) {
  var li = el("li", "row");
  var button = el("button", "rowbtn");
  button.type = "button";
  var count = Math.min(countOf(item), doseOf(item));
  var done = itemDone(item);

  var dot = dotNode();
  if (done) { dot.classList.add("on"); }
  button.appendChild(dot);
  itemText(button, item);
  button.appendChild(pipCounter(count, doseOf(item)));
  button.setAttribute("aria-label", item.name + ": " + count + " of " + doseOf(item) + " today. Tap to add one.");
  button.addEventListener("click", function () {
    var next = countOf(item) + 1;
    state.doses[item.id] = next > doseOf(item) ? 0 : next;
    afterChange();
    renderToday();
  });
  li.appendChild(button);
  if (done) { li.classList.add("done"); }
  return li;
}

function taskRow(item) { return doseOf(item) > 1 ? doseRow(item) : checkRow(item); }

function weekRow(item) {
  var li = el("li", "row");
  var body = el("div", "check");
  itemText(body, item);
  li.appendChild(body);

  var count = state.counts[item.id] || 0;
  var button = el("button", "counter");
  button.type = "button";
  var pips = el("span", "pips");
  for (var i = 0; i < item.target; i++) { pips.appendChild(el("i", i < count ? "pip on" : "pip")); }
  button.appendChild(pips);
  button.appendChild(el("b", null, count + "/" + item.target));
  button.setAttribute("aria-label", item.name + ": " + count + " of " + item.target + " this week. Tap to add one.");
  if (count >= item.target) { button.classList.add("full"); li.classList.add("done"); }
  button.addEventListener("click", function () {
    var next = (state.counts[item.id] || 0) + 1;
    state.counts[item.id] = next > item.target ? 0 : next;
    save();
    renderToday();
  });
  li.appendChild(button);
  return li;
}

function afterChange() {
  recordToday();
  save();
  renderLabels();
  renderHero();
}

function fill(id, items, makeRow) {
  var list = document.getElementById(id);
  list.innerHTML = "";
  for (var i = 0; i < items.length; i++) { list.appendChild(makeRow(items[i])); }
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
  var items = DAILY.concat(dayTypeItems());
  var done = dosesDone(items);
  var total = dosesTotal(items);
  var percent = Math.round((done / total) * 100);
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
      '<p class="eyebrow">12-week program</p>' +
      '<p class="day-big">' + headline + "</p>" +
      '<p class="hero-note">' + note + "</p>" +
    "</div>" + ringSVG(percent) + "</div>" +
    '<div class="track"><i style="width:' + percent + '%"></i></div>' +
    '<p class="hero-doses">' + done + " of " + total + " doses today</p>" +
    (day !== null && day > PROGRAM_DAYS
      ? '<p class="alert">Day 84 has passed. If the ankle still pops on every step, book a surgical consult.</p>'
      : "");
}

function setLabel(id, done, total) {
  var node = document.getElementById(id);
  node.textContent = done + "/" + total;
  node.classList.toggle("full", done >= total);
}

function renderLabels() {
  setLabel("daily-progress", dosesDone(DAILY), dosesTotal(DAILY));
  setLabel("daytype-progress", dosesDone(dayTypeItems()), dosesTotal(dayTypeItems()));
  var done = 0;
  var total = 0;
  for (var i = 0; i < WEEKLY.length; i++) {
    total += WEEKLY[i].target;
    done += Math.min(state.counts[WEEKLY[i].id] || 0, WEEKLY[i].target);
  }
  setLabel("weekly-progress", done, total);
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
  if (!rec) { out.textContent = longDate(day) + " — nothing logged."; return; }
  out.textContent = longDate(day) + " — " + rec.d + " of " + rec.t + " doses (" +
    Math.round((rec.d / rec.t) * 100) + "%)" + (isStreakDay(day) ? " · every-day list complete" : "");
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
  body.appendChild(el("p", "note", "One measurement each week. Kneel, drive the knee to the wall, and record the distance from the toes."));

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

/* ----------------------------------------------------------------- render */

function renderToday() {
  renderHero();
  fill("daily-list", DAILY, taskRow);
  fill("daytype-list", dayTypeItems(), taskRow);
  fill("weekly-list", WEEKLY, weekRow);
  var buttons = document.querySelectorAll("[data-daytype]");
  for (var i = 0; i < buttons.length; i++) {
    var on = buttons[i].getAttribute("data-daytype") === state.dayType;
    buttons[i].classList.toggle("active", on);
    buttons[i].setAttribute("aria-checked", on ? "true" : "false");
  }
  renderLabels();
}

function render() {
  document.getElementById("today-label").textContent = longDate(todayISO());
  renderToday();
  renderStats();
  renderGrid();
  renderCheckpoint();
  renderMeasures();
}

/* ------------------------------------------------------------------ start */

function showView(name) {
  document.getElementById("view-today").hidden = name !== "today";
  document.getElementById("view-progress").hidden = name !== "progress";
  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) {
    if (tabs[i].getAttribute("data-view") === name) {
      tabs[i].setAttribute("aria-current", "page");
    } else {
      tabs[i].removeAttribute("aria-current");
    }
  }
  if (name === "progress") { renderStats(); renderGrid(); }
  window.scrollTo(0, 0);
}

var tabs = document.querySelectorAll(".tab");
for (var t = 0; t < tabs.length; t++) {
  tabs[t].addEventListener("click", function (event) {
    showView(event.currentTarget.getAttribute("data-view"));
  });
}

var toggles = document.querySelectorAll("[data-daytype]");
for (var g = 0; g < toggles.length; g++) {
  toggles[g].addEventListener("click", function (event) {
    state.dayType = event.currentTarget.getAttribute("data-daytype");
    recordToday();
    save();
    renderToday();
  });
}

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
