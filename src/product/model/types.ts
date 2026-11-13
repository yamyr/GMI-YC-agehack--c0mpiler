/** Entities of the signed-in product. See specs/004-marketplace-foundation/data-model.md. */
import type { MatchResult, PriceRange } from "../../demo/domain/types";

export type Role = "expert" | "buyer";

/** An ISO 8601 instant in UTC, e.g. "2026-11-14T15:00:00.000Z". */
export type Instant = string;

export interface Account {
  readonly id: string;
  /** Lower-cased and trimmed; unique. */
  readonly email: string;
  readonly name: string;
  /** At least one. Adding a role is an explicit action (FR-002). */
  readonly roles: readonly Role[];
  readonly activeRole: Role;
  readonly createdAt: Instant;
}

export type SkillSource = { readonly kind: "interview"; readonly turn: number } | { readonly kind: "edited" };

export interface Skill {
  readonly id: string;
  /** From the catalogue; the matching key. */
  readonly tag: string;
  /** Editable by the expert; not empty. */
  readonly label: string;
  readonly description: string;
  readonly source: SkillSource;
}

export interface ExpertProfile {
  /** The owning account's id: one profile per account. */
  readonly id: string;
  readonly headline: string;
  readonly location: string;
  readonly yearsExperience: number;
  /** 1 to 5 to publish. */
  readonly skills: readonly Skill[];
  readonly exampleProblems: readonly string[];
  /** Whole dollars per 15 minutes. */
  readonly priceRange: PriceRange | null;
  /** True only through the confirm-price use case. */
  readonly priceConfirmed: boolean;
  /** Changes only through publish and unpublish (FR-006). */
  readonly state: "draft" | "published";
  /** Always shown on the profile (FR-005). */
  readonly selfDeclared: true;
}

export interface Brief {
  readonly id: string;
  readonly buyerId: string;
  readonly problem: string;
  readonly skillTag: string;
  /** 15-minute units, 1 to 8. */
  readonly units: number;
  /** Whole dollars per 15 minutes. */
  readonly budget: PriceRange;
  readonly state: "draft" | "confirmed";
}

export interface StoredMatch {
  /** The brief's id: one stored match per brief. */
  readonly id: string;
  readonly computedAt: Instant;
  readonly result: MatchResult;
}

export interface Proposal {
  readonly id: string;
  readonly briefId: string;
  readonly buyerId: string;
  readonly expertId: string;
  readonly units: number;
  /** Whole dollars per 15 minutes. */
  readonly pricePerUnit: number;
  readonly startsAt: Instant;
  readonly state: "waiting" | "accepted" | "declined" | "withdrawn" | "unavailable";
}

export interface MeetingLink {
  readonly url: string;
  readonly provider: string;
  readonly standIn: boolean;
}

export interface Session {
  readonly id: string;
  readonly proposalId: string;
  readonly buyerId: string;
  readonly expertId: string;
  readonly startsAt: Instant;
  readonly endsAt: Instant;
  readonly totalCents: number;
  readonly meeting: MeetingLink;
  /** "Awaiting confirmation" is a confirmed session whose end has passed; it is not stored. */
  readonly state: "confirmed" | "held" | "cancelled";
}

export interface Payment {
  /** The payment key (the proposal's id): one payment per key (FR-016). */
  readonly id: string;
  readonly sessionId: string;
  readonly amountCents: number;
  readonly feeCents: number;
  readonly owedCents: number;
  readonly state: "held" | "released" | "lifted";
  /** True for every payment in this version. */
  readonly standIn: boolean;
}

/** Everything the store keeps, by kind. */
export interface EntityMap {
  readonly account: Account;
  readonly profile: ExpertProfile;
  readonly brief: Brief;
  readonly match: StoredMatch;
  readonly proposal: Proposal;
  readonly session: Session;
  readonly payment: Payment;
}

export type Kind = keyof EntityMap;
export const KINDS: readonly Kind[] = ["account", "profile", "brief", "match", "proposal", "session", "payment"];

/** A value or a coded refusal. Screens turn the code into a sentence from copy.ts. */
export type Result<T, E extends string> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): { readonly ok: true; readonly value: T } => ({ ok: true, value });
export const refuse = <E extends string>(error: E): { readonly ok: false; readonly error: E } => ({ ok: false, error });
