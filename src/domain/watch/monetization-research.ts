/**
 * Monetization research — Sprint H8.
 *
 * Research only. Nothing in this module charges, authorizes, reserves, or
 * gates anything: there is no payment code path in the product, and the core
 * watch party is protected by an explicit invariant below rather than by
 * intention.
 *
 * The premium concepts are hypotheses, not a roadmap. Hearo's public listings
 * associate a paid tier with video chat, which makes video and social
 * enhancements a reasonable thing to ask about — it is not evidence that
 * anyone will pay for this product.
 */

/** Hard switch. H8 ships with no billing of any kind. */
export const BILLING_ENABLED = false as const;

export function isBillingActive(): boolean {
  return BILLING_ENABLED;
}

/**
 * The capabilities that must stay free for every beta participant. If a
 * concept ever claims one of these, `validateConcepts` fails loudly rather
 * than letting a paywall reach the MVP by accident.
 */
export const CORE_MVP_CAPABILITIES = [
  "create_room",
  "invite_guest",
  "select_content",
  "countdown",
  "manual_coordination",
  "text_chat",
  "basic_voice",
] as const;
export type CoreCapability = (typeof CORE_MVP_CAPABILITIES)[number];

export function isCoreCapability(value: string): value is CoreCapability {
  return (CORE_MVP_CAPABILITIES as readonly string[]).includes(value);
}

export const PREMIUM_CONCEPTS = [
  "video_chat",
  "larger_rooms",
  "longer_rooms",
  "advanced_moderation",
  "recurring_rooms",
  "room_themes",
  "session_history",
  "community_rooms",
] as const;
export type PremiumConcept = (typeof PREMIUM_CONCEPTS)[number];

export function isPremiumConcept(value: string): value is PremiumConcept {
  return (PREMIUM_CONCEPTS as readonly string[]).includes(value);
}

/**
 * Each concept declares which core capability it extends. The concept may
 * never *be* that capability — only add beyond it.
 */
export const CONCEPT_EXTENDS: Readonly<Record<PremiumConcept, CoreCapability>> = Object.freeze({
  video_chat: "basic_voice",
  larger_rooms: "invite_guest",
  longer_rooms: "create_room",
  advanced_moderation: "text_chat",
  recurring_rooms: "create_room",
  room_themes: "create_room",
  session_history: "create_room",
  community_rooms: "invite_guest",
});

/**
 * Fails when any concept claims a core capability outright. Called by the
 * research panel and asserted in the test suite, so a future concept cannot
 * quietly paywall the MVP.
 */
export function validateConcepts(
  concepts: readonly string[] = PREMIUM_CONCEPTS,
): readonly string[] {
  return concepts.filter((concept) => isCoreCapability(concept));
}

/* ------------------------------------------------------------- the two asks */

export const VALUE_ANSWERS = ["not_valuable", "maybe", "very_valuable"] as const;
export type ValueAnswer = (typeof VALUE_ANSWERS)[number];

export const PAY_ANSWERS = ["no", "maybe", "yes"] as const;
export type PayAnswer = (typeof PAY_ANSWERS)[number];

export interface ResearchResponse {
  readonly concept: PremiumConcept;
  /** Both questions are optional; skipping is a legitimate answer. */
  readonly value: ValueAnswer | null;
  readonly pay: PayAnswer | null;
  readonly at: string;
}

export function buildResearchResponse(input: {
  readonly concept: string;
  readonly value?: string | null;
  readonly pay?: string | null;
  readonly at?: string;
}): ResearchResponse | null {
  if (!isPremiumConcept(input.concept)) return null;
  const value = (VALUE_ANSWERS as readonly string[]).includes(input.value ?? "")
    ? (input.value as ValueAnswer)
    : null;
  const pay = (PAY_ANSWERS as readonly string[]).includes(input.pay ?? "")
    ? (input.pay as PayAnswer)
    : null;
  return { concept: input.concept, value, pay, at: input.at ?? new Date().toISOString() };
}

export interface ConceptSummary {
  readonly concept: PremiumConcept;
  readonly responses: number;
  readonly valueCounts: Readonly<Record<ValueAnswer, number>>;
  readonly payCounts: Readonly<Record<PayAnswer, number>>;
  /** Share answering "very valuable"; null until someone answers. */
  readonly valuableRate: number | null;
  /** Share answering "yes" to paying; null until someone answers. */
  readonly payYesRate: number | null;
}

export function summarizeResearch(
  responses: readonly ResearchResponse[],
): readonly ConceptSummary[] {
  return PREMIUM_CONCEPTS.map((concept) => {
    const mine = responses.filter((response) => response.concept === concept);
    const valueCounts: Record<ValueAnswer, number> = {
      not_valuable: 0,
      maybe: 0,
      very_valuable: 0,
    };
    const payCounts: Record<PayAnswer, number> = { no: 0, maybe: 0, yes: 0 };
    for (const response of mine) {
      if (response.value) valueCounts[response.value] += 1;
      if (response.pay) payCounts[response.pay] += 1;
    }
    const valueTotal = valueCounts.not_valuable + valueCounts.maybe + valueCounts.very_valuable;
    const payTotal = payCounts.no + payCounts.maybe + payCounts.yes;
    return {
      concept,
      responses: mine.length,
      valueCounts,
      payCounts,
      valuableRate:
        valueTotal === 0 ? null : Number((valueCounts.very_valuable / valueTotal).toFixed(4)),
      payYesRate: payTotal === 0 ? null : Number((payCounts.yes / payTotal).toFixed(4)),
    };
  });
}
