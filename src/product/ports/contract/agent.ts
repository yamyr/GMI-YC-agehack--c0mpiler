import { describe, expect, it } from "vitest";
import { validateRange } from "../../../demo/domain/price";
import { skillByTag } from "../../model/catalogue";
import type { AgentPort, InterviewAnswer } from "../index";

const answer = (questionId: string, text: string): InterviewAnswer => ({ questionId, text });

/** Behaviour every AgentPort adapter must show. */
export function agentContract(name: string, make: () => AgentPort): void {
  describe(`AgentPort contract: ${name}`, () => {
    it("asks interview and brief questions, each with replies a person can pick", async () => {
      const agent = make();
      for (const questions of [await agent.interviewQuestions(), await agent.briefQuestions()]) {
        expect(questions.length).toBeGreaterThanOrEqual(2);
        expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
        for (const q of questions) {
          expect(q.text.length).toBeGreaterThan(5);
          expect(q.suggestedReplies.length).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it("drafts a profile whose skills come from the catalogue and point at a real answer", async () => {
      const agent = make();
      const questions = await agent.interviewQuestions();
      const answers = [
        answer(questions[0]?.id ?? "q1", "I was a hospital pharmacist for 38 years in Leeds."),
        answer(questions[1]?.id ?? "q2", "I ran staff scheduling and negotiated with suppliers of medicines."),
      ];
      const draft = await agent.draftProfile(answers);
      expect(draft.unmatched).toBe(false);
      expect(draft.skills.length).toBeGreaterThanOrEqual(1);
      expect(draft.skills.length).toBeLessThanOrEqual(5);
      expect(new Set(draft.skills.map((s) => s.tag)).size).toBe(draft.skills.length);
      for (const skill of draft.skills) {
        expect(skillByTag(skill.tag), skill.tag).toBeDefined();
        expect(skill.label.trim().length).toBeGreaterThan(0);
        expect(skill.sourceTurn).toBeGreaterThanOrEqual(1);
        expect(skill.sourceTurn).toBeLessThanOrEqual(answers.length);
      }
      expect(draft.yearsExperience).toBe(38);
      expect(draft.headline.length).toBeGreaterThan(0);
    });

    it("says so, and invents no skill, when nothing matches the catalogue", async () => {
      const draft = await make().draftProfile([answer("q1", "I like gardening."), answer("q2", "Mostly roses.")]);
      expect(draft.unmatched).toBe(true);
      expect(draft.skills).toEqual([]);
    });

    it("never drafts more than five skills", async () => {
      const everything = "supplier negotiation, audits, logistics, bookkeeping, hiring, sales, hospital, scheduling, vendors, construction bids, grants, factory tooling";
      expect((await make().draftProfile([answer("q1", everything)])).skills.length).toBeLessThanOrEqual(5);
    });

    it("suggests a valid price range with at least two reasons", async () => {
      const agent = make();
      const draft = await agent.draftProfile([answer("q1", "34 years in procurement, negotiating with suppliers.")]);
      const suggestion = await agent.suggestPrice(draft);
      expect(validateRange(suggestion.range).ok).toBe(true);
      expect(suggestion.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it("drafts a brief with a catalogue skill, a length in 15-minute units and a valid budget", async () => {
      const draft = await make().draftBrief([
        answer("q1", "I'm about to sign with a contract manufacturer and have never done it."),
        answer("q2", "About 45 minutes."),
        answer("q3", "Between $50 and $100 per 15 minutes."),
      ]);
      expect(draft.unmatched).toBe(false);
      expect(draft.skillTag).toBe("contract-manufacturing");
      expect(draft.units).toBe(3);
      expect(draft.budget).toEqual({ min: 50, max: 100 });
      expect(draft.problem.length).toBeGreaterThan(0);
    });

    it("keeps a drafted brief inside 1 to 8 units and a valid budget whatever is said", async () => {
      for (const text of ["nine hours", "0 minutes", "600 minutes", "no idea", "$900 to $20"]) {
        const draft = await make().draftBrief([answer("q1", "help with hiring"), answer("q2", text), answer("q3", text)]);
        expect(Number.isInteger(draft.units)).toBe(true);
        expect(draft.units).toBeGreaterThanOrEqual(1);
        expect(draft.units).toBeLessThanOrEqual(8);
        expect(validateRange(draft.budget).ok).toBe(true);
      }
    });

    it("says so when a brief names no skill in the catalogue", async () => {
      const draft = await make().draftBrief([answer("q1", "I want to learn to juggle.")]);
      expect(draft.unmatched).toBe(true);
      expect(draft.skillTag).toBeNull();
    });

    it("says whether it is a stand-in", () => {
      expect(make().status.service).toBe("agent");
    });
  });
}
