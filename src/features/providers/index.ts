/**
 * Providers feature surface — Sprint 2.2.
 * Presentation imports this barrel and nothing deeper.
 */
export { ProviderCard, type ProviderCardProps } from "./components/provider-card";
export { ProviderGrid, type ProviderGridProps } from "./components/provider-grid";
export {
  useProviderCatalog,
  type ProviderCatalogModel,
  type ProviderCatalogStatus,
} from "./use-provider-catalog";
export {
  useProviderSessions,
  type ProviderSessionSource,
  type ProviderSessionsModel,
} from "./use-provider-sessions";
export {
  selectionClassHintKey,
  selectionClassLabelKey,
  toProviderOptionView,
  toProviderOptionViews,
  type ProviderOptionView,
} from "./provider.view-model";
