/**
 * Provider grid — Sprint 2.2.
 *
 * The picker itself: a labelled radio group over the adjudicated catalog,
 * with explicit loading, empty, and unavailable states so the host is never
 * left guessing (MVP Spec §11).
 */
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/foundation/localization";

import type { ProviderCatalogStatus } from "../use-provider-catalog";
import type { ProviderOptionView } from "../provider.view-model";
import { ProviderCard } from "./provider-card";

export interface ProviderGridProps {
  readonly status: ProviderCatalogStatus;
  readonly options: readonly ProviderOptionView[];
  readonly selectedProviderId: string | null;
  readonly pendingProviderId: string | null;
  readonly canSelect: boolean;
  readonly canFavorite: boolean;
  onSelect(providerId: string): void;
  onToggleFavorite(providerId: string, favorite: boolean): void;
}

export function ProviderGrid({
  status,
  options,
  selectedProviderId,
  pendingProviderId,
  canSelect,
  canFavorite,
  onSelect,
  onToggleFavorite,
}: ProviderGridProps) {
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <p className="text-sm text-muted-foreground">
        {t(status === "error" ? "provider.list.error" : "provider.list.unavailable")}
      </p>
    );
  }

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("provider.list.empty")}</p>;
  }

  return (
    <div
      role="radiogroup"
      aria-label={t("provider.list.label")}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((option) => (
        <ProviderCard
          key={option.id}
          option={option}
          isSelected={option.id === selectedProviderId}
          isPending={!canSelect || pendingProviderId !== null}
          canFavorite={canFavorite}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
