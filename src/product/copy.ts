/**
 * Every sentence the product shows about its own honesty, in one place so it can be translated
 * with the rest of the app. Screens add their own copy here as they are built.
 */
export const STAND_IN_LABELS = {
  "sign-in": "Stand-in sign-in: a real version would email this code to you. Nothing is sent.",
  storage: "Stand-in storage: what you enter is kept only in this browser, on this device.",
  agent: "Stand-in agent: these questions and drafts follow fixed rules, not a language model.",
  payments: "Stand-in payments: no money has moved and no card is charged.",
  meetings: "Stand-in meeting link: this is a placeholder, not a real meeting.",
} as const;

export const TRY_OUT_NOTICE =
  "This is a try-out version of Agely. Accounts are for trying it out, your data stays on this device, and nothing you enter is private or permanent.";

/** Plain sentences for each refusal a sign-in can give. */
export const SIGN_IN_ERRORS = {
  "invalid-email": "That doesn't look like an email address. Check it and try again.",
  "wrong-code": "That code isn't right. Check the six digits and try again.",
  expired: "That code has expired. Ask for a new one.",
  used: "That code has already been used. Ask for a new one.",
} as const;

export const SERVICE_NAMES = {
  "sign-in": "Sign-in",
  storage: "Storage",
  agent: "Agent",
  payments: "Payments",
  meetings: "Meetings",
} as const;
