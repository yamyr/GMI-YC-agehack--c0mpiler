import type { Translator } from "../../site/i18n/core.js";
import type { ServiceName } from "./ports";

/** English source messages for the stand-in adapters. */
export const STAND_IN_LABELS = {
  "sign-in": "Stand-in sign-in: a real version would email this code to you. Nothing is sent.",
  storage: "Stand-in storage: what you enter is kept only in this browser, on this device.",
  agent: "Stand-in agent: these questions and drafts follow fixed rules, not a language model.",
  payments: "Stand-in payments: no money has moved and no card is charged.",
  meetings: "Stand-in meeting link: this is a placeholder, not a real meeting.",
} as const;

/** What the stand-ins cannot do. Stated on every page and not worked around (research R18). */
export function tryOutLimits(t: Translator): readonly string[] {
  return [
    t("Use one browser tab. Two tabs writing at once can overwrite each other."),
    t("Nothing is sent to the other person. They see a proposal or an answer the next time they open Agely."),
    t("Anyone can sign in as any address on this device. The stand-in sign-in proves nothing about who someone is."),
  ];
}

/** Plain sentences for each refusal a sign-in can give. */
export function signInErrors(t: Translator) {
  return {
    "invalid-email": t("That doesn't look like an email address. Check it and try again."),
    "wrong-code": t("That code isn't right. Check the six digits and try again."),
    expired: t("That code has expired. Ask for a new one."),
    used: t("That code has already been used. Ask for a new one."),
  };
}

export function serviceNames(t: Translator): Record<ServiceName, string> {
  return {
    "sign-in": t("Sign-in"),
    storage: t("Storage"),
    agent: t("Agent"),
    payments: t("Payments"),
    meetings: t("Meetings"),
  };
}
