// Agely marketplace simulator: the model. No DOM here, so it can be unit-tested.
//
// It applies the prototype's own matching rule (src/demo/domain/match.ts) to a made-up population:
// an expert fits a request when they list the skill and their price range overlaps the buyer's
// budget. Every number it produces is illustrative, not a forecast.

export const SKILLS = [
  "Contract manufacturing",
  "Supplier negotiation",
  "Bookkeeping",
  "Hiring",
  "Logistics",
  "Clinic operations",
  "Sales",
  "Quality audits",
  "Construction bids",
  "Grant writing",
];

/** Outcomes of a request, in the order charts stack them. */
export const OUTCOMES = ["matched", "engine", "skill", "price", "busy", "declined"];

/** Every parameter, with its range. The UI builds its controls from this list. */
export const PARAMS = [
  { key: "experts", group: "Experts", label: "Experts on Agely", min: 5, max: 200, step: 5, value: 40 },
  { key: "expertPrice", group: "Experts", label: "Typical expert price", min: 20, max: 160, step: 5, value: 75, unit: "$" },
  { key: "expertFlex", group: "Experts", label: "How wide their price range is", min: 5, max: 50, step: 5, value: 20, unit: "%" },
  { key: "capacity", group: "Experts", label: "Sessions an expert can take per week", min: 1, max: 20, step: 1, value: 6 },
  { key: "acceptance", group: "Experts", label: "Proposals experts accept", min: 30, max: 100, step: 5, value: 85, unit: "%" },
  { key: "requests", group: "Buyers", label: "Requests per week", min: 5, max: 400, step: 5, value: 120 },
  { key: "budget", group: "Buyers", label: "Typical buyer budget", min: 20, max: 160, step: 5, value: 75, unit: "$" },
  { key: "budgetFlex", group: "Buyers", label: "How wide their budget is", min: 5, max: 50, step: 5, value: 30, unit: "%" },
  { key: "units", group: "Buyers", label: "Average session length", min: 15, max: 60, step: 15, value: 30, unit: "min" },
  { key: "skills", group: "Market", label: "Different skills in demand", min: 2, max: 10, step: 1, value: 6 },
  { key: "concentration", group: "Market", label: "Demand piles onto a few skills", min: 0, max: 100, step: 10, value: 40, unit: "%" },
  { key: "fee", group: "Market", label: "Agely's fee", min: 0, max: 30, step: 1, value: 10, unit: "%" },
  { key: "weeks", group: "Market", label: "Weeks to simulate", min: 4, max: 52, step: 4, value: 12 },
  { key: "approval", group: "Engine", label: "Sessions that become an approved workflow", min: 0, max: 100, step: 10, value: 40, unit: "%" },
];

/** Switches, kept apart from the sliders. */
export const TOGGLES = [
  {
    key: "spread",
    label: "Spread work across experts",
    help: "Off: the best price fit wins, as in the demo. On: among experts who fit, the one with the fewest sessions goes first.",
    value: false,
  },
  {
    key: "engine",
    label: "Engines answer when the expert is busy",
    help: "A future idea, not in the prototype: an expert's approved workflows handle the request for 30% of the session price.",
    value: false,
  },
];

export const ENGINE_PRICE_SHARE = 0.3;
const MAX_PROPOSALS = 3;

export function defaults() {
  const p = { seed: 1 };
  for (const d of PARAMS) p[d.key] = d.value;
  for (const t of TOGGLES) p[t.key] = t.value;
  return p;
}

/** Fill gaps and clamp everything to its range, so a hand-edited link can't break the model. */
export function normalise(input = {}) {
  const p = defaults();
  for (const d of PARAMS) {
    const n = Number(input[d.key]);
    if (Number.isFinite(n)) p[d.key] = Math.min(d.max, Math.max(d.min, Math.round(n / d.step) * d.step));
  }
  for (const t of TOGGLES) if (input[t.key] !== undefined) p[t.key] = input[t.key] === true || input[t.key] === "1";
  const seed = Number(input.seed);
  if (Number.isFinite(seed)) p.seed = Math.abs(Math.trunc(seed)) % 1_000_000;
  return p;
}

/** Small seeded generator (mulberry32): the same seed always replays the same market. */
export function rng(seed) {
  let a = (seed >>> 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand) {
  return Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
}

function pickWeighted(rand, weights) {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** A price range around a midpoint, in whole dollars. */
function range(mid, flexPct) {
  const half = (mid * flexPct) / 100;
  return { min: Math.max(5, Math.round(mid - half)), max: Math.max(6, Math.round(mid + half)) };
}

export function overlap(a, b) {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min <= max ? { min, max } : null;
}

/** How demand splits across skills: even at 0% concentration, steeply skewed at 100%. */
export function demandWeights(skills, concentration) {
  const s = (concentration / 100) * 2;
  return Array.from({ length: skills }, (_, i) => 1 / (i + 1) ** s);
}

const FIRST_NAMES = [
  "Margaret", "Harold", "Lin", "Ruth", "Walter", "Gloria", "Samuel", "Irene", "Arthur", "Joan",
  "Frank", "Mei", "Dorothy", "Carlos", "Evelyn", "George", "Amara", "Stanley", "Priya", "Eugene",
];

function makeExperts(p, rand) {
  return Array.from({ length: p.experts }, (_, i) => {
    const first = i % p.skills; // every skill has someone when there are enough experts
    const skills = [first];
    if (rand() < 0.35) {
      const second = Math.floor(rand() * p.skills);
      if (second !== first) skills.push(second);
    }
    const mid = Math.max(10, p.expertPrice * (1 + 0.25 * normal(rand)));
    return {
      id: i,
      name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${Math.floor(i / FIRST_NAMES.length) + 1}`,
      age: 65 + Math.floor(rand() * 16),
      years: 20 + Math.floor(rand() * 26),
      skills,
      price: range(mid, p.expertFlex),
      capacity: Math.max(1, Math.round(p.capacity * (0.6 + 0.8 * rand()))),
      sessions: 0,
      engineSessions: 0,
      earned: 0,
      workflows: 0,
    };
  });
}

/**
 * Run the whole simulation. Returns the experts' final state, one record per week, and the
 * midpoints of every budget seen (for the price-fit chart).
 */
export function simulate(input) {
  const p = normalise(input);
  const rand = rng(p.seed);
  const experts = makeExperts(p, rand);
  const weights = demandWeights(p.skills, p.concentration);
  const bySkill = Array.from({ length: p.skills }, (_, s) => experts.filter((e) => e.skills.includes(s)));
  const meanUnits = p.units / 15;
  const weeks = [];
  const budgets = [];

  for (let w = 0; w < p.weeks; w++) {
    const used = new Array(experts.length).fill(0);
    const week = { matched: 0, engine: 0, skill: 0, price: 0, busy: 0, declined: 0, requests: p.requests, paid: 0, earned: 0, fees: 0 };

    for (let r = 0; r < p.requests; r++) {
      const skill = pickWeighted(rand, weights);
      const mid = Math.max(10, p.budget * (1 + 0.3 * normal(rand)));
      const budget = range(mid, p.budgetFlex);
      // 1 to 4 units of 15 minutes, averaging the chosen session length.
      let units = 1;
      for (let k = 0; k < 3; k++) if (rand() < (meanUnits - 1) / 3) units++;
      budgets.push(Math.round(mid));

      const listed = bySkill[skill];
      if (listed.length === 0) {
        week.skill++;
        continue;
      }
      const fits = [];
      for (const e of listed) {
        const shared = overlap(e.price, budget);
        if (shared) fits.push({ e, shared });
      }
      if (fits.length === 0) {
        week.price++;
        continue;
      }
      const free = fits.filter((f) => used[f.e.id] < f.e.capacity);
      if (free.length === 0) {
        const withEngine = p.engine ? fits.filter((f) => f.e.workflows > 0) : [];
        if (withEngine.length === 0) {
          week.busy++;
          continue;
        }
        withEngine.sort((a, b) => b.e.workflows - a.e.workflows || a.e.id - b.e.id);
        const { e, shared } = withEngine[0];
        pay(week, e, units * Math.round(((shared.min + shared.max) / 2) * ENGINE_PRICE_SHARE), p.fee);
        e.engineSessions++;
        week.engine++;
        continue;
      }
      // The demo's ranking: widest price overlap, then most experience. "Spread" puts the
      // least-booked expert first instead.
      const width = (f) => f.shared.max - f.shared.min;
      free.sort((a, b) =>
        p.spread
          ? a.e.sessions - b.e.sessions || width(b) - width(a) || a.e.id - b.e.id
          : width(b) - width(a) || b.e.years - a.e.years || a.e.id - b.e.id,
      );
      let booked = false;
      for (const { e, shared } of free.slice(0, MAX_PROPOSALS)) {
        if (rand() * 100 >= p.acceptance) continue; // the expert declines; ask the next one
        pay(week, e, units * Math.round((shared.min + shared.max) / 2), p.fee);
        used[e.id]++;
        e.sessions++;
        // Later sessions teach the engine less: each approved workflow halves the odds of the next.
        if (rand() * 100 < p.approval / (1 + e.workflows)) e.workflows++;
        week.matched++;
        booked = true;
        break;
      }
      if (!booked) week.declined++;
    }

    week.earnedByExpert = experts.map((e) => e.earned);
    week.workflows = experts.reduce((n, e) => n + e.workflows, 0);
    weeks.push(week);
  }

  return { params: p, experts, weeks, budgets };
}

function pay(week, expert, total, feePct) {
  const fee = Math.round(total * feePct) / 100;
  expert.earned += total - fee;
  week.paid += total;
  week.earned += total - fee;
  week.fees += fee;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const m = sorted.length >> 1;
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** Totals after `upTo` weeks (1-based), for the scoreboard. */
export function summarise(result, upTo = result.weeks.length) {
  const weeks = result.weeks.slice(0, upTo);
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, 0]));
  let requests = 0;
  let earned = 0;
  let fees = 0;
  for (const w of weeks) {
    for (const o of OUTCOMES) counts[o] += w[o];
    requests += w.requests;
    earned += w.earned;
    fees += w.fees;
  }
  const byExpert = weeks.length ? weeks[weeks.length - 1].earnedByExpert : result.experts.map(() => 0);
  const served = counts.matched + counts.engine;
  return {
    weeks: weeks.length,
    requests,
    counts,
    served,
    matchRate: requests ? served / requests : 0,
    earned,
    fees,
    medianWeekly: weeks.length ? median(byExpert) / weeks.length : 0,
    earningShare: byExpert.length ? byExpert.filter((v) => v > 0).length / byExpert.length : 0,
    workflows: weeks.length ? weeks[weeks.length - 1].workflows : 0,
    byExpert,
  };
}

/** The three targets that make it a game. Each is a property of a healthy market for experts. */
export const GOALS = [
  { key: "matchRate", label: "At least 70% of requests get help", target: 0.7, test: (s) => s.matchRate >= 0.7 },
  { key: "earningShare", label: "At least 80% of experts earn something", target: 0.8, test: (s) => s.earningShare >= 0.8 },
  { key: "medianWeekly", label: "The typical expert earns $150 or more a week", target: 150, test: (s) => s.medianWeekly >= 150 },
];

/** One plain-language reading of the result: the biggest problem and the lever that addresses it. */
export function diagnose(summary, p) {
  const { counts, requests } = summary;
  if (requests === 0) return "Nothing has happened yet.";
  const lost = ["skill", "price", "busy", "declined"].map((k) => [k, counts[k]]).sort((a, b) => b[1] - a[1]);
  const [worst, n] = lost[0];
  const share = Math.round((n / requests) * 100);
  if (summary.matchRate >= 0.7 && summary.earningShare < 0.8) {
    return `Buyers are being served, but only ${Math.round(summary.earningShare * 100)}% of experts have earned anything. The best price fit keeps winning. Spreading work across experts, or more requests, would reach the rest.`;
  }
  if (summary.matchRate >= 0.7 && summary.medianWeekly < 150) {
    return "Most requests get help, but there isn't enough paid work per expert. More requests, longer sessions, or fewer experts would raise what a typical expert earns.";
  }
  if (summary.matchRate >= 0.7) return "This market works: most buyers get help and the money reaches most experts.";
  const why = {
    skill: `${share}% of requests ask for a skill nobody lists. More experts would cover it; so would fewer distinct skills.`,
    price: `${share}% of requests fail on price: the buyer's budget and the expert's range don't overlap. ${p.expertPrice > p.budget ? "Experts charge more than buyers can pay." : "Budgets and prices are too narrow to meet."} Wider ranges or a closer typical price would help.`,
    busy: `${share}% of requests find a fitting expert who is already fully booked. More experts, more sessions per week, or letting engines answer would absorb the demand.`,
    declined: `${share}% of requests are turned down by every expert asked. A higher acceptance rate is the lever.`,
  };
  return why[worst];
}

/** Named starting points. Each one fails a goal for a different reason. */
export const PRESETS = [
  { key: "balanced", label: "A balanced market", params: {} },
  { key: "launch", label: "Launch month: few experts, few buyers", params: { experts: 5, requests: 15, weeks: 4, skills: 10, concentration: 0 } },
  { key: "pricedOut", label: "Priced out: experts charge more than buyers budget", params: { expertPrice: 120, budget: 60, expertFlex: 10, budgetFlex: 15 } },
  { key: "swamped", label: "Swamped: far more buyers than experts", params: { experts: 15, requests: 300, capacity: 4 } },
  { key: "idle", label: "Idle experts: too little demand", params: { experts: 120, requests: 40 } },
  { key: "niche", label: "Niche skills: demand piles onto one skill", params: { skills: 10, concentration: 100, experts: 20 } },
];

/** A random but plausible scenario: the "parameter generator". */
export function randomScenario(seed) {
  const rand = rng(seed);
  const p = { seed };
  for (const d of PARAMS) {
    if (d.key === "weeks") continue;
    const steps = Math.round((d.max - d.min) / d.step);
    p[d.key] = d.min + Math.floor(rand() * (steps + 1)) * d.step;
  }
  for (const t of TOGGLES) p[t.key] = rand() < 0.3;
  return normalise(p);
}
