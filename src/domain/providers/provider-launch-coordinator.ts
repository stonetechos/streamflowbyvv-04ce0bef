/**
 * ProviderLaunchCoordinator — Sprint 2.8, Foundation §11 and §12, ADR-003.
 *
 * ENGINEERING RULE (Sprint 2.8): this module is the ONLY place in StreamFlow
 * permitted to decide how a streaming provider is launched. No component, no
 * screen, no hook, no feature module, and no provider adapter may derive
 * launch behaviour independently. Presentation renders a `ProviderLaunchPlan`;
 * it never assembles one, never picks a target, and never opens a URL itself.
 *
 * The coordinator sits above three existing pieces and adds no rule of its own
 * to any of them:
 *  - selectability and the compliance verdict come from
 *    `ProviderCatalogService` / `ComplianceService` (Foundation §11);
 *  - the sync mode comes from `ProviderService` (ADR-003);
 *  - the web address comes from `DeepLinkService` (Sprint 2.2), including its
 *    trusted-host check;
 *  - app schemes and store listings come from `DeepLinkRegistry` (Sprint 2.8).
 *
 * Scope discipline — what this sprint prepares and what it refuses:
 *  - it PREPARES launching: classification, destinations, and guidance;
 *  - it does NOT automate a provider, drive a player, read a position, or
 *    observe whether anything actually opened;
 *  - it touches NO provider API, credential, cookie, or token, and it never
 *    stores a provider session — provider authentication stays provider-owned
 *    on the member's own device, exactly as the session-continuity rule
 *    requires. Reusing an existing provider login is something the operating
 *    system does for the member; StreamFlow only supplies a public address.
 *
 * A launch is therefore a hand-off, and `LaunchOutcome.opened` means only that
 * the platform accepted the request.
 */
import { createServiceToken } from "@/domain/service-registry";
import type { Clock } from "@/domain/events/event.types";

import type { ContentReference } from "./content-reference";
import type { DeepLinkRegistry } from "./deep-link-registry";
import type { DeepLinkService } from "./deep-link-service";
import { guidanceSummaryKey, manualSyncGuidanceKeys } from "./manual-sync-guidance";
import type { ProviderLauncher } from "./provider-launcher";
import type { ProviderSelectionOption } from "./provider.types";
import type {
  LaunchOutcome,
  LaunchPlatform,
  LaunchRefusalReason,
  LaunchTarget,
  ProviderLaunchClass,
  ProviderLaunchPlan,
} from "./provider-launch.types";

export interface ProviderLaunchRequest {
  /** The adjudicated catalog entry — never a bare provider row. */
  readonly option: ProviderSelectionOption;
  /** What the room is watching; null before the host has chosen a title. */
  readonly reference: ContentReference | null;
  readonly platform: LaunchPlatform;
}

export interface ProviderLaunchCoordinator {
  /** False when no launcher is bound; the UI explains rather than fails. */
  isAvailable(): boolean;
  /** The single source of launch truth. Pure: builds a plan, opens nothing. */
  plan(request: ProviderLaunchRequest): ProviderLaunchPlan;
  /**
   * Hands one target from a plan to the platform. Refuses any target that is
   * not part of that plan, so a caller cannot smuggle in its own destination.
   */
  launch(plan: ProviderLaunchPlan, target: LaunchTarget): LaunchOutcome;
}

export interface ProviderLaunchCoordinatorDependencies {
  readonly registry: DeepLinkRegistry;
  readonly deepLinks: DeepLinkService;
  readonly launcher: ProviderLauncher;
  readonly clock: Clock;
}

export const PROVIDER_LAUNCH_COORDINATOR = createServiceToken<ProviderLaunchCoordinator>(
  "ProviderLaunchCoordinator",
);

/**
 * Classification. `supported` is claimed only when the catalog says remote
 * control is possible AND there is somewhere to send the member; a capability
 * with no destination is not a launch route.
 */
function classify(
  option: ProviderSelectionOption,
  hasDestination: boolean,
): ProviderLaunchClass {
  if (!option.isSelectable || option.complianceAction === "block") return "unsupported";
  if (!hasDestination) return "unsupported";
  if (option.syncMode === "controlled" && option.selectionClass === "supported") {
    return "supported";
  }
  if (option.selectionClass === "manual_sync") return "manual_sync";
  return "deep_link";
}

function refusalFor(
  option: ProviderSelectionOption,
  reference: ContentReference | null,
  hasDestination: boolean,
): LaunchRefusalReason | null {
  if (option.complianceAction === "block") return "compliance_blocked";
  if (!option.isSelectable) return "provider_unavailable";
  if (reference?.kind === "local_file") return "local_media";
  if (hasDestination) return null;
  return reference === null ? "missing_content_reference" : "no_known_destination";
}

export function createProviderLaunchCoordinator(
  dependencies: ProviderLaunchCoordinatorDependencies,
): ProviderLaunchCoordinator {
  const { registry, deepLinks, launcher, clock } = dependencies;

  const buildTargets = (
    request: ProviderLaunchRequest,
  ): { primary: LaunchTarget | null; fallbacks: LaunchTarget[]; store: LaunchTarget | null } => {
    const { option, reference, platform } = request;
    const provider = option.provider;
    const fallbacks: LaunchTarget[] = [];

    // The provider's own app first on a handset: it is where the member is
    // already signed in, which is the whole point of session continuity.
    const appUri = registry.buildAppUri(provider, platform, reference?.value ?? null);
    const appTarget: LaunchTarget | null = appUri
      ? { kind: "app", url: appUri, labelKey: "provider.launch.target.app" }
      : null;

    // Then the public web page, built and host-checked by DeepLinkService.
    const web = deepLinks.build(provider, reference);
    const webTarget: LaunchTarget | null = web.ok
      ? { kind: "web", url: web.target.url, labelKey: "provider.launch.target.web" }
      : null;

    // Then the provider's front door, for rooms with no title chosen yet.
    const homepage = registry.homepageUrl(provider);
    const homepageTarget: LaunchTarget | null = homepage
      ? { kind: "homepage", url: homepage, labelKey: "provider.launch.target.homepage" }
      : null;

    const storeUrl = registry.storeUrl(provider, platform);
    const store: LaunchTarget | null = storeUrl
      ? { kind: "store", url: storeUrl, labelKey: "provider.launch.target.store" }
      : null;

    const ordered =
      platform === "ios" || platform === "android"
        ? [appTarget, webTarget, homepageTarget]
        : [webTarget, homepageTarget, appTarget];

    const available = ordered.filter((target): target is LaunchTarget => target !== null);
    const [primary, ...rest] = available;
    fallbacks.push(...rest);

    return { primary: primary ?? null, fallbacks, store };
  };

  const plan = (request: ProviderLaunchRequest): ProviderLaunchPlan => {
    const { option, reference, platform } = request;
    const { primary, fallbacks, store } = buildTargets(request);

    const blocked = option.complianceAction === "block" || !option.isSelectable;
    const hasDestination = primary !== null && !blocked;
    const launchClass = classify(option, hasDestination);
    const refusalReason = refusalFor(option, reference, hasDestination);
    const canLaunch = hasDestination && launcher.isAvailable() && refusalReason === null;

    return Object.freeze({
      providerId: option.provider.id,
      providerKey: option.provider.key,
      launchClass,
      syncMode: option.syncMode,
      platform,
      canLaunch,
      primaryTarget: hasDestination ? primary : null,
      fallbackTargets: Object.freeze(hasDestination ? fallbacks : []),
      storeTarget: store,
      guidanceKeys: manualSyncGuidanceKeys(option.provider.key, launchClass),
      // v1 has no automated control on any provider, including `supported`
      // ones: the countdown coordinates people, not players (MVP §6).
      requiresManualPlay: true,
      refusalReason,
      rationaleKeys: Object.freeze([
        ...new Set([...option.rationaleKeys, guidanceSummaryKey(launchClass)]),
      ]),
    });
  };

  const launch = (candidate: ProviderLaunchPlan, target: LaunchTarget): LaunchOutcome => {
    const permitted = [
      candidate.primaryTarget,
      ...candidate.fallbackTargets,
      candidate.storeTarget,
    ].some((known) => known !== null && known.url === target.url);

    // The store is reachable even when the title is not, so a store target is
    // allowed through while `canLaunch` is false; anything else is refused.
    const allowed =
      permitted && (target.kind === "store" || candidate.canLaunch) && launcher.isAvailable();

    return Object.freeze({
      providerId: candidate.providerId,
      target,
      opened: allowed ? launcher.open(target) : false,
      requestedAt: clock.now().toISOString(),
    });
  };

  return {
    isAvailable: () => launcher.isAvailable(),
    plan,
    launch,
  };
}

/** Resolves optional collaborators, mirroring the other Sprint 2.x factories. */
export function resolveProviderLaunchCoordinatorDependencies(
  dependencies: ProviderLaunchCoordinatorDependencies,
): ProviderLaunchCoordinatorDependencies {
  return dependencies;
}
