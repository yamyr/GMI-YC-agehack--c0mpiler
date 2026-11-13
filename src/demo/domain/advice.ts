import { createTranslator, type Locale } from "../../../site/i18n/core.js";
export type AdviceCategory = "legal" | "medical" | "financial";

/**
 * Deterministic, offline guard for the scripted demo (research R5). The real
 * buyer's agent will replace this with a proper classifier.
 */
const PATTERNS: readonly (readonly [AdviceCategory, RegExp])[] = [
  ["legal", /சட்ட ஆலோசனை|कानूनी सलाह/iu],
  ["medical", /மருத்துவ நோயறிதல்|மருத்துவ ஆலோசனை|चिकित्सा निदान|चिकित्सकीय सलाह/iu],
  ["financial", /நிதி ஆலோசனை|முதலீட்டு ஆலோசனை|वित्तीय सलाह|निवेश सलाह/iu],
  ["legal", /\blegal advice\b|\blawyers?\b|\blawsuits?\b|\bsue\b|\bsuing\b/i],
  ["medical", /\bdiagnos\w*|\bmedications?\b|\bsymptoms?\b|\btreatments?\b/i],
  ["financial", /\binvestment advice\b|\bwhich stocks\b|\btax advice\b|\bretirement savings\b/i],
  // Representative supported-language examples only; not a general multilingual classifier.
  ["legal", /conseil juridique|asesoramiento legal|rechtsberatung|consulenza legale|法律建议|法律諮詢|법률 조언|法律相談|juridisk rådgivning|юридична консультація|porada prawna|consultanță juridică|oikeudellinen neuvonta|nasihat hukum|payong legal/iu],
  ["medical", /diagnostic médical|diagnóstico médico|medizinische diagnose|diagnosi medica|医疗诊断|醫療診斷|의료 진단|医療診断|medicinsk diagnose|медичний діагноз|diagnoza medyczna|diagnostic medical|medisinsk diagnose|lääketieteellinen diagnoosi|diagnosis medis|medikal na diagnosis/iu],
  ["financial", /conseil fiscal|asesoramiento financiero|anlageberatung|consulenza finanziaria|投资建议|投資建議|투자 조언|投資助言|investeringsrådgivning|фінансова консультація|porada finansowa|consultanță financiară|finansiell rådgivning|sijoitusneuvonta|nasihat investasi|payong pinansyal/iu],
];

export function detectRestrictedAdvice(text: string): AdviceCategory | null {
  for (const [category, pattern] of PATTERNS) {
    if (pattern.test(text.normalize("NFC"))) return category;
  }
  return null;
}

export function restrictedAdviceMessage(category: AdviceCategory, locale: Locale = "en"): string {
  const t = createTranslator(locale);
  switch (category) {
    case "legal": return t("Agely doesn't offer legal advice, so this brief can't be sent as written. Remove the legal question, or speak to a qualified professional.");
    case "medical": return t("Agely doesn't offer medical advice, so this brief can't be sent as written. Remove the medical question, or speak to a qualified professional.");
    case "financial": return t("Agely doesn't offer financial advice, so this brief can't be sent as written. Remove the financial question, or speak to a qualified professional.");
  }
}
