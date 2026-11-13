import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { STAND_IN_LABELS } from "./copy";
import { CATALOGUE } from "./model/catalogue";
import { makeStandInAgent } from "./standins/agent";

it("registers product copy stored outside literal translation calls", async () => {
  const root = new URL("../../site/i18n/messages/", import.meta.url);
  const sources = new Set<string>();
  for (const file of ["app.json", "product.json", "website.json", "website-extra.json"]) {
    const entries: string[] = JSON.parse(readFileSync(new URL(file, root), "utf8"));
    for (const entry of entries) sources.add(entry);
  }
  const agent = makeStandInAgent();
  const questions = [...await agent.interviewQuestions(), ...await agent.briefQuestions()];
  const productCopy = [
    ...Object.values(STAND_IN_LABELS),
    ...CATALOGUE.flatMap(({ label, description }) => [label, description]),
    ...questions.flatMap(({ text, suggestedReplies }) => [text, ...suggestedReplies]),
  ];
  expect(productCopy.filter((message) => !sources.has(message))).toEqual([]);
});
