import { STAND_IN_LABELS } from "../copy";
import type { AuthPort } from "../ports";
import { type KeyValue, readJson, writeJson } from "./kv";

export const AUTH_KEY = "agely.product.auth.v1";
export const CODE_MINUTES = 10;

interface IssuedCode {
  readonly code: string;
  readonly expiresAt: number;
  readonly used: boolean;
}

interface AuthDocument {
  readonly codes: Record<string, IssuedCode>;
  /** email → account id */
  readonly accounts: Record<string, string>;
  readonly current: string | null;
}

export interface StandInAuthOptions {
  readonly kv: KeyValue;
  readonly now: () => Date;
  /** Six digits. Injected so tests are repeatable. */
  readonly newCode: () => string;
  readonly newId: () => string;
}

const normalise = (email: string): string => email.trim().toLowerCase();
const looksLikeEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const randomCode = (): string => String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");

/**
 * Stand-in sign-in (research R4): the same steps as a real one-time code, but the code is handed
 * back to be shown on screen instead of being emailed. It proves nothing about who someone is.
 */
export function makeStandInAuth(options: StandInAuthOptions): AuthPort {
  const { kv, now, newCode, newId } = options;
  const read = (): AuthDocument => ({ codes: {}, accounts: {}, current: null, ...readJson<Partial<AuthDocument>>(kv, AUTH_KEY, {}) });
  const write = (doc: AuthDocument): void => writeJson(kv, AUTH_KEY, doc);

  return {
    status: { service: "sign-in", connected: false, label: STAND_IN_LABELS["sign-in"] },

    async requestCode(rawEmail) {
      const email = normalise(rawEmail);
      if (!looksLikeEmail(email)) return { ok: false, error: "invalid-email" };
      const doc = read();
      const code = newCode();
      write({ ...doc, codes: { ...doc.codes, [email]: { code, expiresAt: now().getTime() + CODE_MINUTES * 60_000, used: false } } });
      return { ok: true, standInCode: code };
    },

    async confirmCode(rawEmail, code) {
      const email = normalise(rawEmail);
      const doc = read();
      const issued = doc.codes[email];
      if (issued === undefined || issued.code !== code.trim()) return { ok: false, error: "wrong-code" };
      if (issued.used) return { ok: false, error: "used" };
      if (now().getTime() > issued.expiresAt) return { ok: false, error: "expired" };
      const accountId = doc.accounts[email] ?? newId();
      write({
        codes: { ...doc.codes, [email]: { ...issued, used: true } },
        accounts: { ...doc.accounts, [email]: accountId },
        current: accountId,
      });
      return { ok: true, accountId, email };
    },

    async current() {
      return read().current;
    },

    async signOut() {
      write({ ...read(), current: null });
    },

    async forget(accountId) {
      const doc = read();
      const emails = Object.keys(doc.accounts).filter((email) => doc.accounts[email] === accountId);
      const without = <T,>(record: Record<string, T>): Record<string, T> => Object.fromEntries(Object.entries(record).filter(([email]) => !emails.includes(email)));
      write({ codes: without(doc.codes), accounts: without(doc.accounts), current: doc.current === accountId ? null : doc.current });
    },
  };
}
