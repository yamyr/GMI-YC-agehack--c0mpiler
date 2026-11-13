import { describe, expect, it } from "vitest";
import { DEV_BRIEF } from "../script/dev";
import { detectRestrictedAdvice, restrictedAdviceMessage } from "./advice";

describe("detectRestrictedAdvice", () => {
  // These examples guard the multilingual demo boundary; this is not a general classifier.
  it.each([
    ["conseil juridique", "diagnostic médical", "conseil fiscal"],
    ["asesoramiento legal", "diagnóstico médico", "asesoramiento financiero"],
    ["Rechtsberatung", "medizinische Diagnose", "Anlageberatung"],
    ["consulenza legale", "diagnosi medica", "consulenza finanziaria"],
    ["法律建议", "医疗诊断", "投资建议"],
    ["법률 조언", "의료 진단", "투자 조언"],
    ["法律相談", "医療診断", "投資助言"],
    ["juridisk rådgivning", "medicinsk diagnose", "investeringsrådgivning"],
    ["юридична консультація", "медичний діагноз", "фінансова консультація"],
    ["porada prawna", "diagnoza medyczna", "porada finansowa"],
    ["consultanță juridică", "diagnostic medical", "consultanță financiară"],
    ["juridisk rådgivning", "medisinsk diagnose", "finansiell rådgivning"],
    ["oikeudellinen neuvonta", "lääketieteellinen diagnoosi", "sijoitusneuvonta"],
    ["nasihat hukum", "diagnosis medis", "nasihat investasi"],
    ["payong legal", "medikal na diagnosis", "payong pinansyal"],
    ["சட்ட ஆலோசனை", "மருத்துவ நோயறிதல்", "நிதி ஆலோசனை"],
    ["कानूनी सलाह", "चिकित्सा निदान", "वित्तीय सलाह"],
  ])("declines representative legal, medical and financial requests: %s", (legal, medical, financial) => {
    expect(detectRestrictedAdvice(legal)).toBe("legal");
    expect(detectRestrictedAdvice(medical)).toBe("medical");
    expect(detectRestrictedAdvice(financial)).toBe("financial");
  });

  it.each([
    ["I need legal advice about my contract", "legal"],
    ["Can a lawyer look at this?", "legal"],
    ["We may face a LAWSUIT", "legal"],
    ["Should I sue my supplier?", "legal"],
    ["Help me diagnose my back pain", "medical"],
    ["Which medication should I take?", "medical"],
    ["My symptoms are getting worse", "medical"],
    ["What treatment is best?", "medical"],
    ["I want investment advice", "financial"],
    ["Which stocks should I buy?", "financial"],
    ["I need tax advice", "financial"],
    ["How should I invest my retirement savings?", "financial"],
  ] as const)("flags %j as %s", (text, category) => {
    expect(detectRestrictedAdvice(text)).toBe(category);
  });

  it("does not flag ordinary business problems", () => {
    expect(detectRestrictedAdvice(DEV_BRIEF.problem)).toBeNull();
    expect(detectRestrictedAdvice("Negotiate tooling ownership and payment terms")).toBeNull();
  });

  it("explains that Agely does not offer that kind of advice", () => {
    expect(restrictedAdviceMessage("legal")).toMatch(/doesn't offer legal advice/);
  });
});
