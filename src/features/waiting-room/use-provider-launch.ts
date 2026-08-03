/**
 * Provider launch hook — Sprint 2.8.
 *
 * The lobby's view of "where do I go to watch this". It owns no launch rule:
 * the plan comes from `ProviderLaunchCoordinator` (the only module allowed to
 * decide launch behaviour) and this hook merely tracks what this device has
 * attempted and announces it.
 *
 * Launch status is deliberately LOCAL to the viewer. Broadcasting it would
 * need a presence-protocol change that Sprint 2.8 does not authorize, and —
 * more importantly — StreamFlow cannot observe whether a provider actually
 * opened, so a room-wide "everyone launched" indicator would be a claim the
 * system cannot support. Each member sees their own hand-off honestly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PROVIDER_CATALOG_SERVICE,
  PROVIDER_LAUNCH_COORDINATOR,
  detectLaunchPlatform,
  isServiceBound,
  parseContentReference,
  resolveService,
  type LaunchPlatform,
  type LaunchTarget,
  type ProviderLaunchPlan,
  type ProviderSelectionOption,
} from "@/domain";
import { useAnnouncer } from "@/foundation/accessibility";
import { useTranslation } from "@/foundation/localization";
import { logger } from "@/foundation/logging";

const MODULE = "waiting-room";

export type ProviderLaunchStatus = "not_launched" | "launching" | "launched" | "failed";

export interface ProviderLaunchModel {
  readonly status: ProviderLaunchStatus;
  readonly plan: ProviderLaunchPlan | null;
  /** True when a provider is chosen but the platform cannot open anything. */
  readonly isAvailable: boolean;
  readonly lastTarget: LaunchTarget | null;
  launch(target?: LaunchTarget): void;
  reset(): void;
}

export interface UseProviderLaunchInput {
  readonly providerId: string | null;
  readonly contentReference: string | null;
  readonly enabled: boolean;
}

/** Browser detection stays at the edge; Domain receives a plain verdict. */
function currentPlatform(): LaunchPlatform {
  if (typeof navigator === "undefined") return "unknown";
  return detectLaunchPlatform(navigator.userAgent);
}

export function useProviderLaunch({
  providerId,
  contentReference,
  enabled,
}: UseProviderLaunchInput): ProviderLaunchModel {
  const { t } = useTranslation();
  const announce = useAnnouncer();
  const [option, setOption] = useState<ProviderSelectionOption | null>(null);
  const [status, setStatus] = useState<ProviderLaunchStatus>("not_launched");
  const [lastTarget, setLastTarget] = useState<LaunchTarget | null>(null);
  const mounted = useRef(true);

  const coordinator = useMemo(
    () =>
      isServiceBound(PROVIDER_LAUNCH_COORDINATOR)
        ? resolveService(PROVIDER_LAUNCH_COORDINATOR)
        : null,
    [],
  );

  // The adjudicated option — not a raw provider row — is what the coordinator
  // needs, so it is read back through the catalog rather than reconstructed.
  useEffect(() => {
    mounted.current = true;
    if (!enabled || !providerId || !isServiceBound(PROVIDER_CATALOG_SERVICE)) {
      setOption(null);
      return () => {
        mounted.current = false;
      };
    }
    const catalog = resolveService(PROVIDER_CATALOG_SERVICE);
    void catalog
      .load({ profileId: null })
      .then((snapshot) => {
        if (!mounted.current) return;
        setOption(snapshot.options.find((entry) => entry.provider.id === providerId) ?? null);
      })
      .catch((cause: unknown) => {
        logger.warn("Provider launch catalog read failed", { module: MODULE, error: cause });
      });
    return () => {
      mounted.current = false;
    };
  }, [enabled, providerId]);

  // A new provider or title invalidates any previous hand-off.
  useEffect(() => {
    setStatus("not_launched");
    setLastTarget(null);
  }, [providerId, contentReference]);

  const plan = useMemo(() => {
    if (!coordinator || !option) return null;
    return coordinator.plan({
      option,
      reference: parseContentReference(contentReference),
      platform: currentPlatform(),
    });
  }, [contentReference, coordinator, option]);

  const launch = useCallback(
    (target?: LaunchTarget) => {
      if (!coordinator || !plan) return;
      const chosen = target ?? plan.primaryTarget;
      if (!chosen) return;

      setStatus("launching");
      setLastTarget(chosen);
      const outcome = coordinator.launch(plan, chosen);
      setStatus(outcome.opened ? "launched" : "failed");
      announce(
        outcome.opened
          ? t("provider.launch.announce.opened")
          : t("provider.launch.announce.failed"),
      );
    },
    [announce, coordinator, plan, t],
  );

  const reset = useCallback(() => {
    setStatus("not_launched");
    setLastTarget(null);
  }, []);

  return {
    status,
    plan,
    isAvailable: coordinator?.isAvailable() ?? false,
    lastTarget,
    launch,
    reset,
  };
}
