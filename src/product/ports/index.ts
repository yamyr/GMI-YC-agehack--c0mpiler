/**
 * The five outside services the product depends on, as interfaces. Every adapter, stand-in or
 * real, must pass the matching suite in ./contract. See
 * specs/004-marketplace-foundation/contracts/ports.md.
 */
import type { Locale } from "../../../site/i18n/core.js";
import type { PriceRange } from "../../demo/domain/types";
import type { EntityMap, Instant, Kind, MeetingLink } from "../model/types";

export type ServiceName = "sign-in" | "storage" | "agent" | "payments" | "meetings";

export interface ServiceStatus {
  readonly service: ServiceName;
  /** False for every stand-in. */
  readonly connected: boolean;
  /** The sentence a screen shows when it depends on this service (FR-022). */
  readonly label: string;
}

// ---- Sign-in ----

export type RequestCodeResult = { readonly ok: true; readonly standInCode?: string } | { readonly ok: false; readonly error: "invalid-email" };
export type ConfirmCodeResult = { readonly ok: true; readonly accountId: string; readonly email: string } | { readonly ok: false; readonly error: "wrong-code" | "expired" | "used" };

export interface AuthPort {
  requestCode(email: string): Promise<RequestCodeResult>;
  confirmCode(email: string, code: string): Promise<ConfirmCodeResult>;
  /** The signed-in account id, or null. */
  current(): Promise<string | null>;
  signOut(): Promise<void>;
  /** Removes the link between an email and this account id, and signs it out if it is current (R17). */
  forget(accountId: string): Promise<void>;
  readonly status: ServiceStatus;
}

// ---- Storage ----

export interface StorePort {
  get<K extends Kind>(kind: K, id: string): Promise<EntityMap[K] | null>;
  list<K extends Kind>(kind: K, where?: Partial<EntityMap[K]>): Promise<EntityMap[K][]>;
  put<K extends Kind>(kind: K, entity: EntityMap[K]): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
  /** Either every write made by `work` happens, or none does. */
  transaction<T>(work: (tx: StorePort) => Promise<T>): Promise<T>;
  readonly status: ServiceStatus;
}

// ---- Drafting agent ----

export interface AgentQuestion {
  readonly id: string;
  readonly text: string;
  /** What the person can pick instead of typing. */
  readonly suggestedReplies: readonly string[];
}

export interface InterviewAnswer {
  readonly questionId: string;
  readonly text: string;
  /** A selected fixed reply carries the source text so it drafts the same values in any language. */
  readonly suggested?: boolean;
  /** Selected language when this answer was entered, even if the person switches before finishing. */
  readonly locale?: Locale;
}

export interface DraftSkill {
  readonly tag: string;
  readonly label: string;
  readonly description: string;
  /** 1-based position of the answer this skill was heard in. */
  readonly sourceTurn: number;
}

export interface ProfileDraft {
  readonly headline: string;
  readonly location: string;
  readonly yearsExperience: number;
  /** 1 to 5, or empty when `unmatched`. */
  readonly skills: readonly DraftSkill[];
  /** True when nothing the person said matched the catalogue; the draft then invents nothing. */
  readonly unmatched: boolean;
}

export interface PriceSuggestion {
  readonly range: PriceRange;
  /** At least two. */
  readonly reasons: readonly string[];
}

export interface BriefDraft {
  readonly problem: string;
  /** A catalogue tag, or null when `unmatched`. */
  readonly skillTag: string | null;
  readonly units: number;
  /** Null when a supplied budget cannot be interpreted as two whole dollar amounts. */
  readonly budget: PriceRange | null;
  readonly unmatched: boolean;
}

export interface AgentPort {
  interviewQuestions(): Promise<AgentQuestion[]>;
  draftProfile(answers: readonly InterviewAnswer[], locale?: Locale): Promise<ProfileDraft>;
  suggestPrice(profile: ProfileDraft, locale?: Locale): Promise<PriceSuggestion>;
  briefQuestions(): Promise<AgentQuestion[]>;
  draftBrief(answers: readonly InterviewAnswer[], locale?: Locale): Promise<BriefDraft>;
  readonly status: ServiceStatus;
}

// ---- Payments ----

export interface PaymentRecord {
  readonly key: string;
  readonly amountCents: number;
  readonly state: "held" | "released" | "lifted";
  readonly standIn: boolean;
}

export type HoldResult = { readonly ok: true; readonly payment: PaymentRecord } | { readonly ok: false; readonly error: "declined" | "unavailable" | "amount-mismatch" | "invalid-amount" };
export type SettleResult = { readonly ok: true; readonly payment: PaymentRecord } | { readonly ok: false; readonly error: "not-held" };

export interface PaymentsPort {
  /** Idempotent by key: the same key and amount returns the existing hold (FR-016). */
  hold(key: string, amountCents: number): Promise<HoldResult>;
  release(key: string): Promise<SettleResult>;
  lift(key: string): Promise<SettleResult>;
  readonly status: ServiceStatus;
}

// ---- Meetings ----

export interface MeetingsPort {
  createLink(sessionId: string, startsAt: Instant, endsAt: Instant): Promise<MeetingLink>;
  readonly status: ServiceStatus;
}

/** The status of every service, in the order the product lists them. */
export function serviceStatuses(ports: Ports): readonly ServiceStatus[] {
  return [ports.auth.status, ports.store.status, ports.agent.status, ports.payments.status, ports.meetings.status];
}

export interface Ports {
  readonly auth: AuthPort;
  readonly store: StorePort;
  readonly agent: AgentPort;
  readonly payments: PaymentsPort;
  readonly meetings: MeetingsPort;
}
