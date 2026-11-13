import { createTranslator, type Locale } from "../../../site/i18n/core.js";
import type { Skill } from "./types";

/**
 * The shared vocabulary of skills. The matching rule compares tags for equality (FR-010), so
 * profiles and briefs both draw their tags from here (research R6).
 */
export interface CatalogueSkill {
  readonly tag: string;
  readonly label: string;
  readonly description: string;
  /** Lower-case words or phrases that suggest this skill when a person says them. */
  readonly keywords: readonly string[];
}

export const CATALOGUE: readonly CatalogueSkill[] = [
  { tag: "contract-manufacturing", label: "Contract manufacturing terms", description: "Minimum orders, tooling ownership, payment and acceptance terms with contract manufacturers.", keywords: ["contract manufacturing", "contract manufacturer", "manufacturer", "tooling", "moulds", "molds", "factory", "factories"] },
  { tag: "supplier-negotiation", label: "Supplier negotiation", description: "Price, volume and lead-time negotiation with suppliers.", keywords: ["supplier", "suppliers", "negotiated", "negotiation", "negotiating", "procurement", "purchasing"] },
  { tag: "supplier-audits", label: "Supplier quality audits", description: "On-site and remote audits of suppliers against a checklist.", keywords: ["audit", "audits", "auditing", "quality control", "inspection", "inspections"] },
  { tag: "cost-down", label: "Cost-down programmes", description: "Structured unit-cost reduction with existing suppliers.", keywords: ["cost reduction", "unit cost", "cost-down", "cut costs", "cutting costs"] },
  { tag: "logistics", label: "Logistics and shipping", description: "Freight, customs and warehousing.", keywords: ["logistics", "freight", "shipping", "customs", "warehouse", "warehousing"] },
  { tag: "bookkeeping", label: "Bookkeeping", description: "Keeping a small organisation's books in order.", keywords: ["bookkeeping", "bookkeeper", "accounts payable", "payroll", "ledgers"] },
  { tag: "hiring", label: "Hiring", description: "Finding, interviewing and choosing people.", keywords: ["hiring", "hired", "recruiting", "recruitment", "interviewing candidates"] },
  { tag: "sales", label: "Sales", description: "Selling to businesses and closing deals.", keywords: ["sales", "selling", "sold to", "closing deals", "account management"] },
  { tag: "hospital-operations", label: "Hospital and clinic operations", description: "Running wards and clinics day to day.", keywords: ["hospital", "clinic", "clinics", "ward", "wards", "pharmacy", "pharmacist", "nursing"] },
  { tag: "staff-scheduling", label: "Staff scheduling", description: "Shift planning for teams.", keywords: ["scheduling", "rota", "rotas", "shift planning", "shifts"] },
  { tag: "vendor-management", label: "Vendor management", description: "Managing service contracts and the companies behind them.", keywords: ["vendor", "vendors", "service contract", "service contracts", "outsourcing"] },
  { tag: "construction-bids", label: "Construction bids", description: "Reading, pricing and comparing bids for building work.", keywords: ["construction", "bids", "bidding", "contractor", "contractors", "building work"] },
  { tag: "grant-writing", label: "Grant writing", description: "Writing and budgeting grant applications.", keywords: ["grant", "grants", "grant writing", "funding application", "funding applications"] },
];

export function skillByTag(tag: string): CatalogueSkill | undefined {
  return CATALOGUE.find((s) => s.tag === tag);
}

export function exactSkillLabel(text: string, locale: Locale): CatalogueSkill | undefined {
  const t = createTranslator(locale);
  const label = text.trim().normalize("NFC").toLocaleLowerCase(locale);
  return CATALOGUE.find((skill) => [skill.label, t(skill.label)].some((candidate) => candidate.normalize("NFC").toLocaleLowerCase(locale) === label));
}

export function displaySkillLabel(skill: Pick<Skill, "tag" | "label" | "source">, locale: Locale): string {
  return skill.source.kind === "interview" && skill.label === skillByTag(skill.tag)?.label
    ? createTranslator(locale)(skill.label)
    : skill.label;
}

export function displaySkillDescription(skill: Pick<Skill, "tag" | "description">, locale: Locale): string {
  // The profile editor changes only the label. A catalogue description retains its origin.
  return skill.description === skillByTag(skill.tag)?.description
    ? createTranslator(locale)(skill.description)
    : skill.description;
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Catalogue skills whose keywords appear as whole words in the text, in catalogue order. */
export function findSkills(text: string, locale: Locale = "en"): readonly CatalogueSkill[] {
  const t = createTranslator(locale);
  const lower = text.normalize("NFC").toLocaleLowerCase(locale);
  return CATALOGUE.filter((skill) => {
    if (skill.keywords.some((word) => new RegExp(`(^|[^a-z])${escape(word)}([^a-z]|$)`).test(lower))) return true;
    const label = t(skill.label).normalize("NFC").toLocaleLowerCase(locale);
    // Japanese and Chinese compound phrases need no whitespace around a catalogue label.
    if (locale === "ja" || locale === "zh-Hans") return lower.includes(label);
    return new RegExp(`(^|[^\\p{L}\\p{M}])${escape(label)}([^\\p{L}\\p{M}]|$)`, "u").test(lower);
  });
}
