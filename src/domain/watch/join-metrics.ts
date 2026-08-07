/**
 * Join speed and personalization metrics — Sprint H9 (admin-only).
 *
 * Small deterministic summaries over facts the analytics store keeps for the
 * current tab. Each fact is already anonymous when it arrives: a join attempt
 * knows its path and its outcome, never the code that was typed; a
 * personalization fact knows which provider was pinned, never who pinned it.
 */
import { medianOf } from "./beta-activation";
import type { RoomKeyJoinState } from "@/domain/rooms/room-key";

export type JoinPath = "code" | "link";

export interface JoinAttemptFact {
  readonly path: JoinPath;
  readonly outcome: "success" | "blocked";
  /** The product state behind a refusal. Null on success. */
  readonly reason: RoomKeyJoinState | null;
  /** Milliseconds from the app becoming interactive to this attempt landing. */
  readonly elapsedMs: number | null;
}

export interface JoinSpeedMetrics {
  readonly codeAttempts: number;
  readonly codeSuccesses: number;
  readonly codeSuccessRate: number | null;
  readonly linkJoins: number;
  /** Share of successful joins that arrived by code rather than by link. */
  readonly codeShare: number | null;
  /** Median milliseconds from app open to a successful join by code. */
  readonly medianTimeToCodeJoinMs: number | null;
  readonly failureReasons: readonly { readonly reason: RoomKeyJoinState; readonly count: number }[];
}

export const EMPTY_JOIN_SPEED: JoinSpeedMetrics = Object.freeze({
  codeAttempts: 0,
  codeSuccesses: 0,
  codeSuccessRate: null,
  linkJoins: 0,
  codeShare: null,
  medianTimeToCodeJoinMs: null,
  failureReasons: Object.freeze([]) as JoinSpeedMetrics["failureReasons"],
});

export function summarizeJoinSpeed(facts: readonly JoinAttemptFact[]): JoinSpeedMetrics {
  const codeFacts = facts.filter((fact) => fact.path === "code");
  const codeSuccesses = codeFacts.filter((fact) => fact.outcome === "success");
  const linkJoins = facts.filter(
    (fact) => fact.path === "link" && fact.outcome === "success",
  ).length;

  const counts = new Map<RoomKeyJoinState, number>();
  for (const fact of codeFacts) {
    if (fact.outcome === "success" || fact.reason === null) continue;
    counts.set(fact.reason, (counts.get(fact.reason) ?? 0) + 1);
  }

  const totalJoins = codeSuccesses.length + linkJoins;
  const durations = codeSuccesses
    .map((fact) => fact.elapsedMs)
    .filter((value): value is number => typeof value === "number" && value >= 0);

  return {
    codeAttempts: codeFacts.length,
    codeSuccesses: codeSuccesses.length,
    codeSuccessRate: codeFacts.length === 0 ? null : codeSuccesses.length / codeFacts.length,
    linkJoins,
    codeShare: totalJoins === 0 ? null : codeSuccesses.length / totalJoins,
    medianTimeToCodeJoinMs: medianOf(durations),
    failureReasons: [...counts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/* ------------------------------------------------------ personalization */

export interface PersonalizationFact {
  readonly kind: "pinned" | "unpinned" | "hidden" | "unhidden" | "reordered" | "reset";
  readonly providerKey: string | null;
}

export interface SelectionFact {
  /** Whether the app chosen was one the person had pinned. */
  readonly fromFavorite: boolean;
  /** Milliseconds from the shelf becoming visible to the choice. */
  readonly elapsedMs: number | null;
}

export interface PersonalizationMetrics {
  readonly customizingSessions: number;
  readonly totalSessions: number;
  readonly customizationRate: number | null;
  readonly mostPinned: readonly { readonly key: string; readonly count: number }[];
  readonly mostHidden: readonly { readonly key: string; readonly count: number }[];
  readonly resets: number;
  readonly reorders: number;
  /** Share of app choices that landed on a pinned favourite. */
  readonly favoriteSelectionRate: number | null;
  readonly medianSelectionMsFromFavorite: number | null;
  readonly medianSelectionMsOther: number | null;
}

export const EMPTY_PERSONALIZATION: PersonalizationMetrics = Object.freeze({
  customizingSessions: 0,
  totalSessions: 0,
  customizationRate: null,
  mostPinned: Object.freeze([]) as PersonalizationMetrics["mostPinned"],
  mostHidden: Object.freeze([]) as PersonalizationMetrics["mostHidden"],
  resets: 0,
  reorders: 0,
  favoriteSelectionRate: null,
  medianSelectionMsFromFavorite: null,
  medianSelectionMsOther: null,
});

function tally(
  facts: readonly PersonalizationFact[],
  kind: PersonalizationFact["kind"],
): readonly { readonly key: string; readonly count: number }[] {
  const counts = new Map<string, number>();
  for (const fact of facts) {
    if (fact.kind !== kind || !fact.providerKey) continue;
    counts.set(fact.providerKey, (counts.get(fact.providerKey) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function summarizePersonalization(
  facts: readonly PersonalizationFact[],
  selections: readonly SelectionFact[],
  input: { readonly customized: boolean } = { customized: false },
): PersonalizationMetrics {
  const favorites = selections.filter((entry) => entry.fromFavorite);
  const others = selections.filter((entry) => !entry.fromFavorite);
  const duration = (list: readonly SelectionFact[]) =>
    medianOf(
      list.map((entry) => entry.elapsedMs).filter((value): value is number => value !== null),
    );

  return {
    // Session-only store: this tab is the whole population.
    customizingSessions: input.customized ? 1 : 0,
    totalSessions: 1,
    customizationRate: input.customized ? 1 : 0,
    mostPinned: tally(facts, "pinned"),
    mostHidden: tally(facts, "hidden"),
    resets: facts.filter((fact) => fact.kind === "reset").length,
    reorders: facts.filter((fact) => fact.kind === "reordered").length,
    favoriteSelectionRate: selections.length === 0 ? null : favorites.length / selections.length,
    medianSelectionMsFromFavorite: duration(favorites),
    medianSelectionMsOther: duration(others),
  };
}
