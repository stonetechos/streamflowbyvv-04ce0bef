/**
 * Manual sync guidance — Sprint 2.8, MVP Spec §6 and §7, ADR-003.
 *
 * The words StreamFlow says to a member after handing them off to a provider.
 * They exist because of an honesty rule: where automation does not exist, the
 * product must say so plainly rather than imply a capability it lacks. No
 * step here may describe StreamFlow doing something to a provider, because
 * StreamFlow does nothing to a provider — every step is an instruction to a
 * person about their own app and their own account.
 *
 * Only translation keys are produced. Prose lives in the localization bundles
 * (`en`, `hi-IN`) so guidance is translatable and reviewable, and no rule ever
 * branches on a rendered string.
 */
import type { ProviderLaunchClass } from "./provider-launch.types";

const PREFIX = "provider.guidance";

/**
 * Steps shared by every manual room, in the order they should be read:
 * open the provider, sign in as yourself, find the title, wait for the
 * countdown, then press play together.
 */
const BASE_STEPS: readonly string[] = Object.freeze([
  `${PREFIX}.step.open_provider`,
  `${PREFIX}.step.sign_in_own_account`,
  `${PREFIX}.step.find_title`,
  `${PREFIX}.step.return_and_wait`,
  `${PREFIX}.step.press_play_on_zero`,
]);

/**
 * Per-provider additions, keyed by the stable catalog key. Kept small on
 * purpose: a wall of instructions is a sign the product is asking too much.
 */
const PROVIDER_STEPS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  netflix: Object.freeze([`${PREFIX}.netflix.skip_intro_together`]),
  prime_video: Object.freeze([`${PREFIX}.prime_video.check_audio_track`]),
  disney_hotstar: Object.freeze([`${PREFIX}.disney_hotstar.check_language`]),
  local_file: Object.freeze([
    `${PREFIX}.local_file.open_your_copy`,
    `${PREFIX}.local_file.confirm_same_cut`,
  ]),
});

/** Headline that frames the steps for this launch class. */
export function guidanceHeadingKey(launchClass: ProviderLaunchClass): string {
  return `${PREFIX}.heading.${launchClass}`;
}

/**
 * The ordered guidance for one provider.
 *
 * `unsupported` returns a single explanatory line instead of steps: telling
 * someone how to press play in an app StreamFlow refuses to open would be
 * both useless and misleading.
 */
export function manualSyncGuidanceKeys(
  providerKey: string,
  launchClass: ProviderLaunchClass,
): readonly string[] {
  if (launchClass === "unsupported") {
    return Object.freeze([`${PREFIX}.unsupported.explain`]);
  }

  // Local media has no provider to open or sign into; its own steps are whole.
  if (providerKey === "local_file") {
    return Object.freeze([
      ...(PROVIDER_STEPS[providerKey] ?? []),
      `${PREFIX}.step.return_and_wait`,
      `${PREFIX}.step.press_play_on_zero`,
    ]);
  }

  return Object.freeze([...BASE_STEPS, ...(PROVIDER_STEPS[providerKey] ?? [])]);
}

/**
 * The one-line promise attached to the guidance. `supported` providers are
 * still manually played in v1, so the copy must not imply otherwise — the key
 * differs from `manual_sync` only in tone, never in what it claims.
 */
export function guidanceSummaryKey(launchClass: ProviderLaunchClass): string {
  return `${PREFIX}.summary.${launchClass}`;
}
