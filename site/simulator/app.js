// Agely marketplace simulator: the page. The model lives in engine.js.
import {
  GOALS,
  OUTCOMES,
  PARAMS,
  PRESETS,
  SKILLS,
  TOGGLES,
  diagnose,
  normalise,
  randomScenario,
  simulate,
  summarise,
} from "./engine.js";

const OUTCOME_LABELS = {
  matched: "Session booked",
  engine: "Answered by an engine",
  skill: "Nobody lists the skill",
  price: "Price and budget don't overlap",
  busy: "Fitting experts fully booked",
  declined: "Experts declined",
};

const STEP_MS = 550;
const $ = (id) => document.getElementById(id);
const dollars = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const percent = (n) => `${Math.round(n * 100)}%`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style") node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function formatValue(def, value) {
  if (def.unit === "$") return `$${value}`;
  if (def.unit === "%") return `${value}%`;
  if (def.unit === "min") return `${value} minutes`;
  return String(value);
}

// ---- State: the scenario lives in the URL, so any scenario can be shared as a link. ----

function readHash() {
  const raw = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  return normalise(raw);
}

function writeHash() {
  const q = new URLSearchParams();
  for (const d of PARAMS) q.set(d.key, params[d.key]);
  for (const t of TOGGLES) q.set(t.key, params[t.key] ? "1" : "0");
  q.set("seed", params.seed);
  history.replaceState(null, "", `#${q}`);
}

let params = readHash();
let result = simulate(params);
let week = params.weeks;
let timer = null;
let selectedExpert = null;

// ---- Controls ----

function buildControls() {
  const preset = $("preset");
  preset.append(el("option", { value: "", text: "Your own settings" }));
  for (const p of PRESETS) preset.append(el("option", { value: p.key, text: p.label }));
  preset.value = location.hash ? "" : "balanced";
  preset.addEventListener("change", () => {
    const chosen = PRESETS.find((p) => p.key === preset.value);
    if (chosen) setParams(normalise({ ...chosen.params, seed: params.seed }), true);
  });

  const sliders = $("sliders");
  const groups = [...new Set(PARAMS.map((d) => d.group))];
  for (const group of groups) {
    const set = el("fieldset", {}, el("legend", { text: group }));
    for (const d of PARAMS.filter((x) => x.group === group)) {
      const input = el("input", { type: "range", id: `p-${d.key}`, min: d.min, max: d.max, step: d.step });
      const out = el("output", { for: `p-${d.key}`, id: `o-${d.key}` });
      input.addEventListener("input", () => {
        params = normalise({ ...params, [d.key]: input.value });
        $("preset").value = "";
        rerun();
      });
      set.append(el("div", { class: "slider" }, el("label", { for: `p-${d.key}`, text: d.label }), out, input));
    }
    if (group === "Experts" || group === "Engine") {
      const t = TOGGLES[group === "Experts" ? 0 : 1];
      const box = el("input", { type: "checkbox", id: `t-${t.key}` });
      box.addEventListener("change", () => {
        params = normalise({ ...params, [t.key]: box.checked });
        $("preset").value = "";
        rerun();
      });
      set.append(
        el("div", { class: "toggle" }, box, el("label", { for: `t-${t.key}`, text: t.label }), el("p", { text: t.help })),
      );
    }
    sliders.append(set);
  }

  $("random").addEventListener("click", () => {
    $("preset").value = "";
    setParams({ ...randomScenario(Math.floor(Math.random() * 1_000_000)), weeks: params.weeks }, false);
  });
  $("reseed").addEventListener("click", () => {
    setParams({ ...params, seed: Math.floor(Math.random() * 1_000_000) }, true);
  });
  $("copy").addEventListener("click", async () => {
    const button = $("copy");
    try {
      await navigator.clipboard.writeText(location.href);
      button.textContent = "Link copied";
    } catch {
      button.textContent = "Copy the address from your browser";
    }
    setTimeout(() => (button.textContent = "Copy link to this scenario"), 2500);
  });

  $("play").addEventListener("click", () => (timer ? stop() : play()));
  $("week").addEventListener("input", () => {
    stop();
    week = Number($("week").value);
    render();
  });
}

function syncControls() {
  for (const d of PARAMS) {
    $(`p-${d.key}`).value = params[d.key];
    $(`o-${d.key}`).textContent = formatValue(d, params[d.key]);
  }
  for (const t of TOGGLES) $(`t-${t.key}`).checked = params[t.key];
}

function setParams(next, keepPreset) {
  params = normalise(next);
  if (!keepPreset) $("preset").value = "";
  rerun();
}

function rerun() {
  stop();
  result = simulate(params);
  week = params.weeks;
  selectedExpert = null;
  writeHash();
  syncControls();
  render();
}

// ---- Playback ----

function play() {
  week = week >= params.weeks ? 1 : week + 1;
  render();
  timer = setInterval(() => {
    if (week >= params.weeks) return stop();
    week++;
    render();
  }, STEP_MS);
  $("play").textContent = "Pause";
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  $("play").textContent = week >= params.weeks ? "Play from week 1" : "Continue";
}

// ---- Rendering ----

function render() {
  const s = summarise(result, week);
  $("week").max = params.weeks;
  $("week").value = week;
  $("week-label").textContent = `Week ${week} of ${params.weeks}`;
  if (!timer) $("play").textContent = week >= params.weeks ? "Play from week 1" : "Continue";
  renderGoals(s);
  renderTiles(s);
  renderWeeks();
  renderFit();
  renderExperts(s);
}

function renderGoals(s) {
  const met = GOALS.filter((g) => g.test(s));
  const values = { matchRate: percent(s.matchRate), earningShare: percent(s.earningShare), medianWeekly: dollars(s.medianWeekly) };
  $("goals").replaceChildren(
    ...GOALS.map((g) => {
      const ok = g.test(s);
      const progress = Math.min(1, s[g.key] / g.target);
      return el(
        "li",
        { class: ok ? "goal goal--met" : "goal" },
        el("span", { class: "goal-mark", "aria-hidden": "true", text: ok ? "✓" : "✗" }),
        el("span", { class: "goal-text", text: `${g.label} ` }, el("strong", { text: `(${ok ? "met" : "not yet"}: ${values[g.key]})` })),
        el("span", { class: "goal-bar", "aria-hidden": "true" }, el("span", { style: `width:${progress * 100}%` })),
      );
    }),
  );
  $("goals-title").textContent = `Goals: ${met.length} of ${GOALS.length} met`;
  $("diagnosis").textContent = diagnose(s, params);
}

function renderTiles(s) {
  const tiles = [
    ["Earned by experts", dollars(s.earned)],
    ["Requests that got help", `${percent(s.matchRate)}`, `${s.served.toLocaleString("en-US")} of ${s.requests.toLocaleString("en-US")}`],
    ["Typical expert, per week", dollars(s.medianWeekly)],
    ["Experts who earned", percent(s.earningShare)],
    ["Approved workflows", s.workflows.toLocaleString("en-US")],
    ["Agely's fees", dollars(s.fees)],
  ];
  $("tiles").replaceChildren(
    ...tiles.map(([label, value, note]) =>
      el("div", { class: "tile" }, el("p", { class: "tile-label", text: label }), el("p", { class: "tile-value", text: value }), el("p", { class: "tile-note", text: note ?? "" })),
    ),
  );
}

function renderWeeks() {
  $("weekbars").replaceChildren(
    ...result.weeks.map((w, i) => {
      const n = i + 1;
      const col = el("button", {
        type: "button",
        class: n > week ? "weekbar weekbar--future" : "weekbar",
        "aria-label": `Week ${n}: ${w.matched + w.engine} of ${w.requests} requests got help`,
        tabindex: "-1",
      });
      for (const o of OUTCOMES) {
        if (w[o] > 0) col.append(el("span", { class: `seg seg--${o}`, style: `flex-grow:${w[o]}` }));
      }
      col.addEventListener("click", () => {
        stop();
        week = n;
        render();
      });
      col.addEventListener("pointerenter", () => highlightWeek(n));
      return col;
    }),
  );
  $("weekbars").onpointerleave = () => highlightWeek(week);
  highlightWeek(week);

  $("weeks-table").replaceChildren(
    el("thead", {}, el("tr", {}, el("th", { scope: "col", text: "Week" }), ...OUTCOMES.map((o) => el("th", { scope: "col", text: OUTCOME_LABELS[o] })), el("th", { scope: "col", text: "Earned by experts" }))),
    el(
      "tbody",
      {},
      ...result.weeks.slice(0, week).map((x, i) =>
        el("tr", {}, el("th", { scope: "row", text: String(i + 1) }), ...OUTCOMES.map((o) => el("td", { text: String(x[o]) })), el("td", { text: dollars(x.earned) })),
      ),
    ),
  );
}

/** Mark one week's bar and show its breakdown in the legend, without rebuilding the chart. */
function highlightWeek(n) {
  [...$("weekbars").children].forEach((col, i) => col.classList.toggle("weekbar--current", i + 1 === n));
  const w = result.weeks[n - 1];
  $("weeks-legend").replaceChildren(
    el("li", { class: "legend-head", text: `Week ${n}` }),
    ...OUTCOMES.filter((o) => o !== "engine" || params.engine).map((o) =>
      el("li", {}, el("span", { class: `key seg--${o}` }), `${OUTCOME_LABELS[o]}: `, el("strong", { text: String(w[o]) })),
    ),
  );
}

const BIN = 10;
const BINS = 20; // $0 to $200; anything higher lands in the last column

function histogram(values) {
  const bins = new Array(BINS).fill(0);
  for (const v of values) bins[Math.min(BINS - 1, Math.floor(v / BIN))]++;
  return bins.map((n) => (values.length ? n / values.length : 0));
}

function renderFit() {
  const expertShare = histogram(result.experts.map((e) => (e.price.min + e.price.max) / 2));
  const buyerShare = histogram(result.budgets);
  const top = Math.max(...expertShare, ...buyerShare, 0.01);
  $("fit").replaceChildren(
    ...expertShare.map((share, i) => {
      const label = i === BINS - 1 ? `$${i * BIN} or more` : `$${i * BIN}–$${(i + 1) * BIN}`;
      const col = el(
        "div",
        { class: "fit-col" },
        el("div", { class: "fit-up" }, el("span", { class: "fit-bar fit-bar--expert", style: `height:${(share / top) * 100}%` })),
        el("div", { class: "fit-down" }, el("span", { class: "fit-bar fit-bar--buyer", style: `height:${(buyerShare[i] / top) * 100}%` })),
        el("span", { class: "fit-tick", text: i % 5 === 0 ? `$${i * BIN}` : "" }),
      );
      col.addEventListener("pointerenter", () => {
        $("fit-readout").textContent = `${label} per 15 minutes: ${percent(share)} of experts, ${percent(buyerShare[i])} of budgets.`;
      });
      return col;
    }),
  );
}

function renderExperts(s) {
  const top = Math.max(...s.byExpert, 1);
  $("expert-grid").replaceChildren(
    ...result.experts.map((e) => {
      const earned = s.byExpert[e.id];
      const cell = el("button", {
        type: "button",
        class: `expert${earned === 0 ? " expert--none" : ""}${selectedExpert === e.id ? " expert--selected" : ""}`,
        style: earned === 0 ? "" : `--level:${Math.round(15 + 85 * (earned / top))}%`,
        "aria-label": `${e.name}: ${dollars(earned)} earned`,
      });
      const show = () => {
        selectedExpert = e.id;
        describeExpert(e, earned);
        for (const other of $("expert-grid").children) other.classList.remove("expert--selected");
        cell.classList.add("expert--selected");
      };
      cell.addEventListener("click", show);
      cell.addEventListener("pointerenter", show);
      cell.addEventListener("focus", show);
      return cell;
    }),
  );
  const chosen = result.experts[selectedExpert ?? -1];
  if (chosen) describeExpert(chosen, s.byExpert[chosen.id]);
  else $("expert-readout").textContent = "Select a square to see that expert.";
}

function describeExpert(e, earned) {
  const skills = e.skills.map((i) => SKILLS[i]).join(" and ");
  const final = week >= params.weeks ? `, ${e.sessions} sessions and ${e.workflows} approved workflows by the end` : "";
  $("expert-readout").textContent =
    `${e.name}, ${e.age}. ${e.years} years in ${skills}. Charges $${e.price.min}–$${e.price.max} per 15 minutes and can take ${e.capacity} sessions a week. ` +
    `Earned ${dollars(earned)} by week ${week}${final}.`;
}

buildControls();
// On a phone the sliders start folded away so the results are the first thing on screen.
if (matchMedia("(max-width: 900px)").matches) $("adjust").open = false;
syncControls();
render();
