/**
 * Provider catalog hook — Sprint 2.2.
 *
 * Reads the adjudicated catalog through Domain and exposes it to the picker.
 * It performs no compliance reasoning of its own and never talks to a
 * repository (Foundation §2).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  PROVIDER_CATALOG_SERVICE,
  PROVIDER_PREFERENCE_SERVICE,
  isServiceBound,
  resolveService,
} from "@/domain";
import { logger } from "@/foundation/logging";

import { toProviderOptionViews, type ProviderOptionView } from "./provider.view-model";

const MODULE = "providers";

export type ProviderCatalogStatus = "loading" | "ready" | "unavailable" | "error";

export interface ProviderCatalogModel {
  readonly status: ProviderCatalogStatus;
  readonly options: readonly ProviderOptionView[];
  readonly regionCode: string;
  readonly defaultProviderId: string | null;
  refresh(): void;
  toggleFavorite(providerId: string, favorite: boolean): void;
}

export function useProviderCatalog(profileId: string | null, enabled = true): ProviderCatalogModel {
  const [status, setStatus] = useState<ProviderCatalogStatus>("loading");
  const [options, setOptions] = useState<readonly ProviderOptionView[]>([]);
  const [regionCode, setRegionCode] = useState("");
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null);
  const mounted = useRef(true);

  const catalog = useMemo(
    () =>
      isServiceBound(PROVIDER_CATALOG_SERVICE) ? resolveService(PROVIDER_CATALOG_SERVICE) : null,
    [],
  );

  const load = useCallback(async () => {
    if (!enabled) return;
    if (!catalog || !catalog.isAvailable()) {
      setStatus("unavailable");
      return;
    }
    try {
      const snapshot = await catalog.load({ profileId });
      if (!mounted.current) return;
      setOptions(toProviderOptionViews(snapshot.options));
      setRegionCode(snapshot.regionCode);
      setDefaultProviderId(snapshot.defaultProviderId);
      setStatus(snapshot.isAvailable ? "ready" : "unavailable");
    } catch (cause) {
      if (!mounted.current) return;
      logger.warn("Provider catalog load failed", { module: MODULE, error: cause });
      setStatus("error");
    }
  }, [catalog, enabled, profileId]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const toggleFavorite = useCallback(
    (providerId: string, favorite: boolean) => {
      if (!profileId || !isServiceBound(PROVIDER_PREFERENCE_SERVICE)) return;
      const preferences = resolveService(PROVIDER_PREFERENCE_SERVICE);
      void preferences
        .setFavorite(profileId, providerId, favorite)
        .then(() => load())
        .catch((cause: unknown) =>
          logger.warn("Provider favourite update failed", { module: MODULE, error: cause }),
        );
    },
    [load, profileId],
  );

  return {
    status,
    options,
    regionCode,
    defaultProviderId,
    refresh: () => void load(),
    toggleFavorite,
  };
}
