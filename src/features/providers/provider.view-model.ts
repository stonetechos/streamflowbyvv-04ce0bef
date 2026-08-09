/**
 * Provider view models — Sprint 2.2.
 *
 * Presentation-shaped projections of `ProviderSelectionOption`. Nothing is
 * decided here: selectability, sync mode, and the compliance verdict were all
 * adjudicated in Domain (Build Rules §1). This module only chooses labels.
 */
import { isBlockedProviderKey } from "@/domain";
import type { ProviderSelectionClass, ProviderSelectionOption, SyncMode } from "@/domain";

export interface ProviderOptionView {
  readonly id: string;
  readonly key: string;
  /** Translation key for the provider's display name. */
  readonly nameKey: string;
  readonly selectionClass: ProviderSelectionClass;
  readonly syncMode: SyncMode;
  readonly isSelectable: boolean;
  readonly isFavorite: boolean;
  readonly isDefault: boolean;
  readonly supportsDeepLink: boolean;
  /** Translation keys for every restriction that applies, blocking or not. */
  readonly rationaleKeys: readonly string[];
  readonly homepageUrl: string | null;
}

/** Badge label key for the picker — MVP Spec §7 vocabulary. */
export function selectionClassLabelKey(selectionClass: ProviderSelectionClass): string {
  return `provider.class.${selectionClass}`;
}

/** One-line explanation of what choosing this provider will mean. */
export function selectionClassHintKey(selectionClass: ProviderSelectionClass): string {
  return `provider.hint.${selectionClass}`;
}

export function toProviderOptionView(option: ProviderSelectionOption): ProviderOptionView {
  return {
    id: option.provider.id,
    key: option.provider.key,
    nameKey: option.provider.displayNameKey,
    selectionClass: option.selectionClass,
    syncMode: option.syncMode,
    isSelectable: option.isSelectable,
    isFavorite: option.isFavorite,
    isDefault: option.isDefault,
    supportsDeepLink: option.supportsDeepLink,
    // De-duplicated: two rules may cite the same rationale.
    rationaleKeys: [...new Set(option.rationaleKeys)],
    homepageUrl: option.provider.homepageUrl,
  };
}

/**
 * Product correction pass: a service the product has removed never reaches a
 * surface, even if a catalog row for it still exists.
 */
export function toProviderOptionViews(
  options: readonly ProviderSelectionOption[],
): readonly ProviderOptionView[] {
  return options
    .filter((option) => !isBlockedProviderKey(option.provider.key))
    .map(toProviderOptionView);
}
