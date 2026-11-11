import { expect, test } from "@playwright/test";
import { next } from "./helpers";
import { NOT_INSTALLED, READY, collectProblems, failure, installTauriStub, sequence } from "./tauriStub";

const OPENING = {
  message: "Hello Margaret. What did you do before you retired?",
  options: ["I ran procurement for 34 years.", "I negotiated supplier contracts.", "I managed factories abroad."],
  done: false,
};
const FOLLOW_UP = {
  message: "That's a long career. What problem are you proudest of solving?",
  options: ["Getting our moulds back.", "Cutting unit cost by 11%.", "Fixing a late shipment."],
  done: false,
};

test.describe("US1 — live onboarding interview", () => {
  test("runs live with three suggested replies, a typed reply, and finish", async ({ page }) => {
    const problems = collectProblems(page);
    await installTauriStub(page, { agent_status: READY, agent_turn: sequence(OPENING, FOLLOW_UP, FOLLOW_UP) });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
    await expect(page.getByText("generated live with test-model")).toBeVisible();
    await expect(page.getByText(/sent to OpenAI through the ChatGPT account/)).toBeVisible();

    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByText("Live agent (Codex)")).toBeVisible();
    await expect(page.getByText(OPENING.message)).toBeVisible();
    const replies = page.getByRole("group", { name: "Margaret can say" }).getByRole("button");
    await expect(replies).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Finish conversation" })).toHaveCount(0);

    await replies.first().click();
    await expect(page.locator(".turn--person").first()).toHaveText(/I ran procurement for 34 years\./);
    await expect(page.getByText(FOLLOW_UP.message)).toBeVisible();

    await page.getByLabel("Or type Margaret's reply").fill("We got our moulds back outright.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator(".turn--person").nth(1)).toHaveText(/We got our moulds back outright\./);
    await expect(page.locator(".turn--agent")).toHaveCount(3);

    await page.getByRole("button", { name: "Finish conversation" }).click();
    await expect(page.getByText("Conversation finished.")).toBeVisible();
    await next(page);
    await expect(page.getByText("This is the scripted draft.", { exact: false })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("the agent can close the conversation itself", async ({ page }) => {
    await installTauriStub(page, { agent_status: READY, agent_turn: { ...OPENING, done: true } });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByText("Conversation finished.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  });
});

test.describe("US2 — live brief chat and debrief", () => {
  test("Dev's chat and Margaret's debrief run live in the right voice", async ({ page }) => {
    await installTauriStub(page, { agent_status: READY });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();

    await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: "Dev's brief" }).click();
    await expect(page.getByText("Now: Dev, the buyer")).toBeVisible();
    await expect(page.getByRole("group", { name: "Dev can say" }).getByRole("button")).toHaveCount(3);
    await page.getByRole("group", { name: "Dev can say" }).getByRole("button").first().click();
    await expect(page.locator(".turn--agent")).toHaveCount(2);
    await page.getByRole("button", { name: "Finish conversation" }).click();
    await next(page);
    await expect(page.getByText("This is the scripted draft.", { exact: false })).toBeVisible();

    await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: "Debrief" }).click();
    await expect(page.getByRole("group", { name: "Margaret can say" }).getByRole("button")).toHaveCount(3);
  });
});

test.describe("US3 — setup and fallback", () => {
  test("without Codex the walkthrough is scripted and shows the install step", async ({ page }) => {
    await installTauriStub(page, { agent_status: NOT_INSTALLED });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: off — Codex is not installed" })).toBeVisible();
    await expect(page.getByText("npm install -g @openai/codex", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByRole("button", { name: "Start the conversation" })).toBeVisible();
    await expect(page.getByText("Live agent (Codex)")).toHaveCount(0);
  });

  test("shows the sign-in step, and Check again turns live on without a restart", async ({ page }) => {
    await installTauriStub(page, {
      agent_status: sequence(
        { state: "not_signed_in", model: null, detail: "Codex is installed but not signed in.", fix: "In a terminal run: codex login" },
        READY,
      ),
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: off — Codex is not signed in" })).toBeVisible();
    await expect(page.getByText("codex login", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Check again" }).click();
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
  });

  test("a failed turn offers Try again and the scripted conversation", async ({ page }) => {
    await installTauriStub(page, {
      agent_status: READY,
      agent_turn: sequence(failure("timeout", "The agent took longer than 60 seconds."), OPENING),
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByRole("alert")).toContainText("The agent took longer than 60 seconds.");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText(OPENING.message)).toBeVisible();

    await page.getByRole("button", { name: "Restart" }).click();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByText(OPENING.message)).toBeVisible();
  });

  test("Use the scripted conversation continues the demo", async ({ page }) => {
    await installTauriStub(page, { agent_status: READY, agent_turn: failure("failed", "Codex could not answer.") });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await page.getByRole("button", { name: "Use the scripted conversation" }).click();
    await expect(page.getByRole("button", { name: "Start the conversation" })).toBeVisible();
  });

  test("the presenter can turn live mode off", async ({ page }) => {
    await installTauriStub(page, { agent_status: READY });
    await page.goto("/");
    await page.getByRole("button", { name: "Turn live agent off" }).click();
    await expect(page.getByRole("heading", { name: "Live agent: ready, turned off" })).toBeVisible();
    await expect(page.getByText("All data is scripted. No agents, payments or calendars are connected.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Start the walkthrough" }).click();
    await expect(page.getByRole("button", { name: "Start the conversation" })).toBeVisible();
  });

  test("jumping chapters fills earlier conversations from the script", async ({ page }) => {
    await installTauriStub(page, { agent_status: READY });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
    await jumpToWithinPage(page, "Match");
    await expect(page.getByRole("heading", { name: "Agely matched Dev with Margaret Okafor" })).toBeVisible();
  });
});

async function jumpToWithinPage(page: import("@playwright/test").Page, chapter: string): Promise<void> {
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: chapter, exact: true }).click();
}

test("the live interview fits the window with the 16px type floor", async ({ page }) => {
  await installTauriStub(page, { agent_status: READY, agent_turn: OPENING });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Live agent: ready" })).toBeVisible();
  await page.getByRole("button", { name: "Start the walkthrough" }).click();
  await expect(page.getByText(OPENING.message)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const tooSmall = await page.evaluate(() =>
    Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((el) => el.offsetParent !== null && Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== ""))
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => el.className),
  );
  expect(tooSmall).toEqual([]);
});
