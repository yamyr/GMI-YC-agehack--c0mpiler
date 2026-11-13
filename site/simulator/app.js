import { formatExpertDescription } from "./presentation.js";
import { initialLocale, createTranslator, formatMoney, formatNumber } from "../i18n/core.js";
const locale = initialLocale();
const t = createTranslator(locale);
// Agely marketplace simulator: the page. The model lives in engine.js.
import {
  GOALS,
  OUTCOMES,
  PARAMS,
  PRESETS,
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
const dollars = (n) => formatMoney(n, locale);
const percent = (n) => formatNumber(n, locale, { style: "percent", maximumFractionDigits: 0 });

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = t(v);
    else if (k === "style") node.style.cssText = v;
    else node.setAttribute(k, k === "aria-label" ? t(v) : v);
  }
  node.append(...children.map((child) => typeof child === "string" ? t(child) : child));
  return node;
}

function formatValue(def, value) {
  if (def.unit === "$") return formatMoney(value, locale);
  if (def.unit === "%") return formatNumber(value / 100, locale, { style: "percent", maximumFractionDigits: 0 });
  if (def.unit === "min") return t("{0} minutes", formatNumber(value, locale));
  return formatNumber(value, locale);
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
      button.textContent = t("Link copied");
    } catch {
      button.textContent = t("Copy the address from your browser");
    }
    setTimeout(() => (button.textContent = t("Copy link to this scenario")), 2500);
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
  $("play").textContent = t("Pause");
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  $("play").textContent = t(week >= params.weeks ? "Play from week 1" : "Continue");
}

// ---- Rendering ----

function render() {
  const s = summarise(result, week);
  $("week").max = params.weeks;
  $("week").value = week;
  $("week-label").textContent = t("Week {0} of {1}", formatNumber(week, locale), formatNumber(params.weeks, locale));
  if (!timer) $("play").textContent = t(week >= params.weeks ? "Play from week 1" : "Continue");
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
        el("span", { class: "goal-text", text: `${t(g.label)} ` }, el("strong", { text: t("({0}: {1})", t(ok ? "met" : "not yet"), values[g.key]) })),
        el("span", { class: "goal-bar", "aria-hidden": "true" }, el("span", { style: `width:${progress * 100}%` })),
      );
    }),
  );
  $("goals-title").textContent = t("Goals: {0} of {1} met", formatNumber(met.length, locale), formatNumber(GOALS.length, locale));
  $("diagnosis").textContent = diagnose(s, params, t);
}

function renderTiles(s) {
  const tiles = [
    ["Earned by experts", dollars(s.earned)],
    ["Requests that got help", `${percent(s.matchRate)}`, t("{0} of {1}", formatNumber(s.served, locale), formatNumber(s.requests, locale))],
    ["Typical expert, per week", dollars(s.medianWeekly)],
    ["Experts who earned", percent(s.earningShare)],
    ["Approved workflows", formatNumber(s.workflows, locale)],
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
        "aria-label": t("Week {0}: {1} of {2} requests got help", formatNumber(n, locale), formatNumber(w.matched + w.engine, locale), formatNumber(w.requests, locale)),
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
        el("tr", {}, el("th", { scope: "row", text: formatNumber(i + 1, locale) }), ...OUTCOMES.map((o) => el("td", { text: formatNumber(x[o], locale) })), el("td", { text: dollars(x.earned) })),
      ),
    ),
  );
}

/** Mark one week's bar and show its breakdown in the legend, without rebuilding the chart. */
function highlightWeek(n) {
  [...$("weekbars").children].forEach((col, i) => col.classList.toggle("weekbar--current", i + 1 === n));
  const w = result.weeks[n - 1];
  $("weeks-legend").replaceChildren(
    el("li", { class: "legend-head", text: t("Week {0}", formatNumber(n, locale)) }),
    ...OUTCOMES.filter((o) => o !== "engine" || params.engine).map((o) =>
      el("li", {}, el("span", { class: `key seg--${o}` }), t("{0}: ", t(OUTCOME_LABELS[o])), el("strong", { text: formatNumber(w[o], locale) })),
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
      const label = i === BINS - 1 ? t("{0} or more", dollars(i * BIN)) : t("{0}–{1}", dollars(i * BIN), dollars((i + 1) * BIN));
      const col = el(
        "div",
        { class: "fit-col" },
        el("div", { class: "fit-up" }, el("span", { class: "fit-bar fit-bar--expert", style: `height:${(share / top) * 100}%` })),
        el("div", { class: "fit-down" }, el("span", { class: "fit-bar fit-bar--buyer", style: `height:${(buyerShare[i] / top) * 100}%` })),
        el("span", { class: "fit-tick", text: i % 5 === 0 ? dollars(i * BIN) : "" }),
      );
      col.addEventListener("pointerenter", () => {
        $("fit-readout").textContent = t("{0} per 15 minutes: {1} of experts, {2} of budgets.", label, percent(share), percent(buyerShare[i]));
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
        "aria-label": t("{0}: {1} earned", e.name, dollars(earned)),
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
  else $("expert-readout").textContent = t("Select a square to see that expert.");
}

function describeExpert(e, earned) {
  $("expert-readout").textContent = formatExpertDescription(e, earned, week, params.weeks, locale);

}

buildControls();
// On a phone the sliders start folded away so the results are the first thing on screen.
if (matchMedia("(max-width: 900px)").matches) $("adjust").open = false;
syncControls();
render();
