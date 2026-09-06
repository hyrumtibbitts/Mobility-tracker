/* Mobility & rehab routine tracker — plain JS, no build step, no backend. */

var STORAGE_KEY = "mobility-tracker-v1";
var CHECKPOINT_DAYS = 84; /* 12 weeks */

/* ---------------------------------------------------------------- content */

var DAILY = [
  { id: "ankle-dorsiflexion", name: "Banded ankle dorsiflexion mobilization", detail: "5–10 reps × 30s hold — left ankle priority" },
  { id: "gastroc-soleus", name: "Gastroc + soleus stretch", detail: "3–4 × 30–60s each head, both legs" },
  { id: "hamstring", name: "Hamstring static stretch", detail: "~90s total per leg" },
  { id: "thoracic-extension", name: "Foam roller thoracic extension", detail: "T7 / T9 / T11 — 30–90s each" },
  { id: "wall-slides", name: "Wall slides", detail: "2–3 × 10–15" },
  { id: "chin-tucks-1", name: "Chin tucks — set 1", detail: "10 × 5–10s hold" },
  { id: "chin-tucks-2", name: "Chin tucks — set 2", detail: "10 × 5–10s hold" },
  { id: "pec-trap-levator", name: "Doorway pec stretch + upper trap + levator stretch", detail: "20–30s each side" },
  { id: "stability-set", name: "Stability set", detail: "McGill Big 3, hip airplane, QL plank, clamshell, lateral walk, dead bug, band chop, back extension, QL extension" },
  { id: "decompression-am", name: "Passive decompression — AM", detail: "" },
  { id: "decompression-pm", name: "Passive decompression — PM", detail: "" }
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
  { id: "w-knee-to-wall", name: "Knee-to-wall dorsiflexion measure", detail: "Record the distance in centimetres", target: 1, measure: true }
];

/* ------------------------------------------------------------ date helpers */

function iso(date) {
  var m = String(date.getMonth() + 1);
  var d = String(date.getDate());
  if (m.length < 2) { m = "0" + m; }
  if (d.length < 2) { d = "0" + d; }
  return date.getFullYear() + "-" + m + "-" + d;
}

function todayISO() {
  return iso(new Date());
}

/* The Monday of the week that holds the given date. */
function mondayISO(date) {
  var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var offset = (d.getDay() + 6) % 7; /* Sunday = 6 */
  d.setDate(d.getDate() - offset);
  return iso(d);
}

function parseISO(text) {
  var parts = String(text).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function daysBetween(fromISO, toISO) {
  var ms = parseISO(toISO).getTime() - parseISO(fromISO).getTime();
  return Math.round(ms / 86400000);
}

function longDate(text) {
  return parseISO(text).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  });
}

function shortDate(text) {
  return parseISO(text).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function plural(count, word) {
  return count + " " + word + (count === 1 ? "" : "s");
}

/* ----------------------------------------------------------------- storage */

function emptyState() {
  return {
    date: todayISO(),
    weekStart: mondayISO(new Date()),
    dayType: "training",
    checks: {},
    counts: {},
    startDate: null,
    measures: []
  };
}

function load() {
  var state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    state = null;
  }
  if (!state || typeof state !== "object") {
    return emptyState();
  }
  var base = emptyState();
  base.date = state.date || base.date;
  base.weekStart = state.weekStart || base.weekStart;
  base.dayType = state.dayType === "off" ? "off" : "training";
  base.checks = state.checks || {};
  base.counts = state.counts || {};
  base.startDate = state.startDate || null;
  base.measures = Array.isArray(state.measures) ? state.measures : [];
  return base;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    /* Private mode, or the quota is full. The app still works for this visit. */
  }
}

/* Clear the daily checks at midnight, and the weekly counts each Monday. */
function rollover() {
  var changed = false;
  var day = todayISO();
  var week = mondayISO(new Date());
  if (state.date !== day) {
    state.date = day;
    state.checks = {};
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

/* ------------------------------------------------------------------- build */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) { node.className = className; }
  if (text !== undefined) { node.textContent = text; }
  return node;
}

function itemText(parent, item) {
  var text = el("span", "text");
  text.appendChild(el("span", "name", item.name));
  if (item.detail) {
    text.appendChild(el("span", "detail", item.detail));
  }
  parent.appendChild(text);
}

function checkRow(item) {
  var li = el("li", "row");
  var label = el("label", "check");
  var box = document.createElement("input");
  box.type = "checkbox";
  box.checked = !!state.checks[item.id];
  box.addEventListener("change", function () {
    if (box.checked) {
      state.checks[item.id] = true;
    } else {
      delete state.checks[item.id];
    }
    li.classList.toggle("done", box.checked);
    save();
    renderProgress();
  });
  label.appendChild(box);
  itemText(label, item);
  li.appendChild(label);
  if (box.checked) { li.classList.add("done"); }
  return li;
}

function countRow(item) {
  var li = el("li", "row");
  var body = el("div", "check");
  itemText(body, item);
  li.appendChild(body);

  var count = state.counts[item.id] || 0;
  var button = el("button", "counter", count + "/" + item.target);
  button.type = "button";
  button.setAttribute("aria-label", item.name + ": " + count + " of " + item.target + " this week. Tap to add one.");
  button.addEventListener("click", function () {
    var next = (state.counts[item.id] || 0) + 1;
    if (next > item.target) { next = 0; }
    state.counts[item.id] = next;
    save();
    render();
  });
  if (count >= item.target) {
    li.classList.add("done");
    button.classList.add("full");
  }
  li.appendChild(button);

  if (item.measure) {
    li.appendChild(measureField(item));
  }
  return li;
}

function measureField(item) {
  var box = el("div", "measure");
  var label = el("label", "measure-label", "This week (cm)");
  var input = document.createElement("input");
  input.type = "number";
  input.step = "0.5";
  input.min = "0";
  input.inputMode = "decimal";
  input.placeholder = "–";
  input.id = "measure-" + item.id;
  label.setAttribute("for", input.id);

  var thisWeek = null;
  var previous = null;
  for (var i = 0; i < state.measures.length; i++) {
    var entry = state.measures[i];
    if (entry.week === state.weekStart) { thisWeek = entry; }
    else if (!previous || entry.week > previous.week) { previous = entry; }
  }
  if (thisWeek) { input.value = thisWeek.value; }

  input.addEventListener("change", function () {
    var value = parseFloat(input.value);
    var kept = [];
    for (var j = 0; j < state.measures.length; j++) {
      if (state.measures[j].week !== state.weekStart) { kept.push(state.measures[j]); }
    }
    if (!isNaN(value)) {
      kept.push({ week: state.weekStart, date: todayISO(), value: value });
    }
    kept.sort(function (a, b) { return a.week < b.week ? -1 : 1; });
    state.measures = kept.slice(-24);
    save();
    render();
  });

  box.appendChild(label);
  box.appendChild(input);
  if (previous) {
    box.appendChild(el("span", "measure-prev", "Last: " + previous.value + " cm on " + shortDate(previous.date)));
  }
  return box;
}

function fill(listId, items, makeRow) {
  var list = document.getElementById(listId);
  list.innerHTML = "";
  for (var i = 0; i < items.length; i++) {
    list.appendChild(makeRow(items[i]));
  }
}

function dayTypeItems() {
  return state.dayType === "off" ? OFF : TRAINING;
}

function doneCount(items) {
  var n = 0;
  for (var i = 0; i < items.length; i++) {
    if (state.checks[items[i].id]) { n += 1; }
  }
  return n;
}

function renderProgress() {
  var day = dayTypeItems();
  document.getElementById("daily-progress").textContent =
    doneCount(DAILY) + " of " + DAILY.length + " done";
  document.getElementById("daytype-progress").textContent =
    doneCount(day) + " of " + day.length + " done";

  var weekDone = 0;
  var weekTotal = 0;
  for (var i = 0; i < WEEKLY.length; i++) {
    weekTotal += WEEKLY[i].target;
    weekDone += Math.min(state.counts[WEEKLY[i].id] || 0, WEEKLY[i].target);
  }
  document.getElementById("weekly-progress").textContent =
    weekDone + " of " + weekTotal + " done — week of " + shortDate(state.weekStart);
}

/* ------------------------------------------------------------- checkpoint */

function renderCheckpoint() {
  var body = document.getElementById("checkpoint-body");
  body.innerHTML = "";

  if (!state.startDate) {
    var text = el("p", "note", "Set the day you started the program. The app then counts the 12 weeks for you.");
    var form = el("form", "start-form");
    var input = document.createElement("input");
    input.type = "date";
    input.id = "start-date";
    input.required = true;
    input.max = todayISO();
    input.value = todayISO();
    var label = el("label", "sr-only", "Program start date");
    label.setAttribute("for", "start-date");
    var button = el("button", "primary", "Set start date");
    button.type = "submit";
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!input.value) { return; }
      state.startDate = input.value;
      save();
      render();
    });
    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(button);
    body.appendChild(text);
    body.appendChild(form);
    return;
  }

  var elapsed = daysBetween(state.startDate, todayISO());
  var dayNumber = elapsed + 1;

  if (dayNumber < 1) {
    body.appendChild(el("p", "big", "The program starts in " + plural(1 - dayNumber, "day") + "."));
  } else if (dayNumber <= CHECKPOINT_DAYS) {
    var week = Math.ceil(dayNumber / 7);
    var left = CHECKPOINT_DAYS - dayNumber;
    body.appendChild(el("p", "big", "Week " + week + " of 12 — day " + dayNumber + " of " + CHECKPOINT_DAYS));
    var bar = el("div", "bar");
    var fillBar = el("div", "bar-fill");
    fillBar.style.width = Math.round((dayNumber / CHECKPOINT_DAYS) * 100) + "%";
    bar.appendChild(fillBar);
    body.appendChild(bar);
    body.appendChild(el("p", "note", left === 0
      ? "The checkpoint is today."
      : plural(left, "day") + " to the checkpoint."));
  } else {
    var card = el("p", "alert",
      "The 12 weeks are complete (day " + dayNumber + "). If the ankle still pops on every step, book a surgical consult.");
    body.appendChild(card);
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

/* ----------------------------------------------------------------- render */

function render() {
  document.getElementById("today-label").textContent = longDate(todayISO());
  renderCheckpoint();
  fill("daily-list", DAILY, checkRow);
  fill("daytype-list", dayTypeItems(), checkRow);
  fill("weekly-list", WEEKLY, countRow);

  var buttons = document.querySelectorAll("[data-daytype]");
  for (var i = 0; i < buttons.length; i++) {
    var active = buttons[i].getAttribute("data-daytype") === state.dayType;
    buttons[i].classList.toggle("active", active);
    buttons[i].setAttribute("aria-checked", active ? "true" : "false");
  }
  renderProgress();
}

/* ------------------------------------------------------------------ start */

var toggles = document.querySelectorAll("[data-daytype]");
for (var t = 0; t < toggles.length; t++) {
  toggles[t].addEventListener("click", function (event) {
    state.dayType = event.currentTarget.getAttribute("data-daytype");
    save();
    render();
  });
}

document.getElementById("reset-all").addEventListener("click", function () {
  if (!window.confirm("Erase all data on this device? This cannot be undone.")) { return; }
  try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
  state = emptyState();
  save();
  render();
});

/* Keep the page correct if it stays open past midnight. */
function checkRollover() {
  if (rollover()) { render(); }
}
window.setInterval(checkRollover, 30000);
document.addEventListener("visibilitychange", function () {
  if (!document.hidden) { checkRollover(); }
});
window.addEventListener("focus", checkRollover);

rollover();
render();
