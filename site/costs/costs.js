import { initialLocale, createTranslator, formatMoney, formatNumber, formatDate } from "../i18n/core.js";
const locale = initialLocale();
const t = createTranslator(locale);
// Draws the cost ledger from costs.json. Edit that file, not this page, to record a cost.

const KIND_LABELS = { paid: "Paid", estimate: "Estimate", free: "Free plan", missing: "Not yet recorded" };
const $ = (id) => document.getElementById(id);
const usd = (n) => formatMoney(n, locale, 2);
const count = (n) => (n === null ? t("not logged") : formatNumber(n, locale));
const day = (iso) => formatDate(new Date(`${iso}T00:00:00Z`), locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = t(v);
    else node.setAttribute(k, v);
  }
  node.append(...children.map((child) => typeof child === "string" ? t(child) : child));
  return node;
}

const sum = (entries, kind) => entries.filter((e) => e.kind === kind).reduce((n, e) => n + e.amount, 0);

function render(costs) {
  const { entries } = costs;
  const missing = entries.filter((e) => e.kind === "missing");
  $("as-of").textContent = t("Last updated {0}.", day(costs.asOf));

  const paid = sum(entries, "paid");
  const estimated = sum(entries, "estimate");
  $("totals").replaceChildren(
    total("Total cost so far", usd(paid + estimated), "Cash paid plus estimates"),
    total("Paid in cash", usd(paid), "Domain and hosting, paid up front"),
    total("Estimated", usd(estimated), "AI tokens, video and time, priced by the methods below"),
    ...(missing.length ? [total("Not yet recorded", formatNumber(missing.length, locale), "known costs without an amount")] : []),
  );

  $("kinds").replaceChildren(
    ...Object.entries(costs.kinds).map(([kind, text]) =>
      el("div", {}, el("dt", {}, el("span", { class: `kind kind--${kind}`, text: KIND_LABELS[kind] })), el("dd", { text })),
    ),
  );

  // Dated lines newest first, then the ones whose date is not recorded yet.
  const ordered = [...entries].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  $("ledger").replaceChildren(
    el("thead", {}, el("tr", {}, ...["Date", "What", "Kind", "Amount"].map((h) => el("th", { scope: "col", text: h })))),
    el(
      "tbody",
      {},
      ...ordered.map((e) =>
        el(
          "tr",
          {},
          el("td", { class: "nowrap", text: e.date ? day(e.date) : "" }),
          el("td", {}, el("strong", { text: e.item }), el("span", { class: "category", text: e.category }), el("p", { text: e.method }), ...(e.evidence ? [el("p", { class: "evidence" }, t("Receipt: {0}", e.evidence))] : [])),
          el("td", {}, el("span", { class: `kind kind--${e.kind}`, text: KIND_LABELS[e.kind] })),
          el("td", { class: "amount", text: e.amount === null ? "" : usd(e.amount) }),
        ),
      ),
    ),
  );

  const ai = costs.aiUsage;
  $("ai-note").textContent = t(ai.coverage);
  $("ai-table").replaceChildren(
    el("thead", {}, el("tr", {}, ...["Tool and model", "Responses", "New input", "Cache writes", "Cache reads", "Output", "At list price"].map((h) => el("th", { scope: "col", text: h })))),
    el(
      "tbody",
      {},
      ...ai.models.map((m) =>
        el(
          "tr",
          {},
          el("th", { scope: "row" }, el("strong", { text: m.model }), el("span", { class: "category", text: m.tool })),
          ...[m.responses, m.input, m.cacheWrite, m.cacheRead, m.output].map((n) => el("td", { class: "amount", text: count(n) })),
          el("td", { class: "amount", text: usd(m.listPriceUsd) }),
        ),
      ),
    ),
    el(
      "tfoot",
      {},
      el("tr", {}, el("th", { scope: "row", text: "Total" }), el("td", { colspan: "5" }), el("td", { class: "amount", text: usd(ai.models.reduce((n, m) => n + m.listPriceUsd, 0)) })),
    ),
  );
}

function total(label, value, note) {
  return el("div", { class: "total" }, el("p", { class: "total-label", text: label }), el("p", { class: "total-value", text: value }), el("p", { class: "total-note", text: note }));
}

try {
  const response = await fetch("costs.json");
  if (!response.ok) throw new Error(String(response.status));
  render(await response.json());
} catch {
  $("totals").replaceChildren(el("p", {}, "The ledger could not be loaded. Open ", el("a", { href: "costs.json", text: "costs.json" }), " to read the data directly."));
}
